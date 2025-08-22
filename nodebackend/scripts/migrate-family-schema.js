const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://yogeshramakrishnan:pnSCE8RtcPqPetdV@cluster0.qar08.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = process.env.DB_NAME || "sms_db_dev";

async function migrateDatabase() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        
        console.log('🚀 Starting family schema migration...');
        
        // Step 1: Create new collections and indexes
        await createCollectionsAndIndexes(db);
        
        // Step 2: Update existing member collection with new fields
        await updateMemberCollection(db);
        
        // Step 3: Migrate existing parent_name data to new family structure
        await migrateExistingData(db);
        
        console.log('✅ Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await client.close();
    }
}

async function createCollectionsAndIndexes(db) {
    console.log('📁 Creating collections and indexes...');
    
    // Create families collection indexes
    try {
        await db.collection('families').createIndex({ "family_id": 1 }, { unique: true });
        await db.collection('families').createIndex({ "family_name": 1 });
        await db.collection('families').createIndex({ "primary_contact.email": 1 });
        await db.collection('families').createIndex({ "status": 1 });
        console.log('   ✓ Families collection indexes created');
    } catch (error) {
        console.log('   ⚠️ Families indexes may already exist');
    }
    
    // Create family_members collection indexes
    try {
        await db.collection('family_members').createIndex({ "family_id": 1, "member_id": 1 }, { unique: true });
        await db.collection('family_members').createIndex({ "family_id": 1 });
        await db.collection('family_members').createIndex({ "member_id": 1 });
        await db.collection('family_members').createIndex({ "relationship_type": 1 });
        await db.collection('family_members').createIndex({ "is_primary_contact": 1 });
        console.log('   ✓ Family members collection indexes created');
    } catch (error) {
        console.log('   ⚠️ Family members indexes may already exist');
    }
    
    // Create parents collection indexes
    try {
        await db.collection('parents').createIndex({ "parent_id": 1 }, { unique: true });
        await db.collection('parents').createIndex({ "email": 1 }, { unique: true });
        await db.collection('parents').createIndex({ "full_name": 1 });
        await db.collection('parents').createIndex({ "status": 1 });
        console.log('   ✓ Parents collection indexes created');
    } catch (error) {
        console.log('   ⚠️ Parents indexes may already exist');
    }
}

async function updateMemberCollection(db) {
    console.log('👥 Updating member collection with new fields...');
    
    const memberCollection = db.collection('member');
    
    // Add new fields to existing members
    const updateResult = await memberCollection.updateMany(
        {},
        {
            $set: {
                member_type: "student",
                family_role: "child",
                id_card_sub_text: "",
                student_info: {
                    allergies: [],
                    medical_conditions: [],
                    dietary_restrictions: [],
                    pickup_authorization: [],
                    photo_permission: true
                }
            }
        }
    );
    
    // Create new indexes for member collection
    try {
        await memberCollection.createIndex({ "family_id": 1 });
        await memberCollection.createIndex({ "member_type": 1 });
        await memberCollection.createIndex({ "family_role": 1 });
        await memberCollection.createIndex({ "id_card_sub_text": "text" });
        console.log(`   ✓ Updated ${updateResult.modifiedCount} member records`);
    } catch (error) {
        console.log('   ⚠️ Member collection indexes may already exist');
    }
}

async function migrateExistingData(db) {
    console.log('🔄 Migrating existing parent data to family structure...');
    
    const memberCollection = db.collection('member');
    const familyCollection = db.collection('families');
    const familyMembersCollection = db.collection('family_members');
    const parentCollection = db.collection('parents');
    
    // Get all members with parent_name data
    const membersWithParents = await memberCollection.find({
        parent_name: { $exists: true, $ne: "" }
    }).toArray();
    
    console.log(`   📊 Found ${membersWithParents.length} members with parent data`);
    
    const familyMap = new Map(); // To track created families
    const parentMap = new Map(); // To track created parents
    
    for (let i = 0; i < membersWithParents.length; i++) {
        const member = membersWithParents[i];
        const familyKey = member.parent_name.trim().toLowerCase();
        
        console.log(`   Processing ${i + 1}/${membersWithParents.length}: ${member.name}`);
        
        let family = familyMap.get(familyKey);
        
        // Create family if it doesn't exist
        if (!family) {
            const familyId = await generateFamilyId(familyCollection);
            
            family = {
                family_id: familyId,
                family_name: member.parent_name.trim() + " Family",
                primary_contact: {
                    phone: member.contact || "",
                    email: member.email || ""
                },
                status: "Active",
                created_at: new Date(),
                updated_at: new Date(),
                created_by: "migration_script"
            };
            
            await familyCollection.insertOne(family);
            familyMap.set(familyKey, family);
            
            console.log(`     ✓ Created family: ${family.family_name}`);
        }
        
        // Update member with family_id
        await memberCollection.updateOne(
            { student_id: member.student_id },
            {
                $set: {
                    family_id: family.family_id,
                    member_type: "student",
                    family_role: "child"
                }
            }
        );
        
        // Create family_member relationship for student
        await familyMembersCollection.insertOne({
            family_id: family.family_id,
            member_id: member.student_id,
            relationship_type: "child",
            relationship_to_primary: "child",
            is_primary_contact: false,
            is_emergency_contact: false,
            is_pickup_authorized: true,
            contact_preferences: {
                receive_notifications: true,
                preferred_method: "email",
                language: "English"
            },
            created_at: new Date(),
            updated_at: new Date()
        });
        
        // Create parent record if not exists
        const parentKey = `${familyKey}_${member.email || 'no_email'}`;
        let parent = parentMap.get(parentKey);
        
        if (!parent && member.parent_name) {
            const parentId = await generateParentId(parentCollection);
            const nameParts = member.parent_name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            parent = {
                parent_id: parentId,
                first_name: firstName,
                last_name: lastName,
                full_name: member.parent_name.trim(),
                email: member.email || "",
                phone: member.contact || "",
                status: "Active",
                created_at: new Date(),
                updated_at: new Date()
            };
            
            await parentCollection.insertOne(parent);
            parentMap.set(parentKey, parent);
            
            // Link parent to family
            await familyMembersCollection.insertOne({
                family_id: family.family_id,
                member_id: parentId,
                relationship_type: "parent",
                relationship_to_primary: "parent",
                is_primary_contact: true,
                is_emergency_contact: true,
                is_pickup_authorized: true,
                contact_preferences: {
                    receive_notifications: true,
                    preferred_method: "email",
                    language: "English"
                },
                created_at: new Date(),
                updated_at: new Date()
            });
            
            console.log(`     ✓ Created parent: ${parent.full_name}`);
        }
    }
    
    console.log(`   ✅ Migration completed:`);
    console.log(`      - Created ${familyMap.size} families`);
    console.log(`      - Created ${parentMap.size} parent records`);
    console.log(`      - Updated ${membersWithParents.length} student records`);
}

async function generateFamilyId(familyCollection) {
    const latestFamily = await familyCollection
        .findOne({}, { sort: { family_id: -1 } });
    
    let sequence = 1;
    if (latestFamily && latestFamily.family_id) {
        const match = latestFamily.family_id.match(/FAM(\d+)/);
        if (match) {
            sequence = parseInt(match[1]) + 1;
        }
    }
    
    return `FAM${sequence.toString().padStart(5, '0')}`;
}

async function generateParentId(parentCollection) {
    const latestParent = await parentCollection
        .findOne({}, { sort: { parent_id: -1 } });
    
    let sequence = 1;
    if (latestParent && latestParent.parent_id) {
        const match = latestParent.parent_id.match(/PAR(\d+)/);
        if (match) {
            sequence = parseInt(match[1]) + 1;
        }
    }
    
    return `PAR${sequence.toString().padStart(5, '0')}`;
}

// Run migration if called directly
if (require.main === module) {
    migrateDatabase()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateDatabase };