const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Checking for existing users...');
    
    // First, list existing users
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });
    
    console.log('Existing users:', existingUsers);
    
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'rbradshaw@gmail.com' }
    });
    
    if (existingAdmin) {
      console.log('Admin user already exists, updating password...');
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash('AiR43Tx2-', 12);
      
      // Update the existing user
      const updatedUser = await prisma.user.update({
        where: { email: 'rbradshaw@gmail.com' },
        data: {
          password: hashedPassword,
          name: 'Ryan Bradshaw',
          plan: 'PRO'
        }
      });
      
      console.log('Admin user password updated successfully:', {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        plan: updatedUser.plan
      });
    } else {
      console.log('Creating new admin user...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('AiR43Tx2-', 12);
      
      // Create the admin user
      const newUser = await prisma.user.create({
        data: {
          email: 'rbradshaw@gmail.com',
          password: hashedPassword,
          name: 'Ryan Bradshaw',
          plan: 'PRO',
          emailVerified: true,
          signupMethod: 'EMAIL'
        }
      });
      
      console.log('Admin user created successfully:', {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: newUser.plan
      });
    }
    
  } catch (error) {
    console.error('Error creating/updating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();