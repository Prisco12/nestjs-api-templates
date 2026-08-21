import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true, unique: true, trim: true }) name!: string;
  @Prop() description?: string;
  @Prop({ type: [String], default: [] }) permissions!: string[];
}
export type RoleDocument = HydratedDocument<Role>;
export const RoleSchema = SchemaFactory.createForClass(Role);
