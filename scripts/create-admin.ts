/**
 * Script to create an admin user
 *
 * Usage:
 * ts-node scripts/create-admin.ts
 *
 * Or add to package.json:
 * "seed:admin": "tsx scripts/create-admin.ts"
 */

import { PrismaClient } from "../lib/generated/prisma";
import * as readline from "readline";
import { hashPassword, validatePassword } from "../lib/auth/password";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function questionHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(prompt);

    let password = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char: string) => {
      char = char.toString("utf8");

      switch (char) {
        case "\n":
        case "\r":
        case "\u0004":
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          stdout.write("\n");
          resolve(password);
          break;
        case "\u0003":
          process.exit();
          break;
        case "\u007f": // backspace
          password = password.slice(0, -1);
          stdout.clearLine(0);
          stdout.cursorTo(0);
          stdout.write(prompt + "*".repeat(password.length));
          break;
        default:
          password += char;
          stdout.write("*");
          break;
      }
    };

    stdin.on("data", onData);
  });
}

async function createAdmin() {
  try {
    console.log("\n=== Create Admin User ===\n");

    // Get user input
    const name = await question("Admin name: ");
    if (!name) {
      console.error("❌ Name is required");
      process.exit(1);
    }

    const email = await question("Admin email: ");
    if (!email || !email.includes("@")) {
      console.error("❌ Valid email is required");
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.error(`❌ User with email ${email} already exists`);
      process.exit(1);
    }

    const password = await questionHidden("Password: ");
    const confirmPassword = await questionHidden("Confirm password: ");

    if (password !== confirmPassword) {
      console.error("❌ Passwords do not match");
      process.exit(1);
    }

    // Validate password
    const validation = validatePassword(password);
    if (!validation.valid) {
      console.error("❌ Password validation failed:");
      validation.errors.forEach((error) => console.error(`   - ${error}`));
      process.exit(1);
    }

    // Hash password
    console.log("\n⏳ Creating admin user...");
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
        emailVerified: true, // Auto-verify admin users
      },
    });

    console.log(`\n✅ Admin user created successfully!`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}\n`);
  } catch (error) {
    console.error("\n❌ Error creating admin user:", error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdmin();
