#!/usr/bin/env node

/**
 * User Migration Script
 * 
 * This script finds all existing users with bcrypt-hashed passwords
 * and creates a report. Since we can't reverse bcrypt hashes, 
 * this will show you what users need to be recreated.
 * 
 * Usage: node migrate_users.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

// AuthService crypto hashing (matching the new method)
function hashPasswordCrypto(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function analyzeUsers() {
  try {
    console.log('🔍 Analyzing existing users...\n');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isAdmin: true,
        plan: true,
        createdAt: true
      }
    });

    if (users.length === 0) {
      console.log('✅ No users found. Database is clean!');
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);

    const bcryptUsers = [];
    const cryptoUsers = [];

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Admin: ${user.isAdmin ? 'Yes' : 'No'}`);
      console.log(`   Plan: ${user.plan}`);
      console.log(`   Created: ${user.createdAt.toISOString().split('T')[0]}`);
      
      // Check password format to determine hashing method
      if (user.password) {
        if (user.password.includes(':')) {
          // Likely crypto format (salt:hash)
          console.log(`   Password: ✅ Already using new crypto format`);
          cryptoUsers.push(user);
        } else if (user.password.startsWith('$2') && user.password.length === 60) {
          // Likely bcrypt format
          console.log(`   Password: ⚠️  Using old bcrypt format - needs migration`);
          bcryptUsers.push(user);
        } else {
          console.log(`   Password: ❓ Unknown format`);
        }
      } else {
        console.log(`   Password: ❌ No password set`);
      }
      console.log('');
    });

    if (bcryptUsers.length > 0) {
      console.log('📋 MIGRATION NEEDED:');
      console.log(`${bcryptUsers.length} user(s) need password migration:\n`);
      
      bcryptUsers.forEach(user => {
        console.log(`- ${user.email} (${user.name || 'No name'})`);
      });
      
      console.log('\n💡 NEXT STEPS:');
      console.log('Since bcrypt hashes cannot be reversed, these users will need to:');
      console.log('1. Use password reset functionality, OR');
      console.log('2. Re-register with the same email');
      console.log('\n🔧 ADMIN OPTIONS:');
      console.log('1. Delete old users: node migrate_users.js --delete-bcrypt');
      console.log('2. Reset specific user: node migrate_users.js --reset-user email@example.com');
      
    } else {
      console.log('✅ All users are already using the new crypto password format!');
    }

    if (cryptoUsers.length > 0) {
      console.log(`\n✅ ${cryptoUsers.length} user(s) already using new format - no action needed.`);
    }

  } catch (error) {
    console.error('❌ Error analyzing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function deleteBcryptUsers() {
  try {
    console.log('🗑️  Finding and deleting users with bcrypt passwords...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        password: true,
      }
    });

    const bcryptUsers = users.filter(user => 
      user.password && user.password.startsWith('$2') && user.password.length === 60
    );

    if (bcryptUsers.length === 0) {
      console.log('✅ No bcrypt users found to delete.');
      return;
    }

    console.log(`Found ${bcryptUsers.length} user(s) with bcrypt passwords:`);
    bcryptUsers.forEach(user => console.log(`- ${user.email}`));
    
    console.log('\n⚠️  WARNING: This will permanently delete these users!');
    console.log('Type "DELETE" to confirm:');
    
    // Simple confirmation (in production, you might want a better prompt)
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('Confirmation: ', async (answer) => {
      if (answer === 'DELETE') {
        const userIds = bcryptUsers.map(u => u.id);
        
        // Delete users
        const result = await prisma.user.deleteMany({
          where: {
            id: {
              in: userIds
            }
          }
        });
        
        console.log(`✅ Deleted ${result.count} user(s) with bcrypt passwords.`);
        console.log('These users can now re-register with the new password system.');
      } else {
        console.log('❌ Deletion cancelled.');
      }
      
      readline.close();
      await prisma.$disconnect();
    });

  } catch (error) {
    console.error('❌ Error deleting bcrypt users:', error);
    await prisma.$disconnect();
  }
}

async function resetUserPassword(email, newPassword = null) {
  try {
    if (!newPassword) {
      newPassword = 'TempPassword123!'; // Default temp password
    }
    
    console.log(`🔄 Resetting password for ${email}...`);
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log(`❌ User ${email} not found.`);
      return;
    }
    
    const newHashedPassword = hashPasswordCrypto(newPassword);
    
    await prisma.user.update({
      where: { email },
      data: {
        password: newHashedPassword
      }
    });
    
    console.log(`✅ Password reset for ${email}`);
    console.log(`🔑 Temporary password: ${newPassword}`);
    console.log('⚠️  User should change this password after logging in.');
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--delete-bcrypt')) {
  deleteBcryptUsers();
} else if (args.includes('--reset-user') && args[1]) {
  const email = args[1];
  const password = args[2]; // Optional custom password
  resetUserPassword(email, password);
} else {
  analyzeUsers();
}