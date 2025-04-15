import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

interface Params {
  params: {
    id: string;
  };
}

// Simple function to connect directly to MongoDB
async function connectToMongo() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/truespace';
  if (!mongoose.connection.readyState) {
    console.log('Creating direct MongoDB connection');
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('Direct MongoDB connection established');
    } catch (error) {
      console.error('Direct MongoDB connection error:', error);
      throw error;
    }
  } else {
    console.log('Using existing MongoDB connection');
  }
  return mongoose.connection.db;
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    console.log('EMERGENCY DELETE endpoint called for course ID:', params.id);
    
    // Extract course ID
    const id = params.id;
    
    // Connect to MongoDB directly
    const db = await connectToMongo();
    
    // Verify the course exists
    try {
      const courseObjectId = new mongoose.Types.ObjectId(id);
      const course = await db!.collection('courses').findOne({ _id: courseObjectId });
      
      if (!course) {
        console.log('Course not found for deletion:', id);
        return new NextResponse(`Course not found: ${id}`, { status: 404 });
      }
      
      console.log('Found course for deletion:', course.title);
      
      // Delete the course directly - no reference cleanup
      const result = await db!.collection('courses').deleteOne({ _id: courseObjectId });
      
      console.log('Deletion result:', result);
      
      if (result.deletedCount === 0) {
        return new NextResponse(`Failed to delete course: ${id}`, { status: 500 });
      }
      
      return new NextResponse(`Successfully deleted course: ${id}`, { status: 200 });
    } catch (dbError: any) {
      console.error('Database operation error:', dbError);
      return new NextResponse(`Database error: ${dbError.message}`, { status: 500 });
    }
  } catch (error: any) {
    console.error('Emergency delete error:', error);
    return new NextResponse(`Error: ${error.message}\nStack: ${error.stack}`, { status: 500 });
  }
} 