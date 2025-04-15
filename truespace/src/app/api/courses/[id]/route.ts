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
      // Ensure we're returning a serializable object
      const serializedCourse = course.toObject ? course.toObject() : course;
      return NextResponse.json({ course: serializedCourse });
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
    // Ensure we're returning a serializable object
    const serializedCourse = course.toObject ? course.toObject() : course;
    return NextResponse.json({ course: serializedCourse });
    
  } catch (error: any) {
    console.error('Get full course error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to get course videos',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export const POST = withAuth(getFullCourse); 

// Удаление курса (только для администратора)
async function deleteCourse(req: NextRequest, { params }: Params) {
  console.log('Standard delete endpoint called for course ID:', params.id);
  
  try {
    // Connect to database 
    await dbConnect();
    
    const { id } = params;
    const userData = (req as any).user;
    
    // Check user is admin
    if (userData.type !== 'admin') {
      return new NextResponse('Только администраторы могут удалять курсы', { status: 403 });
    }
    
    // Use direct MongoDB operations like our successful emergency delete approach
    const db = mongoose.connection.db;
    if (!db) {
      return new NextResponse('Database connection not established', { status: 500 });
    }
    
    // Step 1: Verify the course exists
    let course;
    try {
      const courseObjectId = new mongoose.Types.ObjectId(id);
      course = await db.collection('courses').findOne({ _id: courseObjectId });
      
      if (!course) {
        return new NextResponse('Курс не найден', { status: 404 });
      }
      
      console.log('Found course for deletion:', course.title);
      
      // Step 2: Try to find and delete related videos
      try {
        const videoCount = await db.collection('videos').deleteMany({ 
          courseId: courseObjectId 
        });
        console.log(`Deleted ${videoCount.deletedCount} videos for course ${id}`);
      } catch (videoError) {
        console.error('Warning: Error deleting videos:', videoError);
        // Continue even if video deletion fails
      }
      
      // Step 3: Remove course from users' activated courses
      try {
        const userUpdateResult = await db.collection('users').updateMany(
          { activatedCourses: courseObjectId } as any, 
          { $pull: { activatedCourses: courseObjectId } } as any
        );
        console.log(`Removed course from ${userUpdateResult.modifiedCount} users' activated courses`);
      } catch (userError) {
        console.error('Warning: Error updating user activatedCourses:', userError);
        // Continue even if user update fails
      }
      
      // Step 4: Remove course from users' favorites
      try {
        const favUpdateResult = await db.collection('users').updateMany(
          { favorites: courseObjectId } as any, 
          { $pull: { favorites: courseObjectId } } as any
        );
        console.log(`Removed course from ${favUpdateResult.modifiedCount} users' favorites`);
      } catch (favError) {
        console.error('Warning: Error updating user favorites:', favError);
        // Continue even if favorites update fails
      }
      
      // Step 5: Delete the course itself
      const deleteResult = await db.collection('courses').deleteOne({ 
        _id: courseObjectId 
      });
      
      console.log('Course deletion result:', deleteResult);
      
      if (deleteResult.deletedCount === 0) {
        return new NextResponse('Не удалось удалить курс', { status: 500 });
      }
      
      return new NextResponse(`Курс "${course.title}" успешно удален`, { status: 200 });
    } catch (dbError: any) {
      console.error('Database operation error:', dbError);
      return new NextResponse(`Ошибка базы данных: ${dbError.message}`, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error deleting course:', error);
    return new NextResponse(`Ошибка: ${error.message}`, { status: 500 });
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
    let reqText;
    try {
      reqText = await req.text();
    } catch (textError) {
      console.error('Error reading request body:', textError);
      return NextResponse.json({
        error: 'Не удалось прочитать тело запроса',
        details: (textError as Error).message
      }, { status: 400 });
    }
    
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
    try {
      await course.save();
    } catch (saveError) {
      console.error('Error saving course:', saveError);
      return NextResponse.json({
        error: 'Не удалось сохранить курс',
        details: (saveError as Error).message
      }, { status: 500 });
    }
    
    // Обрабатываем видео без использования сессии
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
    let updatedCourse;
    try {
      updatedCourse = await Course.findById(id).populate('videos');
      if (!updatedCourse) {
        throw new Error('Course not found after update');
      }
    } catch (findError) {
      console.error('Error fetching updated course:', findError);
      return NextResponse.json({ 
        error: 'Не удалось получить обновленный курс',
        details: (findError as Error).message
      }, { status: 500 });
    }
    
    // Ensure we're returning a serializable object
    const serializedCourse = updatedCourse.toObject ? updatedCourse.toObject() : updatedCourse;
    
    const response = { 
      message: 'Курс успешно обновлен',
      course: serializedCourse
    };
    
    console.log('Successfully updated course:', {
      id: serializedCourse._id,
      title: serializedCourse.title
    });
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error updating course:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось обновить курс',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export const PUT = withAuth(updateCourse); 