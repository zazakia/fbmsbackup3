import { useNotificationStore, createInventoryAlert, createSystemNotification } from '../store/notificationStore';
import { useBusinessStore } from '../store/businessStore';

interface InventoryAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  category?: string;
}

interface InventoryThresholds {
  lowStock: number;
  outOfStock: number;
  expiryWarning: number; // days
}

export class InventoryMonitorService {
  private static instance: InventoryMonitorService;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheck: Date = new Date();
  
  // Default thresholds
  private thresholds: InventoryThresholds = {
    lowStock: 10,
    outOfStock: 0,
    expiryWarning: 7
  };

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): InventoryMonitorService {
    if (!InventoryMonitorService.instance) {
      InventoryMonitorService.instance = new InventoryMonitorService();
    }
    return InventoryMonitorService.instance;
  }

  startMonitoring(): void {
    // Check every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkInventoryLevels();
    }, 5 * 60 * 1000);

    // Initial check
    this.checkInventoryLevels();
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  updateThresholds(newThresholds: Partial<InventoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  private checkInventoryLevels(): void {
    const businessStore = useBusinessStore.getState();
    const notificationStore = useNotificationStore.getState();
    const { products } = businessStore;

    if (!products || products.length === 0) {
      return;
    }

    const now = new Date();
    const alerts: InventoryAlert[] = [];
    const expiringSoonProducts: string[] = [];

    products.forEach(product => {
      // Check stock levels
      if (product.stock <= this.thresholds.outOfStock) {
        alerts.push({
          productId: product.id,
          productName: product.name,
          currentStock: product.stock,
          minimumStock: this.thresholds.outOfStock,
          category: product.categoryId
        });
      } else if (product.stock <= this.thresholds.lowStock) {
        alerts.push({
          productId: product.id,
          productName: product.name,
          currentStock: product.stock,
          minimumStock: this.thresholds.lowStock,
          category: product.categoryId
        });
      }

      // Check expiry dates if available
      if (product.expiryDate) {
        const expiryDate = new Date(product.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        
        if (daysUntilExpiry <= this.thresholds.expiryWarning && daysUntilExpiry > 0) {
          expiringSoonProducts.push(product.name);
        }
      }
    });

    // Create notifications for stock alerts
    alerts.forEach(alert => {
      if (alert.currentStock <= this.thresholds.outOfStock) {
        notificationStore.addNotification(createInventoryAlert(
          'Out of Stock Alert',
          `${alert.productName} is out of stock! Current: ${alert.currentStock}`,
          '/inventory'
        ));
      } else {
        notificationStore.addNotification(createInventoryAlert(
          'Low Stock Warning',
          `${alert.productName} is running low. Current: ${alert.currentStock}, Minimum: ${alert.minimumStock}`,
          '/inventory'
        ));
      }
    });

    // Create notification for expiring products
    if (expiringSoonProducts.length > 0) {
      const message = expiringSoonProducts.length === 1
        ? `${expiringSoonProducts[0]} expires within ${this.thresholds.expiryWarning} days`
        : `${expiringSoonProducts.length} products expire within ${this.thresholds.expiryWarning} days`;

      notificationStore.addNotification(createInventoryAlert(
        'Expiry Warning',
        message,
        '/inventory'
      ));
    }

    // Update last check time
    this.lastCheck = now;

    // Create summary notification if there are multiple alerts
    if (alerts.length > 3) {
      notificationStore.addNotification(createSystemNotification(
        'Inventory Summary',
        `${alerts.length} products need attention. Please review your inventory.`,
        'warning'
      ));
    }
  }

  // Manual check method
  checkNow(): void {
    this.checkInventoryLevels();
  }

  // Get current monitoring status
  getStatus(): { isRunning: boolean; lastCheck: Date; thresholds: InventoryThresholds } {
    return {
      isRunning: this.checkInterval !== null,
      lastCheck: this.lastCheck,
      thresholds: this.thresholds
    };
  }
}

// Export singleton instance
export const inventoryMonitor = InventoryMonitorService.getInstance();

// Hook for React components
export const useInventoryMonitor = () => {
  return {
    checkNow: () => inventoryMonitor.checkNow(),
    updateThresholds: (thresholds: Partial<InventoryThresholds>) => 
      inventoryMonitor.updateThresholds(thresholds),
    getStatus: () => inventoryMonitor.getStatus(),
    start: () => inventoryMonitor.startMonitoring(),
    stop: () => inventoryMonitor.stopMonitoring()
  };
};