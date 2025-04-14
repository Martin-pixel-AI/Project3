import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import Course from '../../../models/Course';
import { withAuth } from '../../../lib/auth';
import mongoose from 'mongoose';

async function getStats(req: NextRequest) {
  try {
    await dbConnect();
    
    // Проверка прав администратора
    const user = (req as any).user;
    if (user.type !== 'admin') {
      return NextResponse.json({ error: 'Только администраторы могут получать статистику' }, { status: 403 });
    }
    
    // Получение общей статистики
    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments();
    
    // Получение статистики за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const newUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    const newCourses = await Course.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    // Получение статистики за сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const usersToday = await User.countDocuments({
      createdAt: { $gte: today }
    });
    
    const coursesToday = await Course.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Популярные категории курсов
    const categoryStats = await Course.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Популярные теги
    const tagStats = await Course.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Активность пользователей по месяцам (регистрации)
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const usersByMonth = await User.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startOfYear } 
        } 
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Преобразуем в массив по месяцам (1-12)
    const usersMonthlyData = Array(12).fill(0);
    usersByMonth.forEach(item => {
      usersMonthlyData[item._id - 1] = item.count;
    });
    
    // Получение списка всех курсов для администратора
    const courses = await Course.find({})
      .select('title category views createdAt')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({
      overview: {
        totalUsers,
        totalCourses,
        newUsers,
        newCourses,
        usersToday,
        coursesToday
      },
      categories: categoryStats,
      tags: tagStats,
      usersMonthlyData,
      courses
    });
    
  } catch (error: any) {
    console.error('Ошибка получения статистики:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось получить статистику' 
    }, { status: 500 });
  }
}

export const GET = withAuth(getStats); 