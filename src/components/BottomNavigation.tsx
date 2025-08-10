import React, { useState, useCallback, useEffect } from 'react';
import { 
  // Home, 
  // ShoppingCart, 
  // Package, 
  // Users, 
  // BarChart3,
  Plus,
  X,
  Loader2,
  AlertCircle,
  // Calculator,
  // Receipt,
  // Settings,
  // DollarSign,
  // FileText,
  // UserCheck,
  // Building2,
  // Activity,
  // CreditCard,
  // Megaphone,
  // Gift,
  // Cloud,
  // TestTube,
  // Shield
} from 'lucide-react';
import { moduleLoadingManager } from '../services/ModuleLoadingManager';
import { loadingStateManager } from '../services/LoadingStateManager';
import { useBusinessStore } from '../store/businessStore';
import { getModuleConfig } from '../utils/lazyComponents';
import type { LoadingState, LoadingStateInfo } from '../types/moduleLoading';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  module: string;
}

interface BottomNavigationProps {
  menuItems: MenuItem[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
}


const BottomNavigation: React.FC<BottomNavigationProps> = ({
  menuItems,
  activeModule,
  onModuleChange
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingStateInfo>>({});
  const [lastTappedItem, setLastTappedItem] = useState<string | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  
  const user = useBusinessStore((state) => state.user);

  // Primary navigation items (shown in bottom bar)
  const primaryItems = menuItems.filter(item => 
    ['dashboard', 'sales', 'inventory', 'customers', 'reports'].includes(item.id)
  ).slice(0, 4);

  // Secondary items (shown in floating menu)
  const secondaryItems = menuItems.filter(item => 
    !['dashboard', 'sales', 'inventory', 'customers', 'reports'].includes(item.id)
  );

  // Subscribe to loading state changes
  useEffect(() => {
    const unsubscribe = loadingStateManager.subscribeToStateChanges((state) => {
      setLoadingStates(prev => ({
        ...prev,
        [state.moduleId]: state
      }));
    });

    return unsubscribe;
  }, []);

  // Enhanced module loading with touch feedback
  const handleModuleLoad = useCallback(async (itemId: string) => {
    try {
      const moduleConfig = getModuleConfig(itemId);
      if (!moduleConfig) {
        console.warn(`No module configuration found for ${itemId}`);
        onModuleChange(itemId);
        return;
      }

      // Check if user has access
      if (!moduleLoadingManager.hasAccess(moduleConfig, user?.role || 'employee')) {
        throw new Error(`Access denied for module ${itemId}`);
      }

      // Load module with enhanced loading management
      await moduleLoadingManager.loadModule(moduleConfig, user);
      onModuleChange(itemId);
      
    } catch (error) {
      console.error(`Failed to load module ${itemId}:`, error);
      // Still allow navigation for fallback handling
      onModuleChange(itemId);
    }
  }, [onModuleChange, user]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleItemSelect = useCallback((itemId: string) => {
    // Prevent double-tap issues
    if (lastTappedItem === itemId && Date.now() - touchStartTime < 300) {
      return;
    }
    
    setLastTappedItem(itemId);
    setTouchStartTime(Date.now());
    
    handleModuleLoad(itemId);
    setIsMenuOpen(false);
  }, [handleModuleLoad, lastTappedItem, touchStartTime]);

  // Touch event handlers for better mobile experience
  const handleTouchStart = useCallback((itemId: string) => {
    setTouchStartTime(Date.now());
    setLastTappedItem(itemId);
  }, []);

  const handleTouchEnd = useCallback((itemId: string) => {
    const touchDuration = Date.now() - touchStartTime;
    
    // Long press detection (> 500ms)
    if (touchDuration > 500) {
      // Show context menu or additional options
      console.log(`Long press detected for ${itemId}`);
      return;
    }
    
    // Normal tap
    if (touchDuration < 300 && lastTappedItem === itemId) {
      handleItemSelect(itemId);
    }
  }, [handleItemSelect, lastTappedItem, touchStartTime]);

  // Get loading state for an item
  const getItemLoadingState = (itemId: string): LoadingStateInfo | null => {
    return loadingStates[itemId] || null;
  };

  // Check if an item is currently loading
  const isItemLoading = (itemId: string): boolean => {
    const state = getItemLoadingState(itemId);
    return state?.state === 'loading' || state?.state === 'retrying';
  };

  // Check if an item has an error
  const hasItemError = (itemId: string): boolean => {
    const state = getItemLoadingState(itemId);
    return state?.state === 'error';
  };

  return (
    <>
      {/* Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Floating Menu */}
      {isMenuOpen && (
        <div className="fixed bottom-20 right-4 z-50 lg:hidden">
          <div className="floating-menu bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2 w-full">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemSelect(item.id)}
                    onTouchStart={() => handleTouchStart(item.id)}
                    onTouchEnd={() => handleTouchEnd(item.id)}
                    disabled={isItemLoading(item.id)}
                    aria-busy={isItemLoading(item.id)}
                    aria-label={`${item.label}${isItemLoading(item.id) ? ' (Loading)' : ''}`}
                    className={`floating-menu-item mobile-nav-button flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] relative ${
                      activeModule === item.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : hasItemError(item.id)
                        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                        : isItemLoading(item.id)
                        ? 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 active:bg-gray-100 dark:active:bg-gray-600'
                    } ${isItemLoading(item.id) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isItemLoading(item.id) ? (
                      <Loader2 className="h-6 w-6 mb-1 animate-spin" />
                    ) : hasItemError(item.id) ? (
                      <AlertCircle className="h-6 w-6 mb-1" />
                    ) : (
                      <Icon className="h-6 w-6 mb-1" />
                    )}
                    <span className="text-xs font-medium text-center leading-tight">
                      {isItemLoading(item.id) ? 'Loading...' : 
                       hasItemError(item.id) ? 'Error' :
                       (item.label.length > 10 ? item.label.substring(0, 8) + '...' : item.label)}
                    </span>
                    
                    {/* Loading progress indicator */}
                    {isItemLoading(item.id) && (
                      <div className="absolute bottom-1 left-2 right-2 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300 ease-out"
                          style={{ width: `${getItemLoadingState(item.id)?.progress || 0}%` }}
                        />
                      </div>
                    )}
                    
                    {/* Error indicator */}
                    {hasItemError(item.id) && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white dark:border-gray-800" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div 
        data-testid="mobile-bottom-nav"
        className="bottom-navigation fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 z-30 lg:hidden"
      >
        {/* Curved cutout container */}
        <div className="relative">
          {/* Main navigation bar with curved cutout */}
          <div className="flex items-center justify-around px-2 py-2 relative">
            {/* Create space for the curved cutout */}
            <div className="flex items-center justify-around w-full">
              {primaryItems.slice(0, 2).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemSelect(item.id)}
                    onTouchStart={() => handleTouchStart(item.id)}
                    onTouchEnd={() => handleTouchEnd(item.id)}
                    disabled={isItemLoading(item.id)}
                    aria-busy={isItemLoading(item.id)}
                    aria-label={`${item.label}${isItemLoading(item.id) ? ' (Loading)' : ''}`}
                    aria-current={activeModule === item.id ? 'page' : undefined}
                    className={`bottom-nav-item mobile-nav-button flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[60px] min-h-[44px] relative ${
                      activeModule === item.id
                        ? 'text-blue-600 dark:text-blue-400'
                        : hasItemError(item.id)
                        ? 'text-red-600 dark:text-red-400'
                        : isItemLoading(item.id)
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-700'
                    } ${isItemLoading(item.id) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isItemLoading(item.id) ? (
                      <Loader2 className="h-5 w-5 mb-1 animate-spin" />
                    ) : hasItemError(item.id) ? (
                      <AlertCircle className="h-5 w-5 mb-1" />
                    ) : (
                      <Icon className="h-5 w-5 mb-1" />
                    )}
                    <span className="mobile-nav-label text-xs font-medium">
                      {isItemLoading(item.id) ? 'Loading' : 
                       hasItemError(item.id) ? 'Error' :
                       (item.label.length > 8 ? item.label.substring(0, 6) + '..' : item.label)}
                    </span>
                    
                    {/* Active indicator */}
                    {activeModule === item.id && !isItemLoading(item.id) && !hasItemError(item.id) && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                    )}
                    
                    {/* Loading progress indicator */}
                    {isItemLoading(item.id) && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300 ease-out"
                          style={{ width: `${getItemLoadingState(item.id)?.progress || 0}%` }}
                        />
                      </div>
                    )}
                    
                    {/* Error indicator */}
                    {hasItemError(item.id) && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                );
              })}
              
              {/* Center space for FAB */}
              <div className="w-16 h-16"></div>
              
              {primaryItems.slice(2, 4).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemSelect(item.id)}
                    onTouchStart={() => handleTouchStart(item.id)}
                    onTouchEnd={() => handleTouchEnd(item.id)}
                    disabled={isItemLoading(item.id)}
                    aria-busy={isItemLoading(item.id)}
                    aria-label={`${item.label}${isItemLoading(item.id) ? ' (Loading)' : ''}`}
                    aria-current={activeModule === item.id ? 'page' : undefined}
                    className={`bottom-nav-item mobile-nav-button flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[60px] min-h-[44px] relative ${
                      activeModule === item.id
                        ? 'text-blue-600 dark:text-blue-400'
                        : hasItemError(item.id)
                        ? 'text-red-600 dark:text-red-400'
                        : isItemLoading(item.id)
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-700'
                    } ${isItemLoading(item.id) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isItemLoading(item.id) ? (
                      <Loader2 className="h-5 w-5 mb-1 animate-spin" />
                    ) : hasItemError(item.id) ? (
                      <AlertCircle className="h-5 w-5 mb-1" />
                    ) : (
                      <Icon className="h-5 w-5 mb-1" />
                    )}
                    <span className="mobile-nav-label text-xs font-medium">
                      {isItemLoading(item.id) ? 'Loading' : 
                       hasItemError(item.id) ? 'Error' :
                       (item.label.length > 8 ? item.label.substring(0, 6) + '..' : item.label)}
                    </span>
                    
                    {/* Active indicator */}
                    {activeModule === item.id && !isItemLoading(item.id) && !hasItemError(item.id) && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                    )}
                    
                    {/* Loading progress indicator */}
                    {isItemLoading(item.id) && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300 ease-out"
                          style={{ width: `${getItemLoadingState(item.id)?.progress || 0}%` }}
                        />
                      </div>
                    )}
                    
                    {/* Error indicator */}
                    {hasItemError(item.id) && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Curved cutout using CSS */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-6 bg-gray-50 dark:bg-dark-950 rounded-b-full"></div>
          </div>
          
          {/* Border with curve cutout */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-px bg-gray-50 dark:bg-dark-950"></div>
          </div>
          
          {/* Floating Action Button - positioned to appear "carved out" */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <button
              onClick={toggleMenu}
              className={`fab relative flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-all duration-300 transform border-4 border-white dark:border-gray-800 ${
                isMenuOpen 
                  ? 'bg-red-500 hover:bg-red-600 rotate-45 scale-110' 
                  : 'bg-blue-500 hover:bg-blue-600 scale-100'
              }`}
              style={{
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)'
              }}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Plus className="h-6 w-6 text-white" />
              )}
              
              {/* Notification badge */}
              {!isMenuOpen && secondaryItems.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white dark:border-gray-800">
                  {secondaryItems.length > 9 ? '9+' : secondaryItems.length}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom padding for content to account for bottom nav */}
      <div className="h-16 lg:hidden"></div>
    </>
  );
};

export default BottomNavigation;