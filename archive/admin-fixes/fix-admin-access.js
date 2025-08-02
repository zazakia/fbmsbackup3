// Quick admin access fix script
// Run this in the browser console to give current user admin access

console.log('🔧 Admin Access Fix Script');

// Check current user status
const checkCurrentUser = async () => {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return;
    }
    
    if (!session?.user) {
      console.log('❌ No user logged in. Please log in first.');
      return;
    }
    
    console.log('✅ Current user:', session.user.email);
    
    // Check user in database
    const { data: userProfile, error: profileError } = await window.supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .single();
    
    if (profileError) {
      console.error('Profile error:', profileError);
      return;
    }
    
    console.log('Current role:', userProfile.role);
    
    if (userProfile.role !== 'admin') {
      console.log('🔧 Updating user role to admin...');
      
      // Update user role to admin
      const { data: updateData, error: updateError } = await window.supabase
        .from('users')
        .update({ 
          role: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('email', session.user.email)
        .select();
      
      if (updateError) {
        console.error('❌ Update error:', updateError);
        return;
      }
      
      console.log('✅ Role updated successfully!');
      console.log('📝 Please refresh the page for changes to take effect.');
      
      // Trigger auth store refresh
      if (window.location) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } else {
      console.log('✅ User already has admin role');
      console.log('🔄 Refreshing auth state...');
      
      // Force refresh the auth store
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
};

// Run the check
checkCurrentUser();