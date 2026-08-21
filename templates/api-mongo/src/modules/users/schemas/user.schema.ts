import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../../rbac/schemas/role.schema';
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;
  @Prop({ required: true }) passwordHash!: string;
  @Prop({ default: true }) isActive!: boolean;
  @Prop({ default: 1 }) authorizationVersion!: number;
  @Prop({ type: [{ type: Types.ObjectId, ref: Role.name }], default: [] })
  roles!: Types.ObjectId[];
  createdAt!: Date;
  updatedAt!: Date;
}
export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
