import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import Admin from '../../../../../models/Admin';
import { generateToken } from '../../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { email, password } = body;
    
    // Проверка наличия обязательных полей
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Необходимо указать email и пароль' 
      }, { status: 400 });
    }
    
    // Поиск администратора по email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return NextResponse.json({ 
        error: 'Неверный email или пароль' 
      }, { status: 401 });
    }
    
    // Проверка пароля
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Неверный email или пароль' 
      }, { status: 401 });
    }
    
    // Генерация JWT токена
    const token = generateToken(admin, 'admin');
    
    return NextResponse.json({ 
      message: 'Вход выполнен успешно',
      token
    });
    
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось выполнить вход' 
    }, { status: 500 });
  }
} 