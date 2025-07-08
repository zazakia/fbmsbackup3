import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Book,
  FileText,
  CheckSquare,
  Keyboard,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  Search,
  ChevronRight,
  ChevronDown,
  Info,
  Lightbulb,
  Settings,
  Shield,
  Zap,
  Users,
  Target,
  Clipboard,
  PlayCircle,
  Download,
  Upload,
  Code,
  Bug,
  AlertTriangle,
  X,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  BarChart3,
  DollarSign,
  Package,
  Receipt,
  Building2,
  UserCheck,
  Wrench
} from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  category: 'getting-started' | 'features' | 'troubleshooting' | 'development' | 'support';
}

const HelpMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [todoContent, setTodoContent] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load todo.md content
    fetch('/todo.md')
      .then(response => response.text())
      .then(content => setTodoContent(content))
      .catch(error => console.log('Todo.md not found in public folder'));
  }, []);

  const categories = [
    { id: 'all', label: 'All Topics', icon: <Book className="h-4 w-4" /> },
    { id: 'getting-started', label: 'Getting Started', icon: <PlayCircle className="h-4 w-4" /> },
    { id: 'features', label: 'Features', icon: <Zap className="h-4 w-4" /> },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: <Bug className="h-4 w-4" /> },
    { id: 'development', label: 'Development', icon: <Code className="h-4 w-4" /> },
    { id: 'support', label: 'Support', icon: <MessageCircle className="h-4 w-4" /> }
  ];

  const keyboardShortcuts = [
    { key: 'Ctrl + K', description: 'Quick search' },
    { key: 'Ctrl + N', description: 'New record' },
    { key: 'Ctrl + S', description: 'Save current form' },
    { key: 'Ctrl + E', description: 'Export current data' },
    { key: 'Ctrl + D', description: 'Dashboard' },
    { key: 'Ctrl + I', description: 'Inventory' },
    { key: 'Ctrl + P', description: 'POS System' },
    { key: 'Ctrl + R', description: 'Reports' },
    { key: 'Esc', description: 'Close modal/menu' },
    { key: 'Tab', description: 'Navigate between fields' },
    { key: 'Enter', description: 'Submit form' },
    { key: 'F1', description: 'Help menu' }
  ];

  const faqData = [
    {
      question: "How do I reset my password?",
      answer: "Go to Settings > Account > Security and click 'Change Password'. You'll need to enter your current password and a new password."
    },
    {
      question: "Why is my data not syncing?",
      answer: "Check your internet connection and ensure you're logged in. If issues persist, try refreshing the page or contact support."
    },
    {
      question: "How do I generate BIR forms?",
      answer: "Navigate to Reports > BIR Forms. Select the appropriate form type and date range, then click 'Generate PDF'."
    },
    {
      question: "Can I use FBMS offline?",
      answer: "Basic POS functionality works offline, but syncing requires an internet connection. Full offline mode is planned for future updates."
    },
    {
      question: "How do I add new users?",
      answer: "Only admins can add users. Go to Admin > User Management, click 'Add User', and assign appropriate roles."
    },
    {
      question: "What payment methods are supported?",
      answer: "Currently supports cash, GCash, and PayMaya. Additional payment methods are being integrated."
    }
  ];

  const helpSections: HelpSection[] = [
    {
      id: 'quick-start',
      title: 'Quick Start Guide',
      icon: <PlayCircle className="h-5 w-5" />,
      category: 'getting-started',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">1. Set Up Your Business</h4>
              <p className="text-sm text-blue-800">Configure your business details, branches, and initial inventory.</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">2. Add Products</h4>
              <p className="text-sm text-green-800">Import or manually add your products with pricing and stock levels.</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">3. Configure Users</h4>
              <p className="text-sm text-purple-800">Set up user accounts with appropriate roles and permissions.</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-semibold text-orange-900 mb-2">4. Start Selling</h4>
              <p className="text-sm text-orange-800">Use the POS system to process sales and manage transactions.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'features-overview',
      title: 'Features Overview',
      icon: <Zap className="h-5 w-5" />,
      category: 'features',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
              <div>
                <h4 className="font-medium">Point of Sale</h4>
                <p className="text-sm text-gray-600">Complete POS system with receipt printing</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
              <div>
                <h4 className="font-medium">Inventory Management</h4>
                <p className="text-sm text-gray-600">Track stock levels and automate reordering</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
              <div>
                <h4 className="font-medium">Analytics & Reports</h4>
                <p className="text-sm text-gray-600">Detailed insights and BIR compliance</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Receipt className="h-6 w-6 text-orange-600" />
              <div>
                <h4 className="font-medium">Accounting</h4>
                <p className="text-sm text-gray-600">Financial management and tax reporting</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Building2 className="h-6 w-6 text-red-600" />
              <div>
                <h4 className="font-medium">Multi-Branch</h4>
                <p className="text-sm text-gray-600">Manage multiple locations from one system</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <UserCheck className="h-6 w-6 text-indigo-600" />
              <div>
                <h4 className="font-medium">User Management</h4>
                <p className="text-sm text-gray-600">Role-based access control</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      icon: <Keyboard className="h-5 w-5" />,
      category: 'features',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keyboardShortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <Info className="h-4 w-4 inline mr-1" />
              Pro tip: Press F1 at any time to open this help menu quickly!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'device-compatibility',
      title: 'Device Compatibility',
      icon: <Monitor className="h-5 w-5" />,
      category: 'features',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Monitor className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-green-900">Desktop</h4>
              <p className="text-sm text-green-800">Fully optimized for desktop use</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Tablet className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold text-blue-900">Tablet</h4>
              <p className="text-sm text-blue-800">Perfect for mobile POS operations</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Smartphone className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold text-purple-900">Mobile</h4>
              <p className="text-sm text-purple-800">Essential features available on mobile</p>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">Browser Requirements</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Chrome 90+ (Recommended)</li>
              <li>• Firefox 88+</li>
              <li>• Safari 14+ (macOS/iOS)</li>
              <li>• Edge 90+</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Common Issues',
      icon: <Bug className="h-5 w-5" />,
      category: 'troubleshooting',
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold text-red-900">Login Issues</h4>
              <p className="text-sm text-red-800">Clear browser cache, check internet connection, or contact admin for password reset.</p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-semibold text-yellow-900">Slow Performance</h4>
              <p className="text-sm text-yellow-800">Close unnecessary tabs, check internet speed, or restart your browser.</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-blue-900">Data Not Syncing</h4>
              <p className="text-sm text-blue-800">Check internet connection and refresh the page. Data will sync automatically when connection is restored.</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-green-900">Print Issues</h4>
              <p className="text-sm text-green-800">Check printer connection and ensure proper drivers are installed.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      icon: <MessageCircle className="h-5 w-5" />,
      category: 'support',
      content: (
        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">{faq.question}</h4>
              <p className="text-sm text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'project-roadmap',
      title: 'Project Roadmap & Todo',
      icon: <Target className="h-5 w-5" />,
      category: 'development',
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Current Project Status: 92% Complete</h4>
            <p className="text-sm text-blue-800">FBMS is nearing completion with most core features implemented.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">✅ Recently Completed</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Security enhancements</li>
                <li>• BIR compliance forms</li>
                <li>• Mobile optimization</li>
                <li>• Performance improvements</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-semibold text-orange-900 mb-2">🔄 In Progress</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Database security (RLS)</li>
                <li>• Advanced reporting</li>
                <li>• Multi-branch features</li>
                <li>• Testing coverage</li>
              </ul>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">🔮 Upcoming Features</h4>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Real payment integration (GCash, PayMaya)</li>
              <li>• PWA offline functionality</li>
              <li>• AI-powered insights</li>
              <li>• Advanced analytics</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'security-guide',
      title: 'Security Best Practices',
      icon: <Shield className="h-5 w-5" />,
      category: 'features',
      content: (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2">🔒 Password Security</h4>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• Use strong, unique passwords</li>
              <li>• Enable two-factor authentication</li>
              <li>• Change passwords regularly</li>
              <li>• Never share login credentials</li>
            </ul>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">🛡️ Data Protection</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Regular data backups</li>
              <li>• Secure network connections</li>
              <li>• Log out when not in use</li>
              <li>• Keep software updated</li>
            </ul>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">👥 User Access</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Assign appropriate user roles</li>
              <li>• Review user permissions regularly</li>
              <li>• Remove inactive users</li>
              <li>• Monitor user activity</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'contact-support',
      title: 'Contact & Support',
      icon: <Phone className="h-5 w-5" />,
      category: 'support',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <Mail className="h-6 w-6 text-blue-600 mb-2" />
              <h4 className="font-semibold text-blue-900">Email Support</h4>
              <p className="text-sm text-blue-800">support@fbms.com</p>
              <p className="text-xs text-blue-700 mt-1">Response within 24 hours</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <Phone className="h-6 w-6 text-green-600 mb-2" />
              <h4 className="font-semibold text-green-900">Phone Support</h4>
              <p className="text-sm text-green-800">+63 2 1234 5678</p>
              <p className="text-xs text-green-700 mt-1">Mon-Fri 9AM-6PM PHT</p>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <MessageCircle className="h-6 w-6 text-purple-600 mb-2" />
            <h4 className="font-semibold text-purple-900">Live Chat</h4>
            <p className="text-sm text-purple-800">Available during business hours for immediate assistance</p>
            <button className="mt-2 text-sm text-purple-700 underline">Start Chat</button>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <Globe className="h-6 w-6 text-gray-600 mb-2" />
            <h4 className="font-semibold text-gray-900">Documentation</h4>
            <p className="text-sm text-gray-800">Comprehensive guides and API documentation</p>
            <button className="mt-2 text-sm text-gray-700 underline">View Documentation</button>
          </div>
        </div>
      )
    }
  ];

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const filteredSections = helpSections.filter(section => {
    const matchesCategory = selectedCategory === 'all' || section.category === selectedCategory;
    const matchesSearch = section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         section.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Help Menu (F1)"
      >
        <HelpCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsOpen(false)} />
      
      {/* Help Menu */}
      <div className="fixed inset-4 bg-white rounded-lg shadow-xl z-50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <HelpCircle className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">FBMS Help Center</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search and Categories */}
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search help topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {filteredSections.map(section => (
              <div key={section.id} className="border rounded-lg">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600">{section.icon}</span>
                    <h3 className="font-semibold text-gray-900">{section.title}</h3>
                  </div>
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {expandedSections.has(section.id) && (
                  <div className="p-4 border-t bg-gray-50">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>FBMS Help Center - Version 2.0</span>
            <div className="flex items-center space-x-4">
              <span>Press F1 for quick access</span>
              <span>•</span>
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HelpMenu;