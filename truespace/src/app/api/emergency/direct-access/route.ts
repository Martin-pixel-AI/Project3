import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import mongoose from 'mongoose';
import { withAuth } from '../../../../lib/auth';

/**
 * This is an emergency route to directly force-activate course access
 * It bypasses the normal validation and directly updates MongoDB
 */
async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    const userData = (req as any).user;
    const userId = userData.id;
    
    console.log(`🚨 EMERGENCY ACCESS: Direct access requested for user ${userId}`);
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { courseId } = body;
    
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }
    
    console.log(`Attempting direct access to course ${courseId} for user ${userId}`);
    
    // Direct database access
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection not established' }, { status: 500 });
    }
    
    // Get current user info for reference
    const userBefore = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
    if (!userBefore) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Create course ObjectId (with validation)
    let courseObjectId;
    try {
      courseObjectId = new mongoose.Types.ObjectId(courseId);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid course ID format' }, { status: 400 });
    }
    
    // Check if the course exists
    const course = await db.collection('courses').findOne({ _id: courseObjectId });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    console.log(`Found course: ${course.title || 'Unknown title'}`);
    
    // Force-add the course to user's activated courses in THREE different ways to ensure it works
    
    // 1. First, update using MongoDB driver
    const updateResult1 = await db.collection('users').updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $addToSet: { activatedCourses: courseObjectId } }
    );
    
    // 2. Then, update again just to be sure, using a completely different approach
    const updateResult2 = await db.collection('users').updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: { [`coursesDirectAccess.${courseId}`]: true } }
    );
    
    // 3. Finally, using a raw update command as a last resort
    const updateResult3 = await db.command({
      update: 'users',
      updates: [
        {
          q: { _id: new mongoose.Types.ObjectId(userId) },
          u: { $push: { activatedCourses: courseObjectId } },
          upsert: false
        }
      ]
    });
    
    // Get the updated user data
    const userAfter = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
    
    // Create a special direct access token
    const directAccessToken = Buffer.from(`${userId}:${courseId}:${Date.now()}`).toString('base64');
    
    // Store this token in a special collection for reference
    await db.collection('directAccess').insertOne({
      userId: new mongoose.Types.ObjectId(userId),
      courseId: courseObjectId,
      token: directAccessToken,
      createdAt: new Date()
    });
    
    // Return a response with detailed information and next steps
    return NextResponse.json({
      success: true,
      message: 'Emergency direct access granted',
      courseTitle: course.title,
      user: userAfter?.email,
      directAccessToken,
      updates: {
        update1: updateResult1,
        update2: updateResult2,
        update3: updateResult3,
      },
      before: {
        hasCourse: userBefore.activatedCourses?.some((c: any) => c.toString() === courseId) || false,
        activatedCourses: (userBefore.activatedCourses || []).map((c: any) => c.toString()),
        activatedPromoCodes: userBefore.activatedPromoCodes || []
      },
      after: {
        hasCourse: userAfter?.activatedCourses?.some((c: any) => c.toString() === courseId) || false,
        activatedCourses: (userAfter?.activatedCourses || []).map((c: any) => c.toString()),
        activatedPromoCodes: userAfter?.activatedPromoCodes || []
      },
      whatToDoNext: "Please refresh the course page after using this emergency fix. If still doesn't work, paste the directAccessToken in localStorage."
    });
    
  } catch (error: any) {
    console.error('Emergency direct access error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export const POST = withAuth(handler); 