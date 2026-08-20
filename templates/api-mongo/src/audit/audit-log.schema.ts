import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop() actorId?: string;
  @Prop({ required: true, index: true }) action!: string;
  @Prop({ required: true }) resource!: string;
  @Prop() resourceId?: string;
  @Prop({ required: true }) status!: string;
  @Prop({ type: Object }) before?: object;
  @Prop({ type: Object }) after?: object;
  @Prop() requestId?: string;
  @Prop() ip?: string;
  @Prop() userAgent?: string;
  createdAt!: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
