const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      throw new Error('JWT configuration error');
    }
    
    const token = jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    
    console.log(`Generated token for user ID: ${id} (expires in 30 days)`);
    return token;
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw new Error('Authentication error');
  }
};

module.exports = { generateToken }; 