import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import PromoCode from '../../../../models/PromoCode';
import User from '../../../../models/User';
import { withAuth } from '../../../../lib/auth';
import mongoose from 'mongoose';

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { code } = body;
    const userId = (req as any).user.id;
    
    // Validate input
    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }
    
    // Find promo code
    const promoCode = await PromoCode.findOne({ code });
    if (!promoCode) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
    }
    
    // Check if promo code is valid
    if (!promoCode.isValid()) {
      return NextResponse.json({ error: 'Promo code is expired or has reached maximum uses' }, { status: 400 });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Убедимся, что activatedCourses - это массив
    if (!user.activatedCourses) {
      user.activatedCourses = [];
    }
    
    // Преобразуем существующие courseIds в строки для сравнения
    const userActivatedCoursesStrings = user.activatedCourses.map(
      (id: mongoose.Types.ObjectId) => id.toString()
    );
    
    // Добавляем только те курсы, которых еще нет у пользователя
    const coursesToAdd = promoCode.courseIds.filter(
      (courseId: mongoose.Types.ObjectId) => !userActivatedCoursesStrings.includes(courseId.toString())
    );
    
    // Конвертируем строки ObjectId обратно в ObjectId
    user.activatedCourses = [
      ...user.activatedCourses,
      ...coursesToAdd
    ];
    
    user.promoCode = code; // Save the last used promo code
    
    await user.save();
    
    // Increment promo code uses
    promoCode.uses += 1;
    await promoCode.save();
    
    // В ответе отправим полный список курсов для диагностики
    return NextResponse.json({ 
      message: 'Promo code activated successfully',
      activatedCourses: user.activatedCourses,
      activatedCoursesCount: user.activatedCourses.length,
      promoCodeCourses: promoCode.courseIds,
      promoCodeCoursesCount: promoCode.courseIds.length
    });
    
  } catch (error: any) {
    console.error('Promo code activation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to activate promo code' }, { status: 500 });
  }
}

export const POST = withAuth(handler); 