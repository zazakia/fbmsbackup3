import React, { useState, useEffect } from 'react';
import { 
  Book, 
  Download, 
  ExternalLink, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Home,
  Bookmark,
  Share,
  Print,
  Eye,
  FileText
} from 'lucide-react';

interface DocumentationViewerProps {
  documentPath?: string;
  onClose?: () => void;
}

const DocumentationViewer: React.FC<DocumentationViewerProps> = ({ 
  documentPath, 
  onClose 
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSection, setCurrentSection] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);

  // Sample documentation content - in a real app, this would be fetched from the server
  const documentationSections = {
    'getting-started': {
      title: 'Getting Started with FBMS',
      content: `# Getting Started with FBMS

## Welcome to the Filipino Business Management System

FBMS is a comprehensive business management solution designed specifically for Filipino businesses. This guide will help you get started with the system.

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for cloud features
- Mobile device or tablet for mobile POS operations

### First Login
1. **Navigate to your FBMS URL**
2. **Click "Login"** and enter your credentials
3. **If first-time user**, click "Register" to create account
4. **Verify your email address** if required
5. **Complete your profile setup**

### Dashboard Overview
The main dashboard provides:
- **Quick Stats**: Sales, inventory, customers overview
- **Recent Transactions**: Latest sales and activities
- **Notifications**: System alerts and reminders
- **Quick Actions**: Fast access to common tasks

### Navigation
- **Desktop**: Use the sidebar menu on the left
- **Mobile/Tablet**: Use the bottom navigation bar
- **Search**: Use the search bar to find products, customers, or features quickly

### User Roles
FBMS supports different user roles with specific permissions:
- **Admin**: Full system access and configuration
- **Manager**: Operations management and reporting
- **Cashier**: Point of sale and basic customer management
- **Accountant**: Financial management and compliance

### Getting Help
- Use the Help menu in the sidebar for documentation
- Contact support for technical assistance
- Check the troubleshooting guide for common issues

## Next Steps
1. Complete your profile setup
2. Configure your business information
3. Add your first products
4. Set up payment methods
5. Train your staff on the system

Ready to start? Let's move on to the specific features you'll be using most.`
    },
    'pos-system': {
      title: 'Point of Sale (POS) System',
      content: `# Point of Sale (POS) System Guide

## Overview
The FBMS POS system is designed for fast, accurate transaction processing with support for multiple payment methods and customer management.

## Starting a New Sale

### Step 1: Access POS
1. Click "POS" in the navigation menu
2. Or click the shopping cart icon
3. You'll see the POS interface with:
   - Product grid on the left
   - Shopping cart on the right
   - Payment options at the bottom

### Step 2: Add Products to Cart

#### Method 1: Click Products
1. Browse product categories
2. Click on product tiles to add to cart
3. Products appear in the cart with quantity 1

#### Method 2: Search Products
1. Use the search bar at the top
2. Type product name or SKU
3. Click the product from search results

#### Method 3: Barcode Scanning (Enhanced Version)
1. Click the barcode scanner icon
2. Allow camera access when prompted
3. Point camera at product barcode
4. Product automatically adds to cart

## Managing the Shopping Cart

### Adjusting Quantities
- **Increase Quantity**: Click the "+" button
- **Decrease Quantity**: Click the "-" button
- **Set Specific Quantity**: Click on quantity number and type
- **Remove Item**: Click the "X" button

### Applying Discounts
1. Click "Discount" button in cart
2. Choose discount type:
   - **Percentage**: Enter % (e.g., 10 for 10%)
   - **Fixed Amount**: Enter peso amount (e.g., 50 for ₱50)
3. Enter reason for discount
4. Click "Apply"

### Cart Calculations
The cart automatically calculates:
- **Subtotal**: Total before tax and discounts
- **Discount**: Total discount amount
- **Tax (VAT)**: 12% tax on applicable items
- **Total**: Final amount to pay

## Payment Processing

### Available Payment Methods

#### Cash Payment
1. Click "Cash" payment method
2. Enter amount received from customer
3. System calculates change
4. Click "Process Payment"
5. Give change to customer

#### GCash Payment
1. Click "GCash" payment method
2. Enter payment amount
3. System generates QR code
4. Customer scans QR with GCash app
5. Wait for payment confirmation
6. Click "Complete" when confirmed

#### PayMaya Payment
1. Click "PayMaya" payment method
2. Enter payment amount
3. Customer can pay via:
   - PayMaya app
   - Credit/debit card
   - Online banking
4. Wait for payment confirmation
5. Complete transaction

### Split Payments
For customers paying with multiple methods:
1. **First Payment**: Select method, enter partial amount, process
2. **Remaining Balance**: System shows remaining, select second method
3. **Complete Transaction**: All payments processed, generate receipt

## Receipt Generation
After successful payment:
- Receipt automatically generates
- Options to print, email, or SMS
- Contains all transaction details
- Includes business and tax information

## Best Practices
1. **Verify Items**: Double-check products and quantities
2. **Confirm Prices**: Ensure correct pricing
3. **Check Payments**: Verify payment amounts
4. **Provide Receipts**: Always offer receipt to customer
5. **Thank Customers**: End with polite closing`
    },
    'troubleshooting': {
      title: 'Troubleshooting Common Issues',
      content: `# Troubleshooting Guide

## Quick Reference
If you're experiencing issues, try these quick fixes first:
1. Refresh the page (F5 or Ctrl+R)
2. Clear browser cache and cookies
3. Check internet connection
4. Try a different browser
5. Contact your supervisor or IT support

## Authentication Issues

### Problem: Cannot Login
**Symptoms:**
- "Invalid credentials" error with correct password
- Login page keeps refreshing
- Session expires immediately

**Solutions:**
1. **Check Credentials**: Verify username and password
2. **Clear Browser Data**: Clear cookies and cache
3. **Try Incognito Mode**: Use private/incognito browsing
4. **Reset Password**: Use "Forgot Password" feature
5. **Contact Admin**: If problem persists

### Problem: Session Expires Quickly
**Symptoms:**
- Frequent "Session expired" messages
- Automatic logout after short periods

**Solutions:**
1. **Check System Time**: Ensure computer time is correct
2. **Stable Internet**: Maintain stable internet connection
3. **Single Tab**: Use only one FBMS tab at a time
4. **Contact Admin**: May need session timeout adjustment

## POS System Issues

### Problem: Product Won't Add to Cart
**Possible Causes:**
- Product is out of stock
- Product is inactive
- System connection issue

**Solutions:**
1. **Check Stock**: Verify product has available stock
2. **Refresh Page**: Try refreshing the browser
3. **Search Manually**: Use search bar to find product
4. **Contact Supervisor**: If problem continues

### Problem: Barcode Scanner Not Working
**Symptoms:**
- Camera not activating
- Barcodes not recognized
- Scanner interface not appearing

**Solutions:**
1. **Allow Camera Access**: Grant camera permissions
2. **Check Lighting**: Ensure good lighting for scanning
3. **Clean Camera**: Clean device camera lens
4. **Manual Entry**: Enter barcode manually as backup
5. **Try Different Browser**: Some browsers work better

### Problem: Payment Processing Fails
**For Digital Payments (GCash/PayMaya):**
1. **Check Internet**: Ensure stable connection
2. **Retry Payment**: Ask customer to try again
3. **Different Method**: Suggest alternative payment
4. **Contact Support**: If gateway issues persist

**For Cash Payments:**
1. **Verify Amount**: Check amount entered correctly
2. **Calculate Change**: Ensure sufficient change available
3. **Receipt Issues**: Check printer status

## System Performance Issues

### Problem: System Running Slowly
**Symptoms:**
- Pages take long time to load
- Buttons don't respond quickly
- Transactions process slowly

**Solutions:**
1. **Close Tabs**: Close unnecessary browser tabs
2. **Restart Browser**: Close and reopen browser
3. **Check Internet**: Test internet speed
4. **Clear Cache**: Clear browser cache and cookies
5. **Restart Device**: Restart computer/tablet if needed

### Problem: Receipt Won't Print
**Solutions:**
1. **Check Printer**: Ensure printer is on and connected
2. **Paper Check**: Verify printer has paper
3. **Restart Printer**: Turn printer off and on
4. **Digital Receipt**: Use email/SMS as backup
5. **Contact IT**: If printer continues to fail

## Data Issues

### Problem: Missing Transactions
**Symptoms:**
- Sales not appearing in reports
- Customer purchases not recorded
- Inventory not updating

**Solutions:**
1. **Check Date Range**: Verify report date filters
2. **Refresh Data**: Reload the page
3. **Check Permissions**: Ensure you have access to view data
4. **Contact Admin**: May be a sync issue

### Problem: Incorrect Calculations
**Symptoms:**
- Wrong totals in cart
- Tax calculations incorrect
- Discounts not applying properly

**Solutions:**
1. **Verify Settings**: Check tax rates and discount rules
2. **Recalculate**: Remove and re-add items to cart
3. **Manual Check**: Calculate totals manually to verify
4. **Report Issue**: Contact supervisor with details

## Getting Additional Help

### When to Contact Support
- System completely down
- Data corruption or loss
- Security concerns
- Payment gateway failures
- Multiple users affected

### Information to Provide
When contacting support, include:
- Your name and role
- Time when issue occurred
- Steps you were taking
- Error messages (screenshot if possible)
- Browser and device information
- Whether issue affects others

### Emergency Contacts
- **System Administrator**: [Contact Info]
- **Technical Support**: [Contact Info]
- **Manager/Supervisor**: [Contact Info]

### Self-Help Resources
- User manual and documentation
- Video tutorials (if available)
- FAQ section
- Community forum or chat

Remember: Most issues can be resolved quickly with basic troubleshooting. Don't hesitate to ask for help when needed!`
    }
  };

  useEffect(() => {
    if (documentPath && documentationSections[documentPath as keyof typeof documentationSections]) {
      setLoading(true);
      // Simulate loading delay
      setTimeout(() => {
        const doc = documentationSections[documentPath as keyof typeof documentationSections];
        setContent(doc.content);
        setLoading(false);
      }, 500);
    }
  }, [documentPath]);

  const handleDownload = () => {
    if (!content) return;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentPath || 'documentation'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FBMS Documentation',
          text: 'Check out this FBMS documentation',
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Convert markdown-like content to HTML for display
  const formatContent = (text: string) => {
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 mt-8">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3 mt-6">$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4 class="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2 mt-4">$1</h4>')
      .replace(/^\*\*(.*?)\*\*/gm, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
      .replace(/^\* (.*$)/gm, '<li class="ml-4 mb-1">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 mb-1 list-decimal">$1. $2</li>')
      .replace(/\n\n/g, '</p><p class="mb-4 text-gray-700 dark:text-gray-300">')
      .replace(/^(?!<[h|l|s])/gm, '<p class="mb-4 text-gray-700 dark:text-gray-300">');
  };

  if (!documentPath) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Select Documentation
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a document from the help menu to view its contents
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-dark-600">
        <div className="flex items-center space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {documentationSections[documentPath as keyof typeof documentationSections]?.title || 'Documentation'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              FBMS Help Documentation
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className={`p-2 rounded-lg transition-colors ${
              bookmarked 
                ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
            }`}
            title="Bookmark"
          >
            <Bookmark className="h-5 w-5" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            title="Share"
          >
            <Share className="h-5 w-5" />
          </button>
          <button
            onClick={handlePrint}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            title="Print"
          >
            <Print className="h-5 w-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search within this document..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600 p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading documentation...</span>
          </div>
        ) : (
          <div 
            className="prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(content) }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            Was this documentation helpful?
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300">
              👍 Yes
            </button>
            <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
              👎 No
            </button>
            <button className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
              Suggest improvements
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationViewer;