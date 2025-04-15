import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import { withAuth } from "@/lib/auth";
import { getCollection, toObjectId } from "@/lib/db-utils";

async function handler(req: NextRequest, context: any) {
  try {
    const { userId } = context;
    const { courseId } = await req.json();
    
    if (!courseId) {
      return NextResponse.json({ 
        error: "Missing courseId in request body" 
      }, { status: 400 });
    }

    // Connect to the database
    const db = await dbConnect();
    const mongoDb = mongoose.connection.db;
    
    // Ensure we handle different ID formats
    const targetCourseId = courseId.toString();
    let courseObjectId: mongoose.Types.ObjectId;
    
    try {
      courseObjectId = toObjectId(targetCourseId);
    } catch (error) {
      return NextResponse.json({ 
        error: "Invalid courseId format" 
      }, { status: 400 });
    }

    // Get collections with the correct names
    const usersCollection = await getCollection(mongoDb, 'users');
    const coursesCollection = await getCollection(mongoDb, 'courses');
    const promoCodesCollection = await getCollection(mongoDb, 'promocodes');

    // Get user and course data
    const user = await usersCollection.findOne({ 
      _id: toObjectId(userId) 
    });
    
    const course = await coursesCollection.findOne({ 
      _id: courseObjectId 
    });

    if (!user) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 });
    }

    if (!course) {
      return NextResponse.json({ 
        error: "Course not found" 
      }, { status: 404 });
    }

    // For debugging
    console.log(`Fixing access for user: ${userId} to course: ${targetCourseId}`);
    console.log(`User type: ${user.type || 'regular'}`);

    // Direct fix process
    const results = {
      userId,
      courseId: targetCourseId,
      initialState: {
        activatedCourses: user.activatedCourses || [],
        activatedPromoCodes: user.activatedPromoCodes || [],
        userType: user.type || 'regular'
      },
      actions: [] as string[]
    };

    // Check if user is admin - admins always have access
    if (user.type === 'admin') {
      results.actions.push("User is admin, no need to add course to activatedCourses");
    } else {
      // 1. Ensure the course exists in activatedCourses with the exact same format
      const activatedCourses = user.activatedCourses || [];
      let courseFound = false;
      
      for (const id of activatedCourses) {
        const idString = id.toString();
        if (idString === targetCourseId || idString === courseObjectId.toString()) {
          courseFound = true;
          break;
        }
      }

      if (!courseFound) {
        // Add the course directly to activatedCourses
        await usersCollection.updateOne(
          { _id: toObjectId(userId) },
          { $addToSet: { activatedCourses: courseObjectId } }
        );
        results.actions.push("Added course to activatedCourses");
      }

      // 2. Check if course is related to any promo code
      const promoCodes = course.promocodes || [];
      
      if (promoCodes.length > 0) {
        const userPromos = user.activatedPromoCodes || [];
        let promoAdded = false;
        
        for (const promoId of promoCodes) {
          // Get the promo code details
          const promoCode = await promoCodesCollection.findOne({
            _id: promoId
          });
          
          if (promoCode && promoCode.courses && promoCode.courses.includes(courseObjectId)) {
            // Add this promo to user's activatedPromoCodes if not already there
            await usersCollection.updateOne(
              { _id: toObjectId(userId) },
              { $addToSet: { activatedPromoCodes: promoId } }
            );
            results.actions.push(`Added promo code ${promoCode.code} to user's activatedPromoCodes`);
            promoAdded = true;
          }
        }
        
        if (!promoAdded) {
          results.actions.push("No relevant promo codes found for this course");
        }
      }
    }

    // Verify changes were applied
    const updatedUser = await usersCollection.findOne({ 
      _id: toObjectId(userId) 
    });

    if (!updatedUser) {
      return NextResponse.json({
        error: "Failed to fetch updated user data"
      }, { status: 500 });
    }

    // Verify access now
    let accessFixed = false;
    
    // Admins always have access
    if (updatedUser.type === 'admin') {
      accessFixed = true;
    } else {
      const updatedActivatedCourses = updatedUser.activatedCourses || [];
      
      for (const id of updatedActivatedCourses) {
        const idString = id.toString();
        if (idString === targetCourseId || idString === courseObjectId.toString()) {
          accessFixed = true;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      courseId: targetCourseId,
      course: {
        title: course.title,
        id: course._id.toString()
      },
      initialState: results.initialState,
      actions: results.actions,
      finalState: {
        activatedCourses: updatedUser.activatedCourses || [],
        activatedPromoCodes: updatedUser.activatedPromoCodes || [],
        userType: updatedUser.type || 'regular'
      },
      accessFixed,
      nextSteps: "Please reload the course page to see if access is working now."
    });
  } catch (error: any) {
    console.error("Direct fix error:", error);
    return NextResponse.json({ 
      error: error.message || "Unknown error occurred" 
    }, { status: 500 });
  }
}

export const POST = withAuth(handler); 