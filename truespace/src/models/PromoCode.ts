import mongoose, { Schema, Document } from 'mongoose';

// This is a stub model that exists only for backward compatibility
// The actual promo code functionality has been removed from the platform
export interface IPromoCode extends Document {
  code: string;
  courseIds: mongoose.Types.ObjectId[];
  expiresAt: Date;
  maxUses: number;
  uses: number;
  isActive: boolean;
  isValid(): boolean;
}

const PromoCodeSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    courseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    expiresAt: { type: Date, required: true },
    maxUses: { type: Number, default: 0 },
    uses: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Method to check if promo code is valid
PromoCodeSchema.methods.isValid = function(): boolean {
  const now = new Date();
  return (
    this.isActive && 
    this.expiresAt > now && 
    (this.maxUses === 0 || this.uses < this.maxUses)
  );
};

// Export a simple model for backward compatibility
export default mongoose.models.PromoCode || mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema); 