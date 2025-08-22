// scripts/run-migration.js
// Script to run the school_id migration

const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Starting migration: Add school_id to users table');
        
        const migrationPath = path.join(__dirname, '../migrations/add_school_id_to_users.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split by semicolons and execute each statement
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
            console.log('Executing:', statement.substring(0, 50) + '...');
            await db.query(statement);
        }
        
        console.log('Migration completed successfully');
        console.log('\nNext steps:');
        console.log('1. Update existing users to have school assignments');
        console.log('2. Run: UPDATE users SET school_id = 1 WHERE school_id IS NULL;');
        console.log('3. Optionally make school_id NOT NULL after assigning schools');
        
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        if (db.pool) {
            await db.pool.end();
        }
        process.exit(0);
    }
}

if (require.main === module) {
    runMigration();
}

module.exports = runMigration;
