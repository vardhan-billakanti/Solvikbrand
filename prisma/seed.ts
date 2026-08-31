import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.OWNER_USERNAME || 'admin';
  const password = process.env.OWNER_PASSWORD;

  if (!password) {
    throw new Error('OWNER_PASSWORD environment variable must be provided');
  }

  console.log(`🌱 Seeding database...`);
  console.log(`👤 Upserting owner: ${username}`);

  const passwordHash = await bcrypt.hash(password, 12);

  const owner = await prisma.owner.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  console.log(`✅ Owner credentials successfully updated (id: ${owner.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
