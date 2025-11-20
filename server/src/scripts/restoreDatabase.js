import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { execSync } from 'child_process'
import fs from 'fs'

// .env dosyasını yükle
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../.env') })

async function restoreDatabase() {
  try {
    const backupFile = process.argv[2]

    if (!backupFile) {
      console.error('❌ Yedek dosyası belirtilmedi!')
      console.log('Kullanım: node restoreDatabase.js <backup-file.sql>')
      console.log('\nMevcut yedekler:')
      
      const backupDir = join(__dirname, '../../backups')
      if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir)
          .filter(f => f.endsWith('.sql'))
          .sort()
          .reverse()
        
        if (files.length === 0) {
          console.log('   (Yedek dosyası bulunamadı)')
        } else {
          files.slice(0, 10).forEach((file, i) => {
            const filePath = join(backupDir, file)
            const stats = fs.statSync(filePath)
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
            console.log(`   ${i + 1}. ${file} (${sizeMB} MB)`)
          })
        }
      }
      process.exit(1)
    }

    // Dosya var mı kontrol et
    const fullPath = fs.existsSync(backupFile) 
      ? backupFile 
      : join(__dirname, '../../backups', backupFile)

    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Yedek dosyası bulunamadı: ${fullPath}`)
      process.exit(1)
    }

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

    console.log('⚠️  UYARI: Bu işlem mevcut veritabanını tamamen silecek!')
    console.log(`   Veritabanı: ${database}`)
    console.log(`   Yedek dosyası: ${fullPath}`)
    console.log('\nDevam etmek için "EVET" yazın:')
    
    // Basit onay (gerçek uygulamada readline kullanılabilir)
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise(resolve => {
      readline.question('', resolve)
    })
    readline.close()
    
    if (answer.trim().toUpperCase() !== 'EVET') {
      console.log('❌ İşlem iptal edildi')
      process.exit(0)
    }

    console.log('\n🔄 Veritabanı geri yükleniyor...')

    // Önce veritabanını temizle (opsiyonel - dikkatli kullanın!)
    // Docker container içinden restore et
    const dockerCmd = `docker exec -i leadportal-postgres psql -U ${user} -d ${database} < "${fullPath}"`
    
    try {
      execSync(dockerCmd, { stdio: 'inherit', shell: true })
      console.log('✅ Veritabanı başarıyla geri yüklendi!')
    } catch (error) {
      // Alternatif: PGPASSWORD ile
      console.log('⚠️  Docker komutu başarısız, alternatif yöntem deneniyor...')
      process.env.PGPASSWORD = password
      const psqlCmd = `psql -h ${host} -p ${port} -U ${user} -d ${database} < "${fullPath}"`
      execSync(psqlCmd, { stdio: 'inherit', shell: true })
      console.log('✅ Veritabanı başarıyla geri yüklendi!')
    }

  } catch (error) {
    console.error('❌ Geri yükleme hatası:', error.message)
    process.exit(1)
  }
}

restoreDatabase()

