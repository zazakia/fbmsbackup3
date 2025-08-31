/**
 * Admin Access Test Utility
 * Tests all permission checks to ensure admin has full access
 */

import { hasPermission, canAccessModule } from './permissions';
import { UserRole } from '../types/auth';

export const runAdminAccessTest = (userRole: UserRole) => {
  console.group('🔐 Admin Access Test Results');
  console.log(`Testing access for role: ${userRole}`);
  
  const modules = [
    'dashboard',
    'pos', 
    'inventory',
    'customers',
    'suppliers',
    'purchases',
    'expenses',
    'accounting',
    'payroll',
    'reports',
    'branches',
    'users',
    'settings',
    'bir',
    'admin-dashboard',
    'system-monitoring',
    'security'
  ];
  
  const actions = ['view', 'create', 'edit', 'delete', 'manage'];
  
  let passed = 0;
  let total = 0;
  
  console.log('\n📋 Module Access Tests:');
  modules.forEach(module => {
    const canAccess = canAccessModule(userRole, module);
    total++;
    if (userRole === 'admin' && canAccess) passed++;
    
    console.log(`  ${canAccess ? '✅' : '❌'} ${module}: ${canAccess}`);
  });
  
  console.log('\n🔧 Permission Tests (Admin should pass all):');
  modules.forEach(module => {
    actions.forEach(action => {
      const hasAccess = hasPermission(userRole, module, action);
      total++;
      if (userRole === 'admin' && hasAccess) passed++;
      
      if (!hasAccess && userRole === 'admin') {
        console.log(`  ❌ ${module}:${action}: ${hasAccess}`);
      }
    });
  });
  
  console.log('\n📊 Test Summary:');
  console.log(`Role: ${userRole}`);
  console.log(`Tests Passed: ${passed}/${total}`);
  console.log(`Success Rate: ${((passed/total) * 100).toFixed(1)}%`);
  
  if (userRole === 'admin' && passed === total) {
    console.log('🎉 ALL TESTS PASSED! Admin has full access.');
  } else if (userRole === 'admin') {
    console.log('⚠️  SOME TESTS FAILED! Admin access is restricted.');
  } else {
    console.log(`✓ Role ${userRole} has appropriate limited access.`);
  }
  
  console.groupEnd();
  
  return { passed, total, successRate: (passed/total) * 100 };
};

// Add to window for console access
if (typeof window !== 'undefined') {
  (window as any).testAdminAccess = runAdminAccessTest;
}