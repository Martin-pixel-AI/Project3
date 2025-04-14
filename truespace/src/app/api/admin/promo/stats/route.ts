import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import PromoCode from '../../../../../models/PromoCode';
import User from '../../../../../models/User';
import Course from '../../../../../models/Course';
import { withAuth } from '../../../../../lib/auth';
import { Types } from 'mongoose';

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    // Проверка прав администратора
    const user = (req as any).user;
    if (user.type !== 'admin') {
      return NextResponse.json({ error: 'Только администраторы могут получать эти данные' }, { status: 403 });
    }
    
    // Получение всех промокодов с сортировкой по использованию
    const promoCodes = await PromoCode.find().sort({ uses: -1 });
    
    // Получаем статистику по использованию промокодов
    const totalPromoCodes = await PromoCode.countDocuments();
    const activePromoCodes = await PromoCode.countDocuments({ 
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    // Общее количество использований всех промокодов
    const totalUses = await PromoCode.aggregate([
      { $group: { _id: null, total: { $sum: '$uses' } } }
    ]);
    
    // Топ-5 наиболее используемых промокодов
    const topPromoCodes = await PromoCode.find()
      .sort({ uses: -1 })
      .limit(5);
    
    // Получаем данные курсов для промокодов
    const courseIds = promoCodes.reduce((ids: Set<string>, promo: any) => {
      promo.courseIds.forEach((id: Types.ObjectId) => ids.add(id.toString()));
      return ids;
    }, new Set<string>());
    
    const courses = await Course.find({ 
      _id: { $in: Array.from(courseIds) } 
    }).select('title');
    
    const coursesMap: Record<string, string> = courses.reduce((map: Record<string, string>, course: any) => {
      map[course._id.toString()] = course.title;
      return map;
    }, {});
    
    // Получение статистики по месяцам (6 последних месяцев)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const usersWithPromoCodes = await User.find({ 
      promoCode: { $exists: true, $ne: null },
      updatedAt: { $gte: sixMonthsAgo }
    });
    
    // Группировка пользователей по месяцам активации промокода
    const promoActivationsByMonth: Record<string, number> = {};
    usersWithPromoCodes.forEach(user => {
      const month = user.updatedAt.toISOString().substring(0, 7); // YYYY-MM format
      promoActivationsByMonth[month] = (promoActivationsByMonth[month] || 0) + 1;
    });
    
    // Формирование итоговой статистики
    return NextResponse.json({
      overview: {
        totalPromoCodes,
        activePromoCodes,
        totalUses: totalUses.length > 0 ? totalUses[0].total : 0
      },
      topPromoCodes: topPromoCodes.map(promo => ({
        _id: promo._id,
        code: promo.code,
        uses: promo.uses,
        maxUses: promo.maxUses,
        isActive: promo.isActive,
        expiresAt: promo.expiresAt,
        isExpired: promo.expiresAt < new Date(),
        courses: promo.courseIds.map((id: Types.ObjectId) => ({
          id: id.toString(),
          title: coursesMap[id.toString()] || 'Unknown Course'
        }))
      })),
      promoActivationsByMonth,
      allPromoCodes: promoCodes.map(promo => ({
        _id: promo._id,
        code: promo.code,
        uses: promo.uses,
        maxUses: promo.maxUses,
        isActive: promo.isActive,
        expiresAt: promo.expiresAt,
        isExpired: promo.expiresAt < new Date(),
        courses: promo.courseIds.map((id: Types.ObjectId) => ({
          id: id.toString(),
          title: coursesMap[id.toString()] || 'Unknown Course'
        }))
      }))
    });
    
  } catch (error: any) {
    console.error('Ошибка получения статистики промокодов:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось получить статистику промокодов' 
    }, { status: 500 });
  }
}

export const GET = withAuth(handler); 