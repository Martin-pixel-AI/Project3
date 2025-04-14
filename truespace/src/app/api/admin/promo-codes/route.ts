import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import PromoCode from '../../../../models/PromoCode';
import Course from '../../../../models/Course';
import { withAuth } from '../../../../lib/auth';

// GET - Retrieve all promo codes with stats
async function getPromoCodes(req: NextRequest) {
  try {
    await dbConnect();
    
    // Check admin permissions
    const user = (req as any).user;
    if (user.type !== 'admin') {
      return NextResponse.json({ error: 'Only admins can access this data' }, { status: 403 });
    }
    
    // Fetch all promo codes with populated course data
    const promoCodes = await PromoCode.find({})
      .populate({
        path: 'courseIds',
        select: 'title thumbnail',
        model: Course
      })
      .sort({ createdAt: -1 });
    
    // Calculate statistics
    const totalPromoCodes = promoCodes.length;
    const activePromoCodes = promoCodes.filter(code => code.isActive).length;
    const totalUses = promoCodes.reduce((sum, code) => sum + code.uses, 0);
    const expiredPromoCodes = promoCodes.filter(code => new Date(code.expiresAt) < new Date()).length;
    const maxedOutPromoCodes = promoCodes.filter(code => code.maxUses > 0 && code.uses >= code.maxUses).length;
    
    return NextResponse.json({
      promoCodes,
      stats: {
        totalPromoCodes,
        activePromoCodes,
        totalUses,
        expiredPromoCodes,
        maxedOutPromoCodes
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch promo codes' 
    }, { status: 500 });
  }
}

export const GET = withAuth(getPromoCodes); 