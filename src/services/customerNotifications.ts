import { useNotificationStore, createSystemNotification } from '../store/notificationStore';
import { getCustomers, getCustomerStats } from '../api/customers';
import { Customer } from '../types/business';

interface CustomerAlert {
  customerId: string;
  customerName: string;
  alertType: 'birthday' | 'inactive' | 'credit_limit' | 'anniversary' | 'high_value';
  message: string;
  priority: 'low' | 'medium' | 'high';
}

export class CustomerNotificationService {
  private static instance: CustomerNotificationService;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): CustomerNotificationService {
    if (!CustomerNotificationService.instance) {
      CustomerNotificationService.instance = new CustomerNotificationService();
    }
    return CustomerNotificationService.instance;
  }

  startMonitoring(): void {
    // Check every 6 hours
    this.checkInterval = setInterval(() => {
      this.checkCustomerAlerts();
    }, 6 * 60 * 60 * 1000);

    // Initial check
    this.checkCustomerAlerts();
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkCustomerAlerts(): Promise<void> {
    try {
      const customersResult = await getCustomers({ isActive: true });
      if (customersResult.error || !customersResult.data) {
        return;
      }

      const customers = customersResult.data;
      const alerts = this.generateCustomerAlerts(customers);
      
      const notificationStore = useNotificationStore.getState();

      alerts.forEach(alert => {
        notificationStore.addNotification({
          type: this.getNotificationType(alert.priority),
          title: `Customer Alert: ${alert.alertType.replace('_', ' ').toUpperCase()}`,
          message: alert.message,
          category: 'general',
          actionUrl: `/customers/${alert.customerId}`,
          actionLabel: 'View Customer'
        });
      });

    } catch (error) {
      console.error('Error checking customer alerts:', error);
    }
  }

  private generateCustomerAlerts(customers: Customer[]): CustomerAlert[] {
    const alerts: CustomerAlert[] = [];
    const today = new Date();

    customers.forEach(customer => {
      // Birthday alerts (7 days before birthday)
      if (customer.birthday) {
        const birthday = new Date(customer.birthday);
        const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
        const daysUntilBirthday = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 3600 * 24));
        
        if (daysUntilBirthday >= 0 && daysUntilBirthday <= 7) {
          alerts.push({
            customerId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            alertType: 'birthday',
            message: `${customer.firstName} ${customer.lastName}'s birthday is ${daysUntilBirthday === 0 ? 'today' : `in ${daysUntilBirthday} days`}. Consider sending a special offer!`,
            priority: 'medium'
          });
        }
      }

      // Inactive customer alerts (no purchase in 90 days)
      if (customer.lastPurchase) {
        const daysSinceLastPurchase = Math.ceil((today.getTime() - customer.lastPurchase.getTime()) / (1000 * 3600 * 24));
        
        if (daysSinceLastPurchase >= 90) {
          alerts.push({
            customerId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            alertType: 'inactive',
            message: `${customer.firstName} ${customer.lastName} hasn't made a purchase in ${daysSinceLastPurchase} days. Consider reaching out!`,
            priority: 'low'
          });
        }
      }

      // Credit limit alerts (80% of credit limit reached)
      if (customer.creditLimit > 0 && customer.currentBalance > 0) {
        const creditUtilization = (customer.currentBalance / customer.creditLimit) * 100;
        
        if (creditUtilization >= 80) {
          alerts.push({
            customerId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            alertType: 'credit_limit',
            message: `${customer.firstName} ${customer.lastName} has used ${creditUtilization.toFixed(1)}% of their credit limit (₱${customer.currentBalance.toLocaleString()} / ₱${customer.creditLimit.toLocaleString()})`,
            priority: 'high'
          });
        }
      }

      // Customer anniversary alerts (1 year since registration)
      const daysSinceRegistration = Math.ceil((today.getTime() - customer.createdAt.getTime()) / (1000 * 3600 * 24));
      const anniversaryDays = [365, 730, 1095]; // 1, 2, 3 years
      
      anniversaryDays.forEach(days => {
        if (Math.abs(daysSinceRegistration - days) <= 1) {
          const years = Math.floor(days / 365);
          alerts.push({
            customerId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            alertType: 'anniversary',
            message: `${customer.firstName} ${customer.lastName} is celebrating their ${years} year anniversary with your business!`,
            priority: 'medium'
          });
        }
      });

      // High-value customer alerts (top 10% by total purchases)
      if (customer.totalPurchases >= 100000) { // ₱100,000+
        const daysSinceLastContact = customer.lastContact 
          ? Math.ceil((today.getTime() - customer.lastContact.getTime()) / (1000 * 3600 * 24))
          : 999;
        
        if (daysSinceLastContact >= 30) {
          alerts.push({
            customerId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            alertType: 'high_value',
            message: `High-value customer ${customer.firstName} ${customer.lastName} (₱${customer.totalPurchases.toLocaleString()} lifetime value) hasn't been contacted in ${daysSinceLastContact} days`,
            priority: 'high'
          });
        }
      }
    });

    return alerts;
  }

  private getNotificationType(priority: CustomerAlert['priority']): 'info' | 'success' | 'warning' | 'error' {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  }

  // Manual trigger for specific alerts
  async triggerBirthdayAlerts(): Promise<void> {
    try {
      const customersResult = await getCustomers({ isActive: true });
      if (customersResult.error || !customersResult.data) {
        return;
      }

      const customers = customersResult.data;
      const today = new Date();
      const notificationStore = useNotificationStore.getState();

      customers.forEach(customer => {
        if (customer.birthday) {
          const birthday = new Date(customer.birthday);
          const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
          const daysUntilBirthday = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 3600 * 24));
          
          if (daysUntilBirthday === 0) {
            notificationStore.addNotification(createSystemNotification(
              '🎉 Customer Birthday Today!',
              `${customer.firstName} ${customer.lastName} is celebrating their birthday today!`,
              'success'
            ));
          }
        }
      });
    } catch (error) {
      console.error('Error triggering birthday alerts:', error);
    }
  }

  async triggerInactiveCustomerReport(): Promise<void> {
    try {
      const customersResult = await getCustomers({ isActive: true });
      if (customersResult.error || !customersResult.data) {
        return;
      }

      const customers = customersResult.data;
      const today = new Date();
      const inactiveCustomers = customers.filter(customer => {
        if (!customer.lastPurchase) return true;
        const daysSinceLastPurchase = Math.ceil((today.getTime() - customer.lastPurchase.getTime()) / (1000 * 3600 * 24));
        return daysSinceLastPurchase >= 90;
      });

      if (inactiveCustomers.length > 0) {
        const notificationStore = useNotificationStore.getState();
        notificationStore.addNotification(createSystemNotification(
          'Inactive Customer Report',
          `${inactiveCustomers.length} customers haven't made a purchase in the last 90 days. Consider a re-engagement campaign.`,
          'warning'
        ));
      }
    } catch (error) {
      console.error('Error generating inactive customer report:', error);
    }
  }

  // Get status of monitoring service
  getStatus(): { isRunning: boolean; lastCheck: Date } {
    return {
      isRunning: this.checkInterval !== null,
      lastCheck: new Date() // In a real implementation, this would track the actual last check time
    };
  }
}

// Export singleton instance
export const customerNotificationService = CustomerNotificationService.getInstance();

// Hook for React components
export const useCustomerNotifications = () => {
  return {
    triggerBirthdayAlerts: () => customerNotificationService.triggerBirthdayAlerts(),
    triggerInactiveReport: () => customerNotificationService.triggerInactiveCustomerReport(),
    getStatus: () => customerNotificationService.getStatus(),
    start: () => customerNotificationService.startMonitoring(),
    stop: () => customerNotificationService.stopMonitoring()
  };
};