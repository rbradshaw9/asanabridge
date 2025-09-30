// Quick debug script to test login
const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login with various credentials...');
    
    // Test 1: Invalid credentials (should get 400 with validation error)
    console.log('\n--- Test 1: Invalid email format ---');
    try {
      const response1 = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'invalid-email',
        password: 'test123'
      });
      console.log('Response:', response1.data);
    } catch (error) {
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }
    
    // Test 2: Valid format but nonexistent user
    console.log('\n--- Test 2: Valid format, nonexistent user ---');
    try {
      const response2 = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
      console.log('Response:', response2.data);
    } catch (error) {
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }
    
    // Test 3: Check if we have any users in database
    console.log('\n--- Test 3: Registration test ---');
    try {
      const response3 = await axios.post('http://localhost:3000/api/auth/register', {
        email: 'debug@test.com',
        password: 'testpassword123',
        name: 'Debug User'
      });
      console.log('Registration Response:', response3.data);
      
      // Now try to login with this user
      console.log('\n--- Test 4: Login with registered user ---');
      const response4 = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'debug@test.com',
        password: 'testpassword123'
      });
      console.log('Login Response:', response4.data);
      
    } catch (error) {
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testLogin();