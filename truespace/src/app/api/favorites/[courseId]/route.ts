import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';
import Course from '../../../../models/Course';
import { withAuth } from '../../../../lib/auth';
import mongoose from 'mongoose';

interface Params {
  params: {
    courseId: string;
  };
}

// Add to favorites
async function addToFavorites(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    
    const { courseId } = params;
    const userId = (req as any).user.id;
    
    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    // Add to user's favorites if not already there
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (user.favorites.includes(new mongoose.Types.ObjectId(courseId))) {
      return NextResponse.json({ message: 'Course already in favorites' });
    }
    
    user.favorites.push(new mongoose.Types.ObjectId(courseId));
    await user.save();
    
    return NextResponse.json({ message: 'Course added to favorites' });
    
  } catch (error: any) {
    console.error('Add to favorites error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add to favorites' }, { status: 500 });
  }
}

// Remove from favorites
async function removeFromFavorites(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    
    const { courseId } = params;
    const userId = (req as any).user.id;
    
    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }
    
    // Remove from user's favorites
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    user.favorites = user.favorites.filter(
      (id) => id.toString() !== courseId
    );
    
    await user.save();
    
    return NextResponse.json({ message: 'Course removed from favorites' });
    
  } catch (error: any) {
    console.error('Remove from favorites error:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove from favorites' }, { status: 500 });
  }
}

export const POST = withAuth(addToFavorites);
export const DELETE = withAuth(removeFromFavorites); 