import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import Course from '../../../../../models/Course';
import Video from '../../../../../models/Video';
import { withAuth } from '../../../../../lib/auth';
import mongoose from 'mongoose';

interface Params {
  params: {
    id: string;
  };
}

// GET - Получить детали курса для админа
async function getCourse(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    
    // Проверка прав администратора
    const user = (req as any).user;
    if (user.type !== 'admin') {
      return NextResponse.json({ error: 'Только администраторы могут получать эти данные' }, { status: 403 });
    }
    
    const { id } = params;
    
    // Получаем курс с видео и статистикой
    const course = await Course.findById(id).populate('videos');
    
    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      course
    });
    
  } catch (error: any) {
    console.error('Ошибка получения курса для админа:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось получить данные курса' 
    }, { status: 500 });
  }
}

// PUT - Обновить курс
async function updateCourse(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    
    // Проверка прав администратора
    const user = (req as any).user;
    if (user.type !== 'admin') {
      return NextResponse.json({ error: 'Только администраторы могут обновлять курсы' }, { status: 403 });
    }
    
    const { id } = params;
    const body = await req.json();
    
    const { 
      title, 
      description, 
      category, 
      tags, 
      thumbnail, 
      videos,
      documents,
      hiddenDescription 
    } = body;
    
    // Проверяем существование курса
    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });
    }
    
    // Начинаем сессию MongoDB для атомарных операций
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Обновляем основную информацию о курсе
      const updatedCourse = await Course.findByIdAndUpdate(
        id,
        { 
          title, 
          description, 
          category, 
          tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags, 
          thumbnail,
          documents,
          hiddenDescription
        },
        { new: true, session }
      );
      
      // Если есть видео, обновляем их
      if (videos && videos.length > 0) {
        // Получаем текущие видео курса
        const currentVideos = await Video.find({ courseId: id });
        const currentVideoIds = currentVideos.map(v => v._id.toString());
        
        // Обработка новых видео и обновление существующих
        const videoPromises = videos.map(async (video: any, index: number) => {
          const videoData = {
            title: video.title,
            youtubeUrl: video.youtubeUrl,
            duration: video.duration || 0,
            description: video.description || '',
            tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags,
            courseId: id,
            order: index
          };
          
          // Обновляем существующие или создаем новые
          if (video._id && currentVideoIds.includes(video._id.toString())) {
            await Video.findByIdAndUpdate(video._id, videoData, { session });
            return video._id;
          } else {
            const newVideo = await Video.create([videoData], { session });
            return newVideo[0]._id;
          }
        });
        
        const updatedVideoIds = await Promise.all(videoPromises);
        
        // Обновляем список видео курса
        await Course.findByIdAndUpdate(
          id,
          { videos: updatedVideoIds },
          { session }
        );
        
        // Удаляем видео, которых нет в обновленном списке
        const videosToKeep = videos
          .filter((v: any) => v._id)
          .map((v: any) => v._id.toString());
        
        const videosToDelete = currentVideoIds.filter(vid => !videosToKeep.includes(vid));
        
        if (videosToDelete.length > 0) {
          await Video.deleteMany(
            { _id: { $in: videosToDelete } },
            { session }
          );
        }
      }
      
      // Коммит транзакции
      await session.commitTransaction();
      
      // Получаем обновленный курс с видео
      const populatedCourse = await Course.findById(id).populate('videos');
      
      return NextResponse.json({ 
        message: 'Курс успешно обновлен',
        course: populatedCourse
      });
      
    } catch (error) {
      // В случае ошибки отменяем транзакцию
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

export const GET = withAuth(getCourse);
export const PUT = withAuth(updateCourse); 