CREATE TABLE IF NOT EXISTS families (
            id SERIAL PRIMARY KEY,
            family_id VARCHAR(20) UNIQUE NOT NULL,
            family_name VARCHAR(100) NOT NULL,
            primary_contact_phone VARCHAR(20),
            primary_contact_email VARCHAR(100),
            primary_address TEXT,
            city VARCHAR(50),
            state VARCHAR(50),
            zip_code VARCHAR(10),
            country VARCHAR(50) DEFAULT 'USA',
            emergency_contact_name VARCHAR(100),
            emergency_contact_phone VARCHAR(20),
            emergency_contact_email VARCHAR(100),
            notes TEXT,
            language_preference VARCHAR(20) DEFAULT 'English',
            communication_preference VARCHAR(20) DEFAULT 'email' CHECK (communication_preference IN ('email', 'phone', 'text')),
            pickup_authorization TEXT, -- JSON array of authorized pickup persons
            family_preferences JSONB, -- Flexible JSON for additional preferences
            status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
            school_id INTEGER REFERENCES schools(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER REFERENCES users(id));


CREATE TABLE IF NOT EXISTS parents (
            id SERIAL PRIMARY KEY,
            parent_id VARCHAR(20) UNIQUE NOT NULL,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            full_name VARCHAR(100) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
            title VARCHAR(10), -- Mr., Mrs., Ms., Dr., etc.
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(20),
            alternate_phone VARCHAR(20),
            work_phone VARCHAR(20),
            occupation VARCHAR(100),
            employer VARCHAR(100),
            work_address TEXT,
            preferred_communication VARCHAR(20) DEFAULT 'email' CHECK (preferred_communication IN ('email', 'phone', 'text')),
            available_for_volunteering BOOLEAN DEFAULT false,
            volunteer_interests TEXT[], -- Array of volunteer interests
            skills TEXT[], -- Array of skills
            alumni_student BOOLEAN DEFAULT false,
            years_associated INTEGER DEFAULT 0,
            previous_volunteer_roles TEXT[], -- Array of previous roles
            member_id INTEGER REFERENCES users(id), -- Link if parent is also a system user (teacher/volunteer)
            status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
            school_id INTEGER REFERENCES schools(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
CREATE TABLE IF NOT EXISTS family_members (
            id SERIAL PRIMARY KEY,
            family_id VARCHAR(20) NOT NULL REFERENCES families(family_id),
            member_id VARCHAR(20) NOT NULL, -- Either student_id or parent_id
            member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('student', 'parent', 'guardian')),
            relationship_type VARCHAR(30) NOT NULL, -- parent, child, guardian, sibling, grandparent, other
            relationship_to_primary VARCHAR(30), -- father, mother, son, daughter, etc.
            is_primary_contact BOOLEAN DEFAULT false,
            is_emergency_contact BOOLEAN DEFAULT false,
            is_pickup_authorized BOOLEAN DEFAULT true,
            custody_info JSONB, -- Custody details: {has_custody: true, custody_type: 'joint', notes: ''}
            contact_preferences JSONB DEFAULT '{"receive_notifications": true, "preferred_method": "email", "language": "English"}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(family_id, member_id)
        );

        ALTER TABLE members ADD COLUMN IF NOT EXISTS family_id VARCHAR(20) REFERENCES families(family_id);
        ALTER TABLE members ADD COLUMN IF NOT EXISTS member_type VARCHAR(20) DEFAULT 'student' CHECK (member_type IN ('student', 'teacher', 'volunteer', 'admin'));
        ALTER TABLE members ADD COLUMN IF NOT EXISTS family_role VARCHAR(20) DEFAULT 'child' CHECK (family_role IN ('child', 'parent', 'guardian', 'sibling', 'other'));
        ALTER TABLE members ADD COLUMN IF NOT EXISTS id_card_sub_text VARCHAR(100);
        ALTER TABLE members ADD COLUMN IF NOT EXISTS student_info JSONB DEFAULT '{}'; -- Medical info, allergies, dietary restrictions, etc.
        ALTER TABLE members ADD COLUMN IF NOT EXISTS pickup_authorization TEXT[]; -- Array of authorized pickup persons
        ALTER TABLE members ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[];
        ALTER TABLE members ADD COLUMN IF NOT EXISTS medical_conditions TEXT[];
        ALTER TABLE members ADD COLUMN IF NOT EXISTS medications TEXT[];
        ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_permission BOOLEAN DEFAULT true;

		
CREATE INDEX IF NOT EXISTS idx_families_family_id ON families(family_id);
CREATE INDEX IF NOT EXISTS idx_families_family_name ON families(family_name);
CREATE INDEX IF NOT EXISTS idx_families_email ON families(primary_contact_email);
CREATE INDEX IF NOT EXISTS idx_families_status ON families(status);
CREATE INDEX IF NOT EXISTS idx_families_school_id ON families(school_id);
-- Parents table indexes
CREATE INDEX IF NOT EXISTS idx_parents_parent_id ON parents(parent_id);
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_parents_full_name ON parents(full_name);
CREATE INDEX IF NOT EXISTS idx_parents_status ON parents(status);
CREATE INDEX IF NOT EXISTS idx_parents_school_id ON parents(school_id);
-- Family members table indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_member_id ON family_members(member_id);
CREATE INDEX IF NOT EXISTS idx_family_members_member_type ON family_members(member_type);
CREATE INDEX IF NOT EXISTS idx_family_members_relationship ON family_members(relationship_type);
CREATE INDEX IF NOT EXISTS idx_family_members_primary_contact ON family_members(is_primary_contact);
-- Enhanced members table indexes
CREATE INDEX IF NOT EXISTS idx_members_family_id ON members(family_id);
CREATE INDEX IF NOT EXISTS idx_members_member_type ON members(member_type);
CREATE INDEX IF NOT EXISTS idx_members_family_role ON members(family_role);
--CREATE INDEX IF NOT EXISTS idx_members_id_card_sub_text ON members USING gin(to_tsvector( \'english\' , id_card_sub_text));

-- Function to generate family IDs
CREATE OR REPLACE FUNCTION generate_family_id()
RETURNS TRIGGER AS $$
DECLARE
    next_id INTEGER;
    new_family_id VARCHAR(20);
BEGIN
    -- Get the next sequence number
    SELECT COALESCE(MAX(CAST(SUBSTRING(family_id FROM 4) AS INTEGER)), 0) + 1
    INTO next_id
    FROM families 
    WHERE family_id ~ '^FAM[0-9]+$';
    
    -- Generate the family ID with zero-padding
    new_family_id := 'FAM' || LPAD(next_id::TEXT, 5, '0');
    NEW.family_id := new_family_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Function to generate parent IDs
CREATE OR REPLACE FUNCTION generate_parent_id()
RETURNS TRIGGER AS $$
DECLARE
    next_id INTEGER;
    new_parent_id VARCHAR(20);
BEGIN
    -- Get the next sequence number
    SELECT COALESCE(MAX(CAST(SUBSTRING(parent_id FROM 4) AS INTEGER)), 0) + 1
    INTO next_id
    FROM parents 
    WHERE parent_id ~ '^PAR[0-9]+$';
    
    -- Generate the parent ID with zero-padding
    new_parent_id := 'PAR' || LPAD(next_id::TEXT, 5, '0');
    NEW.parent_id := new_parent_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_generate_family_id
    BEFORE INSERT ON families
    FOR EACH ROW
    WHEN (NEW.family_id IS NULL OR NEW.family_id = '')
    EXECUTE FUNCTION generate_family_id();

CREATE TRIGGER trigger_generate_parent_id
    BEFORE INSERT ON parents
    FOR EACH ROW
    WHEN (NEW.parent_id IS NULL OR NEW.parent_id = '')
    EXECUTE FUNCTION generate_parent_id();

-- Create updated_at triggers for all family tables
CREATE TRIGGER trigger_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_parents_updated_at
    BEFORE UPDATE ON parents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_family_members_updated_at
    BEFORE UPDATE ON family_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();