import mongoose, { Schema, Document } from 'mongoose';

export interface CourseDocument {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface ICourse extends Document {
  title: string;
  description: string;
  category: string;
  tags: string[];
  videos: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  thumbnail?: string;
  documents?: CourseDocument[];
  hiddenDescription?: string;
}

const CourseSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    tags: [{ type: String }],
    videos: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
    thumbnail: { type: String },
    documents: [{
      fileName: { type: String },
      fileUrl: { type: String },
      fileType: { type: String },
      fileSize: { type: Number }
    }],
    hiddenDescription: { type: String }
  },
  { timestamps: true }
);

// Add text index for search
CourseSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text',
  hiddenDescription: 'text'
}, { 
  weights: { 
    title: 10, 
    description: 5, 
    tags: 3,
    hiddenDescription: 2
  } 
});

export default mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema); 