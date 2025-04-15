import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import mongoose from 'mongoose';

interface Params {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    // Connect to database
    await dbConnect();
    
    const { id } = params;
    
    // Just log information without actually deleting anything
    console.log(`Test endpoint called for course ID: ${id}`);
    
    // Try to get direct access to the Course collection 
    // This approach avoids any potential issues with mongoose models
    const db = mongoose.connection.db;
    if (!db) {
      return new NextResponse('Database connection not established', { status: 500 });
    }
    
    // First try to find the course directly using the raw MongoDB driver
    try {
      const course = await db.collection('courses').findOne({ _id: new mongoose.Types.ObjectId(id) });
      if (!course) {
        return new NextResponse(`Course with ID ${id} not found`, { status: 404 });
      }
      
      return new NextResponse(`Found course: ${course.title}. Test successful.`, { status: 200 });
    } catch (findError: any) {
      console.error('Error finding course:', findError);
      return new NextResponse(`Error finding course: ${findError.message}`, { status: 500 });
    }
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    // Return detailed error information as text
    return new NextResponse(`Error: ${error.message}\nStack: ${error.stack}`, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Connect to database
    await dbConnect();
    
    const { id } = params;
    
    console.log(`Test deletion for course ID: ${id}`);
    
    // Get direct access to the database
    const db = mongoose.connection.db;
    if (!db) {
      return new NextResponse('Database connection not established', { status: 500 });
    }
    
    // Step 1: Check if the course exists
    try {
      const course = await db.collection('courses').findOne({ _id: new mongoose.Types.ObjectId(id) });
      if (!course) {
        return new NextResponse(`Course with ID ${id} not found`, { status: 404 });
      }
      
      // Step 2: Just return success without actually deleting
      return new NextResponse(`Found course: ${course.title}. Test deletion would be successful.`, { status: 200 });
    } catch (dbError: any) {
      console.error('Database operation error:', dbError);
      return new NextResponse(`Database error: ${dbError.message}`, { status: 500 });
    }
  } catch (error: any) {
    console.error('Test deletion error:', error);
    // Return detailed error information as text
    return new NextResponse(`Error: ${error.message}\nStack: ${error.stack}`, { status: 500 });
  }
} 