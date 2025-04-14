import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import Admin from '../../../../../models/Admin';
import { generateToken } from '../../../../../lib/auth';

// Секретный ключ для регистрации администраторов (в реальном проекте должен быть в .env)
const ADMIN_REGISTER_KEY = 'truespace-admin-secret-key';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { email, password, name, adminKey } = body;
    
    // Проверка наличия всех обязательных полей
    if (!email || !password || !name || !adminKey) {
      return NextResponse.json({ 
        error: 'Необходимо указать email, пароль, имя и ключ администратора' 
      }, { status: 400 });
    }
    
    // Проверка ключа администратора
    if (adminKey !== ADMIN_REGISTER_KEY) {
      return NextResponse.json({ 
        error: 'Неверный ключ администратора' 
      }, { status: 403 });
    }
    
    // Проверка, существует ли уже администратор с таким email
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return NextResponse.json({ 
        error: 'Администратор с таким email уже зарегистрирован' 
      }, { status: 400 });
    }
    
    // Создание нового администратора
    const admin = await Admin.create({
      email,
      password, // Пароль будет хешироваться в pre-save хуке
      name,
      role: 'admin'
    });
    
    // Генерация JWT токена
    const token = generateToken(admin, 'admin');
    
    return NextResponse.json({ 
      message: 'Аккаунт администратора успешно создан',
      token
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Admin registration error:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось зарегистрировать администратора' 
    }, { status: 500 });
  }
} 