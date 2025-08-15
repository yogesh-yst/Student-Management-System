// test-env.js
// Quick script to test environment variable loading

// Load dotenv in development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

console.log('🔍 Environment Variable Test');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('PORT:', process.env.PORT || 'undefined');
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ Set' : '❌ Missing');
console.log('DB_NAME:', process.env.DB_NAME || 'undefined');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Set (hidden)' : '❌ Missing');
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN || 'undefined');

if (process.env.NODE_ENV !== 'production') {
    console.log('🔧 Development mode - using .env file');
} else {
    console.log('🚀 Production mode - using Cloud Run environment variables');
}
