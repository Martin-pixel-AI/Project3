import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../lib/auth';

async function handler(req: NextRequest) {
  try {
    // Проверка прав администратора
    const user = (req as any).user;
    if (user.type !== 'admin') {
      return NextResponse.json({ error: 'Только администраторы могут получать эти данные' }, { status: 403 });
    }
    
    // Return information about promo codes being removed
    return NextResponse.json({
      message: 'Функционал промокодов был удален из платформы',
      info: 'Все курсы теперь автоматически доступны пользователям после регистрации',
      overview: {
        totalPromoCodes: 0,
        activePromoCodes: 0,
        totalUses: 0
      },
      topPromoCodes: [],
      promoActivationsByMonth: {},
      allPromoCodes: []
    });
    
  } catch (error: any) {
    console.error('Ошибка в endpoint промокодов:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось обработать запрос' 
    }, { status: 500 });
  }
}

export const GET = withAuth(handler); 