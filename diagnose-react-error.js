#!/usr/bin/env node

console.log('🔍 React Component Error Diagnosis');
console.log('==================================\n');

import * as fs from 'fs';
import * as path from 'path';

// Check for common React component issues
const diagnosticChecks = [
  {
    name: 'Check PermissionGuard Component',
    check: async () => {
      const filePath = 'src/components/PermissionGuard.tsx';
      if (!fs.existsSync(filePath)) {
        return { status: 'error', message: 'PermissionGuard.tsx not found' };
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for potential issues
      const issues = [];
      
      // Check for proper imports
      if (!content.includes('import React from')) {
        issues.push('Missing React import');
      }
      
      // Check for potential null/undefined access
      if (content.includes('user.role') && !content.includes('user &&')) {
        issues.push('Potential null access on user.role without null check');
      }
      
      // Check for useSupabaseAuthStore
      if (!content.includes('useSupabaseAuthStore')) {
        issues.push('Missing useSupabaseAuthStore import or usage');
      }
      
      return {
        status: issues.length > 0 ? 'warning' : 'ok',
        message: issues.length > 0 ? `Issues found: ${issues.join(', ')}` : 'Component looks OK',
        issues
      };
    }
  },
  
  {
    name: 'Check Auth Store State',
    check: async () => {
      const filePath = 'src/store/supabaseAuthStore.ts';
      if (!fs.existsSync(filePath)) {
        return { status: 'error', message: 'supabaseAuthStore.ts not found' };
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for potential issues
      const issues = [];
      
      // Check for proper error handling
      if (!content.includes('try {') || !content.includes('catch (error')) {
        issues.push('Missing error handling in store');
      }
      
      // Check for null/undefined initialization
      if (!content.includes('user: null')) {
        issues.push('User not properly initialized as null');
      }
      
      return {
        status: issues.length > 0 ? 'warning' : 'ok',
        message: issues.length > 0 ? `Issues found: ${issues.join(', ')}` : 'Store looks OK',
        issues
      };
    }
  },
  
  {
    name: 'Check Lazy Components',
    check: async () => {
      const lazyFiles = [
        'src/utils/lazyComponents.tsx',
        'src/components/admin/LazyAdminComponents.tsx'
      ];
      
      const issues = [];
      
      for (const filePath of lazyFiles) {
        if (!fs.existsSync(filePath)) {
          issues.push(`${filePath} not found`);
          continue;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for proper lazy loading
        if (!content.includes('React.lazy')) {
          issues.push(`${filePath} missing React.lazy usage`);
        }
        
        // Check for proper Suspense fallback
        if (content.includes('Suspense') && !content.includes('fallback')) {
          issues.push(`${filePath} missing Suspense fallback`);
        }
      }
      
      return {
        status: issues.length > 0 ? 'warning' : 'ok',
        message: issues.length > 0 ? `Issues found: ${issues.join(', ')}` : 'Lazy components look OK',
        issues
      };
    }
  },
  
  {
    name: 'Check Error Boundary',
    check: async () => {
      const filePath = 'src/components/ErrorBoundary.tsx';
      if (!fs.existsSync(filePath)) {
        return { status: 'error', message: 'ErrorBoundary.tsx not found' };
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      const issues = [];
      
      // Check for proper error boundary implementation
      if (!content.includes('componentDidCatch') || !content.includes('getDerivedStateFromError')) {
        issues.push('Missing proper error boundary methods');
      }
      
      // Check for error logging
      if (!content.includes('errorMonitor')) {
        issues.push('Missing error monitoring integration');
      }
      
      return {
        status: issues.length > 0 ? 'warning' : 'ok',
        message: issues.length > 0 ? `Issues found: ${issues.join(', ')}` : 'Error boundary looks OK',
        issues
      };
    }
  }
];

// Common React error patterns to look for
const errorPatterns = [
  {
    name: 'Null/Undefined Access',
    pattern: /\w+\.\w+(?!\?)/g,
    description: 'Potential null/undefined property access without optional chaining'
  },
  {
    name: 'Missing Key Props',
    pattern: /\.map\([^)]*\)(?![^<]*key=)/g,
    description: 'Array mapping without key props'
  },
  {
    name: 'Async State Updates',
    pattern: /setState.*await|await.*setState/g,
    description: 'Potential async state update issues'
  }
];

async function runDiagnostics() {
  console.log('🧪 Running React Component Diagnostics...\n');
  
  for (const diagnostic of diagnosticChecks) {
    console.log(`⏱️  ${diagnostic.name}...`);
    
    try {
      const result = await diagnostic.check();
      
      if (result.status === 'ok') {
        console.log(`✅ ${result.message}`);
      } else if (result.status === 'warning') {
        console.log(`⚠️ ${result.message}`);
        if (result.issues) {
          result.issues.forEach(issue => console.log(`   - ${issue}`));
        }
      } else {
        console.log(`❌ ${result.message}`);
      }
    } catch (error) {
      console.log(`💥 Failed: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🎯 Analysis Complete!\n');
  
  console.log('💡 Common React Error Solutions:');
  console.log('1. Check for null/undefined access - use optional chaining (?.)');
  console.log('2. Ensure proper error boundaries are in place');
  console.log('3. Verify auth store state is properly initialized');
  console.log('4. Check lazy components have proper Suspense wrappers');
  console.log('5. Ensure all async operations are properly handled');
  
  console.log('\n🔍 To identify the exact error:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Console tab');
  console.log('3. Look for the full error stack trace');
  console.log('4. Check the Network tab for failed requests');
}

runDiagnostics().catch(console.error);
