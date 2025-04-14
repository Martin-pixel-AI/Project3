import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import PromoCode from '../../../../models/PromoCode';
import { withAuth } from '../../../../lib/auth';
import mongoose from 'mongoose';

// Генерация случайного кода
function generateRandomCode(length = 8) {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    // Проверка прав администратора
    const user = (req as any).user;
    if (user.type !== 'admin') {
      return NextResponse.json({ error: 'Только администраторы могут создавать промокоды' }, { status: 403 });
    }
    
    const body = await req.json();
    const { 
      code: providedCode, 
      courseIds, 
      expiresAt: providedExpiryDate, 
      maxUses = 1,
      isActive = true
    } = body;
    
    // Используем предоставленный код или генерируем новый
    const code = providedCode || generateRandomCode();
    
    // Проверяем, существует ли курс с таким кодом
    const existingPromo = await PromoCode.findOne({ code });
    if (existingPromo) {
      return NextResponse.json({ 
        error: 'Промокод с таким кодом уже существует' 
      }, { status: 400 });
    }
    
    // Проверка наличия courseIds
    if (!courseIds || !courseIds.length) {
      return NextResponse.json({ 
        error: 'Необходимо указать хотя бы один курс для промокода' 
      }, { status: 400 });
    }
    
    // Устанавливаем срок действия промокода (30 дней по умолчанию)
    const expiresAt = providedExpiryDate ? new Date(providedExpiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    // Создаем новый промокод
    const promoCode = await PromoCode.create({
      code,
      courseIds,
      expiresAt,
      maxUses,
      uses: 0,
      isActive
    });
    
    return NextResponse.json({ 
      message: 'Промокод успешно создан',
      promoCode
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Ошибка создания промокода:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось создать промокод' 
    }, { status: 500 });
  }
}

export const POST = withAuth(handler); 