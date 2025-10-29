# eBay-Style Proxy Bidding System Documentation

## Overview

This system implements **eBay-style proxy bidding** for the LeadPortal auction platform. Users submit hidden maximum bids, and the system automatically bids the minimum needed to stay on top, never exceeding their maximum.

---

## Core Principles

1. **Hidden Maximum Bids**: Each user submits a maximum bid that only they can see
2. **Automatic Bidding**: System automatically places counter-bids up to the user's maximum
3. **Visible Price Logic**: Current visible price = second-highest maximum + increment
4. **Winner Pays Less**: Winner pays the visible price, NOT their maximum bid
5. **Complete Privacy**: Nobody sees others' maximum bids, only current visible price and leader
6. **Reserve Price**: Optional minimum winning price (auction won't complete below this)
7. **Anti-Sniping**: Auction extends if bids placed in final seconds

---

## How It Works

### Example Scenario

```
Starting price: €100
Minimum increment: €10

1. Alice bids max €500
   → Visible price: €100 (starting price)
   → Leader: Alice

2. Bob bids max €300
   → System auto-bids for Alice: €310 (Bob's max + increment)
   → Visible price: €310
   → Leader: Alice (still)

3. Carol bids max €600
   → Visible price: €510 (Alice's max + increment)
   → Leader: Carol

4. Auction ends
   → Winner: Carol
   → Final price: €510 (NOT €600)
   → Carol saved: €90
```

---

## Database Schema

### Lead Model
```prisma
model Lead {
  id               String   @id
  title            String
  description      String
  startPrice       Int      // Starting bid amount
  minIncrement     Int      // Minimum bid increment
  instantBuyPrice  Int?     // Fixed "Buy Now" price
  reservePrice     Int?     // NEW: Hidden minimum winning price
  antiSnipeSeconds Int      // NEW: Extension window (default: 120s)
  endsAt           DateTime // Auction end time
  isActive         Boolean
  isSold           Boolean
  // ... other fields
}
```

### Bid Model
```prisma
model Bid {
  id        String   @id
  amount    Int      // NEW: Visible current bid amount
  maxBid    Int      // NEW: Hidden maximum bid
  isAutoBid Boolean  // NEW: True if auto-placed by system
  createdAt DateTime
  leadId    String
  userId    String
  // ... relations
}
```

---

## Backend Implementation

### Core Algorithm (`proxyBiddingService.js`)

#### calculateProxyBid()
Determines the new visible bid and leader based on bidding rules:

**Case 1: First Bid**
- Visible bid = starting price
- Bidder becomes leader

**Case 2: New Max > Current Leader's Max**
- New bidder becomes leader
- Visible bid = min(currentLeaderMax + increment, newMax)

**Case 3: New Max = Current Leader's Max**
- Leader doesn't change (first bidder wins ties)
- Visible price stays the same

**Case 4: New Max < Current Leader's Max**
- Leader stays the same
- System creates auto-bid for leader
- Visible bid = min(newMax + increment, leaderMax)

#### processProxyBid()
Main function that:
1. Fetches current bids
2. Calculates new visible price
3. Creates user's bid record
4. Creates automatic counter-bid if needed
5. Returns result with leader status

#### Anti-Sniping: checkAntiSnipe()
- Monitors bids in final N seconds (default: 120)
- Extends auction by N seconds if bid placed in window
- Prevents last-second wins
- Encourages honest maximum bids

#### Reserve Price: meetsReservePrice()
- Checks if current bid meets hidden minimum
- Auction won't complete if reserve not met
- Owner notified if reserve not reached

---

## API Changes

### POST /api/bids

**Old Request:**
```json
{
  "leadId": "lead123",
  "amount": 350  // Direct bid amount
}
```

**New Request:**
```json
{
  "leadId": "lead123",
  "maxBid": 500  // Maximum willing to pay
}
```

**Response:**
```json
{
  "id": "bid123",
  "amount": 350,           // Visible current bid
  "maxBid": 500,           // User's maximum (only visible to them)
  "visiblePrice": 350,     // Current visible price
  "isLeader": true,        // Whether user is now leading
  "isAutoBid": false,      // Whether this was auto-placed
  "reserveMet": true,      // Whether reserve price is met
  "antiSnipeTriggered": false,
  "message": "You are now the leader!"
}
```

### Socket Events

#### bid:new
Emitted when visible price changes:
```javascript
{
  leadId: "lead123",
  bid: {
    id: "bid123",
    amount: 350,        // Visible price
    maxBid: null,       // ALWAYS null (hidden from everyone)
    userId: "user456",
    user: { /* anonymized */ },
    isAutoBid: true
  },
  reserveMet: true
}
```

#### lead:extended
Emitted when anti-sniping triggers:
```javascript
{
  leadId: "lead123",
  newEndsAt: "2025-11-01T15:30:00Z",
  extensionSeconds: 120
}
```

---

## Frontend Changes

### LeadDetailView.vue

**Key Changes:**
1. Input field now labeled "Maksimum Teklifiniz (Gizli)"
2. Info box explains proxy bidding concept
3. Success/error messages indicate leader status
4. Socket handler for `lead:extended` event
5. Reserve price warnings when not met

**User Feedback:**
```javascript
// If user becomes leader
"Tebrikler! Şu anda lidersiniz. Görünür fiyat: €350"

// If user doesn't become leader
"Teklifiniz alındı, ancak başka bir kullanıcının maksimumu daha yüksek.
Lider olmak için daha yüksek bir maksimum teklif verin."

// If reserve not met
"Not: Rezerv fiyat henüz karşılanmadı."

// If anti-sniping triggered
"Açık artırma süresi 120 saniye uzatıldı!"
```

---

## Notifications

### New Notification Types

1. **BID_AUTO_INCREASED**: When your proxy bid automatically counter-bids
   - "Otomatik Teklifiniz Arttırıldı"
   - Informs current leader their auto-bid was triggered

2. **LEAD_NOT_SOLD**: When auction ends without meeting reserve
   - "Lead Rezerv Fiyatına Ulaşmadı"
   - Notifies owner reserve wasn't met

### Modified Notifications

- **BID_PLACED**: Now includes visible price vs max bid info
- **BID_OUTBID**: Only sent when leader actually changes (not on auto-bids)

---

## Auto-Sell Logic (Auction End)

When auction expires (`checkAndSellExpiredLeads()`):

1. **Calculate Final Price**:
   - Find highest maximum bid (winner)
   - Find most recent visible bid (final price)
   - Winner pays visible price, not their max

2. **Check Reserve Price**:
   - If reserve not met → mark inactive, don't sell
   - Notify owner

3. **Complete Sale**:
   - Deduct visible price from winner's balance
   - Create LeadSale record with visible price
   - Log how much winner saved

**Example Log:**
```
Lead sold: "Premium Lead" to alice@example.com for €510 TL
(max bid: €600 TL, saved: €90 TL)
```

---

## Security & Privacy

### What's Hidden:
- ❌ **maxBid** field is NEVER exposed via API/Socket to other users
- ❌ Other users' maximum bids are completely hidden
- ❌ Reserve price is hidden from all bidders

### What's Visible:
- ✅ Current visible price (amount field)
- ✅ Who is currently leading (anonymized)
- ✅ Number of bids placed
- ✅ Your own maximum bid (to yourself only)

### Data Sanitization:
```javascript
// In leads.js - anonymizeBids()
maxBid: isOwnBid ? bid.maxBid : undefined

// In bids.js - Socket emit
maxBid: null  // Always null in socket events
```

---

## Admin Features

Admins can optionally:
- Set **reservePrice** when creating leads
- Set **antiSnipeSeconds** (default: 120)
- View final prices and savings in sale records
- See all bids including max bids (for debugging/analytics)

---

## Testing Scenarios

### Scenario 1: Basic Proxy Bidding
```
1. User A bids max €500 → visible €100 (start price)
2. User B bids max €300 → visible €310 (B's max + €10)
3. User A still leader, paid less than max
```

### Scenario 2: Taking the Lead
```
1. User A bids max €500 → visible €100
2. User B bids max €600 → visible €510 (A's max + €10)
3. User B becomes leader, will pay €510 (not €600)
```

### Scenario 3: Anti-Sniping
```
1. Auction ends in 30 seconds
2. User C bids max €700
3. Auction extends by 120 seconds
4. All bidders notified of extension
```

### Scenario 4: Reserve Not Met
```
1. Reserve price: €1000
2. Highest bid: €800
3. Auction ends → lead not sold
4. Owner notified reserve wasn't met
```

### Scenario 5: Increasing Your Max
```
1. User A bids max €500 → becomes leader
2. User B bids max €800 → B takes lead at €510
3. User A bids max €900 → A retakes lead at €810
4. User A can always increase their max
```

---

## Migration Guide

### For Existing Auctions:

1. **Database**: Run `npx prisma db push` to add new fields:
   - `Lead.reservePrice` (nullable)
   - `Lead.antiSnipeSeconds` (default: 120)
   - `Bid.maxBid` (required)
   - `Bid.isAutoBid` (default: false)

2. **Existing Bids**: For old bids without maxBid:
   - Set `maxBid = amount` (assume old bids were direct)
   - Set `isAutoBid = false`

3. **Frontend**: No breaking changes to existing UI structure
   - Only labels and logic updated
   - Forms still work the same visually

4. **Backwards Compatibility**:
   - Old instant-buy logic unchanged
   - Lead listing/viewing unchanged
   - Only bidding mechanism changed

---

## Benefits of This Implementation

### For Bidders:
1. **Pay Less**: Winner pays second-highest price, not their max
2. **No Constant Monitoring**: Set your max and let system bid for you
3. **Fair Competition**: No sniping advantages
4. **Honest Bidding**: Encourages bidding true maximum value

### For Platform:
1. **Higher Bids**: Users comfortable bidding their true maximum
2. **More Engagement**: Auto-bidding keeps users "in" the auction
3. **Fair Marketplace**: Reduces gaming/sniping strategies
4. **Better Price Discovery**: Finds true market value

### For Sellers:
1. **Higher Final Prices**: Proxy bidding increases final sale prices
2. **Reserve Protection**: Can set minimum acceptable price
3. **Anti-Sniping**: Ensures fair auction endings

---

## Configuration

### Settings (per Lead):
```javascript
{
  reservePrice: 1000,      // Optional minimum (null = no reserve)
  antiSnipeSeconds: 120,   // Extension window (0 = disabled)
  minIncrement: 10         // Minimum bid increment
}
```

### Global Settings:
- Notifications enabled/disabled per type
- Email templates for proxy bid events
- Default anti-snipe window

---

## Troubleshooting

### Issue: "Your new maximum must be higher than your current maximum bid"
**Cause**: User trying to lower their max bid
**Solution**: Users can only increase, never decrease their maximum

### Issue: Visible price seems wrong
**Cause**: Confusing max bid with visible price
**Solution**: Remember: visible = second-highest max + increment

### Issue: Auto-bid not working
**Cause**: Leader's max already exceeded
**Solution**: Check leader's max vs new bid in database

### Issue: Reserve not met notification not showing
**Cause**: Front-end not handling `reserveMet: false` in socket event
**Solution**: Check socket handler in LeadDetailView.vue

---

## Future Enhancements (Optional)

1. **Bid History with Max Reveal**: Show max bids after auction ends
2. **Bid Retraction**: Allow users to retract within X minutes (with penalties)
3. **Proxy Bid Analytics**: Dashboard showing avg savings, bid patterns
4. **Smart Reserve Suggestions**: ML-based reserve price recommendations
5. **Graduated Anti-Sniping**: Longer extensions for higher-value auctions
6. **Bid Limit Per User**: Prevent spam bidding

---

## Files Changed

### Backend:
- ✅ `server/prisma/schema.prisma` - Database schema
- ✅ `server/src/services/proxyBiddingService.js` - NEW: Core algorithm
- ✅ `server/src/routes/bids.js` - Updated bid creation
- ✅ `server/src/routes/leads.js` - Updated auto-sell logic

### Frontend:
- ✅ `leadportal/src/views/LeadDetailView.vue` - Updated UI and logic

### Documentation:
- ✅ `PROXY_BIDDING_DOCUMENTATION.md` - This file

---

## Summary

The proxy bidding system successfully transforms the manual auction into an eBay-style automatic bidding system while:
- ✅ Keeping all existing structure and UI intact
- ✅ Maintaining complete privacy of maximum bids
- ✅ Implementing reserve prices and anti-sniping
- ✅ Ensuring winners pay fair market price (not their max)
- ✅ Providing clear user feedback and notifications
- ✅ Supporting all existing features (instant buy, watch lists, etc.)

The implementation is production-ready and follows best practices for security, performance, and user experience.
