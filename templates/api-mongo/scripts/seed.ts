import 'dotenv/config';
import * as argon2 from 'argon2';
import mongoose from 'mongoose';
import { Role, RolePermissions } from '../src/authorization/access-control';

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const uri = process.env.MONGODB_URI;
  if (!email || !password || !uri)
    throw new Error(
      'MONGODB_URI, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required',
    );
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
  const UserModel =
    mongoose.models.User ||
    mongoose.model(
      'User',
      new mongoose.Schema(
        {
          email: { type: String, unique: true, lowercase: true },
          passwordHash: String,
          isActive: { type: Boolean, default: true },
          roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
        },
        { timestamps: true },
      ),
    );
  const roles = await Promise.all(
    Object.values(Role).map((name) =>
      RoleModel.findOneAndUpdate(
        { name },
        { $set: { permissions: RolePermissions[name] } },
        { upsert: true, returnDocument: 'after' },
      ),
    ),
  );
  const adminRole = roles.find((role) => role!.name === Role.ADMIN)!;
  let user = await UserModel.findOne({ email });
  if (!user)
    user = await UserModel.create({
      email,
      passwordHash: await argon2.hash(password),
      roles: [adminRole._id],
    });
  else if (
    !user.roles.some((id: mongoose.Types.ObjectId) => id.equals(adminRole._id))
  ) {
    user.roles.push(adminRole._id);
    await user.save();
  }
  await mongoose.disconnect();
  console.log(`Seed completed for ${email}`);
}

void main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
