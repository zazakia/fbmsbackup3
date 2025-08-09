# Technical Steering Guidelines

## Tech Stack
- Frontend: React 18.3.1 + TypeScript + Vite
- State: Zustand with persistence
- UI: Tailwind CSS + Lucide React icons
- Testing: Vitest + React Testing Library
- Storage: Local Storage + Supabase

## Development Commands
```bash
npm run dev          # Development server (port 5180)
npm run build       # Production build
npm run test        # Run tests
npm run test:ui     # Test UI interface
npm run lint        # ESLint checks
```

## Development Environment
- Local Supabase recommended (Docker-based)
- Default port: 5180
- Node.js environment with npm
- TypeScript strict mode enabled

## Code Conventions
- Component files: PascalCase .tsx
- Utility files: camelCase .ts
- Tests in __tests__ directories
- Lazy loading for all major components
- ESLint with React/TypeScript rules

## State Management
- Use Zustand stores with persistence
- Separate stores by domain (auth, business, theme)
- Local storage for offline-first operation
- Supabase for cloud synchronization

## Deployment
- Vite-based build process
- ES2020 target with esbuild
- Code splitting enabled
- Netlify deployment integration