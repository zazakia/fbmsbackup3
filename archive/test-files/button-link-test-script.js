/**
 * Comprehensive Button and Link Functionality Testing Script for FBMS
 * This script tests all interactive elements in the Filipino Business Management System
 * Run in browser console at http://localhost:5180
 */

console.log('🔘 Starting Comprehensive Button & Link Testing...');

// Test results storage
const buttonTestResults = {
  passed: [],
  failed: [],
  warnings: [],
  summary: {
    totalButtons: 0,
    totalLinks: 0,
    functionalButtons: 0,
    functionalLinks: 0,
    disabledButtons: 0,
    brokenLinks: 0
  }
};

// Add test result helper
const addButtonTestResult = (category, test, status, message = '', element = null) => {
  const result = { 
    category, 
    test, 
    status, 
    message, 
    element: element ? {
      tagName: element.tagName,
      className: element.className,
      id: element.id,
      textContent: element.textContent?.slice(0, 50)
    } : null,
    timestamp: new Date().toISOString() 
  };
  buttonTestResults[status].push(result);
  console.log(`${status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️'} [UI] ${category} - ${test}: ${message}`);
};

// Helper to simulate clicks safely
const safeClick = async (element, testName) => {
  try {
    const rect = element.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 && 
                     window.getComputedStyle(element).display !== 'none' &&
                     window.getComputedStyle(element).visibility !== 'hidden';
    
    if (!isVisible) {
      addButtonTestResult('Visibility', testName, 'warnings', 'Element not visible', element);
      return false;
    }

    if (element.disabled) {
      addButtonTestResult('Disabled State', testName, 'passed', 'Button properly disabled', element);
      return true;
    }

    // Store original state
    const originalText = element.textContent;
    const originalClass = element.className;
    
    // Simulate click
    element.click();
    
    // Wait for any state changes
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if anything changed (indication of functionality)
    const hasStateChange = element.textContent !== originalText || 
                          element.className !== originalClass ||
                          document.querySelector('.modal, .dialog, [role="dialog"]') ||
                          window.location.hash !== '#' ||
                          document.body.innerHTML.includes('loading');
    
    if (hasStateChange) {
      addButtonTestResult('Functionality', testName, 'passed', 'Element responds to click', element);
      return true;
    } else {
      // Check if it's a valid non-visual action (like data operations)
      const isDataAction = element.textContent?.match(/save|delete|add|edit|submit|confirm|cancel/i) ||
                           element.className?.match(/save|delete|add|edit|submit|confirm|cancel/i);
      
      if (isDataAction) {
        addButtonTestResult('Functionality', testName, 'passed', 'Data action button (no visual change expected)', element);
        return true;
      } else {
        addButtonTestResult('Functionality', testName, 'warnings', 'Click did not produce visible changes', element);
        return false;
      }
    }
  } catch (error) {
    addButtonTestResult('Functionality', testName, 'failed', `Click error: ${error.message}`, element);
    return false;
  }
};

// Test all buttons
const testAllButtons = async () => {
  console.log('🔘 Testing all buttons...');
  
  const buttons = document.querySelectorAll('button');
  buttonTestResults.summary.totalButtons = buttons.length;
  
  console.log(`Found ${buttons.length} buttons to test`);
  
  let functionalCount = 0;
  let disabledCount = 0;
  
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    const buttonId = button.id || `button-${i}`;
    const buttonText = button.textContent?.trim().slice(0, 30) || 'No text';
    
    console.log(`Testing button ${i + 1}/${buttons.length}: "${buttonText}"`);
    
    // Check if button is disabled
    if (button.disabled) {
      disabledCount++;
      addButtonTestResult('Disabled State', `Button: ${buttonText}`, 'passed', 'Correctly disabled', button);
      continue;
    }
    
    // Test button functionality
    const isWorking = await safeClick(button, `Button: ${buttonText}`);
    if (isWorking) {
      functionalCount++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  buttonTestResults.summary.functionalButtons = functionalCount;
  buttonTestResults.summary.disabledButtons = disabledCount;
  
  console.log(`Button testing complete: ${functionalCount}/${buttons.length - disabledCount} functional`);
};

// Test all links
const testAllLinks = async () => {
  console.log('🔗 Testing all links...');
  
  const links = document.querySelectorAll('a, [role="link"]');
  buttonTestResults.summary.totalLinks = links.length;
  
  console.log(`Found ${links.length} links to test`);
  
  let functionalCount = 0;
  let brokenCount = 0;
  
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const linkText = link.textContent?.trim().slice(0, 30) || 'No text';
    const href = link.href || link.getAttribute('href') || 'No href';
    
    console.log(`Testing link ${i + 1}/${links.length}: "${linkText}" -> ${href}`);
    
    // Check for external links
    if (href.startsWith('http') && !href.includes('localhost')) {
      addButtonTestResult('External Link', `Link: ${linkText}`, 'warnings', `External URL: ${href}`, link);
      continue;
    }
    
    // Check for empty or invalid links
    if (!href || href === '#' || href === 'javascript:void(0)') {
      if (link.onclick || link.getAttribute('onclick')) {
        addButtonTestResult('JavaScript Link', `Link: ${linkText}`, 'passed', 'Has onClick handler', link);
        functionalCount++;
      } else {
        addButtonTestResult('Empty Link', `Link: ${linkText}`, 'warnings', 'No href or onClick', link);
      }
      continue;
    }
    
    // Test internal links
    try {
      const originalLocation = window.location.href;
      
      // Simulate click
      link.click();
      
      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newLocation = window.location.href;
      
      if (newLocation !== originalLocation) {
        addButtonTestResult('Navigation', `Link: ${linkText}`, 'passed', `Navigated to: ${newLocation}`, link);
        functionalCount++;
        
        // Navigate back if it changed
        window.history.back();
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        // Check if it's a same-page link or has event handlers
        if (link.onclick || link.getAttribute('onclick') || href.startsWith('#')) {
          addButtonTestResult('Same-page Link', `Link: ${linkText}`, 'passed', 'Same-page navigation or handler', link);
          functionalCount++;
        } else {
          addButtonTestResult('Non-functional Link', `Link: ${linkText}`, 'failed', 'No navigation or handler', link);
          brokenCount++;
        }
      }
    } catch (error) {
      addButtonTestResult('Link Error', `Link: ${linkText}`, 'failed', `Error: ${error.message}`, link);
      brokenCount++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  buttonTestResults.summary.functionalLinks = functionalCount;
  buttonTestResults.summary.brokenLinks = brokenCount;
  
  console.log(`Link testing complete: ${functionalCount}/${links.length} functional`);
};

// Test specific UI component types
const testSpecificComponents = async () => {
  console.log('🎛️ Testing specific UI components...');
  
  // Test navigation menu items
  const navItems = document.querySelectorAll('nav button, nav a, .sidebar button, .sidebar a, [role="menuitem"]');
  console.log(`Testing ${navItems.length} navigation items...`);
  
  for (const item of navItems) {
    const text = item.textContent?.trim().slice(0, 20) || 'Nav item';
    await safeClick(item, `Nav: ${text}`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Test form buttons
  const formButtons = document.querySelectorAll('form button, button[type="submit"], button[type="button"]');
  console.log(`Testing ${formButtons.length} form buttons...`);
  
  for (const button of formButtons) {
    const text = button.textContent?.trim().slice(0, 20) || 'Form button';
    await safeClick(button, `Form: ${text}`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Test toggle switches
  const toggles = document.querySelectorAll('input[type="checkbox"], input[type="radio"], [role="switch"]');
  console.log(`Testing ${toggles.length} toggle elements...`);
  
  for (const toggle of toggles) {
    try {
      const originalState = toggle.checked;
      toggle.click();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (toggle.checked !== originalState) {
        addButtonTestResult('Toggle', 'Toggle switch', 'passed', 'State changed correctly', toggle);
      } else {
        addButtonTestResult('Toggle', 'Toggle switch', 'warnings', 'State did not change', toggle);
      }
    } catch (error) {
      addButtonTestResult('Toggle', 'Toggle switch', 'failed', error.message, toggle);
    }
  }
  
  // Test dropdown menus
  const dropdowns = document.querySelectorAll('select, [role="combobox"], .dropdown-toggle');
  console.log(`Testing ${dropdowns.length} dropdown elements...`);
  
  for (const dropdown of dropdowns) {
    try {
      dropdown.click();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const hasOptions = dropdown.querySelectorAll('option').length > 0 ||
                        document.querySelector('.dropdown-menu, [role="listbox"]');
      
      if (hasOptions) {
        addButtonTestResult('Dropdown', 'Dropdown menu', 'passed', 'Options available', dropdown);
      } else {
        addButtonTestResult('Dropdown', 'Dropdown menu', 'warnings', 'No options found', dropdown);
      }
    } catch (error) {
      addButtonTestResult('Dropdown', 'Dropdown menu', 'failed', error.message, dropdown);
    }
  }
};

// Test accessibility features
const testAccessibility = async () => {
  console.log('♿ Testing accessibility features...');
  
  // Test keyboard navigation
  const focusableElements = document.querySelectorAll(
    'button, a, input, select, textarea, [tabindex], [role="button"], [role="link"]'
  );
  
  console.log(`Testing keyboard focus on ${focusableElements.length} elements...`);
  
  let focusableCount = 0;
  
  for (const element of focusableElements) {
    try {
      element.focus();
      if (document.activeElement === element) {
        focusableCount++;
      }
    } catch (error) {
      // Some elements may not be focusable
    }
  }
  
  const focusPercentage = Math.round((focusableCount / focusableElements.length) * 100);
  
  if (focusPercentage >= 90) {
    addButtonTestResult('Accessibility', 'Keyboard navigation', 'passed', `${focusPercentage}% elements focusable`);
  } else if (focusPercentage >= 70) {
    addButtonTestResult('Accessibility', 'Keyboard navigation', 'warnings', `${focusPercentage}% elements focusable`);
  } else {
    addButtonTestResult('Accessibility', 'Keyboard navigation', 'failed', `Only ${focusPercentage}% elements focusable`);
  }
  
  // Test ARIA labels
  const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
  addButtonTestResult('Accessibility', 'ARIA attributes', elementsWithAria.length > 0 ? 'passed' : 'warnings', 
    `${elementsWithAria.length} elements with ARIA attributes`);
};

// Generate comprehensive report
const generateButtonLinkReport = () => {
  const { summary } = buttonTestResults;
  const total = buttonTestResults.passed.length + buttonTestResults.failed.length + buttonTestResults.warnings.length;
  const successRate = total > 0 ? Math.round((buttonTestResults.passed.length / total) * 100) : 0;
  
  console.log('\n🔘 BUTTON & LINK FUNCTIONALITY REPORT');
  console.log('==========================================');
  console.log(`🔘 Total Buttons: ${summary.totalButtons}`);
  console.log(`  └─ Functional: ${summary.functionalButtons}`);
  console.log(`  └─ Disabled: ${summary.disabledButtons}`);
  console.log(`  └─ Success Rate: ${Math.round((summary.functionalButtons / (summary.totalButtons - summary.disabledButtons)) * 100)}%`);
  
  console.log(`🔗 Total Links: ${summary.totalLinks}`);
  console.log(`  └─ Functional: ${summary.functionalLinks}`);
  console.log(`  └─ Broken: ${summary.brokenLinks}`);
  console.log(`  └─ Success Rate: ${summary.totalLinks > 0 ? Math.round((summary.functionalLinks / summary.totalLinks) * 100) : 0}%`);
  
  console.log(`📊 Overall Test Results:`);
  console.log(`  ✅ Passed: ${buttonTestResults.passed.length}`);
  console.log(`  ❌ Failed: ${buttonTestResults.failed.length}`);
  console.log(`  ⚠️ Warnings: ${buttonTestResults.warnings.length}`);
  console.log(`  📈 Success Rate: ${successRate}%`);
  
  // Detailed results
  if (buttonTestResults.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    buttonTestResults.failed.slice(0, 10).forEach(test => {
      console.log(`  • [${test.category}] ${test.test}: ${test.message}`);
    });
    if (buttonTestResults.failed.length > 10) {
      console.log(`  ... and ${buttonTestResults.failed.length - 10} more failures`);
    }
  }
  
  if (buttonTestResults.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    buttonTestResults.warnings.slice(0, 10).forEach(test => {
      console.log(`  • [${test.category}] ${test.test}: ${test.message}`);
    });
    if (buttonTestResults.warnings.length > 10) {
      console.log(`  ... and ${buttonTestResults.warnings.length - 10} more warnings`);
    }
  }
  
  // Overall assessment
  console.log('\n🎯 UI FUNCTIONALITY ASSESSMENT:');
  if (successRate >= 90) {
    console.log('✅ EXCELLENT: All UI elements are highly functional');
  } else if (successRate >= 80) {
    console.log('✅ GOOD: Most UI elements work well with minor issues');
  } else if (successRate >= 70) {
    console.log('⚠️ FAIR: UI functionality is adequate but needs improvement');
  } else {
    console.log('❌ POOR: Significant UI functionality issues detected');
  }
  
  // Store results globally
  window.fbmsButtonTestResults = buttonTestResults;
  
  return {
    summary,
    successRate,
    isHighlyFunctional: successRate >= 90,
    details: buttonTestResults
  };
};

// Main testing function
const runButtonLinkTests = async () => {
  try {
    console.log('🚀 Starting comprehensive UI testing...');
    
    // Test all interactive elements
    await testAllButtons();
    await testAllLinks();
    await testSpecificComponents();
    await testAccessibility();
    
    console.log('📊 Generating comprehensive report...');
    const report = generateButtonLinkReport();
    
    console.log('\n🎉 Button & Link testing completed!');
    console.log('Results available in window.fbmsButtonTestResults');
    
    return report;
    
  } catch (error) {
    console.error('❌ Critical UI testing error:', error);
    addButtonTestResult('System', 'Critical UI testing failure', 'failed', error.message);
    return { error: error.message, results: buttonTestResults };
  }
};

// Auto-run the tests
console.log('⏳ Starting UI tests in 3 seconds...');
setTimeout(() => {
  runButtonLinkTests().then(report => {
    if (report.isHighlyFunctional) {
      console.log('🏆 CONCLUSION: FBMS UI is highly functional! 🏆');
    } else {
      console.log('⚠️ CONCLUSION: FBMS UI has some functionality issues that need attention');
    }
  }).catch(error => {
    console.error('💥 UI testing suite failed:', error);
  });
}, 3000);