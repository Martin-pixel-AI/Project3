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
    
    // Find course with populated videos
    const course = await Course.findById(id).populate({
      path: 'videos',
      options: { sort: { order: 1 } }
    });
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    // Администратор всегда имеет доступ к полной информации о курсе
    if (userType === 'admin') {
      return NextResponse.json({ course });
    }
    
    // Для обычных пользователей проверяем доступ
    // Check if user has access to this course
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // User needs to have this course in activatedCourses
    const hasAccess = user.activatedCourses.some(
      (courseId: mongoose.Types.ObjectId) => courseId.toString() === id
    );
    
    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'You do not have access to this course', 
        courseId: id,
        needsPromoCode: true 
      }, { status: 403 });
    }
    
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
    
    // Находим и удаляем курс
    const course = await Course.findById(id);
    
    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
    }
    
    // Используем транзакцию для удаления курса и всех связанных данных
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Удаляем курс
      await Course.findByIdAndDelete(id, { session });
      
      // Удаляем курс из списка активированных у пользователей
      await User.updateMany(
        { activatedCourses: id }, 
        { $pull: { activatedCourses: id } },
        { session }
      );
      
      // Удаляем курс из избранного у пользователей
      await User.updateMany(
        { favorites: id }, 
        { $pull: { favorites: id } },
        { session }
      );
      
      await session.commitTransaction();
      return NextResponse.json({ 
        message: 'Курс успешно удален',
        deletedCourseId: id
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error: any) {
    console.error('Ошибка удаления курса:', error);
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
    const body = await req.json();
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
    
    // Используем транзакцию для обновления курса и видео
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Обновляем основные данные курса
      course.title = title;
      course.description = description;
      course.category = category;
      course.tags = tags || [];
      
      if (thumbnail) {
        course.thumbnail = thumbnail;
      }
      
      await course.save({ session });
      
      // Обновляем видео, если они предоставлены
      if (videos && videos.length > 0) {
        // Отфильтровываем видео с ID (существующие) и без ID (новые)
        const existingVideos = videos.filter((v: any) => v._id);
        const newVideos = videos.filter((v: any) => !v._id);
        
        // Обновляем существующие видео
        for (const video of existingVideos) {
          await mongoose.model('Video').findByIdAndUpdate(
            video._id,
            {
              title: video.title,
              youtubeUrl: video.youtubeUrl,
              duration: video.duration,
              description: video.description
            },
            { session }
          );
        }
        
        // Создаем новые видео и привязываем к курсу
        if (newVideos.length > 0) {
          const videosToCreate = newVideos.map((v: any) => ({
            title: v.title,
            youtubeUrl: v.youtubeUrl,
            duration: v.duration,
            description: v.description,
            courseId: course._id
          }));
          
          const createdVideos = await mongoose.model('Video').create(videosToCreate);
          
          // Добавляем новые видео к списку видео курса
          const videoIds = createdVideos.map((v: any) => v._id);
          course.videos = [...course.videos, ...videoIds];
          await course.save({ session });
        }
      }
      
      await session.commitTransaction();
      
      // Возвращаем обновленный курс
      const updatedCourse = await Course.findById(id).populate('videos');
      return NextResponse.json({ 
        message: 'Курс успешно обновлен',
        course: updatedCourse
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error: any) {
    console.error('Ошибка обновления курса:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось обновить курс' 
    }, { status: 500 });
  }
}

export const PUT = withAuth(updateCourse); 