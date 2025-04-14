import mongoose, { Schema, Document } from 'mongoose';

export interface IVideo extends Document {
  title: string;
  youtubeUrl: string;
  duration: number;
  tags: string[];
  description?: string;
  thumbnail?: string;
  courseId: mongoose.Types.ObjectId;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    youtubeUrl: { type: String, required: true },
    duration: { type: Number, required: true },
    tags: [{ type: String }],
    description: { type: String },
    thumbnail: { type: String },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Add text index for search
VideoSchema.index({ 
  title: 'text', 
  description: 'text',
  tags: 'text'
}, { 
  weights: { 
    title: 10, 
    description: 5,
    tags: 3
  } 
});

export default mongoose.models.Video || mongoose.model<IVideo>('Video', VideoSchema); 