# FBMS Security Guide

## 🚨 Critical Security Update

**AUTOMATIC ADMIN CREATION HAS BEEN DISABLED** for security reasons.

## ⚠️ Previous Security Vulnerability

The previous version had a critical security vulnerability:
- **Hardcoded admin credentials**: `admin@fbms.com` / `Qweasd145698@`
- **Automatic admin creation** on any device
- **Auto-login functionality** that granted admin access based on email patterns

**This has been completely removed and fixed.**

## 🔒 Secure Admin Setup Process

### Option 1: Database Direct Assignment (Recommended)

1. **Register a normal user account** through the application
2. **Access your Supabase dashboard**
3. **Navigate to Table Editor → users table**
4. **Find your user record** by email
5. **Update the `role` field** from `employee` to `admin`
6. **Save the changes**
7. **Refresh your application** - you now have admin access

### Option 2: Using Admin Management Interface

1. **Have an existing admin** log into the application
2. **Navigate to Admin → Secure Admin Management**
3. **Select the user** you want to promote
4. **Change their role** to Administrator
5. **Confirm the change**

### Option 3: SQL Query (Advanced)

```sql
-- Update user role to admin (replace with actual user email)
UPDATE users 
SET role = 'admin', updated_at = NOW() 
WHERE email = 'your-admin-email@domain.com';
```

## 🛡️ Security Best Practices

### For Administrators

1. **Never share admin credentials**
2. **Use strong, unique passwords**
3. **Enable 2FA when available**
4. **Regularly audit user roles**
5. **Remove unnecessary admin access**
6. **Monitor security events through the Security Dashboard**

### For Developers

1. **Never commit hardcoded credentials**
2. **Use environment variables for sensitive data**
3. **Follow principle of least privilege**
4. **Regularly review authentication code**
5. **Test security measures in staging**

### For Production Deployment

1. **Change all default credentials**
2. **Enable all security headers**
3. **Configure rate limiting**
4. **Set up monitoring and logging**
5. **Regular security audits**

## 🔧 Security Features Implemented

### Authentication Security
- ✅ No hardcoded credentials
- ✅ Default users get lowest privilege (employee)
- ✅ Manual role assignment required
- ✅ Session management
- ✅ Input sanitization

### Production Security
- ✅ Content Security Policy (CSP)
- ✅ Security headers (HSTS, XSS protection, etc.)
- ✅ Rate limiting by operation type
- ✅ Environment validation
- ✅ File upload validation

### Database Security
- ✅ Row Level Security (RLS) policies
- ✅ Role-based access control
- ✅ Business data separation
- ✅ Audit logging
- ✅ Multi-tenancy support

### Monitoring & Auditing
- ✅ Security event logging
- ✅ Rate limit monitoring
- ✅ CSP violation reporting
- ✅ Admin management interface
- ✅ Security dashboard

## 🚦 User Role Hierarchy

1. **employee** - Lowest privileges, basic access
2. **cashier** - POS operations, sales processing
3. **manager** - Inventory, reports, staff management
4. **admin** - Full system access, user management

## 📋 Emergency Admin Recovery

If you lose admin access:

1. **Access Supabase directly** through the dashboard
2. **Check the `users` table** for existing admin accounts
3. **Manually update a user's role** to `admin`
4. **Or create a new user** through the registration form
5. **Update their role** in the database

## 🔍 Security Monitoring

Access the Security Dashboard to monitor:
- Authentication attempts
- Rate limit status
- Security violations
- User role changes
- System health

## 🆘 Support

For security issues or questions:
1. Check this guide first
2. Review the Security Dashboard
3. Contact your system administrator
4. Check Supabase logs for detailed errors

---

**Remember**: Security is everyone's responsibility. Report any suspicious activity immediately.