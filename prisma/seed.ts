import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.OWNER_USERNAME || 'admin';
  const password = process.env.OWNER_PASSWORD || 'TraceLink@2024!';

  console.log(`🌱 Seeding database...`);
  console.log(`👤 Creating owner: ${username}`);

  const passwordHash = await bcrypt.hash(password, 12);

  const owner = await prisma.owner.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  console.log(`✅ Owner created: ${owner.username} (id: ${owner.id})`);
  console.log(`\n🔐 Login credentials:`);
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`\n⚠️  Change your password in production!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
