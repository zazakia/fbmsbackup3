import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { createCustomer, getCustomers, updateCustomer, deleteCustomer } from '../api/customers';

const SupabaseConnectionTest: React.FC = () => {
  const [status, setStatus] = useState('Checking connection...');
  const [testCustomerId, setTestCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const runTests = async () => {
      // 1. Test connection (read)
      const { data, error } = await supabase.from('customers').select('*').limit(1);
      if (error) {
        setStatus('❌ Connection failed: ' + error.message);
        return;
      }
      setStatus('✅ Connection successful!\n');

      // 2. Test CREATE
      setStatus(s => s + '\nTesting CREATE...');
      const { data: created, error: createErr } = await createCustomer({
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        phone: '1234567890',
        address: 'Test Address',
        city: 'Test City',
        province: 'Test Province',
        zipCode: '0000',
        creditLimit: 1000,
        currentBalance: 0,
        isActive: true,
        lastPurchase: new Date(),
      });
      if (createErr) {
        setStatus(s => s + '\n❌ CREATE failed: ' + createErr.message);
        return;
      }
      setTestCustomerId(created.id);
      setStatus(s => s + '\n✅ CREATE successful: ' + created.id);

      // 3. Test READ
      setStatus(s => s + '\nTesting READ...');
      const { data: customers, error: readErr } = await getCustomers();
      if (readErr) {
        setStatus(s => s + '\n❌ READ failed: ' + readErr.message);
        return;
      }
      setStatus(s => s + `\n✅ READ successful: ${customers.length} customers found`);

      // 4. Test UPDATE
      setStatus(s => s + '\nTesting UPDATE...');
      const { data: updated, error: updateErr } = await updateCustomer(created.id, { city: 'Updated City' });
      if (updateErr) {
        setStatus(s => s + '\n❌ UPDATE failed: ' + updateErr.message);
        return;
      }
      setStatus(s => s + '\n✅ UPDATE successful: ' + updated.city);

      // 5. Test DELETE
      setStatus(s => s + '\nTesting DELETE...');
      const { error: deleteErr } = await deleteCustomer(created.id);
      if (deleteErr) {
        setStatus(s => s + '\n❌ DELETE failed: ' + deleteErr.message);
        return;
      }
      setStatus(s => s + '\n✅ DELETE successful!');
    };
    runTests();
  }, []);

  return <pre className="p-4 bg-gray-100 rounded text-sm whitespace-pre-wrap">{status}</pre>;
};

export default SupabaseConnectionTest; 