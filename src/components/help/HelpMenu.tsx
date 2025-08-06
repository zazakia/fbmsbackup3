import React, { useState } from 'react';
import { 
  HelpCircle, 
  Book, 
  Users, 
  Shield, 
  Wrench, 
  FileText,
  ExternalLink,
  Download,
  ChevronDown,
  ChevronRight,
  User,
  UserCheck,
  Crown,
  Database
} from 'lucide-react';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';

interface HelpMenuItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  type: 'internal' | 'external' | 'download';
  url?: string;
  children?: HelpMenuItem[];
}

const HelpMenu: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const helpMenuItems: HelpMenuItem[] = [
    {
      id: 'user-guides',
      title: 'User Guides',
      description: 'Complete documentation for all FBMS features',
      icon: Book,
      roles: ['admin', 'manager', 'cashier', 'accountant'],
      type: 'internal',
      children: [
        {
          id: 'getting-started',
          title: 'Getting Started',
          description: 'Basic introduction to FBMS',
          icon: User,
          roles: ['admin', 'manager', 'cashier', 'accountant'],
          type: 'internal'
        },
        {
          id: 'pos-system',
          title: 'Point of Sale (POS)',
          description: 'Complete POS system guide',
          icon: FileText,
          roles: ['admin', 'manager', 'cashier'],
          type: 'internal'
        },
        {
          id: 'inventory-management',
          title: 'Inventory Management',
          description: 'Managing products and stock levels',
          icon: Database,
          roles: ['admin', 'manager'],
          type: 'internal'
        },
        {
          id: 'customer-management',
          title: 'Customer Management',
          description: 'Managing customer database and relationships',
          icon: Users,
          roles: ['admin', 'manager', 'cashier'],
          type: 'internal'
        },
        {
          id: 'reports-analytics',
          title: 'Reports & Analytics',
          description: 'Business intelligence and reporting',
          icon: FileText,
          roles: ['admin', 'manager'],
          type: 'internal'
        }
      ]
    },
    {
      id: 'training-materials',
      title: 'Training Materials',
      description: 'Role-specific training guides and tutorials',
      icon: Users,
      roles: ['admin', 'manager', 'cashier', 'accountant'],
      type: 'internal',
      children: [
        {
          id: 'cashier-training',
          title: 'Cashier Training',
          description: 'Complete training for cashier operations',
          icon: UserCheck,
          roles: ['admin', 'manager', 'cashier'],
          type: 'download',
          url: '/docs/training/CASHIER_TRAINING_GUIDE.md'
        },
        {
          id: 'manager-training',
          title: 'Manager Training',
          description: 'Management operations and analytics training',
          icon: Crown,
          roles: ['admin', 'manager'],
          type: 'download',
          url: '/docs/training/MANAGER_TRAINING_GUIDE.md'
        },
        {
          id: 'admin-training',
          title: 'Administrator Training',
          description: 'System administration and technical management',
          icon: Shield,
          roles: ['admin'],
          type: 'download',
          url: '/docs/training/ADMIN_TRAINING_GUIDE.md'
        }
      ]
    },
    {
      id: 'technical-docs',
      title: 'Technical Documentation',
      description: 'System administration and technical guides',
      icon: Shield,
      roles: ['admin'],
      type: 'internal',
      children: [
        {
          id: 'admin-guide',
          title: 'Administrator Guide',
          description: 'Complete system administration guide',
          icon: Shield,
          roles: ['admin'],
          type: 'download',
          url: '/docs/TECHNICAL_ADMINISTRATION_GUIDE.md'
        },
        {
          id: 'backup-recovery',
          title: 'Backup & Recovery',
          description: 'Backup procedures and disaster recovery',
          icon: Database,
          roles: ['admin'],
          type: 'download',
          url: '/docs/BACKUP_RECOVERY_PROCEDURES.md'
        },
        {
          id: 'deployment-guide',
          title: 'Deployment Guide',
          description: 'Production deployment procedures',
          icon: FileText,
          roles: ['admin'],
          type: 'internal'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      description: 'Common issues and solutions',
      icon: Wrench,
      roles: ['admin', 'manager', 'cashier', 'accountant'],
      type: 'internal',
      children: [
        {
          id: 'common-issues',
          title: 'Common Issues',
          description: 'Frequently encountered problems and solutions',
          icon: HelpCircle,
          roles: ['admin', 'manager', 'cashier', 'accountant'],
          type: 'download',
          url: '/docs/TROUBLESHOOTING_GUIDE.md'
        },
        {
          id: 'pos-issues',
          title: 'POS System Issues',
          description: 'Point of sale troubleshooting',
          icon: FileText,
          roles: ['admin', 'manager', 'cashier'],
          type: 'internal'
        },
        {
          id: 'payment-issues',
          title: 'Payment Problems',
          description: 'Payment gateway and processing issues',
          icon: FileText,
          roles: ['admin', 'manager', 'cashier'],
          type: 'internal'
        }
      ]
    },
    {
      id: 'quick-reference',
      title: 'Quick Reference',
      description: 'Cheat sheets and quick guides',
      icon: FileText,
      roles: ['admin', 'manager', 'cashier', 'accountant'],
      type: 'internal',
      children: [
        {
          id: 'keyboard-shortcuts',
          title: 'Keyboard Shortcuts',
          description: 'Speed up your workflow with shortcuts',
          icon: FileText,
          roles: ['admin', 'manager', 'cashier', 'accountant'],
          type: 'internal'
        },
        {
          id: 'feature-comparison',
          title: 'Feature Comparison',
          description: 'Standard vs Enhanced features',
          icon: FileText,
          roles: ['admin', 'manager'],
          type: 'internal'
        }
      ]
    }
  ];

  // Filter menu items based on user role
  const filterMenuItems = (items: HelpMenuItem[]): HelpMenuItem[] => {
    return items.filter(item => {
      const hasAccess = item.roles.includes(user?.role || 'cashier');
      if (hasAccess && item.children) {
        item.children = filterMenuItems(item.children);
      }
      return hasAccess;
    });
  };

  const filteredMenuItems = filterMenuItems(helpMenuItems);

  const handleItemClick = (item: HelpMenuItem) => {
    if (item.children && item.children.length > 0) {
      toggleExpanded(item.id);
    } else {
      switch (item.type) {
        case 'download':
          if (item.url) {
            // For documentation files, we'll open them in a new tab for viewing
            window.open(item.url, '_blank');
          }
          break;
        case 'external':
          if (item.url) {
            window.open(item.url, '_blank');
          }
          break;
        case 'internal':
          // Open documentation viewer in a modal or new page
          // For now, we'll show an alert with the content type
          alert(`Opening ${item.title} documentation...`);
          break;
      }
    }
  };

  const renderMenuItem = (item: HelpMenuItem, level: number = 0) => {
    const Icon = item.icon;
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className={`${level > 0 ? 'ml-4' : ''}`}>
        <button
          onClick={() => handleItemClick(item)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <Icon className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-200">
                {item.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.description}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {item.type === 'download' && (
              <Download className="h-4 w-4 text-gray-400" />
            )}
            {item.type === 'external' && (
              <ExternalLink className="h-4 w-4 text-gray-400" />
            )}
            {hasChildren && (
              <ChevronRight 
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`} 
              />
            )}
          </div>
        </button>
        
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 shadow-sm">
      <div className="p-4 border-b border-gray-200 dark:border-dark-600">
        <div className="flex items-center space-x-2">
          <HelpCircle className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Help & Documentation
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Access guides, training materials, and support resources
        </p>
      </div>
      
      <div className="p-2 max-h-96 overflow-y-auto">
        <div className="space-y-1">
          {filteredMenuItems.map(item => renderMenuItem(item))}
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Need additional help?
          </p>
          <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpMenu;