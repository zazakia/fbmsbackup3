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

**🚀 Live Application:** [https://sme3zap.netlify.app](https://sme3zap.netlify.app)

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
- 🔄 Withholding tax computation (planned)
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
- 🔄 Manufacturing (planned)
- 🔄 Trading businesses (planned)

## 📊 Current Status

### ✅ Completed (Phase 1 - 85% Complete)
- [x] Authentication & Security System
- [x] Dashboard & Analytics
- [x] Point of Sale (POS) System
- [x] Inventory Management
- [x] Customer Management
- [x] BIR Compliance (Basic)
- [x] Local Payment Methods
- [x] Comprehensive Testing (32/33 tests)

### 🔄 In Progress (Phase 2)
- [ ] Purchase Management
- [ ] Expense Tracking
- [ ] Advanced Financial Reporting
- [ ] Payroll System

### 📋 Planned (Phase 3)
- [ ] Multi-branch Management
- [ ] Advanced BIR Compliance
- [ ] Mobile App
- [ ] Cloud Sync

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
│   └── ...            # Other UI components
├── store/             # Zustand state management
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── test/              # Test setup and utilities
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Target Market

- Small retail stores (10-50 employees)
- Restaurants and food services
- Service-based businesses
- Small manufacturers
- Trading companies
- Sari-sari stores (with growth potential)

## 📞 Support

For support, email support@fbms.com or create an issue in this repository.

## 🙏 Acknowledgments

- Built with ❤️ for Filipino small businesses
- Inspired by local business practices and needs
- Designed with BIR compliance in mind
- Optimized for Philippine market requirements

---

**Made with ���� Filipino Pride** 