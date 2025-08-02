---
inclusion: always
---

# Filipino Business Management System (FBMS)

FBMS is a comprehensive web-based ERP solution designed specifically for small businesses in the Philippines. The system incorporates local business practices, BIR compliance, and Filipino business culture.

## Product Architecture Patterns

### Enhanced Version System
- **Standard/Enhanced Toggle**: All major modules support dual-mode operation
- **Feature Gating**: Advanced features (barcode scanning, multi-location, real-time analytics) behind enhanced mode
- **Settings-Driven**: Module visibility and features controlled via `settingsStore`
- **Lazy Loading**: Enhanced components loaded on-demand to optimize performance

### Role-Based Access Control
- **Hierarchical Permissions**: Admin > Manager > Cashier/Accountant
- **Component-Level Guards**: Use `PermissionGuard` wrapper for sensitive features
- **Store-Based Auth**: Authentication state managed in `supabaseAuthStore`
- **Route Protection**: All admin routes require proper role validation

## Business Domain Rules

### Philippine Compliance Requirements
- **VAT Rate**: Always 12% for applicable transactions
- **BIR Forms**: Support 2550M, 2307, 1701Q, 1604CF generation
- **Government Rates**: SSS, PhilHealth, Pag-IBIG rates must be configurable
- **13th Month Pay**: Automatic calculation based on local labor laws

### Payment Processing
- **Local Methods**: Cash, GCash, PayMaya, bank transfers
- **QR Code Support**: Generate payment QRs for digital wallets
- **Multi-Currency**: PHP primary, USD secondary for imports

### Business Types Support
- **Sari-sari Stores**: Inventory-heavy, small transactions
- **Restaurants**: Table management, kitchen orders
- **Retail Shops**: Barcode scanning, customer loyalty
- **Service Businesses**: Time tracking, project billing

## Code Conventions

### Component Naming
- **Feature Components**: `[Feature]Management.tsx` (e.g., `CustomerManagement.tsx`)
- **Enhanced Versions**: `Enhanced[Feature].tsx` prefix for advanced components
- **Form Components**: `[Entity]Form.tsx` for CRUD operations
- **List Components**: `[Entity]List.tsx` for data display

### State Management Patterns
- **Feature Stores**: Separate Zustand stores per domain (auth, settings, business)
- **Persistence**: Use `persist` middleware for user preferences
- **Real-time Updates**: Supabase subscriptions for live data
- **Optimistic Updates**: Update UI immediately, sync with backend

### Security Patterns
- **Input Sanitization**: All user inputs must be sanitized
- **SQL Injection Prevention**: Use parameterized queries only
- **XSS Protection**: Escape all dynamic content
- **CSRF Protection**: Validate request origins

### Mobile-First Design
- **Responsive Components**: All components must work on mobile
- **Touch-Friendly**: Minimum 44px touch targets
- **Bottom Navigation**: Primary navigation for mobile users
- **Offline Support**: Critical features work without internet

## Development Guidelines

### Testing Requirements
- **Component Tests**: All business logic components require tests
- **Integration Tests**: Critical user flows must be tested
- **Security Tests**: Authentication and authorization flows
- **Performance Tests**: Load testing for POS operations

### Error Handling
- **User-Friendly Messages**: No technical errors shown to users
- **Logging**: All errors logged for debugging
- **Fallback UI**: Graceful degradation when features fail
- **Toast Notifications**: Use `toastStore` for user feedback

### Performance Optimization
- **Code Splitting**: Lazy load non-critical components
- **Image Optimization**: Compress and resize images
- **Database Queries**: Minimize N+1 queries
- **Caching**: Cache frequently accessed data

## Target Users
Small businesses in the Philippines requiring comprehensive business management with local compliance and cultural considerations.