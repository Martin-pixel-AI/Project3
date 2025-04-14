import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import PromoCode from '../../../../models/PromoCode';
import User from '../../../../models/User';
import { withAuth } from '../../../../lib/auth';
import mongoose from 'mongoose';

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { code } = body;
    const userId = (req as any).user.id;
    
    console.log('Promo code activation request:', { code, userId });
    
    // Validate input
    if (!code) {
      console.log('No promo code provided');
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }
    
    // Find promo code
    const promoCode = await PromoCode.findOne({ code });
    if (!promoCode) {
      console.log('Invalid promo code:', code);
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
    }
    
    console.log('Promo code found:', { 
      code, 
      courseIds: promoCode.courseIds,
      courseCount: promoCode.courseIds.length,
      expiresAt: promoCode.expiresAt,
      maxUses: promoCode.maxUses,
      currentUses: promoCode.uses,
      isActive: promoCode.isActive
    });
    
    // Check if promo code is valid
    if (!promoCode.isValid()) {
      console.log('Promo code is expired or has reached maximum uses:', code);
      return NextResponse.json({ error: 'Promo code is expired or has reached maximum uses' }, { status: 400 });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Ensure activatedCourses is initialized
    if (!user.activatedCourses) {
      console.log('Initializing empty activatedCourses array for user:', userId);
      user.activatedCourses = [];
    }
    
    // Explicit conversion of ObjectId to strings for reliable comparison
    const userActivatedCoursesStrings = user.activatedCourses.map(
      (id: mongoose.Types.ObjectId) => id.toString()
    );
    
    console.log('Current user activated courses:', userActivatedCoursesStrings);
    
    // Convert promo code courseIds to strings
    const promoCodeCourseIdStrings = promoCode.courseIds.map(
      (id: mongoose.Types.ObjectId) => id.toString()
    );
    
    console.log('Promo code course IDs:', promoCodeCourseIdStrings);
    
    // Find courses to add (ones user doesn't already have)
    const coursesToAddStrings = promoCodeCourseIdStrings.filter(
      (courseId: string) => !userActivatedCoursesStrings.includes(courseId)
    );
    
    console.log('Courses to add:', coursesToAddStrings);
    
    // Convert string IDs back to ObjectId for storage
    const coursesToAdd = coursesToAddStrings.map(
      (courseIdString: string) => new mongoose.Types.ObjectId(courseIdString)
    );
    
    // Add to user's activated courses
    user.activatedCourses = [...user.activatedCourses, ...coursesToAdd];
    user.promoCode = code; // Save the last used promo code
    
    // Log the final state before saving
    console.log('Final activatedCourses state:', {
      activatedCourses: user.activatedCourses.map((id: mongoose.Types.ObjectId) => id.toString()),
      count: user.activatedCourses.length
    });
    
    // Save changes to user
    const savedUser = await user.save();
    
    console.log('User saved successfully with updated courses');
    
    // Increment promo code uses
    promoCode.uses += 1;
    await promoCode.save();
    
    console.log('Promo code uses incremented and saved');
    
    // Return detailed success response
    return NextResponse.json({ 
      message: 'Promo code activated successfully',
      activatedCourses: savedUser.activatedCourses.map((id: mongoose.Types.ObjectId) => id.toString()),
      activatedCoursesCount: savedUser.activatedCourses.length,
      promoCodeCourses: promoCodeCourseIdStrings,
      promoCodeCoursesCount: promoCodeCourseIdStrings.length,
      coursesAdded: coursesToAddStrings,
      coursesAddedCount: coursesToAddStrings.length
    });
    
  } catch (error: any) {
    console.error('Promo code activation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to activate promo code' }, { status: 500 });
  }
}

export const POST = withAuth(handler); 