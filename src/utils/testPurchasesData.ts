import { supabase } from './supabase';

export async function testPurchasesDataAccess() {
  console.log('Testing purchases data access...');
  
  try {
    // Test direct access to purchase_orders table
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('*')
      .limit(5);
    
    console.log('Purchase orders test:', { orders, ordersError });
    
    // Test direct access to suppliers table
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('*')
      .limit(5);
    
    console.log('Suppliers test:', { suppliers, suppliersError });
    
    // Test auth state
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user);
    
    return {
      orders,
      suppliers,
      ordersError,
      suppliersError,
      user
    };
  } catch (error) {
    console.error('Test error:', error);
    return { error };
  }
}