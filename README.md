# 🇵🇭 Filipino Small Business Management System (FBMS)

A comprehensive web-based business management system designed specifically for small businesses in the Philippines, incorporating local business practices, BIR compliance, and Filipino business culture.

![FBMS Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)
![Vite](https://img.shields.io/badge/Vite-5.4.19-purple)
![Tests](https://img.shields.io/badge/Tests-32%2F33%20passing-green)

## 🎯 Overview

FBMS is a complete ERP solution tailored for Philippine small businesses, featuring:

- **Point of Sale (POS)** with BIR-compliant VAT calculation
- **Inventory Management** with stock tracking and alerts
- **Customer Management** with transaction history
- **Financial Management & Accounting** with double-entry bookkeeping
- **Purchase Management** with supplier tracking
- **Expense Tracking** with BIR classification
- **Dashboard Analytics** with real-time KPIs
- **Multi-payment Support** (Cash, GCash, PayMaya, Bank Transfer)
- **Role-based Access Control** for different user types

## ✨ Key Features

### 🛒 Point of Sale System
- Product search and category filtering
- Shopping cart with real-time calculations
- Customer selection and management
- Multiple payment methods (Cash, GCash, PayMaya, Bank Transfer, Credit Card)
- BIR-compliant invoice generation with 12% VAT
- Receipt printing and digital copies

### 📦 Inventory Management
- Product catalog with SKU management
- Stock level monitoring with low stock alerts
- Category management system
- Product variants and pricing
- Inventory valuation tracking
- Barcode support (ready for integration)

### 👥 Customer Management
- Customer database with contact information
- Transaction history tracking
- Credit limit management
- Customer search and filtering
- Balance tracking and statements

### 💰 Financial Management & Accounting ✅ NEW
- **Chart of Accounts**: 34 Philippine-compliant accounts
- **Journal Entries**: Full double-entry bookkeeping system
- **Accounting Dashboard**: Real-time statistics and overview
- **Automatic Balancing**: Debit/credit validation
- **Philippine Compliance**: VAT, withholding tax, SSS, PhilHealth, Pag-IBIG
- **Export Functionality**: CSV export for external reporting
- **Sample Data**: 5 sample journal entries for demonstration

### 📋 Purchase Management ✅ NEW
- Supplier database with contact information
- Purchase order creation and tracking
- Goods received notes
- Purchase invoice matching
- Payment tracking to suppliers
- Purchase analytics and reporting

### 💸 Expense Tracking ✅ NEW
- Expense categories with BIR classification
- Receipt attachment (ready for integration)
- Recurring expense management
- Expense approval workflow
- Petty cash management
- Expense analytics and reporting

### 📊 Dashboard & Analytics
- Real-time business overview
- Key performance indicators (KPIs)
- Sales charts and trends
- Top products tracking
- Recent transactions display
- Alert system for important notifications

### 🔐 Security & Authentication
- JWT-based authentication system
- Role-based access control (Admin, Manager, Cashier, Accountant)
- Password hashing and security
- Session management
- Protected routes and auth guards

## 🛠 Technology Stack

- **Frontend:** React 18.3.1 + TypeScript
- **Styling:** Tailwind CSS + Lucide React Icons
- **State Management:** Zustand
- **Build Tool:** Vite
- **Testing:** Vitest + React Testing Library
- **Package Manager:** pnpm
- **Storage:** Local Storage (offline-first)

## 🌐 Live Demo

**🚀 Live Application:** [https://sme1.zapweb.app](https://sme1.zapweb.app)

**Demo Credentials:**
- **Email:** `admin@fbms.com`
- **Password:** `admin123`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/filipino-business-management-system.git
   cd filipino-business-management-system
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## 📋 Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm preview      # Preview production build

# Testing
pnpm test         # Run tests
pnpm test:ui      # Run tests with UI
pnpm test:coverage # Run tests with coverage

# Linting
pnpm lint         # Run ESLint
```

## 🇵🇭 Philippines-Specific Features

### BIR Compliance
- ✅ 12% VAT calculation (Philippine standard rate)
- ✅ BIR-compliant invoice formatting
- ✅ Sales invoice numbering system
- ✅ Official receipt generation
- ✅ Withholding tax computation (accounts ready)
- ✅ VAT Payable tracking
- 🔄 BIR form generation (planned)

### Local Payment Methods
- ✅ Cash transactions
- ✅ GCash integration
- ✅ PayMaya integration
- ✅ Bank transfers
- ✅ Credit card payments
- 🔄 Check payments (planned)

### Business Types Support
- ✅ Sari-sari store management
- ✅ Retail shops
- ✅ Restaurant/food service
- ✅ Service businesses
- ✅ Trading businesses
- 🔄 Manufacturing (planned)

### Philippine Regulatory Compliance
- ✅ SSS Payable accounts
- ✅ PhilHealth Payable accounts
- ✅ Pag-IBIG Payable accounts
- ✅ Withholding Tax Payable
- 🔄 DTI registration tracking (planned)
- 🔄 Mayor's permit management (planned)

## 📊 Current Status

### ✅ Completed (Phase 1 & 2 - 90% Complete)
- [x] Authentication & Security System
- [x] Dashboard & Analytics
- [x] Point of Sale (POS) System
- [x] Inventory Management
- [x] Customer Management
- [x] **Financial Management & Accounting** ✅ NEW
- [x] **Purchase Management** ✅ NEW
- [x] **Expense Tracking** ✅ NEW
- [x] BIR Compliance (Basic)
- [x] Local Payment Methods
- [x] Comprehensive Testing (32/33 tests)

### 🔄 In Progress (Phase 3)
- [ ] Payroll System
- [ ] Advanced Financial Reporting
- [ ] Multi-branch Management
- [ ] Advanced BIR Compliance

### 📋 Planned (Phase 4)
- [ ] Mobile App
- [ ] Cloud Sync
- [ ] Advanced Analytics
- [ ] API Integration

## 🧪 Testing

The project includes comprehensive testing:

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui
```

**Current Test Status:** 32/33 tests passing (97% success rate)

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/           # Authentication components
│   ├── inventory/      # Inventory management
│   ├── pos/           # Point of Sale system
│   ├── purchases/     # Purchase management
│   ├── expenses/      # Expense tracking
│   ├── accounting/    # Financial management & accounting
│   └── ...            # Other UI components
├── store/             # Zustand state management
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## 🎉 Recent Updates (December 2024)

### ✅ Financial Management & Accounting Module
- **Complete Chart of Accounts** with 34 Philippine-compliant accounts
- **Professional Journal Entry System** with automatic balancing
- **Real-time Accounting Dashboard** with statistics
- **Multi-tab Interface** (Overview, Chart of Accounts, Journal Entries)
- **Export to CSV** for external accountant collaboration
- **Sample Transactions** demonstrating real business scenarios

### ✅ Purchase Management Module
- **Supplier Database** with full CRUD operations
- **Purchase Order Management** with tracking
- **Multi-tab Interface** for suppliers and purchase orders
- **Search and Filter** capabilities

### ✅ Expense Tracking Module
- **Expense Categories** with BIR classification
- **Expense Management** with full CRUD operations
- **Category Management** system
- **Analytics and Reporting** structure

## 🚀 Deployment

The application is deployed on **Netlify** and **Vercel**:

- **Primary:** [https://sme1.zapweb.app](https://sme1.zapweb.app)
- **Backup:** [https://sme3zap.netlify.app](https://sme3zap.netlify.app)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Email: support@fbms.com
- Documentation: [Wiki](https://github.com/yourusername/filipino-business-management-system/wiki)

---

**Built with ❤️ for Philippine Small Businesses** 