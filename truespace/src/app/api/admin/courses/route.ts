import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import Course from '../../../../models/Course';
import { withAuth } from '../../../../lib/auth';

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    // Проверка прав администратора
    const user = (req as any).user;
    if (user.type !== 'admin') {
      return NextResponse.json({ error: 'Только администраторы могут получать эти данные' }, { status: 403 });
    }
    
    // Получение всех курсов с подсчетом видео и активаций
    const courses = await Course.find()
      .populate('videos', 'title duration')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ courses });
    
  } catch (error: any) {
    console.error('Ошибка получения списка курсов для админа:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось получить список курсов' 
    }, { status: 500 });
  }
}

export const GET = withAuth(handler); 