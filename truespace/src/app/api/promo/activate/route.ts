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
    
    // Увеличиваем таймаут для MongoDb операций
    mongoose.connection.setMaxListeners(50);

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

    // Получаем информацию о курсах из промокода
    const Course = mongoose.model('Course');
    const coursesToActivate = await Course.find({
      _id: { $in: promoCode.courseIds }
    }).select('_id title');

    console.log('Courses to activate:', coursesToActivate.map(c => ({ id: c._id.toString(), title: c.title })));
    
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

    if (coursesToAddStrings.length === 0) {
      console.log('User already has access to all courses in this promo code');
      return NextResponse.json({ 
        message: 'You already have access to all courses in this promo code',
        activatedCourses: userActivatedCoursesStrings,
        alreadyActivated: true
      });
    }
    
    // Convert string IDs back to ObjectId for storage
    const coursesToAdd = coursesToAddStrings.map(
      (courseIdString: string) => new mongoose.Types.ObjectId(courseIdString)
    );
    
    // Add courses directly using $addToSet to avoid duplicates
    const updateResult = await User.updateOne(
      { _id: userId },
      { 
        $addToSet: { activatedCourses: { $each: coursesToAdd } },
        $set: { promoCode: code } // Save the last used promo code
      }
    );
    
    console.log('User update result:', updateResult);

    // Запрашиваем обновленную информацию пользователя чтобы убедиться, что данные сохранились
    const updatedUser = await User.findById(userId);
    const updatedActivatedCourses = updatedUser?.activatedCourses?.map(
      (id: mongoose.Types.ObjectId) => id.toString()
    ) || [];

    // Проверяем, были ли фактически добавлены курсы
    const actuallyAdded = coursesToAddStrings.filter(
      (courseId: string) => updatedActivatedCourses.includes(courseId)
    );

    console.log('Actually added courses:', actuallyAdded);
    
    // Log the final state 
    console.log('Final activatedCourses state:', {
      activatedCourses: updatedActivatedCourses,
      count: updatedActivatedCourses.length,
      actuallyAddedCount: actuallyAdded.length
    });
    
    // Increment promo code uses only if at least one course was added
    if (actuallyAdded.length > 0) {
      promoCode.uses += 1;
      await promoCode.save();
      console.log('Promo code uses incremented and saved');
    }
    
    // Return detailed success response
    return NextResponse.json({ 
      message: 'Promo code activated successfully',
      activatedCourses: updatedActivatedCourses,
      activatedCoursesCount: updatedActivatedCourses.length,
      promoCodeCourses: promoCodeCourseIdStrings,
      promoCodeCoursesCount: promoCodeCourseIdStrings.length,
      coursesAdded: actuallyAdded,
      coursesAddedCount: actuallyAdded.length,
      courses: coursesToActivate.map(c => ({ id: c._id.toString(), title: c.title }))
    });
    
  } catch (error: any) {
    console.error('Promo code activation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to activate promo code' }, { status: 500 });
  }
}

export const POST = withAuth(handler); 