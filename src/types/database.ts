// Supabase Database Types
// This file contains the TypeScript definitions for your Supabase database schema

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          full_name?: string;
          role?: string;
          department?: string;
          is_active: boolean;
          status?: string;
          last_sign_in_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          full_name?: string;
          role?: string;
          department?: string;
          is_active?: boolean;
          status?: string;
          last_sign_in_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          full_name?: string;
          role?: string;
          department?: string;
          is_active?: boolean;
          status?: string;
          last_sign_in_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          state?: string;
          country?: string;
          postal_code?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          state?: string;
          country?: string;
          postal_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          state?: string;
          country?: string;
          postal_code?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          sku: string;
          description?: string;
          category: string;
          price: number;
          cost: number;
          stock: number;
          min_stock: number;
          unit: string;
          barcode?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sku: string;
          description?: string;
          category: string;
          price: number;
          cost: number;
          stock?: number;
          min_stock?: number;
          unit: string;
          barcode?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sku?: string;
          description?: string;
          category?: string;
          price?: number;
          cost?: number;
          stock?: number;
          min_stock?: number;
          unit?: string;
          barcode?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          invoice_number: string;
          customer_id?: string;
          customer_name?: string;
          items: any; // JSONB
          subtotal: number;
          discount: number;
          tax: number;
          total: number;
          payment_method: string;
          payment_status: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          customer_id?: string;
          customer_name?: string;
          items: any; // JSONB
          subtotal: number;
          discount?: number;
          tax: number;
          total: number;
          payment_method: string;
          payment_status?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          customer_id?: string;
          customer_name?: string;
          items?: any; // JSONB
          subtotal?: number;
          discount?: number;
          tax?: number;
          total?: number;
          payment_method?: string;
          payment_status?: string;
          status?: string;
          created_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_person?: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          province?: string;
          zip_code?: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          province?: string;
          zip_code?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_person?: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          province?: string;
          zip_code?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      purchase_orders: {
        Row: {
          id: string;
          po_number: string;
          supplier_id: string;
          supplier_name: string;
          items: any; // JSONB
          subtotal: number;
          tax: number;
          total: number;
          status: string;
          enhanced_status?: string;
          expected_date?: string;
          received_date?: string;
          created_by?: string;
          approved_by?: string;
          approved_at?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          po_number: string;
          supplier_id: string;
          supplier_name: string;
          items: any; // JSONB
          subtotal: number;
          tax: number;
          total: number;
          status?: string;
          enhanced_status?: string;
          expected_date?: string;
          received_date?: string;
          created_by?: string;
          approved_by?: string;
          approved_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          po_number?: string;
          supplier_id?: string;
          supplier_name?: string;
          items?: any; // JSONB
          subtotal?: number;
          tax?: number;
          total?: number;
          status?: string;
          enhanced_status?: string;
          expected_date?: string;
          received_date?: string;
          created_by?: string;
          approved_by?: string;
          approved_at?: string;
          created_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          employee_id: string;
          first_name: string;
          last_name: string;
          middle_name?: string;
          email: string;
          phone: string;
          address: string;
          city: string;
          province: string;
          zip_code: string;
          birth_date: string;
          hire_date: string;
          position: string;
          department: string;
          employment_type: string;
          status: string;
          basic_salary: number;
          allowances?: any; // JSONB
          sss_number?: string;
          philhealth_number?: string;
          pagibig_number?: string;
          tin_number?: string;
          bank_name?: string;
          bank_account_number?: string;
          emergency_contact?: any; // JSONB
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          first_name: string;
          last_name: string;
          middle_name?: string;
          email: string;
          phone: string;
          address: string;
          city: string;
          province: string;
          zip_code: string;
          birth_date: string;
          hire_date: string;
          position: string;
          department: string;
          employment_type: string;
          status?: string;
          basic_salary: number;
          allowances?: any; // JSONB
          sss_number?: string;
          philhealth_number?: string;
          pagibig_number?: string;
          tin_number?: string;
          bank_name?: string;
          bank_account_number?: string;
          emergency_contact?: any; // JSONB
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          first_name?: string;
          last_name?: string;
          middle_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          province?: string;
          zip_code?: string;
          birth_date?: string;
          hire_date?: string;
          position?: string;
          department?: string;
          employment_type?: string;
          status?: string;
          basic_salary?: number;
          allowances?: any; // JSONB
          sss_number?: string;
          philhealth_number?: string;
          pagibig_number?: string;
          tin_number?: string;
          bank_name?: string;
          bank_account_number?: string;
          emergency_contact?: any; // JSONB
          created_at?: string;
          updated_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          date: string;
          description: string;
          category: string;
          amount: number;
          tax_amount: number;
          total_amount: number;
          vendor?: string;
          payment_method?: string;
          status: string;
          notes?: string;
          is_recurring: boolean;
          recurring_interval?: string;
          created_by?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          description: string;
          category: string;
          amount: number;
          tax_amount?: number;
          total_amount: number;
          vendor?: string;
          payment_method?: string;
          status?: string;
          notes?: string;
          is_recurring?: boolean;
          recurring_interval?: string;
          created_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          description?: string;
          category?: string;
          amount?: number;
          tax_amount?: number;
          total_amount?: number;
          vendor?: string;
          payment_method?: string;
          status?: string;
          notes?: string;
          is_recurring?: boolean;
          recurring_interval?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          theme?: string;
          language?: string;
          timezone?: string;
          date_format?: string;
          time_format?: string;
          currency?: string;
          display?: any; // JSONB
          notifications?: any; // JSONB
          privacy?: any; // JSONB
          security?: any; // JSONB
          reports?: any; // JSONB
          inventory?: any; // JSONB
          menuVisibility?: any; // JSONB
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: string;
          language?: string;
          timezone?: string;
          date_format?: string;
          time_format?: string;
          currency?: string;
          display?: any; // JSONB
          notifications?: any; // JSONB
          privacy?: any; // JSONB
          security?: any; // JSONB
          reports?: any; // JSONB
          inventory?: any; // JSONB
          menuVisibility?: any; // JSONB
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: string;
          language?: string;
          timezone?: string;
          date_format?: string;
          time_format?: string;
          currency?: string;
          display?: any; // JSONB
          notifications?: any; // JSONB
          privacy?: any; // JSONB
          security?: any; // JSONB
          reports?: any; // JSONB
          inventory?: any; // JSONB
          menuVisibility?: any; // JSONB
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
