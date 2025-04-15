import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

/**
 * EMERGENCY DIRECT ACCESS ENDPOINT - NO AUTH REQUIRED
 * This is a special endpoint for emergency access when normal methods fail
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { courseId, userId, email } = body;
    
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }
    
    if (!userId && !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }
    
    console.log('🚨 SUPER EMERGENCY ACCESS REQUEST:', { courseId, userId, email });
    
    // Direct database access
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // Find user either by ID or email
    let userQuery = {};
    
    if (userId) {
      try {
        userQuery = { _id: new mongoose.Types.ObjectId(userId) };
      } catch (error) {
        console.error('Invalid user ID format:', error);
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
      }
    } else if (email) {
      userQuery = { email };
    }
    
    // Find the user
    const user = await db.collection('users').findOne(userQuery);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('Found user for emergency access:', { id: user._id, email: user.email });
    
    // Convert courseId to ObjectId
    let courseObjectId;
    try {
      courseObjectId = new mongoose.Types.ObjectId(courseId);
    } catch (error) {
      console.error('Invalid course ID format:', error);
      return NextResponse.json({ error: 'Invalid course ID format' }, { status: 400 });
    }
    
    // Find the course
    const course = await db.collection('courses').findOne({ _id: courseObjectId });
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    console.log('Found course:', { id: course._id, title: course.title });
    
    // USE ALL METHODS to ensure access works
    
    // 1. Update activatedCourses array
    let updateResult1;
    try {
      updateResult1 = await db.collection('users').updateOne(
        { _id: user._id },
        { $addToSet: { activatedCourses: courseObjectId } }
      );
      console.log('Method 1 update result:', updateResult1);
    } catch (error) {
      console.error('Method 1 update error:', error);
    }
    
    // 2. Set "deva" promo code to user if not already there
    let updateResult2;
    try {
      updateResult2 = await db.collection('users').updateOne(
        { _id: user._id },
        { $addToSet: { activatedPromoCodes: "deva" } }
      );
      console.log('Method 2 update result:', updateResult2);
    } catch (error) {
      console.error('Method 2 update error:', error);
    }
    
    // 3. Add course to coursesDirectAccess object
    let updateResult3;
    try {
      updateResult3 = await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { [`coursesDirectAccess.${courseId}`]: true } }
      );
      console.log('Method 3 update result:', updateResult3);
    } catch (error) {
      console.error('Method 3 update error:', error);
    }
    
    // 4. Create deva promo code if it doesn't exist and add this course
    try {
      const existingPromo = await db.collection('promocodes').findOne({ code: 'deva' });
      
      if (!existingPromo) {
        await db.collection('promocodes').insertOne({
          code: 'deva',
          courseIds: [courseObjectId],
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          maxUses: 1000,
          uses: 0,
          isActive: true,
          createdAt: new Date()
        });
        console.log('Created deva promo code');
      } else {
        // Add this course to the promo code
        await db.collection('promocodes').updateOne(
          { code: 'deva' },
          { $addToSet: { courseIds: courseObjectId } }
        );
        console.log('Added course to deva promo code');
      }
    } catch (error) {
      console.error('Promo code update error:', error);
    }
    
    // 5. Create special direct access token
    const directAccessToken = Buffer.from(`${user._id}:${courseId}:${Date.now()}`).toString('base64');
    
    try {
      await db.collection('directAccess').insertOne({
        userId: user._id,
        courseId: courseObjectId,
        token: directAccessToken,
        createdAt: new Date()
      });
      console.log('Created direct access token');
    } catch (error) {
      console.error('Direct access token creation error:', error);
    }
    
    // Get updated user record to verify changes
    const updatedUser = await db.collection('users').findOne({ _id: user._id });
    
    return NextResponse.json({
      success: true,
      message: 'Super emergency access granted',
      user: {
        id: updatedUser?._id.toString() || user._id.toString(),
        email: updatedUser?.email || user.email
      },
      course: {
        id: course._id.toString(),
        title: course.title
      },
      directAccessToken,
      actions: {
        activatedCourse: !!updateResult1?.modifiedCount,
        activatedPromoCode: !!updateResult2?.modifiedCount,
        setDirectAccess: !!updateResult3?.modifiedCount
      },
      whatToDoNext: "1. Use localStorage.setItem('directAccessToken', '" + directAccessToken + "'); 2. Use localStorage.setItem('directAccessCourse', '" + courseId + "'); 3. Refresh the page"
    });
    
  } catch (error: any) {
    console.error('Super emergency access error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 