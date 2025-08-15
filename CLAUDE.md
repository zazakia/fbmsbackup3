# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
```bash
npm run dev          # Start development server (port 5180)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing
```bash
npm run test         # Run all tests with Vitest
npm run test:ui      # Run tests with UI interface
npm run test:coverage # Run tests with coverage report

# Run specific test file
npm run test <filename>

# Run tests in watch mode
npm run test --watch

# Test by category
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:e2e        # Run end-to-end tests only

# Database test management
npm run test:db:setup   # Setup test database
npm run test:db:start   # Start test database services
npm run test:db:stop    # Stop test database services
npm run test:db:reset   # Reset test database
npm run test:db:seed    # Seed test database with sample data
npm run test:db:status  # Check test database status
```

### Code Quality
```bash
npm run lint         # Run ESLint for code quality checks
```

### Git Workflow & Deployment
```bash
npm run push         # Quick git add, commit, and push
npm run push:deploy  # Quick push with Netlify deployment
npm run push:msg     # Quick push with custom commit message

# Deployment commands
npm run deploy           # Build and deploy to production
npm run deploy:build     # Build for deployment only
npm run deploy:staging   # Deploy to staging environment
npm run deploy:production # Deploy to production environment
npm run git:workflow     # Run git workflow script
npm run git:deploy       # Run git workflow with deployment
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18.3.1 + TypeScript + Vite
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS + Lucide React icons
- **Testing**: Vitest + React Testing Library
- **Storage**: Local Storage (offline-first) + Supabase (cloud sync)

### Application Structure

**Core Architecture**:
- **Modular Design**: 17 business modules (Dashboard, Sales/POS, Inventory, etc.)
- **Enhanced Version System**: Toggle between standard/advanced features for key modules
- **Role-Based Access**: Admin, Manager, Employee, Accountant roles with different permissions
- **Lazy Loading**: All major components are code-split for performance
- **Data Flow**: API layer → Zustand stores → React components
- **Persistence**: Zustand stores persist to localStorage with key `'fbms-business'`

**Key Directories**:
- `src/components/`: All React components organized by feature
- `src/store/`: Zustand stores for state management
- `src/utils/`: Utility functions and helpers
- `src/types/`: TypeScript type definitions
- `src/api/`: API service functions

### State Management Pattern
Uses Zustand stores with persistence:
- `supabaseAuthStore.ts`: Supabase authentication and user management
- `businessStore.ts`: Core business data (products, customers, sales, etc.)
- `themeStore.ts`: Dark/light theme management
- `toastStore.ts`: Notification system
- `settingsStore.ts`: User preferences and application settings
- `notificationStore.ts`: Application notifications and alerts

### Component Organization
Components are organized by business domain:
- `auth/`: Authentication components (login, register, password reset)
- `pos/`: Point of Sale system (standard and enhanced versions)
- `inventory/`: Inventory management (product management, stock movements)
- `accounting/`: Financial management (accounts, journal entries)
- `reports/`: Analytics and reporting (dashboards, custom reports)
- `customers/`: Customer relationship management
- `purchases/`: Supplier and purchase order management
- `expenses/`: Expense tracking and categorization
- `payroll/`: Employee payroll management
- `settings/`: System configuration and user management
- `admin/`: Administrative functions and diagnostics
- `test/`: Testing components and utilities

### Enhanced Version System
Key modules have both standard and enhanced versions:
- **Sales & POS**: Standard vs Enhanced (barcode scanning, advanced discounts)
- **Inventory**: Standard vs Enhanced (multi-location, automated reorder)
- **Accounting**: Standard vs Enhanced (advanced financial metrics)
- **Purchases**: Standard vs Enhanced (supplier analytics, workflow configuration)
- **Reports**: Standard vs Enhanced (interactive dashboards)

### Purchase Order Workflow Configuration System
The enhanced purchases module includes a comprehensive workflow configuration system:
- **Configurable Approval Thresholds**: Set approval requirements based on amount and user roles
- **Email Notification Templates**: Customizable templates for all workflow events
- **Receiving Tolerance Settings**: Control over/under delivery handling
- **Workflow Automation**: Business rules, validation rules, and automation triggers
- **Audit & Compliance**: Complete audit trails and compliance reporting

### Philippine Business Context
This is a business management system specifically designed for Philippine SMEs:
- **BIR Compliance**: Tax forms, VAT calculations, withholding tax
- **Local Payment Methods**: GCash, PayMaya, Bank Transfer integrations
- **Philippine Regulations**: SSS, PhilHealth, Pag-IBIG rates and calculations

## Development Guidelines

### Testing
- Tests are located in `__tests__` directories alongside components
- Use Vitest for unit tests and React Testing Library for component tests
- Current test status: 32/33 tests passing (97% success rate)

### Code Style
- TypeScript strict mode enabled
- ESLint configured with React and TypeScript rules
- Tailwind CSS for styling with dark mode support
- Component naming: PascalCase for components, camelCase for props

### Git Workflow
- Main branch: `main`
- Custom scripts available for quick commits and deployment
- See `Docu/GIT_WORKFLOW.md` for detailed workflow guidance

### Build and Deployment
- Vite for build tooling with optimizations
- Code splitting configured for vendor, UI, charts, store, and utils
- Netlify deployment integration
- Build target: ES2020 with esbuild minification

## Important Files

### Core Application Files
- `src/App.tsx`: Main application component with routing logic and 17-module navigation
- `src/main.tsx`: Application entry point
- `src/utils/lazyComponents.ts`: Lazy-loaded component definitions for performance
- `src/components/Sidebar.tsx`: Main navigation component with role-based access
- `src/components/Header.tsx`: Top navigation bar with user controls
- `src/components/BottomNavigation.tsx`: Mobile-responsive bottom navigation

### Configuration Files
- `vite.config.ts`: Build configuration with test setup and code splitting
- `tailwind.config.js`: Tailwind configuration with dark mode and Philippine theme colors
- `eslint.config.js`: ESLint configuration for code quality
- `tsconfig.json`: TypeScript configuration
- `supabase/config.toml`: Local Supabase development configuration

### Key Utility Files
- `src/utils/permissions.ts`: Role-based access control system
- `src/utils/supabase.ts`: Supabase client configuration and utilities
- `src/utils/validation.ts`: Input validation and sanitization
- `src/contexts/NavigationContext.tsx`: Navigation state management

### Purchase Order Workflow Files
- `src/types/purchaseOrderConfig.ts`: Workflow configuration type definitions
- `src/services/purchaseOrderWorkflowConfigService.ts`: Main configuration service
- `src/services/approvalThresholdService.ts`: Approval request management
- `src/services/receivingToleranceService.ts`: Goods receiving validation
- `src/services/workflowNotificationService.ts`: Enhanced email notifications
- `src/components/purchases/WorkflowConfigurationPanel.tsx`: Configuration UI

## Environment Setup

### Local Development with Supabase
The project is configured for local Supabase development using Docker. Environment variables are pre-configured in `.env.local`.

**Local Supabase Setup**:
```bash
# Start all Supabase services locally
supabase start

# Check status of services
supabase status

# Stop services when done
supabase stop
```

**Default Local URLs**:
- **API**: http://127.0.0.1:54321
- **DB**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Studio**: http://127.0.0.1:54323
- **Inbucket**: http://127.0.0.1:54324

### Application Modes
The application supports three modes:
- **Local Supabase**: Real data persistence with local Docker containers
- **Cloud Supabase**: Real data persistence with cloud Supabase (production)
- **Mock Data**: Development mode when no Supabase connection (data lost on refresh)

### Cloud Supabase Setup (Optional)
For production or cloud development:
1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key from Settings > API
3. Update `.env.local` with production values
4. See `SUPABASE_SETUP_GUIDE.md` for detailed setup instructions

## Quick Start for Development

### With Local Supabase (Recommended)
```bash
# 1. Install dependencies
npm install

# 2. Start local Supabase services
supabase start

# 3. Start development server
npm run dev

# 4. Open browser to http://localhost:5180
```

### Without Supabase (Mock Data Mode)
```bash
# 1. Install dependencies
npm install

# 2. Start development server (will use mock data)
npm run dev

# 3. Open browser to http://localhost:5180
```

### Additional Commands
```bash
npm run test         # Run tests
npm run build        # Build for production
npm run lint         # Run ESLint
supabase status      # Check Supabase services
supabase stop        # Stop Supabase services
```

The application will be available at `http://localhost:5180` in development mode.

## Debugging and Development Tools

### Browser Dev Tools
- React Developer Tools extension recommended
- Redux DevTools for Zustand state inspection
- Network tab for API debugging

### Common Debugging Commands
```bash
# Check Supabase connection status
npm run dev  # Check console for connection logs

# Database migrations
cd supabase && supabase db reset  # Reset local database
cd supabase && supabase db push   # Apply migrations

# Clear application data
# Clear localStorage in browser dev tools
# Or use the admin reset functions in settings
```

### Development Notes
- Port 5180 is configured in vite.config.ts (not the default 5173)
- All major components use lazy loading for performance
- Role-based access is enforced at component level
- Enhanced versions are toggleable via settings
- Mobile-responsive design with bottom navigation for small screens

### Critical Data Flow Architecture

**API Layer Transformations**:
- `src/api/products.ts`: Handles snake_case ↔ camelCase transformations
- Database fields like `min_stock` → `minStock` in TypeScript
- Category relationships: Database `category` (UUID) → Component needs both `category` (name) and `categoryId` (UUID)

**Common Issues & Solutions**:
- **Products not loading**: Check localStorage cache (`'fbms-business'`) for stale data
- **Double transformation errors**: API layer already transforms data, store should use directly
- **Category mapping failures**: Ensure category lookup is working in `getProducts()`
- **Persistence conflicts**: Clear localStorage if data appears stale

### Environment Variable Priority
```
VITE_PUBLIC_SUPABASE_URL (preferred)
├── VITE_SUPABASE_URL (fallback)  
└── SUPABASE_URL (last resort)

VITE_PUBLIC_SUPABASE_ANON_KEY (preferred)
├── VITE_SUPABASE_ANON_KEY (fallback)
└── SUPABASE_ANON_KEY (last resort)
```

## Steering Documents
These documents provide specific guidance for working with this codebase:

- `.claude/steering/product.md`: Product purpose, features, and business rules
- `.claude/steering/tech.md`: Tech stack, build system, and development commands
- `.claude/steering/structure.md`: Project organization and key file locations

- always reference supabase schema.md for database details and structure to understand tables and fields uses

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.