import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { migrationClient } from './index';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('Starting migrations...');
  
  try {
    const db = drizzle(migrationClient);
    
    console.log('Setting up UUIDv7 functions...');
    
    await migrationClient`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
    
    await migrationClient`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    
    await migrationClient`
      CREATE OR REPLACE FUNCTION uuid_generate_v7()
      RETURNS uuid
      LANGUAGE plpgsql
      AS $$
      DECLARE
        unix_ts_ms bigint;
        uuid_bytes bytea;
      BEGIN
        unix_ts_ms := (extract(epoch from clock_timestamp()) * 1000)::bigint;
        uuid_bytes := overlay(gen_random_bytes(16)
          placing substring(int8send(unix_ts_ms), 3, 6)
          from 1 for 6);
        uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
        uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
        return encode(uuid_bytes, 'hex')::uuid;
      END
      $$;
    `;
    console.log('UUIDv7 function ready.');

    const migrationsFolder = path.join(__dirname, '../../drizzle');
    console.log(`Migrations folder: ${migrationsFolder}`);
    
    await migrate(db, { migrationsFolder });
    
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();