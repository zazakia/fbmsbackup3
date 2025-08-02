import React, { useState } from 'react';
import { Trash2, AlertTriangle, Check, Loader2, RotateCcw } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useToastStore } from '../../store/toastStore';

const TestDataCleanup: React.FC = () => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeComplete, setRemoveComplete] = useState(false);
  const { addToast } = useToastStore();
  
  const { 
    sales, 
    journalEntries,
    products,
    removeTestData,
    removeSeedProducts,
    isLoading 
  } = useBusinessStore();

  // Count test items
  const testSalesCount = sales.filter(sale => 
    sale.invoiceNumber?.startsWith('TEST-') ||
    sale.customerName === 'Integration Test Customer' ||
    sale.cashierId === 'test-user' ||
    sale.notes?.includes('Integration test')
  ).length;

  const testJournalEntriesCount = journalEntries.filter(entry => 
    entry.description?.includes('Integration test') ||
    entry.description?.includes('TEST-') ||
    entry.reference?.startsWith('TEST-')
  ).length;

  // Count seed products
  const seedProductSKUs = ['SMB-330', 'LM-CHK-55', 'CC-355', 'PAN-170', 'vvv', 'gdfg'];
  const seedProductsCount = products.filter(product => 
    seedProductSKUs.includes(product.sku)
  ).length;

  const totalTestItems = testSalesCount + testJournalEntriesCount;
  const totalCleanupItems = totalTestItems + seedProductsCount;

  const handleRemoveAllData = async () => {
    if (totalCleanupItems === 0) {
      addToast({
        type: 'info',
        title: 'No Data to Remove',
        message: 'There are no test items or seed products to remove.'
      });
      return;
    }

    setIsRemoving(true);
    setRemoveComplete(false);

    try {
      // Remove test data if any exists
      if (totalTestItems > 0) {
        await removeTestData();
      }
      
      // Remove seed products if any exist
      if (seedProductsCount > 0) {
        removeSeedProducts();
      }
      
      setRemoveComplete(true);
      addToast({
        type: 'success',
        title: 'Data Cleanup Complete',
        message: `Successfully removed ${totalCleanupItems} items from the system.`
      });
    } catch (error) {
      console.error('Failed to remove data:', error);
      addToast({
        type: 'error',
        title: 'Cleanup Failed',
        message: 'Failed to remove data. Please try again.'
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleReset = () => {
    setRemoveComplete(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Data Cleanup
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Remove test items and seed products from the system
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!removeComplete ? (
            <>
              {/* Warning */}
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Warning: This action cannot be undone
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      This will permanently remove all test items (sales transactions, journal entries) 
                      and seed products (demo inventory items) from both local storage and the database.
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="mb-6 space-y-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Items Found
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Test Sales</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {testSalesCount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Test Journal Entries</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {testJournalEntriesCount}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Seed Products</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {seedProductsCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      Total Items to Remove
                    </span>
                    <span className="font-bold text-xl text-blue-900 dark:text-blue-100">
                      {totalCleanupItems}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleRemoveAllData}
                  disabled={isRemoving || isLoading || totalCleanupItems === 0}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {isRemoving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Removing Items...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>
                        {totalCleanupItems === 0 ? 'No Items to Remove' : `Remove ${totalCleanupItems} Items`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Data Successfully Removed
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                All test items and seed products have been permanently removed from the system.
              </p>
              
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestDataCleanup;