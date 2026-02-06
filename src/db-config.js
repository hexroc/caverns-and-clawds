const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

// Database abstraction layer for SQLite (local) and Postgres (production)
class DatabaseAdapter {
  constructor() {
    this.isPostgres = !!process.env.DATABASE_URL;
    
    if (this.isPostgres) {
      console.log('🐘 Using Postgres database');
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    } else {
      // Use Railway volume mount if available, otherwise local db folder
      const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'caverns.db')
        : path.join(__dirname, '../db/caverns.db');
      
      console.log(`📁 Using SQLite database: ${dbPath}`);
      this.sqlite = new Database(dbPath);
    }
  }

  // Execute raw SQL
  exec(sql) {
    if (this.isPostgres) {
      // For Postgres, we'll need to execute each statement separately
      const statements = sql.split(';').filter(s => s.trim());
      return Promise.all(statements.map(stmt => {
        if (stmt.trim()) {
          return this.pool.query(this.convertSQLiteToPostgres(stmt));
        }
      }));
    } else {
      return this.sqlite.exec(sql);
    }
  }

  // Prepare statement (SQLite-style API)
  prepare(sql) {
    if (this.isPostgres) {
      return new PostgresStatement(this.pool, sql);
    } else {
      return this.sqlite.prepare(sql);
    }
  }

  // Convert SQLite SQL to Postgres-compatible SQL
  convertSQLiteToPostgres(sql) {
    return sql
      .replace(/INTEGER PRIMARY KEY/gi, 'SERIAL PRIMARY KEY')
      .replace(/TEXT PRIMARY KEY/gi, 'VARCHAR(255) PRIMARY KEY')
      .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
      .replace(/IF NOT EXISTS/gi, '') // Postgres CREATE TABLE IF NOT EXISTS syntax is different
      .replace(/AUTOINCREMENT/gi, '');
  }
}

// Wrapper for Postgres to match SQLite prepared statement API
class PostgresStatement {
  constructor(pool, sql) {
    this.pool = pool;
    this.sql = this.convertPlaceholders(sql);
  }

  // Convert ? placeholders to $1, $2, etc.
  convertPlaceholders(sql) {
    let counter = 1;
    return sql.replace(/\?/g, () => `$${counter++}`);
  }

  async get(...params) {
    try {
      const result = await this.pool.query(this.sql, params);
      return result.rows[0] || null;
    } catch (err) {
      console.error('Postgres GET error:', err.message);
      throw err;
    }
  }

  async all(...params) {
    try {
      const result = await this.pool.query(this.sql, params);
      return result.rows;
    } catch (err) {
      console.error('Postgres ALL error:', err.message);
      throw err;
    }
  }

  async run(...params) {
    try {
      const result = await this.pool.query(this.sql, params);
      return { changes: result.rowCount, lastInsertRowid: result.insertId };
    } catch (err) {
      console.error('Postgres RUN error:', err.message);
      throw err;
    }
  }
}

module.exports = new DatabaseAdapter();