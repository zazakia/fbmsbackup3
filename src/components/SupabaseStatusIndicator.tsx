import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const SupabaseStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [message, setMessage] = useState('Checking Supabase connection...');

  useEffect(() => {
    const checkConnection = async () => {
      const { error } = await supabase.from('customers').select('*').limit(1);
      if (error) {
        setStatus('error');
        setMessage('Supabase connection failed');
      } else {
        setStatus('connected');
        setMessage('Supabase connected');
      }
    };
    checkConnection();
  }, []);

  let color = 'bg-yellow-400';
  if (status === 'connected') color = 'bg-green-500';
  if (status === 'error') color = 'bg-red-500';

  return (
    <div className="flex items-center" title={message}>
      <span className={`inline-block w-2 h-2 rounded-full ${color}`}></span>
    </div>
  );
};

export default SupabaseStatusIndicator; 