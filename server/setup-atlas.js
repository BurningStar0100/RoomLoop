/**
 * MongoDB Atlas Setup Script
 * 
 * This script helps configure the MongoDB Atlas connection for RoomLoop.
 * Run this script using: node setup-atlas.js
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🌟 RoomLoop - MongoDB Atlas Setup 🌟');
console.log('-----------------------------------');
console.log('\nThis script will help you configure MongoDB Atlas for your RoomLoop application.');
console.log('\nYou will need the following information from your MongoDB Atlas account:');
console.log('1. Cluster name (e.g., "roomloopcluster")');
console.log('2. Username for database access');
console.log('3. Password for database access');
console.log('4. Database name (recommended: "roomloop")');

const questions = [
  {
    question: '\nEnter your MongoDB Atlas cluster name (e.g., "roomloopcluster", without quotes):',
    key: 'cluster'
  },
  {
    question: 'Enter your MongoDB Atlas username:',
    key: 'username'
  },
  {
    question: 'Enter your MongoDB Atlas password:',
    key: 'password'
  },
  {
    question: 'Enter your database name (recommended: "roomloop"):',
    key: 'database',
    default: 'roomloop'
  },
  {
    question: 'Enter desired JWT secret (or press Enter for a random one):',
    key: 'jwtSecret',
    default: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  },
  {
    question: 'Enter port for the server (recommended: 5501):',
    key: 'port',
    default: '5501'
  }
];

const answers = {};

function askQuestion(index) {
  if (index >= questions.length) {
    generateEnvFile();
    return;
  }

  rl.question(questions[index].question + ' ', (answer) => {
    if (answer.trim() === '' && questions[index].default) {
      answers[questions[index].key] = questions[index].default;
      console.log(`Using default: ${questions[index].default}`);
    } else {
      answers[questions[index].key] = answer.trim();
    }
    askQuestion(index + 1);
  });
}

function generateEnvFile() {
  const connectionString = `mongodb+srv://${answers.username}:${answers.password}@${answers.cluster}.mongodb.net/${answers.database}?retryWrites=true&w=majority`;
  
  const envContent = `MONGODB_ATLAS_URI=${connectionString}
JWT_SECRET=${answers.jwtSecret}
PORT=${answers.port}
NODE_ENV=development`;

  // Check if .env exists and backup if it does
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const backupPath = path.join(__dirname, '.env.backup');
    fs.copyFileSync(envPath, backupPath);
    console.log(`\nExisting .env file backed up to ${backupPath}`);
  }

  // Write new .env file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ MongoDB Atlas configuration complete!');
  console.log(`\nYour .env file has been created at: ${envPath}`);
  console.log('\nYou can now start your server with:');
  console.log('  npm run dev');
  
  console.log('\n🔍 Connection Details:');
  console.log(`  - Cluster: ${answers.cluster}`);
  console.log(`  - Database: ${answers.database}`);
  console.log(`  - User: ${answers.username}`);
  console.log(`  - Server port: ${answers.port}`);
  
  console.log('\n⚠️ Important: Keep your .env file secure and never commit it to version control!');

  rl.close();
}

// Update the atlasConfig.js file
function updateAtlasConfig() {
  const configPath = path.join(__dirname, 'config', 'atlasConfig.js');
  if (fs.existsSync(configPath)) {
    console.log('\nUpdating the atlasConfig.js file...');
    // No need to modify this file as it already uses the MONGODB_ATLAS_URI from .env
  }
}

// Start the setup process
askQuestion(0); 