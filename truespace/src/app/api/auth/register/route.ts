import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';
import Course from '../../../../models/Course';
import { generateToken } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { email, password, name } = body;
    
    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password and name are required' }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists with this email' }, { status: 409 });
    }
    
    // Get all course IDs to automatically add to the user
    const allCourses = await Course.find({}, '_id');
    const allCourseIds = allCourses.map(course => course._id);
    
    console.log(`Auto-activating ${allCourseIds.length} courses for new user`);
    
    // Create new user with all courses activated
    const user = new User({
      email,
      password, // Will be hashed by pre-save hook
      name,
      favorites: [],
      activatedCourses: allCourseIds // Automatically activate all courses
    });
    
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user, 'user');
    
    // Return user without password
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      favorites: user.favorites,
      activatedCourses: user.activatedCourses
    };
    
    return NextResponse.json({ 
      user: userResponse, 
      token 
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Failed to register user' }, { status: 500 });
  }
} 