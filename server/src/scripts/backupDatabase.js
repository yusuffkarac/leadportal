import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { execSync } from 'child_process'
import fs from 'fs'

// .env dosyasını yükle
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../.env') })

async function backupDatabase() {
  try {
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL environment variable bulunamadı!')
      process.exit(1)
    }

    // DATABASE_URL'i parse et
    const urlPattern = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/
    const match = databaseUrl.match(urlPattern)

    if (!match) {
      console.error('❌ DATABASE_URL formatı geçersiz!')
      process.exit(1)
    }

    const [, user, password, host, port, database] = match

    // Backup dizinini oluştur
    const backupDir = join(__dirname, '../../backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    // Backup dosya adı
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const backupFile = join(backupDir, `leadportal-backup-${timestamp}.sql`)

    console.log('📦 Veritabanı yedekleniyor...')
    console.log(`   Veritabanı: ${database}`)
    console.log(`   Host: ${host}:${port}`)
    console.log(`   Yedek dosyası: ${backupFile}`)

    // Docker container içinden backup al
    const dockerCmd = `docker exec leadportal-postgres pg_dump -U ${user} -d ${database} > "${backupFile}"`
    
    try {
      execSync(dockerCmd, { stdio: 'inherit', shell: true })
      console.log(`✅ Yedek başarıyla oluşturuldu: ${backupFile}`)
    } catch (error) {
      // Alternatif: PGPASSWORD ile
      console.log('⚠️  Docker komutu başarısız, alternatif yöntem deneniyor...')
      process.env.PGPASSWORD = password
      const pgDumpCmd = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} > "${backupFile}"`
      execSync(pgDumpCmd, { stdio: 'inherit', shell: true })
      console.log(`✅ Yedek başarıyla oluşturuldu: ${backupFile}`)
    }

    // Dosya boyutunu göster
    const stats = fs.statSync(backupFile)
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2)
    console.log(`📊 Yedek dosya boyutu: ${fileSizeMB} MB`)

  } catch (error) {
    console.error('❌ Yedekleme hatası:', error.message)
    process.exit(1)
  }
}

backupDatabase()

