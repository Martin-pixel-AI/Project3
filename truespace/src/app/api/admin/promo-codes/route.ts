import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/auth';

// GET - Retrieve promo code information (now deprecated)
async function getPromoCodes(req: NextRequest) {
  try {
    // Check admin permissions
    const user = (req as any).user;
    if (user.type !== 'admin') {
      return NextResponse.json({ error: 'Only admins can access this data' }, { status: 403 });
    }
    
    // Return information about promo codes being removed
    return NextResponse.json({
      message: 'Promo code functionality has been removed from the platform',
      info: 'All courses are now automatically available to users after registration',
      promoCodes: [],
      stats: {
        totalPromoCodes: 0,
        activePromoCodes: 0,
        totalUses: 0,
        expiredPromoCodes: 0,
        maxedOutPromoCodes: 0
      }
    });
    
  } catch (error: any) {
    console.error('Error in promo codes endpoint:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process request' 
    }, { status: 500 });
  }
}

export const GET = withAuth(getPromoCodes); 