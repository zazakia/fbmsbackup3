# Claude Memory File

## Project Information
- **Project Name**: FBMS
- **Location**: /home/b/Documents/cursor/FBMS
- **Git Repository**: Yes (main branch)
- **Platform**: Linux 6.14.0-23-generic

## Project Structure
- This appears to be a web application project
- Uses pnpm as package manager (based on pnpm-lock.yaml)
- Has Netlify deployment integration

## Commands
- Build: npm run build / pnpm build
- Test: npm run test / pnpm test  
- Lint: npm run lint / pnpm lint
- Typecheck: npm run typecheck / pnpm typecheck
- Dev: npm run dev / pnpm dev

## Recent Work
- Netlify deployment integration fixes
- Dependency management with pnpm-lock.yaml
- **MAJOR: Role-Based Access Control System Implementation**
  - User Management interface in Settings page
  - Role-based sidebar menu filtering
  - Route protection with PermissionGuard component
  - Supabase auth sync with triggers and RLS policies
  - Comprehensive permission system (admin/manager/cashier/accountant)

## User Management System
- **Components**: UserManagement.tsx, UserForm.tsx, RolePermissions.tsx, PermissionGuard.tsx
- **Database**: Enhanced migrations with auth sync triggers
- **Features**: CRUD operations, role assignment, permission matrix, access control
- **Security**: RLS policies, permission checks, active user validation

## Role Permissions Matrix
- **Admin**: Full system access
- **Manager**: Operational oversight (no user management/system settings)
- **Cashier**: Customer-facing operations (POS, customers, basic inventory)
- **Accountant**: Financial operations (accounting, payroll, BIR, reports)

## Notes
- Clean git status at conversation start
- Role-based access control system fully implemented
- Ready for testing and deployment