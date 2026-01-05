const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nexus_realtime_db', // Connect to DB directly
  multipleStatements: true, // Allow multiple statements in one query
});

// Since we might need to create the DB first if it doesn't exist, we might need a separate connection without DB selected,
// OR we assume DB exists or rely on the connection string to create it (unlikely for mysql2).
// However, the initial schema usually creates the DB. Let's adjust to connect without DB first to ensure we can create it.

async function migrate() {
  let connection;
  try {
    // 1. Connect without database selected to ensure we can create it if needed
    connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true,
    });

    console.log('Connected to MySQL server.');

    const dbName = process.env.DB_NAME || 'nexus_realtime_db';
    
    if (process.argv.includes('fresh')) {
        console.log(`🗑️  Fresh migration requested. Dropping database ${dbName}...`);
        await connection.query(`DROP DATABASE IF EXISTS ${dbName}`);
    }

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await connection.query(`USE ${dbName}`);
    console.log(`Using database: ${dbName}`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    const [rows] = await connection.query('SELECT migration_name FROM migrations');
    const executedMigrations = new Set(rows.map(row => row.migration_name));

    for (const file of files) {
      if (!executedMigrations.has(file)) {
        console.log(`Running migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
            await connection.query(sql);
            await connection.query('INSERT INTO migrations (migration_name) VALUES (?)', [file]);
            console.log(`✅ Success: ${file}`);
        } catch (err) {
            console.error(`❌ Failed: ${file}`, err);
            process.exit(1);
        }
      } else {
        console.log(`Skipping already executed: ${file}`);
      }
    }

    console.log('🎉 All migrations execution process finished.');

  } catch (err) {
    console.error('Migration initialization failed:', err);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
    if (pool) await pool.end();
  }
}

migrate();
