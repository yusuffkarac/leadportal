import { now } from '../utils/dateTimeUtils.js'

/**
 * eBay-style Proxy Bidding Algorithm
 *
 * Core Principles:
 * 1. Users submit hidden maximum bids
 * 2. System automatically bids minimum needed to stay on top
 * 3. Visible price = second-highest max + increment
 * 4. Winner pays visible price, not their maximum
 */

/**
 * Calculate the visible bid amount based on proxy bidding rules
 * @param {number} newMaxBid - New bidder's maximum bid
 * @param {number} currentLeaderMaxBid - Current leader's maximum bid (or null)
 * @param {number} currentVisibleBid - Current visible bid amount
 * @param {number} minIncrement - Minimum bid increment
 * @param {number} startPrice - Auction start price
 * @returns {Object} { visibleBid, newLeader }
 */
export function calculateProxyBid(newMaxBid, currentLeaderMaxBid, currentVisibleBid, minIncrement, startPrice) {
  // Case 1: First bid on the auction
  if (!currentLeaderMaxBid) {
    return {
      visibleBid: startPrice, // First bidder pays starting price
      newLeader: true
    }
  }

  // Case 2: New max exceeds current leader's max
  if (newMaxBid > currentLeaderMaxBid) {
    return {
      visibleBid: Math.min(
        currentLeaderMaxBid + minIncrement, // Second-highest + increment
        newMaxBid // But never exceed new bidder's max
      ),
      newLeader: true
    }
  }

  // Case 3: New max equals current leader's max (tie - first bidder wins)
  if (newMaxBid === currentLeaderMaxBid) {
    return {
      visibleBid: currentVisibleBid, // Keep current price
      newLeader: false, // Original leader keeps lead
      message: 'Your maximum bid equals the current leader. To take the lead, you must bid higher.'
    }
  }

  // Case 4: New max is less than current leader's max
  // Leader automatically counter-bids
  return {
    visibleBid: Math.min(
      newMaxBid + minIncrement, // New bidder's max + increment
      currentLeaderMaxBid // But never exceed leader's max
    ),
    newLeader: false,
    autoBidTriggered: true // Leader's proxy bid was triggered
  }
}

/**
 * Process a new proxy bid and create necessary bid records
 * @param {Object} prisma - Prisma client
 * @param {string} leadId - Lead ID
 * @param {string} userId - User ID placing the bid
 * @param {number} maxBid - User's maximum bid
 * @param {Object} lead - Lead object with current bids
 * @returns {Object} Result with created bids and status
 */
export async function processProxyBid(prisma, leadId, userId, maxBid, lead) {
  // Get current highest bid info
  const currentBids = await prisma.bid.findMany({
    where: { leadId },
    orderBy: { amount: 'desc' },
    take: 10, // Get top 10 to find second-highest max
    include: { user: true }
  })

  const currentLeader = currentBids[0]
  const currentLeaderMaxBid = currentLeader?.maxBid || null
  const currentLeaderId = currentLeader?.userId || null
  const currentVisibleBid = currentLeader?.amount || lead.startPrice

  // Check if user is trying to outbid themselves
  if (currentLeaderId === userId) {
    // Allow users to increase their max bid
    if (maxBid > currentLeaderMaxBid) {
      // Update their existing max bid (keep same visible price unless someone else bid)
      const updatedBid = await prisma.bid.create({
        data: {
          leadId,
          userId,
          maxBid,
          amount: currentVisibleBid, // Keep same visible price
          isAutoBid: false
        },
        include: { user: true }
      })

      return {
        success: true,
        userBid: updatedBid,
        visiblePrice: currentVisibleBid,
        isLeader: true,
        message: 'Your maximum bid has been increased.'
      }
    } else {
      throw new Error('Dein neues Maximalgebot muss höher sein als dein aktuelles Maximalgebot.')
    }
  }

  // Calculate proxy bid result
  const result = calculateProxyBid(
    maxBid,
    currentLeaderMaxBid,
    currentVisibleBid,
    lead.minIncrement,
    lead.startPrice
  )

  console.log('[ProxyBid] Calculation result:', {
    newMaxBid: maxBid,
    currentLeaderMaxBid,
    currentVisibleBid,
    minIncrement: lead.minIncrement,
    result
  })

  // If bid is equal to current leader's max, reject it
  if (!result.newLeader && maxBid === currentLeaderMaxBid) {
    return {
      success: false,
      message: `Teklifiniz alındı, ancak başka bir kullanıcının maksimumu daha yüksek. Lider olmak için daha yüksek bir maksimum teklif verin.`
    }
  }

  // Create the user's bid record
  const userBid = await prisma.bid.create({
    data: {
      leadId,
      userId,
      maxBid,
      amount: result.newLeader ? result.visibleBid : maxBid, // If not leader, record their max as amount
      isAutoBid: false
    },
    include: { user: true }
  })

  let leaderAutoBid = null

  // If user didn't become leader and auto-bid was triggered
  if (!result.newLeader && result.autoBidTriggered && currentLeaderId) {
    console.log('[ProxyBid] Creating auto-bid for current leader:', {
      leaderId: currentLeaderId,
      leaderMaxBid: currentLeaderMaxBid,
      newVisiblePrice: result.visibleBid
    })

    // Create automatic counter-bid for current leader
    leaderAutoBid = await prisma.bid.create({
      data: {
        leadId,
        userId: currentLeaderId,
        maxBid: currentLeaderMaxBid, // Same max as before
        amount: result.visibleBid, // New visible price
        isAutoBid: true
      },
      include: { user: true }
    })

    console.log('[ProxyBid] Auto-bid created:', leaderAutoBid.id)
  } else {
    console.log('[ProxyBid] No auto-bid needed:', {
      newLeader: result.newLeader,
      autoBidTriggered: result.autoBidTriggered,
      hasCurrentLeader: !!currentLeaderId
    })
  }

  return {
    success: true,
    userBid,
    leaderAutoBid,
    visiblePrice: result.visibleBid,
    isLeader: result.newLeader,
    message: result.message,
    previousLeaderId: currentLeaderId
  }
}

/**
 * Check if bid meets reserve price
 * @param {number} amount - Bid amount
 * @param {number|null} reservePrice - Reserve price (if set)
 * @returns {boolean} Whether reserve is met
 */
export function meetsReservePrice(amount, reservePrice) {
  if (!reservePrice) return true
  return amount >= reservePrice
}

/**
 * Check if anti-sniping should trigger and calculate new end time
 * @param {Date} endsAt - Current auction end time
 * @param {number} antiSnipeSeconds - Anti-snipe window in seconds
 * @returns {Object} { shouldExtend, newEndsAt }
 */
export function checkAntiSnipe(endsAt, antiSnipeSeconds = 120) {
  const currentTime = now()
  const timeRemaining = (endsAt - currentTime) / 1000 // seconds

  // If bid placed within anti-snipe window
  if (timeRemaining > 0 && timeRemaining <= antiSnipeSeconds) {
    const newEndsAt = new Date(currentTime.getTime() + antiSnipeSeconds * 1000)
    return {
      shouldExtend: true,
      newEndsAt,
      extensionSeconds: antiSnipeSeconds
    }
  }

  return {
    shouldExtend: false,
    newEndsAt: endsAt
  }
}

/**
 * Get the highest maximum bid for a lead (for admin/debugging)
 * @param {Object} prisma - Prisma client
 * @param {string} leadId - Lead ID
 * @returns {Object} Highest max bid info
 */
export async function getHighestMaxBid(prisma, leadId) {
  const highestMaxBid = await prisma.bid.findFirst({
    where: { leadId },
    orderBy: { maxBid: 'desc' },
    include: { user: true }
  })

  return highestMaxBid
}

/**
 * Get visible current price for a lead
 * This is what bidders see as the "current bid"
 * @param {Object} prisma - Prisma client
 * @param {string} leadId - Lead ID
 * @returns {Object} Current visible bid info
 */
export async function getCurrentVisibleBid(prisma, leadId) {
  const currentBid = await prisma.bid.findFirst({
    where: { leadId },
    orderBy: { createdAt: 'desc' }, // Most recent bid shows the current visible price
    include: { user: true }
  })

  return currentBid
}

/**
 * Anonymize max bid for non-owner users
 * Users should never see others' maximum bids
 * @param {Object} bid - Bid object
 * @param {string|null} requestingUserId - User requesting the data
 * @returns {Object} Sanitized bid object
 */
export function sanitizeBidForUser(bid, requestingUserId = null) {
  if (!bid) return null

  // If user is viewing their own bid, show max
  if (requestingUserId && bid.userId === requestingUserId) {
    return bid
  }

  // Hide maxBid from other users
  const { maxBid, ...sanitizedBid } = bid
  return {
    ...sanitizedBid,
    maxBid: null // Hide maximum bid
  }
}

/**
 * Calculate final sale price when auction ends
 * Winner pays the visible price, not their maximum
 * @param {Object} prisma - Prisma client
 * @param {string} leadId - Lead ID
 * @returns {Object} Final sale information
 */
export async function calculateFinalPrice(prisma, leadId) {
  const bids = await prisma.bid.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  })

  if (bids.length === 0) {
    return {
      hasWinner: false,
      finalPrice: null,
      winnerId: null
    }
  }

  // The most recent bid shows the current visible price
  const visibleBid = bids[0]

  // Find the actual winner (highest max bid)
  const sortedByMax = [...bids].sort((a, b) => b.maxBid - a.maxBid)
  const winner = sortedByMax[0]

  return {
    hasWinner: true,
    finalPrice: visibleBid.amount, // Winner pays visible price
    winnerId: winner.userId,
    winnerMaxBid: winner.maxBid, // What they were willing to pay
    savedAmount: winner.maxBid - visibleBid.amount // How much they saved
  }
}
