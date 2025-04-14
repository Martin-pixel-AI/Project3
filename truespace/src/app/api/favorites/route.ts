import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import { withAuth } from '../../../lib/auth';

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    const userId = (req as any).user.id;
    
    // Find user with populated favorites
    const user = await User.findById(userId).populate('favorites');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ favorites: user.favorites });
    
  } catch (error: any) {
    console.error('Get favorites error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get favorites' }, { status: 500 });
  }
}

export const GET = withAuth(handler); 