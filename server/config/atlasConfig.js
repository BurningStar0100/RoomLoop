/**
 * MongoDB Atlas Configuration
 * 
 * This file provides the configuration for connecting to MongoDB Atlas.
 * It's designed to be used as an alternative to the default db.js file.
 */

const mongoose = require('mongoose');

const connectToAtlas = async () => {
  try {
    // MongoDB Atlas connection string
    // Format: mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<database-name>?retryWrites=true&w=majority
    let MONGODB_ATLAS_URI = process.env.MONGODB_ATLAS_URI;
    
    // Ensure the URI is complete
    if (!MONGODB_ATLAS_URI) {
      console.error('Missing MongoDB Atlas URI in environment variables');
      process.exit(1);
    }
    
    // Ensure the database name is in the URI
    if (!MONGODB_ATLAS_URI.includes('/roomloop?') && !MONGODB_ATLAS_URI.includes('/roomloop&')) {
      // Add database name if it's missing
      MONGODB_ATLAS_URI = MONGODB_ATLAS_URI.replace('/?', '/roomloop?');
    }
    
    // Print the MongoDB connection URI (hide password)
    const sanitizedUri = MONGODB_ATLAS_URI.replace(
      /mongodb(\+srv)?:\/\/[^:]+:([^@]+)@/,
      'mongodb$1://<username>:<hidden>@'
    );
    console.log(`Connecting to MongoDB: ${sanitizedUri}`);
    
    // Connect to MongoDB Atlas
    const conn = await mongoose.connect(MONGODB_ATLAS_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
    
    // List all collections to verify connection
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name).join(', '));
    
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB Atlas: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectToAtlas; 