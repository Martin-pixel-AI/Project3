import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import mongoose from 'mongoose';
import { withAuth } from '../../../../lib/auth';
import { getCollection, toObjectId } from '@/lib/db-utils';

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get userId from auth
    const userData = (req as any).user;
    const userId = userData.id;
    
    console.log(`🔍 [COURSE-ACCESS-DEBUG] Checking course access for user ${userId}`);
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { courseId, fix = false } = body;
    
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }
    
    // Direct database access
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection not established' }, { status: 500 });
    }
    
    // Get collections with the correct names
    const usersCollection = await getCollection(db, 'users');
    const coursesCollection = await getCollection(db, 'courses');
    const promoCodesCollection = await getCollection(db, 'promocodes');
    
    // Get user and course directly from MongoDB
    const user = await usersCollection.findOne({ 
      _id: toObjectId(userId) 
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const course = await coursesCollection.findOne({ 
      _id: toObjectId(courseId) 
    });
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    // Extract and normalize all the IDs for comparison
    const courseObjectId = toObjectId(courseId);
    const courseIdString = courseId.toString();
    const courseIdHexString = courseObjectId.toHexString();
    
    // Initialize arrays if they don't exist
    const activatedCourses = user.activatedCourses || [];
    const activatedPromoCodes = user.activatedPromoCodes || [];
    
    // Check for admin access
    const isAdmin = user.type === 'admin';
    
    // Get detailed format information about activatedCourses array
    const activatedCoursesDetails = activatedCourses.map((activeCourse: any) => {
      let idAsString;
      let idAsHexString;
      let isExactMatch = false;
      let isHexMatch = false;
      
      try {
        idAsString = activeCourse.toString();
        idAsHexString = activeCourse instanceof mongoose.Types.ObjectId 
          ? activeCourse.toHexString() 
          : new mongoose.Types.ObjectId(activeCourse).toHexString();
        
        // Check for exact matches and hex matches
        isExactMatch = idAsString === courseIdString;
        isHexMatch = idAsHexString === courseIdHexString;
      } catch (error) {
        console.error('Error converting ID:', error);
      }
      
      return {
        original: activeCourse,
        asString: idAsString,
        asHexString: idAsHexString,
        isExactMatch,
        isHexMatch,
        typeOf: typeof activeCourse
      };
    });
    
    // Check if course is in activatedCourses (any format)
    const hasDirectAccess = isAdmin || activatedCoursesDetails.some(
      (detail: { isExactMatch: boolean, isHexMatch: boolean }) => detail.isExactMatch || detail.isHexMatch
    );
    
    // Check if any of the user's promo codes grant access to this course
    const promoCodesForCourse = await promoCodesCollection.find({
      code: { $in: activatedPromoCodes },
      courseIds: toObjectId(courseId)
    }).toArray();
    
    // Fix the issue if requested and there's a problem
    let fixApplied = false;
    let fixResult = null;
    
    if (fix && (!hasDirectAccess && promoCodesForCourse.length > 0 && !isAdmin)) {
      try {
        // Try multiple ways to update the array to ensure it works
        
        // Method 1: Add as ObjectId
        await usersCollection.updateOne(
          { _id: toObjectId(userId) },
          { $addToSet: { activatedCourses: courseObjectId } }
        );
        
        // Method 2: Remove all instances and add fresh
        await usersCollection.updateOne(
          { _id: toObjectId(userId) },
          { 
            $pull: { 
              activatedCourses: { 
                $in: [
                  courseIdString, 
                  courseIdHexString,
                  courseObjectId
                ] 
              } as any
            } 
          }
        );
        
        await usersCollection.updateOne(
          { _id: toObjectId(userId) },
          { $addToSet: { activatedCourses: courseObjectId } }
        );
        
        // Method 3: Force entire array replacement if needed
        if (promoCodesForCourse.length > 0) {
          const existingCourseIds = (user.activatedCourses || [])
            .map((id: any) => toObjectId(id.toString()))
            .filter((id: any) => id.toString() !== courseIdString);
          
          const newCourseIds = [
            ...existingCourseIds,
            courseObjectId
          ];
          
          await usersCollection.updateOne(
            { _id: toObjectId(userId) },
            { $set: { activatedCourses: newCourseIds } }
          );
        }
        
        // Get updated user data to confirm changes
        const updatedUser = await usersCollection.findOne({ 
          _id: toObjectId(userId) 
        });
        
        // Check if fix worked
        const updatedCourseIds = updatedUser?.activatedCourses || [];
        const fixWorked = updatedCourseIds.some((id: any) => 
          id.toString() === courseIdString
        );
        
        fixApplied = true;
        fixResult = {
          success: fixWorked,
          updatedActivatedCourses: updatedCourseIds.map((id: any) => id.toString())
        };
        
      } catch (fixError: any) {
        console.error('Fix attempt error:', fixError);
        fixResult = {
          success: false,
          error: fixError.message
        };
      }
    }
    
    // Return detailed diagnostic information
    return NextResponse.json({
      diagnostics: {
        userId,
        courseId,
        courseIdFormats: {
          original: courseId,
          asString: courseIdString,
          asHexString: courseIdHexString
        },
        userEmail: user.email,
        userType: user.type || 'regular',
        isAdmin,
        courseName: course.title,
        hasDirectAccess,
        activatedCoursesCount: activatedCourses.length,
        activatedCoursesDetails,
        activatedPromoCodes,
        matchingPromoCodes: promoCodesForCourse.map((p: any) => p.code),
        hasPromoAccess: promoCodesForCourse.length > 0,
        shouldHaveAccess: hasDirectAccess || promoCodesForCourse.length > 0 || isAdmin
      },
      fixApplied,
      fixResult,
      userInstructions: isAdmin
        ? "You have admin access to all courses"
        : (fixApplied 
          ? "Please refresh the course page to see if access has been granted. If not, try clearing your browser cache and logging in again."
          : "Run this endpoint again with 'fix: true' in the request body to attempt an automatic fix.")
    });
    
  } catch (error: any) {
    console.error('Course access debug error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export const POST = withAuth(handler); 