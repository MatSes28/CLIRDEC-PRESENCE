#!/usr/bin/env node

/**
 * CLIRDEC: PRESENCE - Complete System Functionality Test
 * Tests all API endpoints, pages, and features for 100% functionality
 */

import http from 'http';
import https from 'https';

const BASE_URL = 'http://localhost:5000';
let sessionCookie = '';

// Test Results Tracker
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        // Capture session cookie from login
        if (res.headers['set-cookie']) {
          sessionCookie = res.headers['set-cookie'][0];
        }
        
        try {
          const response = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: response, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test runner function
async function runTest(name, testFn) {
  try {
    console.log(`🧪 Testing: ${name}`);
    await testFn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ FAIL: ${name} - ${error.message}`);
  }
}

// Authentication Tests
async function testAuthentication() {
  await runTest('Admin Login', async () => {
    const response = await makeRequest('POST', '/api/login', {
      email: 'admin@clsu.edu.ph',
      password: 'admin123'
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.id) throw new Error('Login did not return user data');
  });

  await runTest('Faculty Login', async () => {
    const response = await makeRequest('POST', '/api/login', {
      email: 'faculty@clsu.edu.ph', 
      password: 'faculty123'
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  });

  await runTest('Invalid Login Rejection', async () => {
    const response = await makeRequest('POST', '/api/login', {
      email: 'invalid@test.com',
      password: 'wrongpass'
    });
    if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
  });
}

// Dashboard and Statistics Tests
async function testDashboardAPIs() {
  await runTest('Dashboard Statistics', async () => {
    const response = await makeRequest('GET', '/api/dashboard/stats');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (typeof response.data.totalStudents !== 'number') throw new Error('Missing totalStudents');
  });

  await runTest('User Profile', async () => {
    const response = await makeRequest('GET', '/api/user');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.email) throw new Error('Missing user email');
  });
}

// Student Management Tests
async function testStudentManagement() {
  await runTest('Get Students List', async () => {
    const response = await makeRequest('GET', '/api/students');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!Array.isArray(response.data)) throw new Error('Students should be an array');
  });

  await runTest('Create Student', async () => {
    const testStudent = {
      studentId: 'TEST-2025-001',
      firstName: 'Test',
      lastName: 'Student',
      email: 'test.student@clsu.edu.ph',
      year: 3,
      section: 'A',
      rfidCardId: 'TEST123456',
      parentEmail: 'parent.test@email.com',
      parentName: 'Test Parent'
    };
    
    const response = await makeRequest('POST', '/api/students', testStudent);
    if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`);
    if (!response.data.id) throw new Error('Created student should have ID');
  });
}

// Classroom Management Tests
async function testClassroomManagement() {
  await runTest('Get Classrooms', async () => {
    const response = await makeRequest('GET', '/api/classrooms');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!Array.isArray(response.data)) throw new Error('Classrooms should be an array');
  });

  await runTest('Create Classroom', async () => {
    const testClassroom = {
      name: 'Test Lab 101',
      location: 'Test Building',
      capacity: 30,
      type: 'laboratory'
    };
    
    const response = await makeRequest('POST', '/api/classrooms', testClassroom);
    if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`);
  });
}

// RFID and Attendance Tests
async function testRFIDSimulation() {
  await runTest('RFID Tap Simulation', async () => {
    const response = await makeRequest('POST', '/api/rfid/tap', {
      rfidCard: 'TEST123456',
      proximityValidated: true
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  });
}

// IoT Device Management Tests
async function testIoTDeviceManagement() {
  await runTest('Get IoT Devices', async () => {
    const response = await makeRequest('GET', '/api/iot/devices');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.devices) throw new Error('Missing devices array');
  });

  await runTest('IoT Setup Guide', async () => {
    const response = await makeRequest('GET', '/api/iot/setup-guide');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.hardwareRequirements) throw new Error('Missing hardware requirements');
  });
}

// System Health and Performance Tests
async function testSystemHealth() {
  await runTest('Memory Status', async () => {
    const response = await makeRequest('GET', '/api/system/memory-status');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.status) throw new Error('Missing memory status');
  });

  await runTest('Performance Metrics', async () => {
    const response = await makeRequest('GET', '/api/performance/metrics');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (typeof response.data.uptime !== 'number') throw new Error('Missing uptime metric');
  });
}

// Email Notification Tests
async function testEmailNotifications() {
  await runTest('Send Notification', async () => {
    const response = await makeRequest('POST', '/api/notifications/send', {
      studentId: 1,
      type: 'absence_alert',
      customMessage: 'Test notification'
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  });
}

// Reports and Analytics Tests
async function testReportsAndAnalytics() {
  await runTest('Attendance Trend Report', async () => {
    const response = await makeRequest('GET', '/api/reports/attendance-trend');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  });

  await runTest('Student Performance Report', async () => {
    const response = await makeRequest('GET', '/api/reports/student-performance');
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  });
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting CLIRDEC: PRESENCE System Functionality Tests\n');
  
  try {
    // Test authentication first
    await testAuthentication();
    
    // Test all system components
    await testDashboardAPIs();
    await testStudentManagement();
    await testClassroomManagement();
    await testRFIDSimulation();
    await testIoTDeviceManagement();
    await testSystemHealth();
    await testEmailNotifications();
    await testReportsAndAnalytics();
    
  } catch (error) {
    console.error('💥 Test suite failed with error:', error.message);
  }
  
  // Print final results
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
  }
  
  console.log('\n🎯 SYSTEM STATUS:', testResults.failed === 0 ? '100% FUNCTIONAL ✅' : 'NEEDS ATTENTION ⚠️');
}

// Run the tests
runAllTests().catch(console.error);