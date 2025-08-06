import React, { useState } from 'react';
import { 
  Book, 
  HelpCircle, 
  FileText, 
  Users, 
  Settings, 
  Shield, 
  Database, 
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
  X
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
}

const HelpCenter: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<HelpContent | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const helpSections: HelpSection[] = [
    // User Documentation
    {
      id: 'user-guide',
      title: 'Complete User Guide',
      description: 'Comprehensive guide covering all FBMS features for all user roles',
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

## System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for cloud features
- Mobile device or tablet for mobile POS operations

## First Login
1. Navigate to your FBMS URL
2. Click "Login" and enter your credentials
3. If first-time user, click "Register" to create account
4. Verify your email address if required
5. Complete your profile setup

## Dashboard Overview
The main dashboard provides:
- **Quick Stats**: Sales, inventory, customers overview
- **Recent Transactions**: Latest sales and activities
- **Notifications**: System alerts and reminders
- **Quick Actions**: Fast access to common tasks

## Navigation
- **Desktop**: Use the sidebar menu on the left
- **Mobile/Tablet**: Use the bottom navigation bar
- **Search**: Use the search bar to find products, customers, or features quickly`
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
      section.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return roleMatch && categoryMatch && searchMatch;
  });

  const categories = [
    { id: 'all', label: 'All Topics', icon: Book },
    { id: 'user', label: 'User Guides', icon: User },
    { id: 'training', label: 'Training', icon: Users },
    { id: 'admin', label: 'Administration', icon: Shield },
    { id: 'technical', label: 'Technical', icon: Database }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Help Center
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Find guides, tutorials, and documentation to help you use FBMS effectively
        </p>
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

      {/* Welcome Message */}
      <div className="text-center py-12">
        <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Welcome to the Help Center
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Access comprehensive documentation, training materials, and troubleshooting guides.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="p-6 bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600">
            <Book className="h-8 w-8 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">User Guides</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Step-by-step instructions for all FBMS features
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600">
            <Users className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Training Materials</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Role-specific training for all user types
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600">
            <Wrench className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Troubleshooting</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Solutions for common issues and problems
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;