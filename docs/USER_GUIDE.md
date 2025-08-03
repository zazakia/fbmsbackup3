# Filipino Business Management System (FBMS) - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [User Roles and Permissions](#user-roles-and-permissions)
3. [Point of Sale (POS) System](#point-of-sale-pos-system)
4. [Inventory Management](#inventory-management)
5. [Customer Management](#customer-management)
6. [Sales and Reporting](#sales-and-reporting)
7. [Accounting and Finance](#accounting-and-finance)
8. [BIR Compliance](#bir-compliance)
9. [Offline Mode](#offline-mode)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### System Requirements
- **Web Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Internet Connection**: Required for initial setup and data sync
- **Screen Resolution**: Minimum 1024x768 (optimized for mobile and tablet)
- **Operating System**: Windows 10+, macOS 10.15+, Linux Ubuntu 18.04+

### First Time Setup
1. **Access the System**: Open your web browser and navigate to your FBMS URL
2. **Login**: Use your provided credentials to log in
3. **Complete Profile**: Fill in your business information and preferences
4. **Configure Settings**: Set up your business details, tax settings, and preferences

### Navigation Overview
- **Top Navigation**: Quick access to main modules and user settings
- **Sidebar**: Detailed navigation for current module
- **Bottom Navigation** (Mobile): Touch-friendly navigation for mobile devices
- **Quick Actions**: Floating action buttons for common tasks

## User Roles and Permissions

### Admin Role
**Full system access with all permissions:**
- User management and role assignment
- System configuration and settings
- Database management and backups
- Security and audit log access
- All business operations

### Manager Role
**Operations management with restricted admin access:**
- Staff scheduling and management
- Inventory oversight and approvals
- Sales reporting and analytics
- Customer relationship management
- Purchase order approvals

### Cashier Role
**Point of sale focused with limited access:**
- POS system operations
- Basic customer management
- Sales transaction processing
- Inventory viewing (read-only)
- Basic reporting

### Accountant Role
**Financial management and compliance:**
- Accounting and bookkeeping
- Financial reporting
- BIR compliance and tax forms
- Expense management
- Payroll processing

## Point of Sale (POS) System

### Starting a Sale
1. **Select Products**: 
   - Browse product grid or use search
   - Scan barcodes for quick selection
   - Click/tap products to add to cart

2. **Manage Cart**:
   - Adjust quantities using +/- buttons
   - Remove items by clicking the X button
   - Apply discounts if authorized

3. **Select Customer** (Optional):
   - Click "Select Customer" button
   - Search existing customers or add new
   - Apply loyalty points if available

4. **Process Payment**:
   - Click "Process Payment" button
   - Select payment method (Cash, GCash, PayMaya, Bank Transfer)
   - Enter payment details
   - Complete transaction

### Payment Methods

#### Cash Payment
- Enter amount received
- System calculates change automatically
- Print receipt for customer

#### GCash Payment
- Generate QR code for customer
- Customer scans and pays
- Verify payment confirmation
- Complete transaction

#### PayMaya Payment
- Enter customer's PayMaya details
- Process payment through PayMaya API
- Confirm payment status
- Generate receipt

#### Bank Transfer
- Provide bank details to customer
- Verify transfer confirmation
- Update payment status
- Complete transaction

### Offline Mode
When internet connection is lost:
- POS continues to operate normally
- Transactions saved locally
- Automatic sync when connection restored
- Offline indicator shows current status

## Inventory Management

### Product Management
1. **Add New Product**:
   - Navigate to Inventory → Products
   - Click "Add Product" button
   - Fill in product details (name, SKU, price, cost, stock)
   - Set category and supplier
   - Save product

2. **Update Stock**:
   - Find product in inventory list
   - Click "Update Stock" button
   - Enter quantity adjustment
   - Select reason (purchase, adjustment, transfer)
   - Confirm update

3. **Set Reorder Points**:
   - Edit product details
   - Set minimum stock level
   - System alerts when stock falls below threshold
   - Automatic purchase order suggestions

### Stock Movements
- **Stock In**: Receiving inventory from suppliers
- **Stock Out**: Sales and adjustments
- **Transfers**: Moving stock between locations
- **Adjustments**: Corrections and write-offs

### Inventory Reports
- **Stock Levels**: Current inventory status
- **Movement History**: Detailed transaction log
- **Reorder Report**: Items needing replenishment
- **Valuation Report**: Inventory value analysis

## Customer Management

### Customer Profiles
1. **Add New Customer**:
   - Navigate to Customers → Customer List
   - Click "Add Customer" button
   - Enter customer information
   - Set credit limit and discount percentage
   - Save customer profile

2. **Customer Types**:
   - **Individual**: Personal customers
   - **Business**: Corporate customers with tax requirements
   - **VIP**: Special pricing and privileges

### Loyalty Program
- **Points Earning**: 1 point per ₱100 spent
- **Points Redemption**: 1 point = ₱1 discount
- **Tier System**: Bronze, Silver, Gold, Platinum
- **Special Offers**: Tier-based promotions

### Customer Analytics
- **Purchase History**: Complete transaction record
- **Spending Analysis**: Trends and patterns
- **Loyalty Status**: Points balance and tier level
- **Credit Management**: Outstanding balances and limits

## Sales and Reporting

### Sales Dashboard
- **Today's Sales**: Real-time sales metrics
- **Top Products**: Best-selling items
- **Payment Methods**: Distribution analysis
- **Hourly Trends**: Sales patterns throughout the day

### Sales Reports
1. **Daily Sales Report**:
   - Total sales and transactions
   - Payment method breakdown
   - Top-selling products
   - Cashier performance

2. **Monthly Sales Report**:
   - Monthly trends and comparisons
   - Customer analysis
   - Product performance
   - Profit margins

3. **Custom Reports**:
   - Date range selection
   - Filter by product, customer, or cashier
   - Export to PDF, Excel, or CSV
   - Scheduled report generation

## Accounting and Finance

### Chart of Accounts
The system uses a standard Philippine chart of accounts:
- **1000-1999**: Assets (Cash, Inventory, Equipment)
- **2000-2999**: Liabilities (Accounts Payable, Loans)
- **3000-3999**: Equity (Owner's Capital, Retained Earnings)
- **4000-4999**: Income (Sales Revenue, Other Income)
- **5000-5999**: Expenses (COGS, Operating Expenses)

### Journal Entries
- **Automatic Entries**: Generated from sales, purchases, and payments
- **Manual Entries**: For adjustments and corrections
- **Entry Validation**: Ensures debits equal credits
- **Audit Trail**: Complete transaction history

### Financial Statements
1. **Profit & Loss Statement**:
   - Revenue and expense summary
   - Gross and net profit calculation
   - Period comparisons

2. **Balance Sheet**:
   - Assets, liabilities, and equity
   - Financial position snapshot
   - Ratio analysis

3. **Cash Flow Statement**:
   - Operating, investing, and financing activities
   - Cash position analysis
   - Liquidity assessment

## BIR Compliance

### VAT Management
- **VAT Rate**: 12% (Philippine standard)
- **VAT-Exempt Items**: Configurable exemptions
- **VAT Reports**: Monthly and quarterly summaries
- **BIR Form 2550M**: Monthly VAT declaration

### Official Receipts
- **Sequential Numbering**: BIR-compliant receipt numbers
- **Required Information**: Business name, TIN, address
- **Receipt Format**: Standardized BIR format
- **Electronic Receipts**: Email and SMS delivery

### Tax Forms
1. **Form 2550M**: Monthly VAT Declaration
2. **Form 2307**: Certificate of Creditable Tax Withheld
3. **Form 1701Q**: Quarterly Income Tax Return
4. **Form 1604CF**: Certificate of Final Tax Withheld

### Withholding Tax
- **Business Customers**: Automatic withholding calculation
- **Tax Rates**: Configurable rates by transaction type
- **Certificates**: Automatic generation of tax certificates
- **Reporting**: Monthly withholding tax reports

## Offline Mode

### When to Use Offline Mode
- **Internet Outages**: Continue operations without connectivity
- **Slow Connections**: Improve performance in poor network conditions
- **Remote Locations**: Work in areas with limited internet access
- **Testing**: Validate offline functionality

### Offline Capabilities
- **POS Operations**: Complete sales transactions
- **Inventory Updates**: Stock adjustments and movements
- **Customer Management**: Add and update customer information
- **Local Storage**: Secure local data storage

### Data Synchronization
- **Automatic Sync**: When connection is restored
- **Manual Sync**: Force sync with "Sync Now" button
- **Conflict Resolution**: Handles data conflicts intelligently
- **Sync Status**: Visual indicators show sync progress

### Offline Indicators
- **Connection Status**: Online/offline indicator in top bar
- **Pending Transactions**: Count of unsynchronized transactions
- **Sync Progress**: Real-time sync status updates
- **Error Notifications**: Alerts for sync failures

## Troubleshooting

### Common Issues

#### Login Problems
**Issue**: Cannot log in to the system
**Solutions**:
1. Check internet connection
2. Verify username and password
3. Clear browser cache and cookies
4. Try different browser
5. Contact system administrator

#### POS Not Working
**Issue**: Cannot process sales transactions
**Solutions**:
1. Check if products are in stock
2. Verify customer information is correct
3. Ensure payment method is configured
4. Try refreshing the page
5. Switch to offline mode if needed

#### Sync Issues
**Issue**: Offline transactions not syncing
**Solutions**:
1. Check internet connection
2. Click "Sync Now" button manually
3. Check for error messages in sync status
4. Restart the application
5. Contact technical support

#### Printing Problems
**Issue**: Receipts not printing
**Solutions**:
1. Check printer connection and power
2. Verify printer driver installation
3. Test print from browser settings
4. Try different browser
5. Use PDF receipt as backup

### Performance Issues

#### Slow Loading
**Causes and Solutions**:
- **Slow Internet**: Use offline mode or upgrade connection
- **Large Dataset**: Use filters to reduce data load
- **Browser Issues**: Clear cache or try different browser
- **Server Load**: Contact administrator about server capacity

#### Memory Issues
**Causes and Solutions**:
- **Too Many Tabs**: Close unused browser tabs
- **Large Reports**: Use date filters to reduce report size
- **Browser Cache**: Clear browser cache regularly
- **System Resources**: Close other applications

### Getting Help

#### In-App Help
- **Help Menu**: Access contextual help from any screen
- **Tooltips**: Hover over elements for quick help
- **Keyboard Shortcuts**: Press F1 for shortcut list
- **Video Tutorials**: Built-in tutorial videos

#### Support Contacts
- **Technical Support**: support@fbms.ph
- **User Training**: training@fbms.ph
- **Sales Inquiries**: sales@fbms.ph
- **Emergency Support**: +63 2 8123-4567

#### Documentation
- **User Guide**: This comprehensive guide
- **Video Tutorials**: Step-by-step video instructions
- **FAQ**: Frequently asked questions
- **Release Notes**: Latest updates and features

### Best Practices

#### Daily Operations
1. **Start of Day**: Check system status and sync pending transactions
2. **Regular Backups**: Ensure automatic backups are working
3. **Stock Monitoring**: Review low stock alerts
4. **End of Day**: Generate daily sales report and reconcile cash

#### Security
1. **Strong Passwords**: Use complex passwords and change regularly
2. **User Access**: Limit access based on job roles
3. **Data Protection**: Never share login credentials
4. **Regular Updates**: Keep system updated with latest security patches

#### Data Management
1. **Regular Cleanup**: Archive old data periodically
2. **Backup Verification**: Test backup restoration regularly
3. **Data Validation**: Review reports for accuracy
4. **Audit Trails**: Monitor user activities and system changes

---

*This user guide is regularly updated. For the latest version, check the system's help section or contact support.*