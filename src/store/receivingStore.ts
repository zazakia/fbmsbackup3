import { create } from 'zustand';
import { receiveStock as receiveStockApi } from '../api/receiving';
import { searchProducts as searchProductsApi } from '../api/products';
import { Product } from '../types/business';
import { useToastStore } from './toastStore';

interface ReceivingState {
  loading: boolean;
  error: string | null;
  products: Product[];
  receiveStock: (productId: string, quantity: number, userId: string) => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
}

export const useReceivingStore = create<ReceivingState>((set) => ({
  loading: false,
  error: null,
  products: [],
  receiveStock: async (productId, quantity, userId) => {
    set({ loading: true, error: null });
    try {
      const { error } = await receiveStockApi(productId, quantity, userId);
      if (error) {
        throw new Error(error.message);
      }
      set({ loading: false });
      useToastStore.getState().showSuccess('Stock received successfully');
    } catch (error: any) {
      set({ loading: false, error: error.message });
      useToastStore.getState().showError('Error receiving stock', error.message);
    }
  },
  searchProducts: async (query) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await searchProductsApi(query);
      if (error) {
        throw new Error(error.message);
      }
      set({ products: data || [], loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message });
      useToastStore.getState().showError('Error searching products', error.message);
    }
  },
}));
