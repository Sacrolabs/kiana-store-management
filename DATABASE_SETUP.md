# Database Setup Guide

## ✅ Local PostgreSQL (Current Setup)

Your app is now configured to use a local PostgreSQL database via Docker. This uses the **same database as Supabase** (PostgreSQL), so switching to production will be seamless!

### Starting the Database

```bash
# Start PostgreSQL
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f postgres

# Stop database
docker compose down

# Stop and remove data (fresh start)
docker compose down -v
```

### Connection Details

- **Host**: localhost
- **Port**: 5432
- **Database**: store_management
- **User**: postgres
- **Password**: postgres

### Database Management

```bash
# Generate Prisma client (after schema changes)
npx prisma generate

# Push schema changes to database
npx prisma db push

# Open Prisma Studio (GUI to view/edit data)
npx prisma studio

# Create a migration (for production)
npx prisma migrate dev --name init
```

---

## 🚀 Switching to Supabase (Production)

When you're ready to deploy to production with Supabase:

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Save your database password!

### Step 2: Get Connection String

1. In Supabase Dashboard → **Project Settings** → **Database**
2. Find "Connection string" → **URI**
3. Copy the connection string
4. Replace `[YOUR-PASSWORD]` with your actual password

### Step 3: Update Environment Variables

Update `.env`:

```bash
# Comment out local database
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/store_management?schema=public"

# Add Supabase connection
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Add Supabase credentials (for auth)
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### Step 4: Push Schema to Supabase

```bash
# Push your schema to Supabase
npx prisma db push

# Or create a migration
npx prisma migrate dev --name init
```

That's it! Your app will now use Supabase instead of local PostgreSQL.

---

## 📊 Database Schema Overview

### Tables

| Table | Purpose | Multi-Currency |
|-------|---------|----------------|
| `users` | Admin authentication | - |
| `stores` | Store information | ✅ EUR/GBP config |
| `employees` | Employee details | ✅ Hourly rates per currency |
| `vendors` | Vendor information | - |
| `sales` | Sales records | ✅ Currency per sale |
| `expenses` | Expense tracking | ✅ Currency per expense |
| `attendance` | Time tracking & payments | ✅ Currency per entry |

### Key Features

- ✅ All amounts stored as integers (cents/pence) for precision
- ✅ Multi-currency support (EUR/GBP)
- ✅ Proper indexing for fast queries
- ✅ Cascade deletes for data integrity
- ✅ Created/Updated timestamps on all tables

---

## 🔧 Troubleshooting

### "Connection refused" error

Make sure Docker is running:
```bash
docker compose up -d
```

### "Database does not exist"

The database is created automatically. If you get this error:
```bash
docker compose down -v
docker compose up -d
npx prisma db push
```

### Schema changes not reflecting

After modifying `prisma/schema.prisma`:
```bash
npx prisma generate
npx prisma db push
```

### View database directly

```bash
# Using Prisma Studio (recommended)
npx prisma studio

# Or connect with psql
docker compose exec postgres psql -U postgres -d store_management
```

---

## 📝 Environment Variables

### Local Development (Current)

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/store_management?schema=public"
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
```

### Production (Supabase)

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-KEY]"
```

---

## 🎯 Next Steps

Your database is ready! You can now:

1. ✅ Start building the app features
2. ✅ Use Prisma Client in your API routes
3. ✅ Run `npx prisma studio` to view/add test data
4. ✅ Switch to Supabase anytime without code changes
