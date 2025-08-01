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
```

### Code Quality
```bash
npm run lint         # Run ESLint for code quality checks
```

### Git Workflow
```bash
npm run push         # Quick git add, commit, and push
npm run push:deploy  # Quick push with Netlify deployment
npm run push:msg     # Quick push with custom commit message
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
- **Role-Based Access**: Admin, Manager, Cashier, Accountant roles with different permissions
- **Lazy Loading**: All major components are code-split for performance

**Key Directories**:
- `src/components/`: All React components organized by feature
- `src/store/`: Zustand stores for state management
- `src/utils/`: Utility functions and helpers
- `src/types/`: TypeScript type definitions
- `src/api/`: API service functions

### State Management Pattern
Uses Zustand stores with persistence:
- `authStore.ts`: Authentication and user management
- `businessStore.ts`: Core business data
- `themeStore.ts`: Dark/light theme management
- `toastStore.ts`: Notification system

### Component Organization
Components are organized by business domain:
- `auth/`: Authentication components
- `pos/`: Point of Sale system
- `inventory/`: Inventory management
- `accounting/`: Financial management
- `reports/`: Analytics and reporting

### Enhanced Version System
Key modules have both standard and enhanced versions:
- **Sales & POS**: Standard vs Enhanced (barcode scanning, advanced discounts)
- **Inventory**: Standard vs Enhanced (multi-location, automated reorder)
- **Accounting**: Standard vs Enhanced (advanced financial metrics)
- **Purchases**: Standard vs Enhanced (supplier analytics)
- **Reports**: Standard vs Enhanced (interactive dashboards)

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

- `src/App.tsx`: Main application component with routing logic
- `src/utils/lazyComponents.ts`: Lazy-loaded component definitions
- `src/components/Sidebar.tsx`: Main navigation component
- `vite.config.ts`: Build configuration with test setup
- `tailwind.config.js`: Tailwind configuration with dark mode

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
