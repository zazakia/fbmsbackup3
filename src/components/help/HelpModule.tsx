import React, { useState } from 'react';
import { 
  Book, 
  HelpCircle, 
  FileText, 
  Users, 
  Shield, 
  Wrench, 
  Search,
  ChevronRight,
  ExternalLink,
  Download,
  Star,
  Clock,
  User,
  UserCheck,
  Crown,
  Database,
  ArrowLeft,
  Home
} from 'lucide-react';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';

interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: HelpContent[];
  roles: string[];
  category: 'user' | 'admin' | 'training' | 'technical';
}

interface HelpContent {
  id: string;
  title: string;
  description: string;
  type: 'guide' | 'tutorial' | 'reference' | 'troubleshooting';
  estimatedTime?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: string;
  tags: string[];
  downloadUrl?: string;
}

const HelpModule: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<HelpContent | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const helpSections: HelpSection[] = [
    // User Documentation
    {
      id: 'user-guide',
      title: 'User Guides',
      description: 'Complete guides for all FBMS features',
      icon: Book,
      category: 'user',
      roles: ['admin', 'manager', 'cashier', 'accountant'],
      content: [
        {
          id: 'getting-started',
          title: 'Getting Started',
          description: 'Learn the basics of using FBMS',
          type: 'tutorial',
          estimatedTime: '15 min',
          difficulty: 'beginner',
          tags: ['basics', 'login', 'navigation'],
          content: `# Getting Started with FBMS

## Welcome to FBMS
The Filipino Business Management System (FBMS) is designed to help you manage your business efficiently.

## First Steps
1. **Login**: Use your provided credentials
2. **Dashboard**: Familiarize yourself with the main dashboard
3. **Navigation**: Learn to use the sidebar menu
4. **Profile**: Complete your user profile

## Key Features
- **Point of Sale (POS)**: Process sales transactions
- **Inventory Management**: Track products and stock
- **Customer Management**: Maintain customer database
- **Reports**: Generate business insights
- **Multi-user Support**: Different roles and permissions

## Getting Help
- Use this Help module for documentation
- Contact your supervisor for training
- Check troubleshooting guides for common issues

Ready to start? Explore the other sections for detailed guides on each feature.`
        },
        {
          id: 'pos-system',
          title: 'Point of Sale (POS)',
          description: 'Complete POS system guide',
          type: 'guide',
          estimatedTime: '20 min',
          difficulty: 'beginner',
          tags: ['pos', 'sales', 'payments'],
          content: `# Point of Sale (POS) System

## Overview
The POS system is your main tool for processing customer transactions.

## Starting a Sale
1. **Access POS**: Click "POS" in the sidebar
2. **Add Products**: Click product tiles or use search
3. **Adjust Quantities**: Use +/- buttons
4. **Apply Discounts**: Click discount button if needed
5. **Select Customer**: Optional customer selection
6. **Process Payment**: Choose payment method and complete

## Payment Methods
- **Cash**: Enter amount received, system calculates change
- **GCash**: Generate QR code for customer
- **PayMaya**: Credit/debit cards and digital wallet
- **Bank Transfer**: Provide bank details

## Tips for Success
- Double-check items and quantities
- Verify payment amounts
- Always provide receipts
- Thank customers for their business

## Troubleshooting
- If product won't add: Check stock levels
- If payment fails: Try different method
- If receipt won't print: Check printer status`
        },
        {
          id: 'inventory-basics',
          title: 'Inventory Basics',
          description: 'Understanding inventory management',
          type: 'guide',
          estimatedTime: '25 min',
          difficulty: 'intermediate',
          tags: ['inventory', 'products', 'stock'],
          content: `# Inventory Management Basics

## Overview
Inventory management helps you track products, stock levels, and movements.

## Key Concepts
- **SKU**: Stock Keeping Unit - unique product identifier
- **Stock Level**: Current quantity available
- **Reorder Point**: When to restock
- **Categories**: Product organization

## Viewing Inventory
1. Navigate to Inventory in sidebar
2. Browse products by category
3. Use search to find specific items
4. Check stock levels and status

## Stock Alerts
- **Low Stock**: Yellow warning when stock is low
- **Out of Stock**: Red indicator when no stock
- **Reorder Alerts**: Automatic notifications

## For Cashiers
- You can view inventory but cannot edit
- Report low stock to your supervisor
- Note customer requests for out-of-stock items

## For Managers
- Add new products and categories
- Adjust stock levels
- Set reorder points
- Generate inventory reports`
        }
      ]
    },

    // Training Materials
    {
      id: 'training',
      title: 'Training Materials',
      description: 'Role-specific training guides',
      icon: Users,
      category: 'training',
      roles: ['admin', 'manager', 'cashier', 'accountant'],
      content: [
        {
          id: 'cashier-training',
          title: 'Cashier Training Guide',
          description: 'Complete training for cashier operations',
          type: 'tutorial',
          estimatedTime: '45 min',
          difficulty: 'beginner',
          tags: ['cashier', 'training', 'pos'],
          downloadUrl: '/docs/training/CASHIER_TRAINING_GUIDE.md',
          content: `# Cashier Training Overview

## Your Role
As a cashier, you're the face of the business. Your responsibilities include:
- Processing sales transactions
- Providing excellent customer service
- Handling payments securely
- Managing basic customer information

## Daily Tasks
- **Opening**: Log in and check system status
- **Sales**: Process customer transactions
- **Payments**: Handle cash and digital payments
- **Closing**: Complete end-of-shift procedures

## Key Skills
- POS system operation
- Payment processing
- Customer service
- Basic troubleshooting

## Training Modules
1. System basics and navigation
2. POS operation and sales processing
3. Payment methods and handling
4. Customer service excellence
5. Daily procedures and best practices

Download the complete training guide for detailed instructions and exercises.`
        },
        {
          id: 'manager-training',
          title: 'Manager Training Guide',
          description: 'Management operations and analytics',
          type: 'tutorial',
          estimatedTime: '60 min',
          difficulty: 'intermediate',
          tags: ['manager', 'training', 'analytics'],
          downloadUrl: '/docs/training/MANAGER_TRAINING_GUIDE.md',
          content: `# Manager Training Overview

## Your Role
As a manager, you oversee operations and make strategic decisions:
- Staff supervision and training
- Inventory management
- Performance monitoring
- Customer relationship management

## Key Areas
- **Operations**: Daily business management
- **Analytics**: Performance tracking and reporting
- **Staff**: Team management and development
- **Strategy**: Business planning and growth

## Management Tools
- Dashboard analytics
- Inventory management
- Staff performance tracking
- Customer relationship tools
- Financial reporting

## Training Modules
1. Dashboard and analytics overview
2. Inventory management and control
3. Staff management and scheduling
4. Customer relationship management
5. Reports and business intelligence

Download the complete training guide for comprehensive management training.`
        }
      ]
    },

    // Troubleshooting
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      description: 'Common issues and solutions',
      icon: Wrench,
      category: 'technical',
      roles: ['admin', 'manager', 'cashier', 'accountant'],
      content: [
        {
          id: 'common-issues',
          title: 'Common Issues',
          description: 'Quick fixes for frequent problems',
          type: 'troubleshooting',
          estimatedTime: '10 min',
          difficulty: 'beginner',
          tags: ['troubleshooting', 'issues', 'solutions'],
          content: `# Common Issues and Quick Fixes

## Login Problems
**Can't log in?**
- Check username and password
- Clear browser cache
- Try incognito/private mode
- Contact your supervisor

## POS Issues
**Product won't add to cart?**
- Check if product is in stock
- Refresh the page
- Try searching for the product
- Report to supervisor if continues

**Payment not working?**
- Check internet connection
- Try different payment method
- Ask customer to retry
- Use cash as backup

## System Slow?
- Close unnecessary browser tabs
- Refresh the page
- Check internet connection
- Restart browser if needed

## Receipt Problems
**Won't print?**
- Check printer power and paper
- Try test print
- Restart printer
- Use digital receipt as backup

## When to Get Help
- System completely down
- Multiple failed transactions
- Data appears incorrect
- Security concerns

## Emergency Contacts
- Supervisor: [Contact Info]
- IT Support: [Contact Info]
- System Admin: [Contact Info]

Remember: Most issues can be fixed quickly. Don't hesitate to ask for help!`
        },
        {
          id: 'pos-troubleshooting',
          title: 'POS Troubleshooting',
          description: 'Specific POS system issues',
          type: 'troubleshooting',
          estimatedTime: '15 min',
          difficulty: 'beginner',
          tags: ['pos', 'troubleshooting', 'payments'],
          content: `# POS System Troubleshooting

## Cart Issues
**Items not adding to cart:**
1. Check product stock status
2. Verify product is active
3. Refresh browser page
4. Clear browser cache

**Wrong quantities:**
1. Use +/- buttons to adjust
2. Click quantity to type exact number
3. Remove and re-add if needed

## Payment Issues
**GCash not working:**
1. Check internet connection
2. Verify QR code is clear
3. Ask customer to update app
4. Try generating new QR code

**PayMaya failures:**
1. Check card details with customer
2. Try different card
3. Use alternative payment method
4. Contact payment support

**Cash drawer issues:**
1. Check drawer is properly closed
2. Verify cash amounts
3. Count change carefully
4. Report discrepancies immediately

## Receipt Problems
**Printer not responding:**
1. Check power and connections
2. Verify paper is loaded correctly
3. Clear any paper jams
4. Restart printer

**Wrong information on receipt:**
1. Check business settings
2. Verify tax rates
3. Confirm product prices
4. Report to manager

## Performance Issues
**System running slowly:**
1. Close other applications
2. Check internet speed
3. Clear browser cache
4. Restart if necessary

**Frequent crashes:**
1. Update browser
2. Check system requirements
3. Report to IT support
4. Use backup device if available`
        }
      ]
    },

    // Admin Documentation
    {
      id: 'admin-docs',
      title: 'Administrator Guides',
      description: 'System administration and technical guides',
      icon: Shield,
      category: 'admin',
      roles: ['admin'],
      content: [
        {
          id: 'system-admin',
          title: 'System Administration',
          description: 'Complete system administration guide',
          type: 'reference',
          estimatedTime: '45 min',
          difficulty: 'advanced',
          tags: ['admin', 'system', 'configuration'],
          downloadUrl: '/docs/TECHNICAL_ADMINISTRATION_GUIDE.md',
          content: `# System Administration Overview

## Administrator Responsibilities
- User management and permissions
- System configuration and settings
- Security and compliance
- Backup and recovery
- Performance monitoring

## Key Areas
- **User Management**: Create, modify, and deactivate users
- **System Settings**: Configure business rules and parameters
- **Security**: Manage access controls and audit logs
- **Maintenance**: Regular system maintenance tasks
- **Support**: Provide technical support to users

## Daily Tasks
- Monitor system health
- Review user activity logs
- Check backup status
- Address user issues
- Update system settings as needed

## Weekly Tasks
- Review security logs
- Perform system maintenance
- Update user permissions
- Generate system reports
- Plan system improvements

## Monthly Tasks
- Full system backup verification
- Security audit and review
- Performance analysis
- User training assessment
- System update planning

Download the complete technical administration guide for detailed procedures.`
        },
        {
          id: 'backup-recovery',
          title: 'Backup & Recovery',
          description: 'Data protection and recovery procedures',
          type: 'reference',
          estimatedTime: '30 min',
          difficulty: 'advanced',
          tags: ['backup', 'recovery', 'data'],
          downloadUrl: '/docs/BACKUP_RECOVERY_PROCEDURES.md',
          content: `# Backup & Recovery Overview

## Backup Strategy
- **Daily**: Automated database backups
- **Weekly**: Full system backups
- **Monthly**: Archive backups for long-term storage

## Types of Backups
- **Database**: All business data
- **Application**: System files and configurations
- **User Data**: Uploads and documents

## Recovery Procedures
- **Point-in-time**: Restore to specific date/time
- **Full Restore**: Complete system restoration
- **Selective**: Restore specific data or components

## Best Practices
- Test backups regularly
- Maintain multiple backup locations
- Document recovery procedures
- Train staff on emergency procedures

## Emergency Procedures
1. Assess the situation
2. Determine recovery requirements
3. Execute appropriate recovery plan
4. Verify data integrity
5. Resume normal operations

Download the complete backup and recovery guide for detailed procedures and scripts.`
        }
      ]
    }
  ];

  // Filter sections based on user role and search
  const filteredSections = helpSections.filter(section => {
    const roleMatch = section.roles.includes(user?.role || 'cashier');
    const categoryMatch = activeCategory === 'all' || section.category === activeCategory;
    const searchMatch = searchTerm === '' || 
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.content.some(content => 
        content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        content.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        content.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    
    return roleMatch && categoryMatch && searchMatch;
  });

  const categories = [
    { id: 'all', label: 'All Topics', icon: Book },
    { id: 'user', label: 'User Guides', icon: User },
    { id: 'training', label: 'Training', icon: Users },
    { id: 'technical', label: 'Technical', icon: Wrench },
    { id: 'admin', label: 'Administration', icon: Shield }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'advanced': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return Book;
      case 'tutorial': return Users;
      case 'reference': return FileText;
      case 'troubleshooting': return Wrench;
      default: return HelpCircle;
    }
  };

  const formatContent = (text: string) => {
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 mt-8">$2</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3 mt-6">$3</h3>')
      .replace(/^\*\*(.*?)\*\*/gm, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1 list-disc">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 mb-1 list-decimal">$1. $2</li>')
      .replace(/\n\n/g, '</p><p class="mb-4 text-gray-700 dark:text-gray-300">')
      .replace(/^(?!<[h|l|s])/gm, '<p class="mb-4 text-gray-700 dark:text-gray-300">');
  };

  const handleDownload = (content: HelpContent) => {
    if (content.downloadUrl) {
      window.open(content.downloadUrl, '_blank');
    } else {
      // Create downloadable content
      const blob = new Blob([content.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${content.id}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <HelpCircle className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Help & Documentation
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Find guides, tutorials, and support resources for FBMS
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search help topics, guides, and tutorials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar - Help Sections */}
        <div className="lg:col-span-1">
          {selectedContent && (
            <button
              onClick={() => {
                setSelectedContent(null);
                setSelectedSection(null);
              }}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to sections</span>
            </button>
          )}
          
          <div className="space-y-4">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedSection === section.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 dark:border-primary-400'
                      : 'border-gray-200 dark:border-dark-600 hover:border-gray-300 dark:hover:border-dark-500 bg-white dark:bg-dark-800'
                  }`}
                  onClick={() => {
                    setSelectedSection(section.id);
                    setSelectedContent(null);
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-6 w-6 mt-1 ${
                      selectedSection === section.id
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {section.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {section.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {section.content.length} topics
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {!selectedSection && !selectedContent && (
            <div className="text-center py-12">
              <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Welcome to FBMS Help Center
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Select a topic from the sidebar to get started, or use the search bar to find specific information.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                <button
                  onClick={() => setActiveCategory('user')}
                  className="flex items-center justify-center space-x-2 p-3 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:hover:bg-primary-900/30 transition-colors"
                >
                  <User className="h-5 w-5" />
                  <span>User Guides</span>
                </button>
                <button
                  onClick={() => setActiveCategory('training')}
                  className="flex items-center justify-center space-x-2 p-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30 transition-colors"
                >
                  <Users className="h-5 w-5" />
                  <span>Training</span>
                </button>
              </div>
            </div>
          )}

          {selectedSection && !selectedContent && (
            <div>
              {(() => {
                const section = helpSections.find(s => s.id === selectedSection);
                if (!section) return null;

                const Icon = section.icon;
                return (
                  <div>
                    {/* Section Header */}
                    <div className="mb-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <Icon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {section.title}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-400">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Content List */}
                    <div className="space-y-4">
                      {section.content.map((content) => {
                        const TypeIcon = getTypeIcon(content.type);
                        return (
                          <div
                            key={content.id}
                            className="border border-gray-200 dark:border-dark-600 rounded-lg p-4 hover:border-gray-300 dark:hover:border-dark-500 cursor-pointer transition-colors bg-white dark:bg-dark-800"
                            onClick={() => setSelectedContent(content)}
                          >
                            <div className="flex items-start space-x-4">
                              <TypeIcon className="h-6 w-6 text-gray-400 mt-1" />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    {content.title}
                                  </h3>
                                  <div className="flex items-center space-x-2">
                                    {content.downloadUrl && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownload(content);
                                        }}
                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        title="Download"
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>
                                    )}
                                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                  </div>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                                  {content.description}
                                </p>
                                <div className="flex items-center space-x-4 text-xs">
                                  <span className={`px-2 py-1 rounded-full ${getDifficultyColor(content.difficulty)}`}>
                                    {content.difficulty}
                                  </span>
                                  {content.estimatedTime && (
                                    <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                                      <Clock className="h-3 w-3" />
                                      <span>{content.estimatedTime}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-1">
                                    {content.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="px-2 py-1 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {selectedContent && (
            <div>
              {/* Content Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {selectedContent.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {selectedContent.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className={`px-3 py-1 rounded-full ${getDifficultyColor(selectedContent.difficulty)}`}>
                        {selectedContent.difficulty}
                      </span>
                      {selectedContent.estimatedTime && (
                        <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>{selectedContent.estimatedTime}</span>
                        </div>
                      )}
                      {selectedContent.downloadUrl && (
                        <button
                          onClick={() => handleDownload(selectedContent)}
                          className="flex items-center space-x-1 px-3 py-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Full Guide</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <div 
                  className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 p-6"
                  dangerouslySetInnerHTML={{ 
                    __html: formatContent(selectedContent.content)
                  }}
                />
              </div>

              {/* Content Footer */}
              <div className="mt-8 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Was this helpful?
                    </span>
                    <div className="flex items-center space-x-2">
                      <button className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30 transition-colors">
                        <Star className="h-4 w-4" />
                        <span>Yes</span>
                      </button>
                      <button className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-300 dark:hover:bg-dark-500 transition-colors">
                        <span>No</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Need more help? Contact your supervisor or IT support.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpModule;