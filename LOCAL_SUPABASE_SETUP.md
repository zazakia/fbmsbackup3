# Local Supabase Development Setup

This guide helps you set up a local Supabase instance using Docker for development.

## Prerequisites

- **Docker**: Make sure Docker is installed and running
- **Supabase CLI**: Already installed in this project

## Quick Setup

### 1. Start Supabase Services
```bash
# This will start all Supabase services in Docker containers
supabase start
```

**Note**: The first run will take several minutes as it downloads Docker images. Subsequent starts are much faster.

### 2. Check Service Status
```bash
supabase status
```

You should see output similar to:
```
         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Start Your Application
```bash
npm run dev
```

Your app will now connect to the local Supabase instance!

## Available Services

### 🗄️ Database
- **URL**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Username**: postgres
- **Password**: postgres
- All your database migrations will be applied automatically

### 🎨 Supabase Studio
- **URL**: http://127.0.0.1:54323
- Web interface for managing your database, viewing data, and running SQL queries
- Similar to the cloud Supabase dashboard

### 📧 Email Testing (Inbucket)
- **URL**: http://127.0.0.1:54324
- All emails sent by your app will appear here instead of being actually sent
- Perfect for testing authentication emails

### 🔗 API Gateway
- **URL**: http://127.0.0.1:54321
- RESTful API for your database
- Real-time subscriptions
- Authentication endpoints

## Environment Configuration

The `.env.local` file is already configured for local development:

```env
VITE_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeo-pkc4y4I4UuQXX1WlCd3yW_vLX2-THqI
```

## Database Migrations

Your existing migrations in the `supabase/migrations/` folder will be automatically applied when you start Supabase:

- `20250702131813_create-customers-table.sql`
- `20250702131927_create-customers-table.sql`
- `20250702153619_create_all_tables.sql`

## Useful Commands

```bash
# Start services
supabase start

# Check status
supabase status

# Stop services
supabase stop

# Reset database (careful - this deletes all data!)
supabase db reset

# Generate new migration
supabase db diff -f new_migration_name

# Push local changes to remote (when ready)
supabase db push
```

## Development Workflow

1. **Start Supabase**: `supabase start`
2. **Start your app**: `npm run dev`
3. **Make database changes**: Edit files in `supabase/migrations/`
4. **Test changes**: Use Supabase Studio at http://127.0.0.1:54323
5. **Stop when done**: `supabase stop`

## Troubleshooting

### Docker Issues
```bash
# Check if Docker is running
docker --version
docker ps

# If Docker isn't running, start it
sudo systemctl start docker  # Linux
# or use Docker Desktop on Windows/Mac
```

### Port Conflicts
If you get port conflict errors, check what's running on these ports:
- 54321 (API)
- 54322 (Database)
- 54323 (Studio)
- 54324 (Inbucket)

```bash
# Check what's using a port
lsof -i :54321

# Kill process if needed
sudo kill -9 <PID>
```

### Reset Everything
```bash
# Stop all services
supabase stop

# Remove all containers and volumes
docker system prune -a --volumes

# Start fresh
supabase start
```

## Benefits of Local Development

✅ **Fast Development** - No network latency  
✅ **Offline Work** - Works without internet  
✅ **Free** - No cloud usage costs  
✅ **Safe Testing** - Can't break production data  
✅ **Full Control** - Complete access to all services  
✅ **Easy Reset** - Start fresh anytime  

## Production Deployment

When ready to deploy:

1. Create a cloud Supabase project
2. Push your migrations: `supabase db push`
3. Update `.env.local` with production URLs
4. Deploy your application

Your local and production databases will have the same structure!