import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function updateExpenseStatus() {
  try {
    // Get all expenses
    const allExpenses = await prisma.expense.findMany();
    console.log(`Total expenses: ${allExpenses.length}`);

    // Check if they have status
    for (const expense of allExpenses) {
      console.log(`Expense ${expense.id}:`);
      console.log(`  Description: ${expense.description}`);
      console.log(`  Status: ${expense.status}`);
      console.log(`  Amount: ${expense.amount}`);
      console.log(`  Currency: ${expense.currency}`);
      console.log('---');
    }

    console.log('\nAll expenses checked!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExpenseStatus();
