import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import PromoCode from '../../../../models/PromoCode';
import User from '../../../../models/User';
import { withAuth } from '../../../../lib/auth';
import mongoose from 'mongoose';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

async function handler(req: NextRequest) {
  console.log('🔍 [POST] [/api/promo/activate] Activating promo code...');
  
  try {
    await dbConnect();
    
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid request format', 
        details: (parseError as Error).message 
      }, { status: 400 });
    }
    
    const { code, courseId } = body;
    const userId = (req as any).user.id;
    
    console.log('Promo code activation request:', { code, courseId, userId });
    
    // Validate input
    if (!code || !courseId) {
      console.error(`❌ Missing required fields: ${!code ? 'code' : 'courseId'}`);
      return NextResponse.json({ error: 'Missing required fields: promoCode or courseId' }, { status: 400 });
    }
    
    // Verify courseId format
    let courseObjectId;
    try {
      courseObjectId = new mongoose.Types.ObjectId(courseId);
      console.log(`✅ Valid course ObjectId: ${courseObjectId}`);
    } catch (error) {
      console.error(`❌ Invalid course ID format: ${courseId}`, error);
      return NextResponse.json({ error: 'Invalid course ID format' }, { status: 400 });
    }
    
    // Find promo code
    const promoCode = await PromoCode.findOne({ code });
    if (!promoCode) {
      console.error(`❌ Promo code "${code}" not found or inactive`);
      return NextResponse.json({ error: 'Invalid or inactive promo code' }, { status: 400 });
    }
    
    console.log('Promo code found:', { 
      code, 
      courseIds: promoCode.courseIds?.map((id: mongoose.Types.ObjectId) => id.toString()),
      courseCount: promoCode.courseIds?.length || 0,
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
    
    // Verify the promo code is for this course
    const courseIdStr = courseId.toString();
    const promoCourseIdsStr = promoCode.courseIds?.map((id: mongoose.Types.ObjectId) => id.toString()) || [];
    
    console.log('Checking promo code for course:', { 
      courseId: courseIdStr,
      promoCourseIds: promoCourseIdsStr,
      isTargetedPromo: promoCourseIdsStr.length > 0
    });
    
    // If the promo code is targeted (has specific courses) and doesn't include this course
    if (promoCourseIdsStr.length > 0 && !promoCourseIdsStr.includes(courseIdStr)) {
      console.error(`❌ Promo code ${code} is not valid for course ${courseIdStr}`);
      
      // More detailed logging to diagnose the issue
      console.log('Course ID comparison results:', promoCourseIdsStr.map((id: string) => ({
        promoCourseId: id,
        requestedCourseId: courseIdStr,
        matches: id === courseIdStr
      })));
      
      return NextResponse.json({ error: 'Promo code is not valid for this course' }, { status: 400 });
    }
    
    // Извлекаем токен из заголовков для аутентификации
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid Authorization header');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Проверяем токен и получаем данные пользователя
    let userIdFromToken;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      userIdFromToken = decoded.userId;
      console.log(`🔐 Authenticated user: ${userIdFromToken}`);
    } catch (error) {
      console.error('❌ JWT verification failed:', error);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
    
    // Получаем пользователя из базы данных
    const user = await User.findById(userIdFromToken);
    if (!user) {
      console.error(`❌ User not found: ${userIdFromToken}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Проверяем, активировал ли пользователь уже этот промокод
    const userHasPromo = user.activatedPromoCodes?.includes(code);
    
    if (userHasPromo) {
      console.error(`❌ User ${userIdFromToken} has already activated promo code ${code}`);
      return NextResponse.json({ error: 'Promo code already activated by this user' }, { status: 400 });
    }
    
    // Check if user already has access to the course
    const userAlreadyHasCourse = user.activatedCourses?.some(
      (courseItem: mongoose.Types.ObjectId) => courseItem.toString() === courseId
    );
    
    if (userAlreadyHasCourse) {
      console.log(`ℹ️ User ${userIdFromToken} already has access to course ${courseId}`);
    }
    
    // Activate promo code for user
    console.log(`⏳ Updating user ${userIdFromToken} with new activated promo code ${code} and course ${courseId}`);
    const activatedPromoCodes = user.activatedPromoCodes || [];
    
    try {
      // Convert courseId to ObjectId (already done above)
      
      // Log the data that we'll be updating
      console.log('Update data:', {
        userId: userIdFromToken,
        newPromoCode: code,
        courseId: courseId,
        courseObjectId: courseObjectId.toString(),
        existingPromoCodes: activatedPromoCodes,
      });
      
      // Perform update directly using MongoDB driver for more reliability
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      
      // First approach: Use Mongoose model
      const updateResult = await User.updateOne(
        { _id: userIdFromToken },
        { 
          $set: { 
            activatedPromoCodes: [...activatedPromoCodes, code],
          },
          $addToSet: { 
            activatedCourses: courseObjectId
          }
        }
      );
      
      console.log(`📊 Mongoose update result: ${JSON.stringify(updateResult)}`);

      if (updateResult.modifiedCount === 0) {
        console.log('⚠️ Mongoose update didn\'t modify the document, trying direct MongoDB driver...');
        
        // Second approach: Use MongoDB driver directly as fallback
        const directUpdateResult = await db.collection('users').updateOne(
          { _id: new mongoose.Types.ObjectId(userIdFromToken.toString()) },
          { 
            $set: { 
              activatedPromoCodes: [...activatedPromoCodes, code]
            },
            $addToSet: { 
              activatedCourses: courseObjectId
            }
          }
        );
        
        console.log(`📊 Direct MongoDB update result: ${JSON.stringify(directUpdateResult)}`);
        
        if (directUpdateResult.modifiedCount === 0) {
          console.error(`❌ Both update methods failed for user ${userIdFromToken}`);
          return NextResponse.json({ error: 'Failed to update user record' }, { status: 500 });
        }
      }
      
      // Increment uses counter for the promo code
      await PromoCode.updateOne(
        { _id: promoCode._id },
        { $inc: { uses: 1 } }
      );
      
      // Verify the update was successful by reading the user again
      const updatedUser = await User.findById(userIdFromToken);
      if (!updatedUser) {
        console.error(`❌ Couldn't verify user update for ${userIdFromToken}`);
      } else {
        console.log('Updated user:', {
          activatedPromoCodes: updatedUser.activatedPromoCodes,
          activatedCourses: updatedUser.activatedCourses?.map((courseItem: mongoose.Types.ObjectId) => courseItem.toString())
        });
        
        // Double-check the course was added
        const courseWasAdded = updatedUser.activatedCourses?.some(
          (courseItem: mongoose.Types.ObjectId) => courseItem.toString() === courseId
        );
        
        if (!courseWasAdded) {
          console.error(`❌ Course ${courseId} was not added to user's activatedCourses despite successful update! Using emergency fix...`);
          
          // Emergency third attempt using raw MongoDB commands
          try {
            const emergencyUpdateResult = await db.collection('users').updateOne(
              { _id: new mongoose.Types.ObjectId(userIdFromToken.toString()) },
              { $push: { activatedCourses: courseObjectId } } as any // Type assertion to bypass TypeScript limitation
            );
            
            console.log(`📊 Emergency update result: ${JSON.stringify(emergencyUpdateResult)}`);
          } catch (emergencyError) {
            console.error('❌ Emergency update failed:', emergencyError);
          }
        }
      }
      
      // If the promo code is one-time use, deactivate it
      if (promoCode.isOneTime) {
        console.log(`⏳ Deactivating one-time promo code ${code}`);
        await PromoCode.updateOne(
          { _id: promoCode._id },
          { $set: { isActive: false } }
        );
      }
    } catch (dbError) {
      console.error('❌ Database error during promo code activation:', dbError);
      return NextResponse.json({ 
        error: 'Database error during activation', 
        details: (dbError as Error).message 
      }, { status: 500 });
    }

    // Return success
    console.log(`🎉 Successfully activated promo code ${code} for user ${userIdFromToken} and course ${courseId}`);
    return NextResponse.json(
      { 
        success: true, 
        message: 'Promo code activated successfully',
        courseId
      },
      { status: 200 }
    );
    
  } catch (error: any) {
    console.error('❌ Error activating promo code:', error);
    return NextResponse.json(
      { error: 'An error occurred: ' + error.message },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);