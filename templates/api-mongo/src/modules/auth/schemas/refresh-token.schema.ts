import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ required: true, unique: true }) tokenId!: string;
  @Prop({ required: true }) tokenHash!: string;
  @Prop({ required: true }) expiresAt!: Date;
  @Prop() revokedAt?: Date;
  @Prop({ type: String, ref: User.name, required: true, index: true })
  userId!: string;
}
export type RefreshTokenDocument = HydratedDocument<RefreshToken>;
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
