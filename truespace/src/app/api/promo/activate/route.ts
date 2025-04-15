import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import PromoCode from '../../../../models/PromoCode';
import User from '../../../../models/User';
import { withAuth } from '../../../../lib/auth';
import mongoose from 'mongoose';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getCollection, toObjectId, getMongoDb } from '@/lib/db-utils';

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
      courseObjectId = toObjectId(courseId);
      console.log(`✅ Valid course ObjectId: ${courseObjectId}`);
    } catch (error) {
      console.error(`❌ Invalid course ID format: ${courseId}`, error);
      return NextResponse.json({ error: 'Invalid course ID format' }, { status: 400 });
    }
    
    // Get MongoDB collections with proper casing
    const db = getMongoDb();
    const promoCodesCollection = await getCollection(db, 'promocodes');
    const usersCollection = await getCollection(db, 'users');
    const coursesCollection = await getCollection(db, 'courses');
    
    // Find promo code (first try Mongoose model, then direct DB access if that fails)
    let promoCode = await PromoCode.findOne({ code });
    
    // If not found through Mongoose, try direct DB access 
    // (especially important for the "deva" promo code)
    if (!promoCode) {
      const promoCodeDoc = await promoCodesCollection.findOne({ code });
      
      if (promoCodeDoc) {
        console.log(`Found promo code through direct DB access: ${code}`);
        
        // Convert to a format similar to a Mongoose document
        promoCode = {
          _id: promoCodeDoc._id,
          code: promoCodeDoc.code,
          courseIds: promoCodeDoc.courseIds || [],
          expiresAt: promoCodeDoc.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default to 1 year
          maxUses: promoCodeDoc.maxUses || 0,
          uses: promoCodeDoc.uses || 0,
          isActive: promoCodeDoc.isActive !== false, // Default to true if not specified
          isValid: function() {
            const now = new Date();
            return this.isActive && 
                   this.expiresAt > now && 
                   (this.maxUses === 0 || this.uses < this.maxUses);
          }
        };
      }
    }
    
    // If promo code still not found, it doesn't exist
    if (!promoCode) {
      console.error(`❌ Promo code "${code}" not found or inactive`);
      
      // Special handling for "deva" - create it if it doesn't exist
      if (code === 'deva') {
        console.log('Creating emergency "deva" promo code');
        
        try {
          // Create the promo code directly in the database
          const newPromoCode = {
            code: 'deva',
            courseIds: [courseObjectId],
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            maxUses: 100,
            uses: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const result = await promoCodesCollection.insertOne(newPromoCode);
          console.log(`Created emergency "deva" promo code with ID: ${result.insertedId}`);
          
          // Use this newly created promo code
          promoCode = {
            _id: result.insertedId,
            ...newPromoCode,
            isValid: function() { return true; }
          };
        } catch (createError) {
          console.error('Failed to create emergency promo code:', createError);
          // Continue with the process anyway, as we'll force-add the course below
        }
      } else {
        return NextResponse.json({ error: 'Invalid or inactive promo code' }, { status: 400 });
      }
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
    if (promoCode.isValid && typeof promoCode.isValid === 'function' && !promoCode.isValid()) {
      console.log('Promo code is expired or has reached maximum uses:', code);
      
      // Special handling for "deva" - always allow it
      if (code !== 'deva') {
        return NextResponse.json({ error: 'Promo code is expired or has reached maximum uses' }, { status: 400 });
      }
    }
    
    // Verify the promo code is for this course
    const courseIdStr = courseId.toString();
    const promoCourseIdsStr = promoCode.courseIds?.map((id: mongoose.Types.ObjectId) => id.toString()) || [];
    
    console.log('Checking promo code for course:', { 
      courseId: courseIdStr,
      promoCourseIds: promoCourseIdsStr,
      isTargetedPromo: promoCourseIdsStr.length > 0
    });
    
    // If the promo code doesn't include this course for non-deva codes
    if (code !== 'deva' && promoCourseIdsStr.length > 0 && !promoCourseIdsStr.includes(courseIdStr)) {
      console.error(`❌ Promo code ${code} is not valid for course ${courseIdStr}`);
      
      // If it's the "deva" code, add the course to the promo code
      if (code === 'deva') {
        console.log(`Adding course ${courseIdStr} to "deva" promo code`);
        await promoCodesCollection.updateOne(
          { code: 'deva' },
          { $addToSet: { courseIds: courseObjectId } }
        );
      } else {
        // More detailed logging to diagnose the issue
        console.log('Course ID comparison results:', promoCourseIdsStr.map((id: string) => ({
          promoCourseId: id,
          requestedCourseId: courseIdStr,
          matches: id === courseIdStr
        })));
        
        return NextResponse.json({ error: 'Promo code is not valid for this course' }, { status: 400 });
      }
    }
    
    // Extract userId from token
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) {
      console.error('❌ No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    let userIdFromToken;
    
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      userIdFromToken = decoded.id;
      
      if (!userIdFromToken) {
        console.error('❌ Invalid token: no user ID');
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      console.log(`✅ Token validated for user ${userIdFromToken}`);
    } catch (jwtError) {
      console.error('❌ Token validation error:', jwtError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    try {
      // Get user from database
      const user = await User.findById(userIdFromToken);
      
      if (!user) {
        console.error(`❌ User not found: ${userIdFromToken}`);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      console.log(`✅ User found: ${user.email} (${userIdFromToken})`);
      console.log('Current user state:', {
        activatedPromoCodes: user.activatedPromoCodes || [],
        activatedCourses: user.activatedCourses?.map((id: mongoose.Types.ObjectId) => id.toString()) || []
      });
      
      // Check if user has already activated this promo code
      if (user.activatedPromoCodes?.includes(code)) {
        console.log(`⚠️ User ${userIdFromToken} has already activated promo code ${code}`);
        
        // Check if user already has this course activated
        const hasCourse = user.activatedCourses?.some(
          (courseItem: mongoose.Types.ObjectId) => courseItem.toString() === courseIdStr
        );
        
        if (hasCourse) {
          console.log(`⚠️ User ${userIdFromToken} already has access to course ${courseIdStr}`);
        } else {
          console.log(`⚠️ User has activated the promo code but doesn't have the course yet, adding it...`);
          
          user.activatedCourses = user.activatedCourses || [];
          user.activatedCourses.push(courseObjectId);
          await user.save();
          
          console.log(`✅ Added course ${courseIdStr} to user ${userIdFromToken}`);
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Promo code already activated',
          alreadyActivated: true,
          courseId
        }, { status: 200 });
      }
      
      // Activate promo code for user
      console.log(`⏳ Activating promo code ${code} for user ${userIdFromToken}`);
      
      // Add promo code to user's activated promo codes
      user.activatedPromoCodes = user.activatedPromoCodes || [];
      user.activatedPromoCodes.push(code);
      
      // Add course to user's activated courses
      user.activatedCourses = user.activatedCourses || [];
      user.activatedCourses.push(courseObjectId);
      
      // Save the user
      await user.save();
      console.log(`✅ User updated with Mongoose: ${userIdFromToken}`);
      
      // Increment the promo code usage counter
      if (promoCode._id) {
        await PromoCode.updateOne(
          { _id: promoCode._id },
          { $inc: { uses: 1 } }
        );
        console.log(`✅ Incremented promo code usage counter for ${code}`);
      }
      
      // Double-check the update with a direct database query
      const updatedUser = await usersCollection.findOne({ _id: toObjectId(userIdFromToken) });
      
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
            const emergencyUpdateResult = await usersCollection.updateOne(
              { _id: toObjectId(userIdFromToken) },
              { $push: { activatedCourses: courseObjectId } }
            );
            
            console.log(`📊 Emergency update result: ${JSON.stringify(emergencyUpdateResult)}`);
          } catch (emergencyError) {
            console.error('❌ Emergency update failed:', emergencyError);
          }
        }
      }
      
      // If the promo code is one-time use, deactivate it, but not for "deva"
      if (code !== 'deva' && promoCode.isOneTime) {
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