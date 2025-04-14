import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';
import Admin from '../../../../models/Admin';
import { withAuth } from '../../../../lib/auth';

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    const userData = (req as any).user;
    const userId = userData.id;
    const userType = userData.type || 'user';
    
    // В зависимости от типа пользователя, получаем данные из соответствующей модели
    let user;
    if (userType === 'admin') {
      user = await Admin.findById(userId).select('-password');
    } else {
      user = await User.findById(userId).select('-password');
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }
    
    // Возвращаем информацию о пользователе вместе с типом
    return NextResponse.json({
      ...user.toJSON(),
      type: userType
    });
    
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: error.message || 'Не удалось получить данные пользователя' }, { status: 500 });
  }
}

export const GET = withAuth(handler); 