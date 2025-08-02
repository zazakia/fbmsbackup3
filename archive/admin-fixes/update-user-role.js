import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndUpdateUser() {
  try {
    console.log('🔍 Checking for user cybergada@gmail.com...');
    
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'cybergada@gmail.com')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', checkError);
      return;
    }
    
    if (!existingUser) {
      console.log('❌ User cybergada@gmail.com not found in database');
      console.log('📝 Creating user profile...');
      
      // Create user profile
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: 'cybergada@gmail.com',
          first_name: 'Cyber',
          last_name: 'Gada',
          role: 'admin',
          is_active: true
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating user:', createError);
        return;
      }
      
      console.log('✅ User created successfully with admin role:', newUser);
      return;
    }
    
    console.log('✅ User found:', existingUser);
    
    if (existingUser.role === 'admin') {
      console.log('ℹ️  User is already an admin');
      return;
    }
    
    console.log('🔄 Updating user role to admin...');
    
    // Update user role to admin
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('email', 'cybergada@gmail.com')
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating user role:', updateError);
      return;
    }
    
    console.log('✅ User role updated successfully:', updatedUser);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAndUpdateUser();