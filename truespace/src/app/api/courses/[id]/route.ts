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
      hasAccess 
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
  const session = await mongoose.startSession();
  
  try {
    await dbConnect();
    
    const { id } = params;
    const userData = (req as any).user;
    
    console.log('DELETE course request:', { courseId: id, userId: userData.id });
    
    // Проверяем, что пользователь - администратор
    if (userData.type !== 'admin') {
      console.log('Access denied: user is not admin');
      return NextResponse.json({ 
        error: 'Только администраторы могут удалять курсы' 
      }, { status: 403 });
    }
    
    // Находим курс и его видео перед удалением
    const course = await Course.findById(id).populate('videos');
    
    if (!course) {
      console.log('Course not found:', id);
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
    }
    
    console.log('Course found for deletion:', { 
      courseId: id, 
      title: course.title,
      videosCount: course.videos?.length || 0
    });
    
    // Используем транзакцию для удаления курса и всех связанных данных
    await session.startTransaction();
    
    try {
      // Получаем ID всех видео курса
      const videoIds = course.videos?.map((video: any) => video._id) || [];
      console.log('Video IDs to delete:', videoIds);
      
      // Удаляем видео курса
      if (videoIds.length > 0) {
        const VideoModel = mongoose.model('Video');
        const deleteVideosResult = await VideoModel.deleteMany({ 
          _id: { $in: videoIds } 
        }).session(session);
        
        console.log('Videos deletion result:', deleteVideosResult);
      }
      
      // Удаляем курс
      const deleteCourseResult = await Course.findByIdAndDelete(id).session(session);
      console.log('Course deletion result:', !!deleteCourseResult);
      
      // Удаляем курс из списка активированных у пользователей
      const updateActivatedResult = await User.updateMany(
        { activatedCourses: id }, 
        { $pull: { activatedCourses: id } }
      ).session(session);
      
      console.log('Users activated courses update result:', updateActivatedResult);
      
      // Удаляем курс из избранного у пользователей
      const updateFavoritesResult = await User.updateMany(
        { favorites: id }, 
        { $pull: { favorites: id } }
      ).session(session);
      
      console.log('Users favorites update result:', updateFavoritesResult);
      
      await session.commitTransaction();
      console.log('Transaction committed successfully');
      
      return NextResponse.json({ 
        message: 'Курс успешно удален',
        deletedCourseId: id,
        title: course.title,
        videosDeleted: videoIds.length
      });
    } catch (error: any) {
      await session.abortTransaction();
      console.error('Transaction error during course deletion:', error);
      return NextResponse.json({ 
        error: error.message || 'Ошибка при удалении курса' 
      }, { status: 500 });
    } 
    
  } catch (error: any) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось удалить курс' 
    }, { status: 500 });
  } finally {
    session.endSession();
  }
}

export const DELETE = withAuth(deleteCourse);

// Обновление курса (только для администратора)
async function updateCourse(req: NextRequest, { params }: Params) {
  const session = await mongoose.startSession();
  
  try {
    await dbConnect();
    
    const { id } = params;
    const userData = (req as any).user;
    
    console.log('PUT course request:', { courseId: id, userId: userData.id });
    
    // Проверяем, что пользователь - администратор
    if (userData.type !== 'admin') {
      console.log('Access denied: user is not admin');
      return NextResponse.json({ 
        error: 'Только администраторы могут обновлять курсы' 
      }, { status: 403 });
    }
    
    // Получаем данные из запроса
    const reqText = await req.text();
    
    // Проверяем, не пустой ли запрос
    if (!reqText || reqText.trim() === '') {
      console.error('Empty request body');
      return NextResponse.json({ 
        error: 'Тело запроса пустое' 
      }, { status: 400 });
    }
    
    console.log('Request body text:', reqText.substring(0, 200) + '...');
    
    // Парсим JSON с обработкой ошибок
    let body;
    try {
      body = JSON.parse(reqText);
    } catch (parseError) {
      console.error('Failed to parse request JSON:', parseError);
      return NextResponse.json({ 
        error: 'Невозможно разобрать JSON' 
      }, { status: 400 });
    }
    
    const { title, description, category, tags, thumbnail, videos } = body;
    
    console.log('Course update data:', {
      title,
      description: description?.substring(0, 50) + '...',
      category,
      tagsCount: tags?.length,
      videosCount: videos?.length
    });
    
    // Проверка обязательных полей
    if (!title || !description || !category) {
      console.log('Missing required fields');
      return NextResponse.json({ 
        error: 'Название, описание и категория обязательны для заполнения' 
      }, { status: 400 });
    }
    
    // Находим курс
    const course = await Course.findById(id);
    
    if (!course) {
      console.log('Course not found:', id);
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
    }
    
    console.log('Course found for update:', {
      id: course._id,
      title: course.title
    });
    
    // Используем транзакцию для обновления курса и видео
    await session.startTransaction();
    
    try {
      // Обновляем основные данные курса
      course.title = title;
      course.description = description;
      course.category = category;
      course.tags = tags || [];
      
      if (thumbnail) {
        course.thumbnail = thumbnail;
      }
      
      const savedCourse = await course.save({ session });
      console.log('Course basic data updated');
      
      // Обновляем видео, если они предоставлены
      if (videos && videos.length > 0) {
        // Отфильтровываем видео с ID (существующие) и без ID (новые)
        const existingVideos = videos.filter((v: any) => v._id);
        const newVideos = videos.filter((v: any) => !v._id);
        
        console.log('Videos to update:', {
          existingCount: existingVideos.length,
          newCount: newVideos.length
        });
        
        // Обновляем существующие видео
        for (const video of existingVideos) {
          const updateResult = await mongoose.model('Video').findByIdAndUpdate(
            video._id,
            {
              title: video.title,
              youtubeUrl: video.youtubeUrl,
              duration: video.duration,
              description: video.description
            },
            { new: true }
          ).session(session);
          
          if (!updateResult) {
            console.warn('Failed to update video:', video._id);
          }
        }
        
        console.log('Existing videos updated');
        
        // Создаем новые видео и привязываем к курсу
        if (newVideos.length > 0) {
          const videosToCreate = newVideos.map((v: any) => ({
            title: v.title,
            youtubeUrl: v.youtubeUrl,
            duration: v.duration,
            description: v.description,
            courseId: course._id
          }));
          
          const VideoModel = mongoose.model('Video');
          const createdVideos = await VideoModel.create(
            videosToCreate,
            { session }
          );
          
          console.log('New videos created:', createdVideos.length);
          
          // Добавляем новые видео к списку видео курса
          const videoIds = createdVideos.map((v: any) => v._id);
          course.videos = [...course.videos, ...videoIds];
          await course.save({ session });
          
          console.log('Added new videos to course');
        }
      }
      
      await session.commitTransaction();
      console.log('Transaction committed successfully');
      
      // Возвращаем обновленный курс
      const updatedCourse = await Course.findById(id).populate('videos');
      
      if (!updatedCourse) {
        console.error('Failed to fetch updated course after update');
        return NextResponse.json({ 
          error: 'Не удалось получить обновленный курс' 
        }, { status: 500 });
      }
      
      console.log('Returning updated course data');
      
      return NextResponse.json({ 
        message: 'Курс успешно обновлен',
        course: updatedCourse
      });
    } catch (error: any) {
      await session.abortTransaction();
      console.error('Transaction error during course update:', error);
      return NextResponse.json({ 
        error: error.message || 'Ошибка при обновлении курса' 
      }, { status: 500 });
    } 
    
  } catch (error: any) {
    console.error('Error updating course:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось обновить курс' 
    }, { status: 500 });
  } finally {
    session.endSession();
  }
}

export const PUT = withAuth(updateCourse); 