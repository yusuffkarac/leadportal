import { PrismaClient } from '../prismaClient.js'

const prisma = new PrismaClient()

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice(arr) {
	return arr[Math.floor(Math.random() * arr.length)]
}

function randomString(words, min = 3, max = 8) {
	const len = randomInt(min, max)
	const chosen = Array.from({ length: len }, () => randomChoice(words))
	const sentence = chosen.join(' ')
	return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

function randomParagraph(words) {
	const sentences = randomInt(2, 6)
	return Array.from({ length: sentences }, () => randomString(words, 6, 16) + '.')
		.join(' ')
}

function randomPostalCode() {
	// 4-6 karakterli, sayı ağırlıklı posta kodu üret
	const length = randomInt(4, 6)
	let s = ''
	for (let i = 0; i < length; i++) s += String(randomInt(0, 9))
	return s
}

function futureDateWithin(daysMin, daysMax) {
	const now = new Date()
	const deltaDays = randomInt(daysMin, daysMax)
	const result = new Date(now.getTime() + deltaDays * 24 * 60 * 60 * 1000 + randomInt(0, 10) * 60 * 60 * 1000)
	return result
}

function pastDateWithin(daysMin, daysMax) {
	const now = new Date()
	const deltaDays = randomInt(daysMin, daysMax)
	const result = new Date(now.getTime() - deltaDays * 24 * 60 * 60 * 1000 - randomInt(0, 10) * 60 * 60 * 1000)
	return result
}

async function generateFakeLeads(total = 50) {
	try {
		console.log(`🚀 ${total} adet sahte lead oluşturma başlıyor...`)

		// Kullanıcıları topla (ownerId için)
		const users = await prisma.user.findMany({ select: { id: true, userTypeId: true } })
		if (users.length === 0) {
			throw new Error('Hiç kullanıcı yok. Önce seed çalıştırın veya kullanıcı oluşturun.')
		}

		// Admin olmayanlara öncelik ver; yoksa tüm kullanıcılar
		const nonAdminUsers = users.filter(u => !(u.userTypeId || '').includes('ADMIN'))
		const ownerPool = nonAdminUsers.length > 0 ? nonAdminUsers : users

		const wordBank = [
			'araba', 'sağlık', 'konut', 'sigorta', 'kasko', 'teklif', 'premium', 'hızlı', 'güvenli', 'kampanya',
			'kredi', 'dijital', 'pazarlama', 'enerji', 'konfor', 'akıllı', 'otomasyon', 'analitik', 'rapor', 'entegrasyon',
			'iş', 'müşteri', 'fırsat', 'limit', 'avantaj', 'paket', 'pro', 'max', 'lite', 'yüksek', 'düşük', 'orta'
		]

		const insuranceTypes = [
			'Kasko', 'Zorunlu Trafik', 'Sağlık', 'Konut', 'İşyeri', 'Seyahat', 'Cihaz', 'Sorumluluk'
		]

		const leads = []
		for (let i = 0; i < total; i++) {
			const leadType = Math.random() < 0.6 ? 'AUCTION' : 'SOFORT_KAUF'
			const ownerId = randomChoice(ownerPool).id

			// Fiyatlar
			const base = randomInt(50, 5000)
			const startPrice = leadType === 'AUCTION' ? base : randomInt(50, 2000)
			const minIncrement = randomInt(5, Math.max(10, Math.floor(startPrice * 0.1)))
			const reservePrice = Math.random() < 0.4 ? startPrice + randomInt(20, 500) : null
			const instantBuyPrice = leadType === 'SOFORT_KAUF' ? startPrice + randomInt(50, 2000) : (Math.random() < 0.2 ? startPrice + randomInt(100, 1500) : null)

			// Zamanlar
			const startsInPast = Math.random() < 0.3
			const startsAt = Math.random() < 0.5 ? (startsInPast ? pastDateWithin(1, 5) : futureDateWithin(0, 3)) : null
			const endsAt = startsAt
				? new Date(startsAt.getTime() + randomInt(1, 14) * 24 * 60 * 60 * 1000)
				: futureDateWithin(1, 21)

			const data = {
				title: randomString(wordBank, 2, 5),
				description: randomParagraph(wordBank),
				privateDetails: Math.random() < 0.7 ? randomParagraph(wordBank) : null,
				postalCode: Math.random() < 0.9 ? randomPostalCode() : null,
				leadType,
				startPrice,
				minIncrement,
				instantBuyPrice,
				reservePrice,
				antiSnipeSeconds: randomInt(60, 240),
				insuranceType: Math.random() < 0.7 ? randomChoice(insuranceTypes) : null,
				isActive: Math.random() < 0.95,
				isShowcase: Math.random() < 0.2,
				isSold: false,
				featured: Math.random() < 0.15,
				startsAt,
				endsAt,
				ownerId
			}

			// createMany null'ları kabul eder, Prisma 6 ile uyumlu
			leads.push(data)
		}

		const created = await prisma.lead.createMany({ data: leads })
		console.log(`✅ ${created.count} lead eklendi`)
	} catch (err) {
		console.error('❌ Fake lead oluşturulurken hata:', err)
		throw err
	} finally {
		await prisma.$disconnect()
	}
}

const total = Number(process.argv[2]) || 50
generateFakeLeads(total)
	.then(() => {
		console.log('🎉 Tamamlandı')
		process.exit(0)
	})
	.catch(() => process.exit(1))


