const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

// Ensure environment variables
require('../config/setupEnv');

// Create test user credentials
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123', // Will be hashed before saving
  profile: {
    displayName: 'Test User',
    bio: 'This is a test user account',
  }
};

// Connect to MongoDB
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_ATLAS_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected successfully');
  
  // Define a minimal User model for this script
  const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profile: {
      displayName: { type: String, default: '' },
      bio: { type: String, default: '' },
      avatar: { type: String, default: '' },
    }
  });
  
  // Hash password before saving
  UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  });
  
  // Check if User model already exists
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: testUser.email }, 
        { username: testUser.username }
      ] 
    });
    
    if (existingUser) {
      console.log('Test user already exists:');
      console.log('- Username:', existingUser.username);
      console.log('- Email:', existingUser.email);
      console.log('- ID:', existingUser._id);
    } else {
      // Create user
      const newUser = new User(testUser);
      await newUser.save();
      console.log('Test user created:');
      console.log('- Username:', newUser.username);
      console.log('- Email:', newUser.email);
      console.log('- ID:', newUser._id);
    }
    
    // List all users
    const allUsers = await User.find().select('-password');
    console.log('\nAll Users:');
    allUsers.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - ID: ${user._id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
}); 