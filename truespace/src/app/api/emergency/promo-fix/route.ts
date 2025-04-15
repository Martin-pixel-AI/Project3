import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import { withAuth } from '@/lib/auth';
import { getCollection, toObjectId, getMongoDb } from '@/lib/db-utils';

/**
 * Emergency endpoint to fix promo code activation issues
 */
async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    const userData = (req as any).user;
    const userId = userData.id;
    
    console.log(`🚨 EMERGENCY PROMO FIX: Promo activation fix requested for user ${userId}`);
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { courseId, promoCode = 'deva' } = body;
    
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }
    
    console.log(`Attempting to fix promo activation for course ${courseId} using code ${promoCode}`);
    
    // Direct database access
    const db = getMongoDb();
    if (!db) {
      return NextResponse.json({ error: 'Database connection not established' }, { status: 500 });
    }
    
    // Get collections with proper casing
    const usersCollection = await getCollection(db, 'users');
    const coursesCollection = await getCollection(db, 'courses');
    const promoCodesCollection = await getCollection(db, 'promocodes');
    
    // Get current user info and course
    const user = await usersCollection.findOne({ _id: toObjectId(userId) });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Create course ObjectId
    let courseObjectId;
    try {
      courseObjectId = toObjectId(courseId);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid course ID format' }, { status: 400 });
    }
    
    // Check if the course exists
    const course = await coursesCollection.findOne({ _id: courseObjectId });
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    console.log(`Found course: ${course.title || 'Unknown title'}`);
    
    // Find the promo code
    const promoCodeDoc = await promoCodesCollection.findOne({ code: promoCode });
    
    if (!promoCodeDoc) {
      return NextResponse.json({ error: `Promo code '${promoCode}' not found` }, { status: 404 });
    }
    
    console.log(`Found promo code: ${promoCode}`);
    
    // Check if promo code contains the course
    const promoCourseIds = promoCodeDoc.courseIds || [];
    const promoCourseStrings = promoCourseIds.map((id: any) => id.toString());
    
    console.log(`Promo code courses: ${JSON.stringify(promoCourseStrings)}`);
    console.log(`Target course: ${courseId.toString()}`);
    
    const promoContainsCourse = promoCourseStrings.includes(courseId.toString());
    
    if (!promoContainsCourse) {
      // Add the course to the promo code if missing
      await promoCodesCollection.updateOne(
        { _id: promoCodeDoc._id },
        { $addToSet: { courseIds: courseObjectId } }
      );
      console.log(`Added course ${courseId} to promo code ${promoCode}`);
    }
    
    // Fixes to apply
    const fixes = [];
    
    // Fix 1: Ensure promo code is in user's activatedPromoCodes
    if (!user.activatedPromoCodes || !user.activatedPromoCodes.includes(promoCode)) {
      await usersCollection.updateOne(
        { _id: toObjectId(userId) },
        { $addToSet: { activatedPromoCodes: promoCode } }
      );
      fixes.push(`Added promo code '${promoCode}' to user's activatedPromoCodes`);
    }
    
    // Fix 2: Ensure course is directly in user's activatedCourses
    const userActivatedCourses = user.activatedCourses || [];
    const userActivatedCoursesStrings = userActivatedCourses.map((id: any) => id.toString());
    const hasCourseDirectly = userActivatedCoursesStrings.includes(courseId.toString());
    
    if (!hasCourseDirectly) {
      await usersCollection.updateOne(
        { _id: toObjectId(userId) },
        { $addToSet: { activatedCourses: courseObjectId } }
      );
      fixes.push(`Added course ${courseId} directly to user's activatedCourses`);
    }
    
    // Get updated user data
    const updatedUser = await usersCollection.findOne({ _id: toObjectId(userId) });
    
    // Verify fixes
    const updatedActivatedPromoCodes = updatedUser?.activatedPromoCodes || [];
    const updatedActivatedCourses = updatedUser?.activatedCourses || [];
    const updatedActivatedCoursesStrings = updatedActivatedCourses.map((id: any) => id.toString());
    
    const promoFixed = updatedActivatedPromoCodes.includes(promoCode);
    const courseFixed = updatedActivatedCoursesStrings.includes(courseId.toString());
    
    return NextResponse.json({
      success: true,
      message: 'Emergency promo code fix applied',
      courseTitle: course.title,
      promoCode,
      user: {
        email: user.email,
        id: user._id.toString()
      },
      fixes,
      verification: {
        promoFixed,
        courseFixed,
        shouldHaveAccess: promoFixed && courseFixed
      },
      before: {
        activatedPromoCodes: user.activatedPromoCodes || [],
        activatedCourses: userActivatedCoursesStrings
      },
      after: {
        activatedPromoCodes: updatedActivatedPromoCodes,
        activatedCourses: updatedActivatedCoursesStrings
      },
      nextSteps: "Please completely refresh the course page and try again. If still doesn't work, log out and log back in."
    });
    
  } catch (error: any) {
    console.error('Emergency promo fix error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export const POST = withAuth(handler); 