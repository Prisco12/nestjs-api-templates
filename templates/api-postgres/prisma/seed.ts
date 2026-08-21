import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  DEFAULT_ADMIN_ROLE,
  DEFAULT_USER_ROLE,
  Permission,
} from '../src/modules/authorization/permission-catalog';

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const databaseUrl = process.env.DATABASE_URL;
  if (!email || !password || !databaseUrl)
    throw new Error(
      'DATABASE_URL, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required',
    );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  const permissions = await Promise.all(
    Object.values(Permission).map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code },
      }),
    ),
  );
  const roles = await Promise.all(
    [DEFAULT_ADMIN_ROLE, DEFAULT_USER_ROLE].map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: {
          name,
          description:
            name === DEFAULT_ADMIN_ROLE
              ? 'Template administrator'
              : 'Default user',
        },
      }),
    ),
  );
  for (const role of roles) {
    for (const code of role.name === DEFAULT_ADMIN_ROLE
      ? Object.values(Permission)
      : []) {
      const permission = permissions.find((item) => item.code === code)!;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
  const adminRole = roles.find((role) => role.name === DEFAULT_ADMIN_ROLE)!;
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    user = await prisma.user.create({
      data: { email, passwordHash: await argon2.hash(password) },
    });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id },
  });
  await prisma.$disconnect();
  console.log(`Seed completed for ${email}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
