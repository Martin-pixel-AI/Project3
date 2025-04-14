import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import Course from '../../../../models/Course';
import User from '../../../../models/User';
import { withAuth } from '../../../../lib/auth';
import mongoose from 'mongoose';

interface Params {
  params: {
    id: string;
  };
}

// Public endpoint to get course details (without videos)
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    // Find course without populating videos
    const course = await Course.findById(id);
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    return NextResponse.json({ course });
    
  } catch (error: any) {
    console.error('Get course error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get course' }, { status: 500 });
  }
}

// Protected endpoint to get course with videos (only for users who have access)
async function getFullCourse(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    
    const { id } = params;
    const userData = (req as any).user;
    const userId = userData.id;
    const userType = userData.type;
    
    console.log('getFullCourse request:', { 
      courseId: id, 
      userId, 
      userType 
    });
    
    // Find course with populated videos
    const course = await Course.findById(id).populate({
      path: 'videos',
      options: { sort: { order: 1 } }
    });
    
    if (!course) {
      console.log('Course not found:', id);
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    console.log('Course found:', { 
      courseId: id, 
      hasVideos: !!course.videos?.length,
      videosCount: course.videos?.length || 0
    });
    
    // Администратор всегда имеет доступ к полной информации о курсе
    if (userType === 'admin') {
      console.log('Admin access granted for course:', id);
      return NextResponse.json({ course });
    }
    
    // Для обычных пользователей проверяем доступ
    // Check if user has access to this course
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Убедимся, что activatedCourses - это массив
    if (!user.activatedCourses) {
      console.log('User has no activatedCourses, initializing empty array');
      user.activatedCourses = [];
      await user.save();
    }
    
    // Конвертируем ObjectID в строки для корректного сравнения
    const userActivatedCoursesStrings = user.activatedCourses.map(
      (courseId: mongoose.Types.ObjectId) => courseId.toString()
    );
    
    // Проверяем есть ли курс в списке активированных
    const hasAccess = userActivatedCoursesStrings.includes(id);
    
    console.log('Access check:', { 
      userId, 
      courseId: id, 
      userActivatedCourses: userActivatedCoursesStrings, 
      userActivatedCoursesCount: userActivatedCoursesStrings.length,
      hasAccess,
      // Добавляем типы данных для отладки
      courseIdType: typeof id,
      activatedCoursesTypes: userActivatedCoursesStrings.map((courseId: string) => typeof courseId),
      // Дополнительная информация
      userInfo: {
        email: user.email,
        promoCode: user.promoCode,
        activatedCoursesRaw: user.activatedCourses
      },
      // Прямая проверка на точное совпадение
      exactMatches: userActivatedCoursesStrings.filter((courseId: string) => courseId === id)
    });
    
    if (!hasAccess) {
      console.log('Access denied for course:', id);
      return NextResponse.json({ 
        error: 'You do not have access to this course', 
        courseId: id,
        needsPromoCode: true 
      }, { status: 403 });
    }
    
    console.log('Access granted for course:', id);
    return NextResponse.json({ course });
    
  } catch (error: any) {
    console.error('Get full course error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get course videos' }, { status: 500 });
  }
}

export const POST = withAuth(getFullCourse); 

// Удаление курса (только для администратора)
async function deleteCourse(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    
    const { id } = params;
    const userData = (req as any).user;
    
    // Проверяем, что пользователь - администратор
    if (userData.type !== 'admin') {
      return NextResponse.json({ 
        error: 'Только администраторы могут удалять курсы' 
      }, { status: 403 });
    }
    
    // Находим курс с его видео для дальнейшего удаления
    const course = await Course.findById(id).populate('videos');
    
    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
    }
    
    // Получаем ID всех видео курса для удаления
    const videoIds = course.videos?.map((video: any) => video._id) || [];
    
    // Шаг 1: Удаляем все видео курса
    if (videoIds.length > 0) {
      try {
        const VideoModel = mongoose.model('Video');
        await VideoModel.deleteMany({ 
          _id: { $in: videoIds } 
        });
      } catch (videoDeletionError) {
        console.error('Error deleting videos:', videoDeletionError);
        // Продолжаем удаление даже при ошибке с видео
      }
    }
    
    // Шаг 2: Удаляем курс из активированных курсов пользователей
    try {
      await User.updateMany(
        { activatedCourses: id }, 
        { $pull: { activatedCourses: id } }
      );
    } catch (activatedCoursesError) {
      console.error('Error removing course from activated courses:', activatedCoursesError);
      // Продолжаем удаление даже при ошибке
    }
    
    // Шаг 3: Удаляем курс из избранного пользователей
    try {
      await User.updateMany(
        { favorites: id }, 
        { $pull: { favorites: id } }
      );
    } catch (favoritesError) {
      console.error('Error removing course from favorites:', favoritesError);
      // Продолжаем удаление даже при ошибке
    }
    
    // Шаг 4: Удаляем сам курс
    try {
      await Course.findByIdAndDelete(id);
    } catch (courseDeletionError) {
      console.error('Error deleting course:', courseDeletionError);
      return NextResponse.json({ 
        error: 'Не удалось удалить курс' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Курс успешно удален',
      deletedCourseId: id,
      title: course.title
    });
  } catch (error: any) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось удалить курс' 
    }, { status: 500 });
  }
}

export const DELETE = withAuth(deleteCourse);

// Обновление курса (только для администратора)
async function updateCourse(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    
    const { id } = params;
    const userData = (req as any).user;
    
    // Проверяем, что пользователь - администратор
    if (userData.type !== 'admin') {
      return NextResponse.json({ 
        error: 'Только администраторы могут обновлять курсы' 
      }, { status: 403 });
    }
    
    // Получаем данные из запроса
    const reqText = await req.text();
    if (!reqText || reqText.trim() === '') {
      console.error('Empty request body');
      return NextResponse.json({ 
        error: 'Тело запроса пустое' 
      }, { status: 400 });
    }
    
    // Парсим JSON с обработкой ошибок
    let body;
    try {
      body = JSON.parse(reqText);
    } catch (parseError) {
      console.error('Failed to parse request JSON:', parseError);
      return NextResponse.json({ 
        error: 'Невозможно разобрать JSON. Ошибка: ' + (parseError as Error).message
      }, { status: 400 });
    }
    
    const { title, description, category, tags, thumbnail, videos } = body;
    
    // Проверка обязательных полей
    if (!title || !description || !category) {
      return NextResponse.json({ 
        error: 'Название, описание и категория обязательны для заполнения' 
      }, { status: 400 });
    }
    
    // Находим курс
    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
    }
    
    // Обновляем основные данные курса
    course.title = title;
    course.description = description;
    course.category = category;
    course.tags = tags || [];
    
    if (thumbnail) {
      course.thumbnail = thumbnail;
    }
    
    // Сохраняем изменения курса
    await course.save();
    
    // Обрабатываем видео без использования сессии
    // Сначала видео с ID (существующие)
    if (videos && videos.length > 0) {
      const existingVideos = videos.filter((v: any) => v._id);
      const newVideos = videos.filter((v: any) => !v._id);
      
      // Обновляем существующие видео по одному
      for (const video of existingVideos) {
        try {
          await mongoose.model('Video').findByIdAndUpdate(
            video._id,
            {
              title: video.title,
              youtubeUrl: video.youtubeUrl,
              duration: video.duration,
              description: video.description
            }
          );
        } catch (updateError) {
          console.error('Error updating video:', video._id, updateError);
        }
      }
      
      // Создаем новые видео, если есть
      if (newVideos.length > 0) {
        try {
          const VideoModel = mongoose.model('Video');
          const videosToCreate = newVideos.map((v: any) => ({
            title: v.title,
            youtubeUrl: v.youtubeUrl,
            duration: v.duration,
            description: v.description,
            courseId: course._id
          }));
          
          const createdVideos = await VideoModel.create(videosToCreate);
          
          // Добавляем новые видео к списку видео курса
          const videoIds = createdVideos.map((v: any) => v._id);
          course.videos = [...course.videos, ...videoIds];
          await course.save();
        } catch (createError) {
          console.error('Error creating new videos:', createError);
        }
      }
    }
    
    // Получаем обновленный курс с видео для ответа
    const updatedCourse = await Course.findById(id).populate('videos');
    if (!updatedCourse) {
      return NextResponse.json({ 
        error: 'Не удалось получить обновленный курс' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Курс успешно обновлен',
      course: updatedCourse
    });
  } catch (error: any) {
    console.error('Error updating course:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось обновить курс' 
    }, { status: 500 });
  }
}

export const PUT = withAuth(updateCourse); 