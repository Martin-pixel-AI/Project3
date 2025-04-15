import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import mongoose from 'mongoose';
import { withAuth } from '../../../../lib/auth';
import User from '../../../../models/User';
import PromoCode from '../../../../models/PromoCode';
import Course from '../../../../models/Course';

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get admin user from auth
    const userData = (req as any).user;
    
    // Check if user is admin
    if (userData.type !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can perform this action' }, { status: 403 });
    }
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { email, courseId, promoCode } = body;
    
    if (!email || (!courseId && !promoCode)) {
      return NextResponse.json({ 
        error: 'Required fields missing: provide email and either courseId or promoCode' 
      }, { status: 400 });
    }
    
    // Get database connection
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection not established' }, { status: 500 });
    }
    
    // Find user by email
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      return NextResponse.json({ error: `User with email ${email} not found` }, { status: 404 });
    }
    
    console.log(`Found user for manual access grant:`, {
      userId: user._id,
      email: user.email
    });
    
    let updatedCourseIds = [];
    let updatedPromoCode = null;
    
    // If promo code is provided, validate and add it
    if (promoCode) {
      // Find promo code
      const promoCodeRecord = await db.collection('promocodes').findOne({ code: promoCode });
      
      if (!promoCodeRecord) {
        return NextResponse.json({ error: `Promo code ${promoCode} not found` }, { status: 404 });
      }
      
      console.log(`Found promo code:`, {
        code: promoCodeRecord.code,
        courseIds: promoCodeRecord.courseIds
      });
      
      // Add promo code to user's activated promo codes
      const userPromoCodes = user.activatedPromoCodes || [];
      if (!userPromoCodes.includes(promoCode)) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $addToSet: { activatedPromoCodes: promoCode } }
        );
        updatedPromoCode = promoCode;
      }
      
      // If promo code has associated courses, add them to user's activated courses
      if (promoCodeRecord.courseIds && promoCodeRecord.courseIds.length > 0) {
        for (const courseObjId of promoCodeRecord.courseIds) {
          // Add course to user's activated courses
          await db.collection('users').updateOne(
            { _id: user._id },
            { $addToSet: { activatedCourses: courseObjId } }
          );
          updatedCourseIds.push(courseObjId.toString());
        }
      }
    }
    
    // If courseId is directly provided, add it
    if (courseId) {
      // Validate courseId
      let courseObjectId;
      try {
        courseObjectId = new mongoose.Types.ObjectId(courseId);
      } catch (error) {
        return NextResponse.json({ error: 'Invalid course ID format' }, { status: 400 });
      }
      
      // Check if course exists
      const course = await db.collection('courses').findOne({ _id: courseObjectId });
      if (!course) {
        return NextResponse.json({ error: `Course with ID ${courseId} not found` }, { status: 404 });
      }
      
      console.log(`Found course:`, {
        courseId: course._id,
        title: course.title
      });
      
      // Add course to user's activated courses
      await db.collection('users').updateOne(
        { _id: user._id },
        { $addToSet: { activatedCourses: courseObjectId } }
      );
      
      if (!updatedCourseIds.includes(courseId)) {
        updatedCourseIds.push(courseId);
      }
    }
    
    // Get updated user data
    const updatedUser = await db.collection('users').findOne({ _id: user._id });
    
    return NextResponse.json({
      message: 'Access granted successfully',
      user: {
        email: updatedUser.email,
        id: updatedUser._id.toString(),
        activatedPromoCodes: updatedUser.activatedPromoCodes || [],
        activatedCourses: (updatedUser.activatedCourses || []).map((c: any) => c.toString())
      },
      changes: {
        addedPromoCode: updatedPromoCode,
        addedCourses: updatedCourseIds
      }
    });
    
  } catch (error: any) {
    console.error('Manual access error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = withAuth(handler); 