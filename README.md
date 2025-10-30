# Store Management PWA

A mobile-first Progressive Web App for managing stores, sales, attendance, and expenses with multi-currency support (EUR/GBP).

## Features

- **Multi-Store Management**: Manage multiple stores with currency configuration
- **Sales Tracking**: Record sales by type (Cash, Online, Delivery, Just Eat, MyLocal, Credit Card)
- **Attendance Management**: Track employee check-in/check-out with payment calculation
- **Expense Tracking**: Manage vendor expenses per store
- **Multi-Currency Support**: EUR and GBP with separate tracking and reports
- **Analytics Dashboard**: Visual insights with charts and summaries
- **Offline-First**: Works without internet, syncs when online
- **Mobile-Optimized**: Native app-like experience on mobile devices
- **Export Reports**: PDF and Excel export functionality

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **State Management**: Zustand + TanStack Query
- **PWA**: next-pwa + Workbox
- **Offline Storage**: IndexedDB (Dexie)
- **Charts**: Recharts
- **Currency**: dinero.js
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Building for Production

```bash
npm run build
npm start
```

## Deployment

Deploy to Vercel:

```bash
vercel
```

Or use the Vercel CLI/GitHub integration.

## PWA Installation

The app can be installed on mobile devices:
- **iOS**: Tap Share → Add to Home Screen
- **Android**: Tap menu → Install App / Add to Home Screen

## License

Private - All rights reserved
