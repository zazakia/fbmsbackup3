import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const SupabaseStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [message, setMessage] = useState('Checking Supabase connection...');

  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('customers').select('*').limit(1);

        if (!mounted) return;

        if (error) {
          setStatus('error');
          setMessage('Supabase connection failed');
        } else {
          setStatus('connected');
          setMessage('Supabase connected');
        }
      } catch (err) {
        if (!mounted) return;
        setStatus('error');
        setMessage('Connection error');
      }
    };

    checkConnection();

    // Set up a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted && status === 'checking') {
        setStatus('error');
        setMessage('Connection timeout');
      }
    }, 8000); // 8 second timeout

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
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