import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';
import { withAuth } from '../../../../lib/auth';

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    const userId = (req as any).user.id;
    
    // Find user with populated courses
    const user = await User.findById(userId)
      .populate('favorites')
      .populate('activatedCourses');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Return user without password
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      favorites: user.favorites,
      activatedCourses: user.activatedCourses,
      promoCode: user.promoCode
    };
    
    return NextResponse.json({ user: userResponse });
    
  } catch (error: any) {
    console.error('Get user profile error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get user profile' }, { status: 500 });
  }
}

export const GET = withAuth(handler); 