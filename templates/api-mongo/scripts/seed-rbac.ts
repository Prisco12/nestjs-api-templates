import 'dotenv/config';
import mongoose from 'mongoose';
import {
  DEFAULT_ADMIN_ROLE,
  DEFAULT_USER_ROLE,
  Permission,
} from '../src/modules/authorization/permission-catalog';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(uri);

  const RoleModel =
    mongoose.models.Role ||
    mongoose.model(
      'Role',
      new mongoose.Schema(
        { name: { type: String, unique: true }, permissions: [String] },
        { timestamps: true },
      ),
    );

  await Promise.all(
    [DEFAULT_ADMIN_ROLE, DEFAULT_USER_ROLE].map((name) =>
      RoleModel.findOneAndUpdate(
        { name },
        {
          $set: {
            permissions:
              name === DEFAULT_ADMIN_ROLE ? Object.values(Permission) : [],
          },
        },
        { upsert: true, returnDocument: 'after' },
      ),
    ),
  );

  await mongoose.disconnect();
  console.log('RBAC seed completed');
}

void main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
