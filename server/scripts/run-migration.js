#!/usr/bin/env node

/**
 * Production sunucusunda eksik migration'ları çalıştırmak için script
 * Kullanım: node scripts/run-migration.js
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    // DATABASE_URL'i environment'tan al
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL environment variable bulunamadı!');
      process.exit(1);
    }

    // DATABASE_URL formatı: postgresql://user:password@host:port/database
    const urlPattern = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const match = databaseUrl.match(urlPattern);

    if (!match) {
      console.error('❌ DATABASE_URL formatı geçersiz!');
      console.error('Beklenen format: postgresql://user:password@host:port/database');
      process.exit(1);
    }

    const [, user, password, host, port, database] = match;

    // SQL dosyasını oku
    const sqlFile = join(__dirname, '../prisma/migrations/fix_missing_migrations.sql');
    const sqlContent = await readFile(sqlFile, 'utf-8');

    console.log('📋 Migration SQL dosyası okunuyor...');
    console.log(`📊 Veritabanı: ${database}`);
    console.log(`🌐 Host: ${host}:${port}`);
    console.log(`👤 Kullanıcı: ${user}`);
    console.log('');

    // PGPASSWORD environment variable ile psql çalıştır
    // Bu şekilde şifre komut satırında görünmez
    const env = {
      ...process.env,
      PGPASSWORD: password,
    };

    const psqlCommand = `psql -h ${host} -p ${port} -U ${user} -d ${database} -f ${sqlFile}`;
    
    console.log('🚀 Migration çalıştırılıyor...');
    console.log('');

    execSync(psqlCommand, {
      env,
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
    });

    console.log('');
    console.log('✅ Migration başarıyla tamamlandı!');
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration hatası:');
    console.error(error.message);
    process.exit(1);
  }
}

runMigration();

