import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';
import { generateToken } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { email, password } = body;
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    // Generate JWT token
    const token = generateToken(user, 'user');
    
    // Return user without password
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      favorites: user.favorites,
      activatedCourses: user.activatedCourses,
      promoCode: user.promoCode
    };
    
    return NextResponse.json({ 
      user: userResponse, 
      token 
    });
    
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Failed to login' }, { status: 500 });
  }
} 