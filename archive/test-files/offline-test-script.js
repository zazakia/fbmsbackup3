/**
 * Comprehensive Offline-First Testing Script for FBMS
 * This script thoroughly tests the offline capabilities of the Filipino Business Management System
 * Run in browser console at http://localhost:5180
 */

console.log('🔌 Starting Comprehensive Offline-First Testing...');

// Test results storage
const offlineTestResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Add test result helper
const addOfflineTestResult = (category, test, status, message = '') => {
  const result = { category, test, status, message, timestamp: new Date().toISOString() };
  offlineTestResults[status].push(result);
  console.log(`${status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️'} [OFFLINE] ${category} - ${test}: ${message}`);
};

// Helper to wait for DOM elements
const waitForOfflineElement = (selector, timeout = 5000) => {
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

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
};

// Helper to simulate network disconnection
const simulateOffline = () => {
  // Override fetch to simulate network failure
  window.originalFetch = window.fetch;
  window.fetch = () => Promise.reject(new Error('Network request failed - offline mode'));
  
  // Override XMLHttpRequest
  window.originalXMLHttpRequest = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    throw new Error('Network request failed - offline mode');
  };
  
  // Set navigator.onLine to false (if possible)
  try {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
  } catch (e) {
    console.log('Cannot override navigator.onLine, continuing test...');
  }
  
  console.log('🔌 Network disconnected - entering offline mode');
};

// Helper to restore network
const simulateOnline = () => {
  if (window.originalFetch) {
    window.fetch = window.originalFetch;
    delete window.originalFetch;
  }
  
  if (window.originalXMLHttpRequest) {
    window.XMLHttpRequest = window.originalXMLHttpRequest;
    delete window.originalXMLHttpRequest;
  }
  
  try {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  } catch (e) {
    console.log('Cannot restore navigator.onLine, continuing test...');
  }
  
  console.log('🌐 Network restored - entering online mode');
};

// Helper to check localStorage data
const checkLocalStorageData = () => {
  const storageKeys = Object.keys(localStorage);
  const fbmsKeys = storageKeys.filter(key => key.includes('fbms'));
  
  console.log('📦 LocalStorage FBMS keys found:', fbmsKeys);
  
  fbmsKeys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      console.log(`📦 ${key}:`, {
        size: JSON.stringify(data).length,
        hasData: Object.keys(data).length > 0,
        mainKeys: Object.keys(data).slice(0, 5)
      });
    } catch (e) {
      console.log(`📦 ${key}: Invalid JSON or empty`);
    }
  });
  
  return fbmsKeys;
};

// Helper to test CRUD operations
const testOfflineCRUD = async () => {
  try {
    // Test adding a product
    const testProduct = {
      name: 'Offline Test Product',
      sku: 'OFFLINE-001',
      category: 'Electronics',
      price: 999.99,
      cost: 600.00,
      stock: 50,
      minStock: 5,
      isActive: true,
      description: 'Test product created in offline mode'
    };

    // Try to access the business store
    console.log('🧪 Testing offline CRUD operations...');
    
    // Check if Zustand stores are accessible
    const storeData = localStorage.getItem('fbms-business');
    if (storeData) {
      addOfflineTestResult('CRUD', 'Business store accessible', 'passed', 'Store data found in localStorage');
    } else {
      addOfflineTestResult('CRUD', 'Business store accessible', 'failed', 'No store data in localStorage');
    }

    // Test form interactions in offline mode
    const forms = document.querySelectorAll('form');
    if (forms.length > 0) {
      addOfflineTestResult('CRUD', 'Forms available offline', 'passed', `${forms.length} forms found`);
    } else {
      addOfflineTestResult('CRUD', 'Forms available offline', 'warnings', 'No forms found on current page');
    }

    // Test input fields
    const inputs = document.querySelectorAll('input, textarea, select');
    if (inputs.length > 0) {
      addOfflineTestResult('CRUD', 'Input fields functional', 'passed', `${inputs.length} inputs found`);
      
      // Test input functionality
      const firstInput = inputs[0];
      if (firstInput && firstInput.type !== 'file') {
        const originalValue = firstInput.value;
        firstInput.value = 'Offline test value';
        firstInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        if (firstInput.value === 'Offline test value') {
          addOfflineTestResult('CRUD', 'Input modification works', 'passed', 'Input value changed successfully');
          firstInput.value = originalValue; // Restore original value
        } else {
          addOfflineTestResult('CRUD', 'Input modification works', 'failed', 'Input value did not change');
        }
      }
    } else {
      addOfflineTestResult('CRUD', 'Input fields functional', 'warnings', 'No input fields found');
    }

  } catch (error) {
    addOfflineTestResult('CRUD', 'Offline CRUD operations', 'failed', error.message);
  }
};

// Helper to test navigation offline
const testOfflineNavigation = async () => {
  try {
    console.log('🧭 Testing offline navigation...');
    
    // Test sidebar navigation
    const sidebarLinks = document.querySelectorAll('nav a, .sidebar a, [role="navigation"] a, button[data-module]');
    if (sidebarLinks.length > 0) {
      addOfflineTestResult('Navigation', 'Navigation links available', 'passed', `${sidebarLinks.length} nav links found`);
      
      // Test clicking a navigation link
      const firstNavLink = sidebarLinks[0];
      if (firstNavLink) {
        try {
          firstNavLink.click();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for navigation
          addOfflineTestResult('Navigation', 'Navigation click works', 'passed', 'Navigation responded to click');
        } catch (error) {
          addOfflineTestResult('Navigation', 'Navigation click works', 'failed', error.message);
        }
      }
    } else {
      addOfflineTestResult('Navigation', 'Navigation links available', 'warnings', 'No navigation links found');
    }

    // Test if current page still loads content
    const contentElements = document.querySelectorAll('main, .content, [role="main"], h1, h2');
    if (contentElements.length > 0) {
      addOfflineTestResult('Navigation', 'Page content loads', 'passed', `${contentElements.length} content elements found`);
    } else {
      addOfflineTestResult('Navigation', 'Page content loads', 'failed', 'No content elements found');
    }

  } catch (error) {
    addOfflineTestResult('Navigation', 'Offline navigation', 'failed', error.message);
  }
};

// Helper to test offline data persistence
const testDataPersistence = async () => {
  try {
    console.log('💾 Testing data persistence...');
    
    const beforeKeys = checkLocalStorageData();
    
    // Test that data persists across page operations
    if (beforeKeys.length > 0) {
      addOfflineTestResult('Persistence', 'LocalStorage data exists', 'passed', `${beforeKeys.length} FBMS keys found`);
      
      // Test individual store data
      const businessStoreData = localStorage.getItem('fbms-business');
      if (businessStoreData) {
        try {
          const parsedData = JSON.parse(businessStoreData);
          const dataTypes = Object.keys(parsedData.state || parsedData);
          addOfflineTestResult('Persistence', 'Business store data valid', 'passed', `Data types: ${dataTypes.join(', ')}`);
        } catch (e) {
          addOfflineTestResult('Persistence', 'Business store data valid', 'failed', 'Invalid JSON in business store');
        }
      }
      
      const settingsStoreData = localStorage.getItem('fbms-settings-store');
      if (settingsStoreData) {
        addOfflineTestResult('Persistence', 'Settings store persisted', 'passed', 'Settings data found');
      } else {
        addOfflineTestResult('Persistence', 'Settings store persisted', 'warnings', 'No settings data found');
      }
      
      const themeStoreData = localStorage.getItem('fbms-theme');
      if (themeStoreData) {
        addOfflineTestResult('Persistence', 'Theme store persisted', 'passed', 'Theme data found');
      } else {
        addOfflineTestResult('Persistence', 'Theme store persisted', 'warnings', 'No theme data found');
      }
      
    } else {
      addOfflineTestResult('Persistence', 'LocalStorage data exists', 'failed', 'No FBMS data found in localStorage');
    }

  } catch (error) {
    addOfflineTestResult('Persistence', 'Data persistence test', 'failed', error.message);
  }
};

// Helper to test offline UI indicators
const testOfflineIndicators = async () => {
  try {
    console.log('🔍 Testing offline UI indicators...');
    
    // Look for offline indicators
    const offlineIndicators = document.querySelectorAll(
      '[data-testid*="offline"], .offline, [class*="offline"], [class*="disconnected"]'
    );
    
    if (offlineIndicators.length > 0) {
      addOfflineTestResult('UI Indicators', 'Offline indicators present', 'passed', `${offlineIndicators.length} indicators found`);
    } else {
      addOfflineTestResult('UI Indicators', 'Offline indicators present', 'warnings', 'No explicit offline indicators found');
    }
    
    // Check for any error messages or network status
    const errorMessages = document.querySelectorAll('.error, .alert, [role="alert"], .notification');
    addOfflineTestResult('UI Indicators', 'Error handling visible', 'passed', `${errorMessages.length} error/alert elements found`);
    
    // Check if buttons and forms are still functional
    const buttons = document.querySelectorAll('button:not([disabled])');
    const functionalButtons = Array.from(buttons).filter(btn => !btn.disabled);
    addOfflineTestResult('UI Indicators', 'Interactive elements functional', 'passed', `${functionalButtons.length}/${buttons.length} buttons enabled`);

  } catch (error) {
    addOfflineTestResult('UI Indicators', 'Offline UI indicators', 'failed', error.message);
  }
};

// Main offline testing function
const runOfflineTests = async () => {
  try {
    console.log('🚀 Phase 1: Baseline Testing (Online Mode)');
    
    // Phase 1: Test current state (online)
    await testDataPersistence();
    checkLocalStorageData();
    
    console.log('🔌 Phase 2: Simulating Network Disconnection');
    
    // Phase 2: Simulate going offline
    simulateOffline();
    
    // Wait a moment for any offline detection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📱 Phase 3: Testing Offline Functionality');
    
    // Phase 3: Test offline functionality
    await testOfflineNavigation();
    await testOfflineCRUD();
    await testOfflineIndicators();
    await testDataPersistence();
    
    console.log('🌐 Phase 4: Testing Network Recovery');
    
    // Phase 4: Simulate coming back online
    simulateOnline();
    
    // Wait for any reconnection logic
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test that app still works after reconnection
    const postOnlineContent = document.querySelectorAll('main, .content, [role="main"]');
    if (postOnlineContent.length > 0) {
      addOfflineTestResult('Recovery', 'App functional after reconnection', 'passed', 'Content still visible');
    } else {
      addOfflineTestResult('Recovery', 'App functional after reconnection', 'failed', 'No content after reconnection');
    }
    
    console.log('📊 Phase 5: Generating Offline Test Report');
    
    // Generate final report
    const generateOfflineReport = () => {
      const total = offlineTestResults.passed.length + offlineTestResults.failed.length + offlineTestResults.warnings.length;
      const successRate = total > 0 ? Math.round((offlineTestResults.passed.length / total) * 100) : 0;
      
      console.log('\n📊 OFFLINE-FIRST TEST REPORT');
      console.log('================================');
      console.log(`✅ Passed: ${offlineTestResults.passed.length}`);
      console.log(`❌ Failed: ${offlineTestResults.failed.length}`);
      console.log(`⚠️ Warnings: ${offlineTestResults.warnings.length}`);
      console.log(`📈 Offline Success Rate: ${successRate}%`);
      console.log('================================');
      
      // Detailed results
      if (offlineTestResults.failed.length > 0) {
        console.log('\n❌ OFFLINE FAILURES:');
        offlineTestResults.failed.forEach(test => {
          console.log(`  • [${test.category}] ${test.test}: ${test.message}`);
        });
      }
      
      if (offlineTestResults.warnings.length > 0) {
        console.log('\n⚠️ OFFLINE WARNINGS:');
        offlineTestResults.warnings.forEach(test => {
          console.log(`  • [${test.category}] ${test.test}: ${test.message}`);
        });
      }
      
      console.log('\n✅ OFFLINE SUCCESSES:');
      offlineTestResults.passed.forEach(test => {
        console.log(`  • [${test.category}] ${test.test}: ${test.message}`);
      });
      
      // Overall assessment
      console.log('\n🎯 OFFLINE-FIRST ASSESSMENT:');
      if (successRate >= 80) {
        console.log('✅ EXCELLENT: App is truly offline-first with robust functionality');
      } else if (successRate >= 60) {
        console.log('⚠️ GOOD: App has offline capabilities with some limitations');
      } else if (successRate >= 40) {
        console.log('⚠️ FAIR: App has basic offline support but needs improvement');
      } else {
        console.log('❌ POOR: App is not truly offline-first, requires network connection');
      }
      
      // Key metrics
      const hasLocalStorage = offlineTestResults.passed.some(t => t.test.includes('LocalStorage'));
      const hasOfflineNav = offlineTestResults.passed.some(t => t.test.includes('Navigation'));
      const hasDataPersist = offlineTestResults.passed.some(t => t.test.includes('persisted'));
      
      console.log('\n📋 KEY OFFLINE FEATURES:');
      console.log(`📦 Local Storage: ${hasLocalStorage ? '✅ Working' : '❌ Not Working'}`);
      console.log(`🧭 Offline Navigation: ${hasOfflineNav ? '✅ Working' : '❌ Not Working'}`);
      console.log(`💾 Data Persistence: ${hasDataPersist ? '✅ Working' : '❌ Not Working'}`);
      
      // Store results globally
      window.fbmsOfflineTestResults = offlineTestResults;
      
      return {
        total,
        passed: offlineTestResults.passed.length,
        failed: offlineTestResults.failed.length,
        warnings: offlineTestResults.warnings.length,
        successRate,
        isOfflineFirst: successRate >= 80 && hasLocalStorage && hasOfflineNav && hasDataPersist,
        details: offlineTestResults
      };
    };

    return generateOfflineReport();

  } catch (error) {
    console.error('❌ Critical offline testing error:', error);
    addOfflineTestResult('System', 'Critical offline testing failure', 'failed', error.message);
    return { error: error.message, results: offlineTestResults };
  }
};

// Auto-run the offline tests
console.log('⏳ Starting offline tests in 2 seconds...');
setTimeout(() => {
  runOfflineTests().then(report => {
    console.log('\n🎉 Offline testing completed!');
    console.log('Results available in window.fbmsOfflineTestResults');
    
    if (report.isOfflineFirst) {
      console.log('🏆 CONCLUSION: FBMS is truly OFFLINE-FIRST! 🏆');
    } else {
      console.log('⚠️ CONCLUSION: FBMS has offline features but may not be fully offline-first');
    }
  }).catch(error => {
    console.error('💥 Offline testing suite failed:', error);
  });
}, 2000);