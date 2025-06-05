/**
 * Environment Variable Setup
 * 
 * This file ensures all required environment variables are properly set
 * before the server starts.
 */

// Check if JWT_SECRET is defined, set a default if not
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET not found in environment variables, setting a default value');
  process.env.JWT_SECRET = 'my_secret_key';
}

// Check if MONGODB_ATLAS_URI is defined
if (!process.env.MONGODB_ATLAS_URI) {
  console.warn('MONGODB_ATLAS_URI not found in environment variables, setting a default value');
  process.env.MONGODB_ATLAS_URI = 'mongodb+srv://admin:admin2002@roomloopcluster.qmfgmaz.mongodb.net/roomloop?retryWrites=true&w=majority';
}

// Check if PORT is defined
if (!process.env.PORT) {
  console.warn('PORT not found in environment variables, setting a default value');
  process.env.PORT = '5501';
}

// Check NODE_ENV
if (!process.env.NODE_ENV) {
  console.warn('NODE_ENV not found in environment variables, setting to development');
  process.env.NODE_ENV = 'development';
}

console.log('Environment variables configured:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '[SET]' : '[MISSING]');
console.log('- MONGODB_ATLAS_URI:', process.env.MONGODB_ATLAS_URI ? '[SET]' : '[MISSING]'); 