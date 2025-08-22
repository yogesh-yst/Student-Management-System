const db = require('./db').default;

async function setupDatabase() {
    try {
        console.log('Setting up PostgreSQL database...');
        
        // Create tables
        await createTables();
        
        // Create indexes
        await createIndexes();
        
        // Create default admin user
        await createDefaultAdmin();
        
        // Create default school
        await createDefaultSchool();
        
        console.log('Database setup completed successfully!');
        
    } catch (error) {
        console.error('Database setup failed:', error);
        throw error;
    }
}

async function createTables() {
    const tables = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'teacher', 'volunteer', 'parent')),
            school_id INTEGER REFERENCES schools(id),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Schools table
        `CREATE TABLE IF NOT EXISTS schools (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            address TEXT,
            city VARCHAR(50),
            state VARCHAR(50),
            country VARCHAR(50),
            contact_phone VARCHAR(20),
            contact_email VARCHAR(100),
            timezone VARCHAR(50) DEFAULT 'America/New_York',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Members table
        `CREATE TABLE IF NOT EXISTS members (
            id SERIAL PRIMARY KEY,
            student_id VARCHAR(20) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            grade VARCHAR(20) NOT NULL,
            status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Alumni', 'Transferred')),
            school_id INTEGER REFERENCES schools(id),
            parent_name VARCHAR(100),
            contact VARCHAR(20),
            email VARCHAR(100),
            emergency_contact VARCHAR(20),
            allergies TEXT,
            photo_url VARCHAR(255),
            date_of_birth DATE,
            address TEXT,
            preferred_class_timing VARCHAR(50),
            academic_year VARCHAR(10),
            enrollment_date DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Classes table
        `CREATE TABLE IF NOT EXISTS classes (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            grade_level VARCHAR(20) NOT NULL,
            school_id INTEGER REFERENCES schools(id),
            teacher_id INTEGER REFERENCES users(id),
            class_time TIME,
            class_day VARCHAR(10),
            max_capacity INTEGER DEFAULT 25,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Attendance table
        `CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            student_id VARCHAR(20) NOT NULL REFERENCES members(student_id),
            school_id INTEGER REFERENCES schools(id),
            class_id INTEGER REFERENCES classes(id),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            check_in_method VARCHAR(20) DEFAULT 'manual' CHECK (check_in_method IN ('qr', 'manual', 'app')),
            marked_by INTEGER REFERENCES users(id),
            notes TEXT,
            UNIQUE(student_id, DATE(timestamp))
        )`,
        
        // Sessions table
        `CREATE TABLE IF NOT EXISTS sessions (
            sid VARCHAR(255) PRIMARY KEY,
            sess JSON NOT NULL,
            expire TIMESTAMP NOT NULL
        )`,
        
        // Reports table
        `CREATE TABLE IF NOT EXISTS reports (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            type VARCHAR(50) NOT NULL,
            parameters JSON,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // ID Cards table
        `CREATE TABLE IF NOT EXISTS id_cards (
            id SERIAL PRIMARY KEY,
            student_id VARCHAR(20) REFERENCES members(student_id),
            card_number VARCHAR(50) UNIQUE,
            qr_code VARCHAR(255),
            issue_date DATE DEFAULT CURRENT_DATE,
            expiry_date DATE,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];
    
    for (const tableSQL of tables) {
        await db.query(tableSQL);
    }
    
    console.log('Tables created successfully');
}

async function createIndexes() {
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_members_student_id ON members(student_id)',
        'CREATE INDEX IF NOT EXISTS idx_members_status ON members(status)',
        'CREATE INDEX IF NOT EXISTS idx_members_grade ON members(grade)',
        'CREATE INDEX IF NOT EXISTS idx_members_school_id ON members(school_id)',
        'CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)',
        'CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp)',
        'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(DATE(timestamp))',
        'CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON attendance(school_id)',
        'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id)',
        'CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire)'
    ];
    
    for (const indexSQL of indexes) {
        await db.query(indexSQL);
    }
    
    console.log('Indexes created successfully');
}

async function createDefaultAdmin() {
    const bcrypt = require('bcryptjs');
    
    const adminExists = await db.query(
        'SELECT id FROM users WHERE username = $1',
        ['admin']
    );
    
    if (adminExists.rows.length === 0) {
        const passwordHash = await bcrypt.hash('admin123', 12);
        
        await db.query(`
            INSERT INTO users (username, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
        `, ['admin', 'admin@balavihar.org', passwordHash, 'admin']);
        
        console.log('Default admin user created (admin/admin123)');
    }
}

async function createDefaultSchool() {
    const schoolExists = await db.query('SELECT id FROM schools LIMIT 1');
    
    if (schoolExists.rows.length === 0) {
        await db.query(`
            INSERT INTO schools (name, city, state, country)
            VALUES ($1, $2, $3, $4)
        `, ['Main Bala Vihar Center', 'Columbus', 'Ohio', 'USA']);
        
        console.log('Default school created');
    }
}
// Run setup if called directly
if (require.main === module) {
    setupDatabase()
        .then(() => {
            console.log('Setup completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupDatabase };