import React, { useState } from 'react';
import { AlertTriangle, Database, ExternalLink, Copy, Check } from 'lucide-react';

const DatabaseMigrationAlert: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const migrationSQL = `-- Fix for purchase_order_items table missing
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0),
    unit_cost NUMERIC(15,2) NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_poi_purchase_order_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product_id ON public.purchase_order_items(product_id);

-- Enable RLS
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Authenticated users can manage purchase order items" 
ON public.purchase_order_items FOR ALL 
USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.purchase_order_items TO authenticated;`;

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(migrationSQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy SQL:', error);
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-900 mb-2">
            Database Migration Required
          </h3>
          <p className="text-sm text-red-700 mb-3">
            The <code className="bg-red-100 px-1 py-0.5 rounded">purchase_order_items</code> table 
            is missing from your remote Supabase database. This causes the purchase orders feature to fail.
          </p>
          
          <div className="bg-white border border-red-200 rounded p-3 mb-3">
            <h4 className="text-xs font-medium text-gray-900 mb-2 flex items-center">
              <Database className="h-3 w-3 mr-1" />
              Required SQL Migration:
            </h4>
            <pre className="text-xs text-gray-700 bg-gray-50 p-2 rounded overflow-x-auto mb-2">
{migrationSQL}
            </pre>
            
            <button
              onClick={handleCopySQL}
              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors flex items-center space-x-1"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
            </button>
          </div>
          
          <div className="text-xs text-red-600">
            <strong>To fix this:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Copy the SQL above</li>
              <li>Go to your <a 
                href="https://supabase.com/dashboard/project/coqjcziquviehgyifhek/sql" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:no-underline inline-flex items-center"
              >
                Supabase SQL Editor <ExternalLink className="h-3 w-3 ml-1" />
              </a></li>
              <li>Paste and run the SQL query</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseMigrationAlert;