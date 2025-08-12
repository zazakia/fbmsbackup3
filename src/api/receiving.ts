import { supabase } from '../utils/supabase';
import { updateStock } from './products';

export async function receiveStock(productId: string, quantity: number, userId: string, referenceId?: string) {
  return await updateStock(productId, quantity, 'add', { userId, referenceId, reason: 'Stock receiving' });
}

export async function getProduct(id: string) {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
    
    return { data, error };
}
