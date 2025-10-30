# Setup Guide

## What's Been Built

### ✅ Phase 1: Foundation (COMPLETED)
1. **Next.js 14 Project** with TypeScript and App Router
2. **Tailwind CSS** configured with mobile-first utilities
3. **shadcn/ui** components (Button, Card, Input, Label, Tabs, Toaster)
4. **PWA Configuration** with next-pwa and comprehensive caching strategies
5. **Database Schema** with Prisma (multi-currency support)
6. **Supabase Integration** client and server utilities
7. **Currency Utilities** for EUR/GBP handling

### 📦 Installed Dependencies
- **UI**: Tailwind CSS, Radix UI, shadcn/ui, Framer Motion, Lucide icons
- **PWA**: next-pwa, Workbox
- **State**: Zustand, TanStack Query
- **Forms**: React Hook Form, Zod
- **Database**: Prisma, Supabase
- **Charts**: Recharts
- **Currency**: dinero.js, date-fns
- **Export**: jsPDF, xlsx, react-to-print
- **Offline**: Dexie (IndexedDB)

## Next Steps: Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new organization (if needed)
4. Create a new project:
   - **Name**: store-management
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
   - **Plan**: Free tier is fine to start

### 2. Get Your Credentials

After project creation (takes 1-2 minutes):

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string)

3. Go to **Project Settings** → **Database**
4. Scroll to **Connection string** → **URI**
5. Copy the connection string
6. Replace `[YOUR-PASSWORD]` with your database password

### 3. Configure Environment Variables

Create `.env.local` file in project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### 4. Initialize Database

Run these commands:

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (creates all tables)
npx prisma db push

# Optional: Open Prisma Studio to view database
npx prisma studio
```

### 5. Verify Setup

1. Start development server:
```bash
npm run dev
```

2. Open http://localhost:3000
3. You should see the homepage without errors

## Database Schema Overview

### Tables Created:
- **users** - Admin users for authentication
- **stores** - Store information with currency configuration
- **employees** - Employee details with hourly rates per currency
- **vendors** - Vendor information for expenses
- **sales** - Sales records with multi-currency support
- **expenses** - Expense tracking per store and vendor
- **attendance** - Employee attendance and payment records

### Key Features:
- ✅ Multi-currency support (EUR/GBP)
- ✅ All amounts stored as integers (cents/pence) for precision
- ✅ Proper indexing for fast queries
- ✅ Cascade deletes for data integrity
- ✅ Created/Updated timestamps

## Troubleshooting

### "Cannot find module '@/lib/generated/prisma'"
Run: `npx prisma generate`

### "Invalid DATABASE_URL"
- Verify password doesn't contain special characters that need escaping
- Check the URL format matches exactly
- Try wrapping URL in quotes if it contains special chars

### Build errors
1. Delete `.next` folder: `rm -rf .next`
2. Reinstall dependencies: `npm install`
3. Rebuild: `npm run build`

### Supabase connection issues
- Verify project URL and keys are correct
- Check your IP is not blocked (Supabase → Project Settings → Database → Connection pooling)
- Ensure database password is correct

## What's Next

Once Supabase is configured, we'll build:
1. Authentication system (login, session management)
2. Mobile-first layout with bottom navigation
3. Store management (CRUD)
4. Sales tracking with currency support
5. Attendance management
6. Expense tracking
7. Analytics dashboard
8. Report exports

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
