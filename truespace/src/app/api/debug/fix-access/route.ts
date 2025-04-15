import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import mongoose from 'mongoose';
import { withAuth } from '../../../../lib/auth';
import User from '../../../../models/User';
import PromoCode from '../../../../models/PromoCode';

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get userId from auth
    const userData = (req as any).user;
    const userId = userData.id;
    
    console.log(`🔧 [FIX-ACCESS] Attempting to fix access for user ${userId}`);
    
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
    
    // Direct database access
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection not established' }, { status: 500 });
    }
    
    // Get user directly from MongoDB
    const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if user already has direct access
    const hasDirectAccess = user.activatedCourses?.some(
      (course: any) => course.toString() === courseId
    );
    
    if (hasDirectAccess) {
      return NextResponse.json({ 
        message: 'User already has direct access to this course',
        fixApplied: false,
        alreadyHadAccess: true
      });
    }
    
    // Get user's promo codes
    const userPromoCodes = user.activatedPromoCodes || [];
    
    if (userPromoCodes.length === 0) {
      return NextResponse.json({ 
        error: 'User has no activated promo codes',
        fixApplied: false
      }, { status: 400 });
    }
    
    // Check if any of the user's promo codes grant access to this course
    const promoCodesForCourse = await db.collection('promocodes').find({
      code: { $in: userPromoCodes },
      courseIds: new mongoose.Types.ObjectId(courseId)
    }).toArray();
    
    if (promoCodesForCourse.length === 0) {
      return NextResponse.json({ 
        error: 'User has no promo codes that grant access to this course',
        fixApplied: false
      }, { status: 400 });
    }
    
    // User has promo codes for this course but doesn't have direct access
    // Apply the fix by adding course to activatedCourses
    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    
    // Apply the fix - add to activatedCourses
    const updateResult = await db.collection('users').updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $addToSet: { activatedCourses: courseObjectId } }
    );
    
    console.log('Fix applied:', updateResult);
    
    // Get course name for better messaging
    const course = await db.collection('courses').findOne({ _id: courseObjectId });
    
    if (updateResult.modifiedCount === 1) {
      return NextResponse.json({
        message: `Fixed access for course: ${course?.title || courseId}`,
        courseName: course?.title,
        courseId,
        fixApplied: true,
        promoCodesUsed: promoCodesForCourse.map((p: any) => p.code)
      });
    } else {
      return NextResponse.json({
        message: 'Fix attempt made but database was not updated',
        fixApplied: false,
        updateResult
      });
    }
    
  } catch (error: any) {
    console.error('Fix access error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withAuth(handler); 