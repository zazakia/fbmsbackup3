// Debug script to check purchase order status
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE5NTcxMjkyMDB9.IotU_8FMxp8nZx4Pf0FJYCe9NdLOEBDw8oGOEQ4wHHw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPOStatus() {
  try {
    console.log('🔍 Checking all purchase orders status...');
    
    const { data: allPOs, error } = await supabase
      .from('purchase_orders')
      .select('id, po_number, status, enhanced_status, approved_by, approved_at, created_at')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching POs:', error);
      return;
    }
    
    console.log('📋 All Purchase Orders:');
    console.table(allPOs);
    
    console.log('🔍 Checking receiving queue (should include approved POs)...');
    
    const { data: receivingQueue, error: receivingError } = await supabase
      .from('purchase_orders')
      .select('*')
      .in('enhanced_status', ['approved', 'sent_to_supplier', 'partially_received']);
      
    if (receivingError) {
      console.error('Error fetching receiving queue:', receivingError);
      return;
    }
    
    console.log('📦 Receiving Queue:');
    console.table(receivingQueue);
    
    const approvedCount = allPOs?.filter(po => po.enhanced_status === 'approved').length || 0;
    const receivingCount = receivingQueue?.length || 0;
    
    console.log(`\n📊 Summary:`);
    console.log(`Total POs: ${allPOs?.length || 0}`);
    console.log(`Approved POs: ${approvedCount}`);
    console.log(`POs in Receiving Queue: ${receivingCount}`);
    
  } catch (error) {
    console.error('Debug script error:', error);
  }
}

checkPOStatus();