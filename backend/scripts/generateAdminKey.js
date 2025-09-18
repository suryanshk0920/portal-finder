#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Admin API Key Generator and Manager
 * 
 * This script helps generate secure admin API keys for the Portal Finder
 * admin dashboard and manages the .env configuration.
 */

function generateSecureApiKey() {
  // Generate a cryptographically secure random key
  const randomBytes = crypto.randomBytes(32);
  const timestamp = Date.now().toString(36);
  const prefix = 'pf_admin';
  
  return `${prefix}_${timestamp}_${randomBytes.toString('hex')}`;
}

function updateEnvFile(apiKey) {
  const envPath = path.join(__dirname, '../../.env');
  let envContent = '';
  
  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Check if ADMIN_API_KEY already exists
  const lines = envContent.split('\n');
  let keyExists = false;
  
  const updatedLines = lines.map(line => {
    if (line.startsWith('ADMIN_API_KEY=')) {
      keyExists = true;
      return `ADMIN_API_KEY=${apiKey}`;
    }
    return line;
  });
  
  // If key doesn't exist, add it
  if (!keyExists) {
    updatedLines.push('');
    updatedLines.push('# Admin Dashboard Security');
    updatedLines.push(`ADMIN_API_KEY=${apiKey}`);
    updatedLines.push('');
  }
  
  // Write back to .env file
  fs.writeFileSync(envPath, updatedLines.join('\n'));
  
  return envPath;
}

function createSecurityInstructions(apiKey) {
  const instructions = `
# Portal Finder Admin Security Setup

## Generated Admin API Key
Your secure admin API key has been generated and saved to .env file:

${apiKey}

## IMPORTANT SECURITY NOTES:

1. **Keep this key secret** - Never share it or commit it to version control
2. **Use HTTPS in production** - API keys should only be transmitted over encrypted connections
3. **Regenerate periodically** - Consider rotating keys every 90 days
4. **Environment Variables** - The key is stored in your .env file and loaded automatically

## How to Use:

### Option 1: HTTP Header (Recommended)
Include the API key in your requests:
X-Admin-API-Key: ${apiKey}

### Option 2: Authorization Header
Authorization: Bearer ${apiKey}

### Option 3: Query Parameter (Less Secure)
?admin_key=${apiKey}

## Admin Dashboard Access:

1. Start your server: npm start
2. Visit: http://localhost:5000/admin
3. Enter your API key when prompted
4. The dashboard will authenticate and load

## Security Features Enabled:

✓ API Key Authentication
✓ Rate Limiting (10 requests per 15 minutes)
✓ Security Headers (XSS, Clickjacking protection)
✓ Access Logging
✓ Constant-time key comparison
✓ Failed attempt monitoring

## Regenerating the Key:

To generate a new key, run this script again:
node backend/scripts/generateAdminKey.js

## Production Deployment:

1. Set ADMIN_API_KEY environment variable on your server
2. Remove the default key from code
3. Use HTTPS
4. Consider additional authentication layers
5. Monitor access logs regularly

Keep this information secure!
`;

  const securityPath = path.join(__dirname, '../../ADMIN_SECURITY.md');
  fs.writeFileSync(securityPath, instructions);
  
  return securityPath;
}

function main() {
  console.log('🔐 Portal Finder Admin Key Generator\n');
  
  try {
    // Generate secure API key
    console.log('⚡ Generating cryptographically secure admin API key...');
    const apiKey = generateSecureApiKey();
    
    // Update .env file
    console.log('📄 Updating .env file...');
    const envPath = updateEnvFile(apiKey);
    
    // Create security documentation
    console.log('📋 Creating security documentation...');
    const securityPath = createSecurityInstructions(apiKey);
    
    console.log('\n✅ Admin API Key Generated Successfully!\n');
    console.log(`🔑 API Key: ${apiKey}`);
    console.log(`💾 Saved to: ${envPath}`);
    console.log(`📖 Instructions: ${securityPath}`);
    
    console.log('\n🚨 SECURITY REMINDERS:');
    console.log('   • Keep this key secret and secure');
    console.log('   • Never commit the .env file to version control');
    console.log('   • Use HTTPS in production environments');
    console.log('   • Monitor admin access logs regularly');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Restart your server to load the new key');
    console.log('   2. Visit http://localhost:5000/admin');
    console.log('   3. Enter the API key when prompted');
    console.log('   4. Read ADMIN_SECURITY.md for complete setup guide');
    
  } catch (error) {
    console.error('❌ Error generating admin key:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateSecureApiKey,
  updateEnvFile,
  createSecurityInstructions
};