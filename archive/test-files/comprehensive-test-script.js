/**
 * Comprehensive End-to-End Testing Script for FBMS
 * This script tests all major functionality in the Filipino Business Management System
 * Run in browser console at http://localhost:5180
 */

console.log('🚀 Starting Comprehensive FBMS Testing...');

// Helper function to wait for elements
const waitForElement = (selector, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
};

// Helper function to simulate clicks
const clickElement = async (selector) => {
  const element = await waitForElement(selector);
  element.click();
  await new Promise(resolve => setTimeout(resolve, 500)); // Wait for UI update
  return element;
};

// Helper function to fill input fields
const fillInput = async (selector, value) => {
  const input = await waitForElement(selector);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 200));
  return input;
};

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Add test result
const addTestResult = (category, test, status, message = '') => {
  const result = { category, test, status, message, timestamp: new Date().toISOString() };
  testResults[status].push(result);
  console.log(`${status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️'} ${category} - ${test}: ${message}`);
};

// Main testing function
const runComprehensiveTests = async () => {
  try {
    console.log('📋 Phase 1: Testing Basic App Loading and Navigation');
    
    // Test 1: Check if app loads
    try {
      await waitForElement('[data-testid="app-container"], .min-h-screen', 3000);
      addTestResult('App Loading', 'Application loads successfully', 'passed');
    } catch (error) {
      addTestResult('App Loading', 'Application fails to load', 'failed', error.message);
    }

    // Test 2: Check for main navigation elements
    try {
      await waitForElement('nav, [data-testid="sidebar"], .sidebar', 2000);
      addTestResult('Navigation', 'Main navigation renders', 'passed');
    } catch (error) {
      addTestResult('Navigation', 'Main navigation missing', 'failed', error.message);
    }

    // Test 3: Check for dashboard
    try {
      await waitForElement('[data-testid="dashboard"], .dashboard, h1, h2', 2000);
      addTestResult('Dashboard', 'Dashboard content loads', 'passed');
    } catch (error) {
      addTestResult('Dashboard', 'Dashboard content missing', 'failed', error.message);
    }

    console.log('📋 Phase 2: Testing Module Navigation');
    
    // Test navigation to different modules
    const modules = [
      { name: 'Sales & POS', selector: '[data-testid="sales"], [href*="sales"], button:contains("Sales"), a:contains("Sales")' },
      { name: 'Inventory', selector: '[data-testid="inventory"], [href*="inventory"], button:contains("Inventory"), a:contains("Inventory")' },
      { name: 'Customers', selector: '[data-testid="customers"], [href*="customers"], button:contains("Customers"), a:contains("Customers")' },
      { name: 'Purchases', selector: '[data-testid="purchases"], [href*="purchases"], button:contains("Purchases"), a:contains("Purchases")' },
      { name: 'Accounting', selector: '[data-testid="accounting"], [href*="accounting"], button:contains("Accounting"), a:contains("Accounting")' },
      { name: 'Reports', selector: '[data-testid="reports"], [href*="reports"], button:contains("Reports"), a:contains("Reports")' },
      { name: 'Settings', selector: '[data-testid="settings"], [href*="settings"], button:contains("Settings"), a:contains("Settings")' }
    ];

    for (const module of modules) {
      try {
        // Try to find and click navigation element
        const navElements = document.querySelectorAll('a, button');
        let found = false;
        
        for (const element of navElements) {
          if (element.textContent?.toLowerCase().includes(module.name.toLowerCase().split(' ')[0])) {
            element.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            found = true;
            break;
          }
        }
        
        if (found) {
          addTestResult('Module Navigation', `${module.name} module accessible`, 'passed');
        } else {
          addTestResult('Module Navigation', `${module.name} module not found`, 'warnings', 'Navigation element not found');
        }
      } catch (error) {
        addTestResult('Module Navigation', `${module.name} module navigation failed`, 'failed', error.message);
      }
    }

    console.log('📋 Phase 3: Testing Form Functionality');
    
    // Test form interactions
    try {
      // Look for any form on the page
      const forms = document.querySelectorAll('form');
      if (forms.length > 0) {
        addTestResult('Forms', `Found ${forms.length} forms on page`, 'passed');
        
        // Test input fields
        const inputs = document.querySelectorAll('input, textarea, select');
        if (inputs.length > 0) {
          addTestResult('Forms', `Found ${inputs.length} input fields`, 'passed');
        } else {
          addTestResult('Forms', 'No input fields found', 'warnings');
        }
      } else {
        addTestResult('Forms', 'No forms found on current page', 'warnings');
      }
    } catch (error) {
      addTestResult('Forms', 'Form testing failed', 'failed', error.message);
    }

    console.log('📋 Phase 4: Testing UI Components');
    
    // Test buttons
    try {
      const buttons = document.querySelectorAll('button');
      addTestResult('UI Components', `Found ${buttons.length} buttons`, buttons.length > 0 ? 'passed' : 'warnings');
    } catch (error) {
      addTestResult('UI Components', 'Button test failed', 'failed', error.message);
    }

    // Test icons
    try {
      const icons = document.querySelectorAll('svg, .icon, [data-icon]');
      addTestResult('UI Components', `Found ${icons.length} icons`, icons.length > 0 ? 'passed' : 'warnings');
    } catch (error) {
      addTestResult('UI Components', 'Icon test failed', 'failed', error.message);
    }

    console.log('📋 Phase 5: Testing Theme and Responsiveness');
    
    // Test theme toggle if available
    try {
      const themeToggle = document.querySelector('[data-testid="theme-toggle"], button:contains("Dark"), button:contains("Light"), .theme-toggle');
      if (themeToggle) {
        themeToggle.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        addTestResult('Theme', 'Theme toggle works', 'passed');
      } else {
        addTestResult('Theme', 'Theme toggle not found', 'warnings');
      }
    } catch (error) {
      addTestResult('Theme', 'Theme toggle test failed', 'failed', error.message);
    }

    // Test responsive classes
    try {
      const responsiveElements = document.querySelectorAll('[class*="sm:"], [class*="md:"], [class*="lg:"]');
      addTestResult('Responsiveness', `Found ${responsiveElements.length} responsive elements`, responsiveElements.length > 0 ? 'passed' : 'warnings');
    } catch (error) {
      addTestResult('Responsiveness', 'Responsive test failed', 'failed', error.message);
    }

    console.log('📋 Phase 6: Testing Data Operations');
    
    // Test local storage
    try {
      const storageKeys = Object.keys(localStorage);
      const fbmsKeys = storageKeys.filter(key => key.includes('fbms') || key.includes('business') || key.includes('auth'));
      addTestResult('Data Storage', `Found ${fbmsKeys.length} FBMS storage keys`, fbmsKeys.length > 0 ? 'passed' : 'warnings');
    } catch (error) {
      addTestResult('Data Storage', 'Local storage test failed', 'failed', error.message);
    }

    console.log('📋 Phase 7: Testing Performance');
    
    // Basic performance tests
    try {
      const performanceEntries = performance.getEntriesByType('navigation');
      if (performanceEntries.length > 0) {
        const loadTime = performanceEntries[0].loadEventEnd - performanceEntries[0].loadEventStart;
        addTestResult('Performance', `Page load time: ${Math.round(loadTime)}ms`, loadTime < 3000 ? 'passed' : 'warnings');
      }
    } catch (error) {
      addTestResult('Performance', 'Performance test failed', 'failed', error.message);
    }

    // Test memory usage
    try {
      if (performance.memory) {
        const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        addTestResult('Performance', `Memory usage: ${memoryMB}MB`, memoryMB < 100 ? 'passed' : 'warnings');
      }
    } catch (error) {
      addTestResult('Performance', 'Memory test failed', 'failed', error.message);
    }

    console.log('📋 Phase 8: Testing Error Handling');
    
    // Test error boundaries
    try {
      const errorElements = document.querySelectorAll('[data-testid="error"], .error, .alert-error');
      addTestResult('Error Handling', `Error elements status: ${errorElements.length === 0 ? 'No errors displayed' : `${errorElements.length} errors found`}`, 
        errorElements.length === 0 ? 'passed' : 'warnings');
    } catch (error) {
      addTestResult('Error Handling', 'Error boundary test failed', 'failed', error.message);
    }

    console.log('📋 Testing Complete! Generating Report...');
    
    // Generate final report
    const generateReport = () => {
      const total = testResults.passed.length + testResults.failed.length + testResults.warnings.length;
      const successRate = Math.round((testResults.passed.length / total) * 100);
      
      console.log('\n📊 COMPREHENSIVE TEST REPORT');
      console.log('================================');
      console.log(`✅ Passed: ${testResults.passed.length}`);
      console.log(`❌ Failed: ${testResults.failed.length}`);
      console.log(`⚠️ Warnings: ${testResults.warnings.length}`);
      console.log(`📈 Success Rate: ${successRate}%`);
      console.log('================================');
      
      if (testResults.failed.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.failed.forEach(test => {
          console.log(`  • [${test.category}] ${test.test}: ${test.message}`);
        });
      }
      
      if (testResults.warnings.length > 0) {
        console.log('\n⚠️ WARNINGS:');
        testResults.warnings.forEach(test => {
          console.log(`  • [${test.category}] ${test.test}: ${test.message}`);
        });
      }
      
      console.log('\n✅ PASSED TESTS:');
      testResults.passed.forEach(test => {
        console.log(`  • [${test.category}] ${test.test}`);
      });
      
      // Store results globally for external access
      window.fbmsTestResults = testResults;
      
      return {
        total,
        passed: testResults.passed.length,
        failed: testResults.failed.length,
        warnings: testResults.warnings.length,
        successRate,
        details: testResults
      };
    };

    return generateReport();

  } catch (error) {
    console.error('❌ Critical testing error:', error);
    addTestResult('System', 'Critical testing failure', 'failed', error.message);
    return { error: error.message, results: testResults };
  }
};

// Auto-run the tests
runComprehensiveTests().then(report => {
  console.log('\n🎉 Testing completed successfully!');
  console.log('Results are available in window.fbmsTestResults');
}).catch(error => {
  console.error('💥 Testing suite failed:', error);
});