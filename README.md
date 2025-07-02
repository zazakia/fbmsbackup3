# 🇵🇭 Filipino Business Management System (FBMS)

A comprehensive web-based business management system designed specifically for small businesses in the Philippines, incorporating local business practices, BIR compliance, and Filipino business culture.

![FBMS Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)
![Vite](https://img.shields.io/badge/Vite-5.4.19-purple)
![Tests](https://img.shields.io/badge/Tests-32%2F33%20passing-green)

## �� Quick Overview

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

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/zazakia/filipino-business-management-system.git
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

## 🌐 Live Demo

**🚀 Live Application:** [https://sme1.zapweb.app](https://sme1.zapweb.app)

**Demo Credentials:**
- **Email:** `admin@fbms.com`
- **Password:** `admin123`

## �� Documentation

All project documentation has been moved to the `Docu/` folder for better organization:

### 📖 [Complete Project Documentation](Docu/README.md)
- Detailed feature descriptions
- Philippines-specific features
- Technology stack information
- Current status and roadmap

### �� [Project Plan](Docu/plan.md)
- Development phases and milestones
- Feature implementation roadmap
- Technical architecture decisions

### ✅ [Todo List](Docu/todo.md)
- Current development tasks
- Bug fixes and improvements
- Feature requests and ideas

### 🔄 [Git Workflow Guide](Docu/GIT_WORKFLOW.md)
- Multi-computer development workflow
- Best practices for team collaboration
- Common Git commands and troubleshooting

## �� Technology Stack

- **Frontend:** React 18.3.1 + TypeScript
- **Styling:** Tailwind CSS + Lucide React Icons
- **State Management:** Zustand
- **Build Tool:** Vite
- **Testing:** Vitest + React Testing Library
- **Package Manager:** pnpm
- **Storage:** Local Storage (offline-first)

## 📊 Current Status

### ✅ Completed (Phase 1 & 2 - 90% Complete)
- [x] Authentication & Security System
- [x] Dashboard & Analytics
- [x] Point of Sale (POS) System
- [x] Inventory Management
- [x] Customer Management
- [x] Financial Management & Accounting
- [x] Purchase Management
- [x] Expense Tracking
- [x] BIR Compliance (Basic)
- [x] Local Payment Methods
- [x] Comprehensive Testing (32/33 tests)

### �� In Progress (Phase 3)
- [ ] Payroll System
- [ ] Advanced Financial Reporting
- [ ] Multi-branch Management
- [ ] Advanced BIR Compliance

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
- Documentation: [Wiki](https://github.com/zazakia/filipino-business-management-system/wiki)

---

**Built with ❤️ for Philippine Small Businesses**

---

> 📖 **For detailed documentation, please visit the [Docu/](Docu/) folder**
