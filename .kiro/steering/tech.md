# Technology Stack

## Frontend Framework
- **React 18.3.1** with TypeScript for type safety
- **Vite** as build tool and development server
- **React Router DOM** for client-side routing

## Styling & UI
- **Tailwind CSS** for utility-first styling with custom Philippine-themed colors
- **Lucide React** for consistent iconography
- **Dark mode support** with class-based theme switching
- **Mobile-responsive design** with dedicated mobile styles

## State Management
- **Zustand** for lightweight state management
- **Persist middleware** for localStorage persistence
- Store pattern: separate stores for auth, settings, notifications, theme, toast, business data

## Backend & Database
- **Supabase** for backend-as-a-service
- **PostgreSQL** database with Row Level Security (RLS)
- **Supabase Auth** for authentication with OAuth support (Google, GitHub)
- **Real-time subscriptions** for live data updates

## Testing
- **Vitest** as test runner
- **React Testing Library** for component testing
- **jsdom** environment for browser simulation
- **Coverage reporting** with text, JSON, and HTML formats

## Development Tools
- **ESLint** with TypeScript and React plugins
- **TypeScript** with strict configuration
- **PostCSS** with Autoprefixer
- **pnpm** as package manager (preferred)

## Build & Deployment
- **Netlify** for production deployment
- **Vercel** support with configuration
- **Environment variables** for configuration management
- **Code splitting** with manual chunks for optimization

## Common Commands

### Development
```bash
pnpm dev          # Start development server (port 5180)
pnpm build        # Build for production
pnpm preview      # Preview production build
```

### Testing
```bash
pnpm test         # Run tests
pnpm test:ui      # Run tests with UI
pnpm test:coverage # Run tests with coverage
```

### Code Quality
```bash
pnpm lint         # Run ESLint
```

### Deployment
```bash
pnpm deploy       # Build and deploy to Netlify
pnpm deploy:staging    # Deploy to staging
pnpm deploy:production # Deploy to production
```

### Git Workflow
```bash
pnpm push         # Quick push with auto-generated commit
pnpm git:workflow # Run git workflow script
```

## Key Libraries
- **@supabase/supabase-js**: Database and auth client
- **date-fns**: Date manipulation and formatting
- **recharts**: Chart and analytics components
- **html2canvas + jspdf**: PDF generation for reports
- **react-router-dom**: Client-side routing

## Performance Optimizations
- **Lazy loading** with React.lazy for code splitting
- **Manual chunks** for vendor libraries
- **Tree shaking** enabled
- **CSS minification** in production
- **Image optimization** and responsive loading