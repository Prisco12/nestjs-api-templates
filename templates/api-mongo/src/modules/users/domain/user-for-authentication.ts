import { Types } from 'mongoose';

export interface UserForAuthentication {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  isActive: boolean;
  authorizationVersion: number;
  emailVerifiedAt?: Date;
  emailVerificationTokenHash?: string;
  emailVerificationTokenExpiresAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetTokenExpiresAt?: Date;
  roles: Array<{
    permissions: string[];
  }>;
}
