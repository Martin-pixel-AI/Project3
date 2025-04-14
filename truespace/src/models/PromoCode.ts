import mongoose, { Schema, Document } from 'mongoose';

export interface IPromoCode extends Document {
  code: string;
  courseIds: mongoose.Types.ObjectId[];
  expiresAt: Date;
  maxUses: number;
  uses: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    courseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    expiresAt: { type: Date, required: true },
    maxUses: { type: Number, default: 1 },
    uses: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Method to check if promo code is valid
PromoCodeSchema.methods.isValid = function(): boolean {
  const now = new Date();
  return this.isActive && 
         this.expiresAt > now && 
         (this.maxUses === 0 || this.uses < this.maxUses);
};

export default mongoose.models.PromoCode || mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema); 