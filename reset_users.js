const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// AuthService implementation for password hashing
class AuthService {
  static async hashPassword(password) {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(32).toString('hex');
      crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(salt + ':' + derivedKey.toString('hex'));
      });
    });
  }

  static async verifyPassword(password, hash) {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');
      crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(key === derivedKey.toString('hex'));
      });
    });
  }
}

async function resetUsers() {
  try {
    console.log('🗑️  Starting user reset process...');
    
    // Get current user count
    const currentUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true }
    });
    
    console.log(`📊 Found ${currentUsers.length} existing users:`);
    currentUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.name || 'No name'}) - ID: ${user.id}`);
    });
    
    // Delete all existing users
    console.log('\n🗑️  Deleting all existing users...');
    const deleteResult = await prisma.user.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} users`);
    
    // Create new user: Ryan Bradshaw
    console.log('\n👤 Creating new user: Ryan Bradshaw...');
    
    const hashedPassword = await AuthService.hashPassword('Jenny595-');
    
    const newUser = await prisma.user.create({
      data: {
        email: 'ryan@ignitiongo.com',
        password: hashedPassword,
        name: 'Ryan Bradshaw',
        isAdmin: true, // Making Ryan an admin
        plan: 'PRO' // Setting to PRO plan
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        plan: true,
        createdAt: true,
        password: true
      }
    });
    
    console.log('✅ Successfully created new user:');
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Name: ${newUser.name}`);
    console.log(`   Admin: ${newUser.isAdmin}`);
    console.log(`   Plan: ${newUser.plan}`);
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Created: ${newUser.createdAt}`);
    
    // Test password verification
    console.log('\n🔐 Testing password verification...');
    const isValidPassword = await AuthService.verifyPassword('Jenny595-', newUser.password);
    console.log(`Password verification: ${isValidPassword ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    console.log('\n🎉 User reset completed successfully!');
    console.log('\nLogin credentials:');
    console.log('Email: ryan@ignitiongo.com');
    console.log('Password: Jenny595-');
    
  } catch (error) {
    console.error('❌ Error during user reset:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetUsers();