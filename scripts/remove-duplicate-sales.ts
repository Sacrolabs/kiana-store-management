import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function removeDuplicateSales() {
  try {
    // Find all sales grouped by store, currency, and date
    const allSales = await prisma.sale.findMany({
      orderBy: [
        { storeId: 'asc' },
        { currency: 'asc' },
        { date: 'asc' },
        { createdAt: 'asc' }, // Keep the oldest one
      ],
    });

    console.log(`Total sales: ${allSales.length}`);

    // Group sales by store, currency, and date (normalized to date only)
    const groups = new Map<string, typeof allSales>();

    for (const sale of allSales) {
      const dateStr = sale.date.toISOString().split('T')[0]; // Get just the date part
      const key = `${sale.storeId}|${sale.currency}|${dateStr}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(sale);
    }

    // Find duplicates
    const duplicates: string[] = [];
    for (const [key, sales] of groups.entries()) {
      if (sales.length > 1) {
        console.log(`\nFound ${sales.length} duplicates for ${key}:`);
        // Keep the first one (oldest), delete the rest
        for (let i = 1; i < sales.length; i++) {
          console.log(`  - Will delete sale ${sales[i].id} (created: ${sales[i].createdAt})`);
          duplicates.push(sales[i].id);
        }
      }
    }

    if (duplicates.length > 0) {
      console.log(`\nDeleting ${duplicates.length} duplicate sales...`);
      const result = await prisma.sale.deleteMany({
        where: {
          id: {
            in: duplicates,
          },
        },
      });
      console.log(`Deleted ${result.count} duplicate sales.`);
    } else {
      console.log('\nNo duplicates found!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicateSales();
