# Filipino Business Management System (FBMS) - Technical Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Installation and Setup](#installation-and-setup)
4. [Configuration](#configuration)
5. [Database Management](#database-management)
6. [API Documentation](#api-documentation)
7. [Security Implementation](#security-implementation)
8. [Performance Optimization](#performance-optimization)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Backup and Recovery](#backup-and-recovery)
11. [Troubleshooting](#troubleshooting)
12. [Development Guidelines](#development-guidelines)

## System Architecture

### Overview
FBMS is a modern web-based ERP system built with React and TypeScript, designed specifically for Filipino small businesses. The system follows a client-server architecture with offline-first capabilities.

### Architecture Components
- **Frontend**: React 18.3.1 with TypeScript
- **State Management**: Zustand with persistence
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: Tailwind CSS with custom Philippine theme
- **Build Tool**: Vite for fast development and optimized builds
- **Testing**: Vitest with React Testing Library

### System Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   Supabase      │    │   External APIs │
│   (React App)   │◄──►│   Backend       │◄──►│   (GCash, etc.) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Local Storage  │    │   PostgreSQL    │
│  (Offline Data) │    │   Database      │
└─────────────────┘    └─────────────────┘
```

## Technology Stack

### Frontend Technologies
- **React 18.3.1**: Modern React with concurrent features
- **TypeScript 5.0+**: Type-safe JavaScript development
- **Vite 4.0+**: Fast build tool and development server
- **Tailwind CSS 3.0+**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **React Router DOM**: Client-side routing
- **Lucide React**: Modern icon library

### Backend Technologies
- **Supabase**: Backend-as-a-Service platform
- **PostgreSQL 15+**: Primary database
- **Row Level Security (RLS)**: Database-level security
- **Real-time subscriptions**: Live data updates
- **Supabase Auth**: Authentication and authorization

### Development Tools
- **ESLint**: Code linting and quality
- **Prettier**: Code formatting
- **Vitest**: Unit and integration testing
- **React Testing Library**: Component testing
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixes## Ins
tallation and Setup

### Prerequisites
- Node.js 18.0+ (LTS recommended)
- npm 9.0+ or pnpm 8.0+ (preferred)
- Git 2.30+
- Modern web browser for testing

### Local Development Setup
1. **Clone Repository**:
   ```bash
   git clone https://github.com/your-org/fbms.git
   cd fbms
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development Server**:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

### Production Deployment

#### Netlify Deployment
1. **Build Application**:
   ```bash
   pnpm build
   ```

2. **Deploy to Netlify**:
   ```bash
   pnpm deploy
   # or use Netlify CLI
   netlify deploy --prod --dir=dist
   ```

#### Vercel Deployment
1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Configuration

### Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Configuration
VITE_APP_NAME=FBMS
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false

# Payment Integration
VITE_GCASH_MERCHANT_ID=your_gcash_merchant_id
VITE_PAYMAYA_PUBLIC_KEY=your_paymaya_public_key

# BIR Configuration
VITE_BIR_TIN=your_business_tin
VITE_BIR_RDO_CODE=your_rdo_code
```

### Application Settings
The system uses a hierarchical configuration system:
1. **Environment Variables**: System-level configuration
2. **User Settings**: User-specific preferences
3. **Business Settings**: Business-specific configuration
4. **Module Settings**: Feature-specific settings

### Supabase Configuration
```sql
-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own data" ON customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```