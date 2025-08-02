# Project Structure

## Root Directory
- **src/**: Main application source code
- **public/**: Static assets
- **supabase/**: Database migrations and configuration
- **scripts/**: Deployment and utility scripts
- **database-files/**: SQL setup and migration files
- **Docu/**: Project documentation
- **archive/**: Archived code and documentation

## Source Code Organization (`src/`)

### Core Application
- **main.tsx**: Application entry point with dev setup
- **App.tsx**: Main application component with routing and layout
- **index.css**: Global styles and Tailwind imports
- **vite-env.d.ts**: Vite type definitions

### Components (`src/components/`)
Organized by feature domains:

#### Core UI Components
- **Dashboard.tsx**: Main dashboard with analytics
- **Header.tsx**: Top navigation bar
- **Sidebar.tsx**: Left navigation menu
- **BottomNavigation.tsx**: Mobile bottom navigation
- **LoadingSpinner.tsx**: Loading states
- **ErrorBoundary.tsx**: Error handling wrapper
- **ProtectedRoute.tsx**: Authentication guard
- **PermissionGuard.tsx**: Role-based access control

#### Feature Modules
- **auth/**: Authentication components (login, register, OAuth)
- **pos/**: Point of sale system components
- **inventory/**: Inventory management components
- **customers/**: Customer management components
- **purchases/**: Purchase order components
- **accounting/**: Financial and accounting components
- **payroll/**: Employee and payroll components
- **reports/**: Analytics and reporting components
- **settings/**: System configuration components
- **admin/**: Admin-only components
- **test/**: Testing and diagnostic components

### State Management (`src/store/`)
- **supabaseAuthStore.ts**: Authentication state
- **settingsStore.ts**: User preferences and module settings
- **themeStore.ts**: Dark/light theme management
- **notificationStore.ts**: In-app notifications
- **toastStore.ts**: Toast notifications
- **businessStore.ts**: Business data and metrics

### Utilities (`src/utils/`)
- **supabase.ts**: Database client configuration
- **permissions.ts**: Role-based access control logic
- **validation.ts**: Form and data validation
- **formatters.ts**: Data formatting utilities
- **security.ts**: Security and sanitization functions
- **lazyComponents.ts**: Code splitting configuration
- **devCommands.ts**: Development utilities

### API Layer (`src/api/`)
- **customers.ts**: Customer CRUD operations
- **products.ts**: Product management
- **sales.ts**: Sales transaction handling
- **accounting.ts**: Financial operations
- **users.ts**: User management
- **settings.ts**: System settings

### Types (`src/types/`)
- **auth.ts**: Authentication type definitions
- **business.ts**: Business domain types
- **settings.ts**: Configuration types

### Hooks (`src/hooks/`)
- **useDebounce.ts**: Input debouncing
- **useSafeForm.ts**: Form validation and security
- **useSecurity.ts**: Security monitoring

### Services (`src/services/`)
- **inventoryMonitor.ts**: Automated inventory alerts
- **customerNotifications.ts**: Customer communication
- **adminMonitoring.ts**: System monitoring

### Styles (`src/styles/`)
- **mobile-responsive.css**: Mobile-specific styles
- **mobile.css**: Additional mobile optimizations

## Database Structure (`supabase/`)
- **config.toml**: Supabase configuration
- **migrations/**: Database schema migrations with timestamps
  - User management and authentication
  - Business data tables
  - Security policies (RLS)
  - Audit logging

## Scripts (`scripts/`)
- **deploy.sh**: Production deployment
- **git-workflow.sh**: Git automation
- **quick-push.js**: Automated commit and push
- **backup-and-protect.sh**: Data backup utilities

## Configuration Files
- **package.json**: Dependencies and scripts
- **vite.config.ts**: Build configuration with testing setup
- **tailwind.config.js**: Styling configuration with Philippine theme
- **tsconfig.json**: TypeScript configuration
- **eslint.config.js**: Code quality rules
- **netlify.toml**: Deployment configuration

## Naming Conventions
- **Components**: PascalCase (e.g., `CustomerManagement.tsx`)
- **Utilities**: camelCase (e.g., `formatCurrency.ts`)
- **Constants**: UPPER_SNAKE_CASE
- **CSS classes**: Tailwind utility classes
- **Database tables**: snake_case
- **API endpoints**: kebab-case

## Code Organization Patterns
- **Feature-based structure**: Components grouped by business domain
- **Lazy loading**: Heavy components loaded on demand
- **Store separation**: Each domain has its own state store
- **Permission guards**: Access control at component level
- **Enhanced versions**: Standard/advanced feature toggles
- **Mobile-first**: Responsive design with mobile considerations