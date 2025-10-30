# Quick Start Guide 🚀

## What's Ready

✅ **Local PostgreSQL Database** running via Docker
✅ **Complete database schema** with multi-currency support
✅ **PWA configuration** for mobile-first experience
✅ **UI components** from shadcn/ui ready to use
✅ **Build passing** - everything compiles successfully

## Get Started in 3 Steps

### 1. Database is Already Running

Your local PostgreSQL is running via Docker. Check status:

```bash
docker compose ps
```

You should see `store-management-db` with status "Up" and "healthy".

### 2. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. View Your Database

```bash
npx prisma studio
```

This opens a GUI at [http://localhost:5555](http://localhost:5555) where you can view and add test data.

---

## Quick Commands

```bash
# Development
npm run dev                  # Start dev server
npm run build                # Build for production
npm start                    # Run production build

# Database
docker compose up -d         # Start PostgreSQL
docker compose down          # Stop PostgreSQL
npx prisma studio            # View database GUI
npx prisma db push           # Update database schema

# Code Quality
npm run lint                 # Run ESLint
```

---

## Project Structure

```
store-management-app/
├── app/                     # Next.js App Router
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Homepage
├── components/
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── currency/           # Currency utilities
│   ├── prisma/             # Prisma client
│   ├── supabase/           # Supabase clients
│   └── utils.ts            # General utilities
├── prisma/
│   └── schema.prisma       # Database schema
├── public/                 # Static assets
├── docker-compose.yml      # PostgreSQL setup
└── .env                    # Environment variables
```

---

## Database Tables

Your database has these tables ready:

- **users** - Admin authentication
- **stores** - Store info + currency config (EUR/GBP)
- **employees** - Employee details + hourly rates
- **vendors** - Vendor information
- **sales** - Daily sales tracking (multi-currency)
- **expenses** - Expense management (multi-currency)
- **attendance** - Employee time tracking (multi-currency)

---

## What to Build Next

The foundation is ready! Here's what we can build:

1. **Authentication** - Login system for admins
2. **Mobile Layout** - Bottom navigation tabs
3. **Store Management** - Add/edit stores with currency config
4. **Sales Entry** - Record daily sales with EUR/GBP tabs
5. **Attendance** - Employee check-in/out system
6. **Expenses** - Track vendor expenses
7. **Dashboard** - Analytics with charts
8. **Reports** - PDF and Excel exports

---

## Switch to Supabase Later

When ready for production:

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Get connection string from Project Settings → Database
3. Update `.env` with Supabase credentials
4. Run `npx prisma db push`

No code changes needed! Same PostgreSQL database.

---

## Need Help?

- **Database issues**: See `DATABASE_SETUP.md`
- **PWA setup**: See `SETUP.md`
- **General info**: See `README.md`

Ready to continue building? Just let me know what feature you want next! 🎉
