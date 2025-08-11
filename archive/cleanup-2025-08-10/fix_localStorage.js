// Fix localStorage database mode setting
// Run this in browser console: http://localhost:5180

console.log('🔧 Fixing database mode in localStorage...');

// Check current settings
const currentSettings = localStorage.getItem('fbms-settings-store');
console.log('📋 Current settings:', currentSettings ? JSON.parse(currentSettings) : 'None');

if (currentSettings) {
    try {
        const settings = JSON.parse(currentSettings);
        const currentMode = settings?.state?.database?.mode;
        
        console.log(`🔍 Current database mode: ${currentMode}`);
        
        if (currentMode === 'local') {
            console.log('⚠️  Found LOCAL mode - fixing...');
            
            // Fix the database mode
            settings.state.database.mode = 'remote';
            localStorage.setItem('fbms-settings-store', JSON.stringify(settings));
            
            console.log('✅ Database mode switched to REMOTE');
            console.log('🔄 Refreshing page to apply changes...');
            
            // Refresh the page
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else if (currentMode === 'remote') {
            console.log('✅ Database mode is already REMOTE');
            console.log('🤔 The issue might be elsewhere...');
        } else {
            console.log('❓ Unknown mode, setting to REMOTE');
            settings.state.database.mode = 'remote';
            localStorage.setItem('fbms-settings-store', JSON.stringify(settings));
            setTimeout(() => window.location.reload(), 1000);
        }
    } catch (error) {
        console.error('❌ Error parsing settings:', error);
    }
} else {
    console.log('ℹ️  No localStorage settings found');
    console.log('✅ App should use default REMOTE mode');
    console.log('🤔 Issue might be in the configuration logic');
}

// Test the configuration logic
console.log('\n🧪 Testing configuration logic:');
const LOCAL_CONFIG = { url: 'http://127.0.0.1:54321', mode: 'local' };
const REMOTE_CONFIG = { url: 'https://coqjcziquviehgyifhek.supabase.co', mode: 'remote' };

function testGetDatabaseConfig() {
    try {
        const stored = localStorage.getItem('fbms-settings-store');
        if (stored) {
            const settings = JSON.parse(stored);
            const mode = settings?.state?.database?.mode || 'remote';
            const config = mode === 'remote' ? REMOTE_CONFIG : LOCAL_CONFIG;
            console.log(`🔗 Would connect to: ${config.url} (${config.mode})`);
            return config;
        }
    } catch (error) {
        console.warn('Error reading settings:', error);
    }
    
    console.log('🔗 Would connect to: https://coqjcziquviehgyifhek.supabase.co (remote - default)');
    return REMOTE_CONFIG;
}

const testConfig = testGetDatabaseConfig();
console.log('📊 Test result:', testConfig);