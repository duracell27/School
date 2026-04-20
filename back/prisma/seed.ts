import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'volodymyrshmidt@gmail.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin user already exists');
    return;
  }

  const password = await bcrypt.hash('11111111', 10);
  await prisma.user.create({
    data: {
      email,
      name: 'Volodymyr Shmidt',
      password,
      role: Role.ADMIN,
    },
  });

  console.log('Admin user created:', email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
