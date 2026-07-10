/**
 * Creates (or resets) a single ADMIN account — the first login on a fresh
 * production database, where dev seeding is disabled.
 *
 * Run through the builder image (it has tsx + Prisma + the native bcrypt addon):
 *   docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm --no-deps \
 *     -e ADMIN_EMAIL=you@school.ac.th -e ADMIN_PASSWORD='a-strong-password' \
 *     migrate sh -c "npx tsx scripts/create-admin.ts"
 *
 * Idempotent: re-running with the same email resets that account's password.
 */
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "@node-rs/bcrypt";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // COST 10 — matches lib/password.ts.
  const passwordHash = await hash(password as string, 10);
  const user = await prisma.user.upsert({
    where: { email: email as string },
    update: { passwordHash, role: Role.ADMIN, isActive: true, isDeleted: false },
    create: { email: email as string, passwordHash, role: Role.ADMIN },
    select: { id: true, email: true },
  });
  console.log(`✓ admin ready: ${user.email} (${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
