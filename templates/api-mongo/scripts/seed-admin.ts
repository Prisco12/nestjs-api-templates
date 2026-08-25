import 'dotenv/config';
import * as argon2 from 'argon2';
import mongoose from 'mongoose';
import { DEFAULT_ADMIN_ROLE } from '../src/modules/authorization/permission-catalog';

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const uri = process.env.MONGODB_URI;

  if (!email || !password || !uri) {
    throw new Error(
      'MONGODB_URI, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required',
    );
  }

  await mongoose.connect(uri);

  const RoleModel =
    mongoose.models.Role ||
    mongoose.model(
      'Role',
      new mongoose.Schema({ name: { type: String, unique: true } }),
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
          emailVerifiedAt: Date,
          authorizationVersion: { type: Number, default: 1 },
          roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
        },
        { timestamps: true },
      ),
    );

  const adminRole = await RoleModel.findOne({ name: DEFAULT_ADMIN_ROLE });
  if (!adminRole) {
    throw new Error('Admin role not found. Run "npm run seed:rbac" first.');
  }

  let user = await UserModel.findOne({ email });
  if (!user) {
    user = await UserModel.create({
      email,
      passwordHash: await argon2.hash(password),
      emailVerifiedAt: new Date(),
      roles: [adminRole._id],
    });
    console.log(`Administrator created for ${email}`);
  } else if (
    !user.roles.some((id: mongoose.Types.ObjectId) => id.equals(adminRole._id))
  ) {
    user.roles.push(adminRole._id);
    user.authorizationVersion = (user.authorizationVersion ?? 1) + 1;
    await user.save();
    console.log(`Administrator role assigned to ${email}`);
  } else {
    console.log(
      `Administrator already exists for ${email}; password was not changed`,
    );
  }

  if (!user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date();
    await user.save();
    console.log(`Administrator email marked as verified for ${email}`);
  }

  await mongoose.disconnect();
}

void main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
