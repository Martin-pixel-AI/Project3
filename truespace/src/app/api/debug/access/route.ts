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
    
    console.log(`🔍 [DEBUG] Checking user access for ${userId}`);
    
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
    
    // Check all possible ways user might have access
    const hasDirectAccess = user.activatedCourses?.some(
      (course: any) => course.toString() === courseId
    );
    
    // Get user's promo codes
    const userPromoCodes = user.activatedPromoCodes || [];
    
    // Check if any of the user's promo codes grant access to this course
    const promoCodesForCourse = await db.collection('promocodes').find({
      code: { $in: userPromoCodes },
      courseIds: new mongoose.Types.ObjectId(courseId)
    }).toArray();
    
    // Get course details
    const course = await db.collection('courses').findOne({ _id: new mongoose.Types.ObjectId(courseId) });
    
    // Return detailed diagnostic information
    return NextResponse.json({
      diagnostics: {
        userId,
        courseId,
        userEmail: user.email,
        courseName: course?.title || 'Unknown course',
        hasDirectAccess,
        activatedCourses: user.activatedCourses?.map((c: any) => c.toString()) || [],
        activatedPromoCodes: userPromoCodes,
        matchingPromoCodes: promoCodesForCourse.map((p: any) => p.code),
        hasPromoAccess: promoCodesForCourse.length > 0,
        shouldHaveAccess: hasDirectAccess || promoCodesForCourse.length > 0
      },
      fixApplied: false
    });
    
  } catch (error: any) {
    console.error('Debug access check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withAuth(handler); 