import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Route isimlerini Türkçe'ye çevirmek için mapping
const routeNameMap = {
  'home': 'Ana Sayfa',
  'lead-marketplace': 'Lead Pazarı',
  'forgot-password': 'Şifremi Unuttum',
  'reset-password': 'Şifre Sıfırla',
  'admin-leads-new': 'Yeni Lead',
  'login': 'Giriş',
  'admin-leads': 'Lead Yönetimi',
  'admin-users': 'Kullanıcı Yönetimi',
  'admin-users-list': 'Kullanıcı Listesi',
  'admin-leads-edit': 'Lead Düzenle',
  'lead-detail': 'Lead Detayı',
  'forbidden': 'Erişim Engellendi',
  'about': 'Hakkında',
  'faq': 'SSS',
  'purchased-leads': 'Satın Aldıklarım',
  'user-dashboard': 'Kullanıcı Paneli',
  'admin-settings': 'Ayarlar',
  'admin-user-types': 'Kullanıcı Tipleri',
  'admin-faq': 'FAQ Yönetimi',
  'admin-about': 'Hakkında Yönetimi',
  'admin-design-settings': 'Tasarım Ayarları',
  'admin-email-sms-settings': 'E-posta & SMS Ayarları',
  'admin-lead-type-permissions': 'Lead Tipi Yetkileri',
  'admin-homepage-settings': 'Anasayfa Ayarları',
  'admin-statistics': 'İstatistikler',
  'admin-activity-log': 'Aktivite Kaydı',
  'profile': 'Profil'
}

// Özel sayfa adları (parametreli route'lar için)
const specialPaths = {
  '/admin/leads/:id': 'Lead Düzenle',
  '/lead/:id': 'Lead Detayı'
}

// Hariç tutulacak route'lar (login, forbidden, reset-password vs)
const excludedRoutes = ['login', 'forbidden', 'forgot-password', 'reset-password']

function parseRouterFile() {
  const routerPath = path.join(__dirname, '../leadportal/src/router/index.js')
  const content = fs.readFileSync(routerPath, 'utf8')

  // Route objelerini regex ile çıkar
  const routeRegex = /\{\s*path:\s*['"]([^'"]+)['"],\s*name:\s*['"]([^'"]+)['"]/g
  const routes = []
  const processedPaths = new Set()

  let match
  while ((match = routeRegex.exec(content)) !== null) {
    const [, path, name] = match

    // Hariç tutulacak route'ları atla
    if (excludedRoutes.includes(name)) {
      continue
    }

    // Aynı path'i birden fazla ekleme (duplicate routes)
    if (processedPaths.has(path)) {
      continue
    }

    processedPaths.add(path)

    // Özel isim varsa onu kullan, yoksa mapping'den al, o da yoksa name'i kullan
    const pageName = specialPaths[path] ||
                     routeNameMap[name] ||
                     name ||
                     path

    routes.push({
      path,
      name,
      pageName
    })
  }

  return routes
}

function generatePagesList() {
  const routes = parseRouterFile()
  const pages = []

  routes.forEach(route => {
    pages.push({
      id: route.path,
      name: route.pageName
    })
  })

  // Path'e göre sırala
  pages.sort((a, b) => {
    // Admin route'ları sona at
    if (a.id.startsWith('/admin') && !b.id.startsWith('/admin')) return 1
    if (!a.id.startsWith('/admin') && b.id.startsWith('/admin')) return -1
    return a.id.localeCompare(b.id)
  })

  return pages
}

function updatePagesFile(pages) {
  const pagesFilePath = path.join(__dirname, '../server/src/routes/pages.js')
  let content = fs.readFileSync(pagesFilePath, 'utf8')

  // STATIC_PAGES array'ini oluştur
  const pagesArrayStr = pages.map(p =>
    `    { id: '${p.id}', name: '${p.name}' }`
  ).join(',\n')

  const newStaticPages = `const STATIC_PAGES = [\n${pagesArrayStr},\n  ]`

  // Dosyadaki STATIC_PAGES'i değiştir
  const regex = /const STATIC_PAGES = \[[\s\S]*?\]/

  if (regex.test(content)) {
    content = content.replace(regex, newStaticPages)
  } else {
    throw new Error('STATIC_PAGES array not found in pages.js')
  }

  fs.writeFileSync(pagesFilePath, content, 'utf8')
}

function main() {
  console.log('🔄 Route senkronizasyonu başlıyor...\n')

  const pages = generatePagesList()

  console.log(`📄 Toplam ${pages.length} route bulundu:\n`)
  pages.forEach(p => {
    console.log(`  - ${p.id.padEnd(35)} → ${p.name}`)
  })

  console.log('\n📝 pages.js dosyası güncelleniyor...')
  updatePagesFile(pages)

  console.log('✅ Route senkronizasyonu tamamlandı!')
  console.log('\n💡 Yeni route\'ların sayfa yetkilendirmeleri sekmesinde görünmesi için:')
  console.log('   1. Sunucuyu yeniden başlatın')
  console.log('   2. Admin panelinden "Kullanıcı Tipleri > Yetkilendirmeler" sekmesine gidin')
  console.log('   3. Sayfa otomatik olarak veritabanına senkronize edilecektir\n')
}

main()
