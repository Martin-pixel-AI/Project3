import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/db';
import Course from '../../../models/Course';
import Video from '../../../models/Video';
import { withAuth } from '../../../lib/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const tag = url.searchParams.get('tag');
    const query = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const page = parseInt(url.searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Build filter object
    let filter: any = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (tag) {
      filter.tags = tag;
    }
    
    if (query) {
      filter.$text = { $search: query };
    }
    
    // Get total count for pagination
    const total = await Course.countDocuments(filter);
    
    // Get courses with pagination
    let coursesQuery = Course.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    // Execute query
    const courses = await coursesQuery;
    
    return NextResponse.json({ 
      courses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Get courses error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get courses' }, { status: 500 });
  }
}

async function createCourse(req: NextRequest) {
  try {
    await dbConnect();
    
    // Проверка прав администратора
    const user = (req as any).user;
    if (user.type !== 'admin') {
      return NextResponse.json({ error: 'Только администраторы могут создавать курсы' }, { status: 403 });
    }
    
    const body = await req.json();
    const { title, description, category, tags, thumbnail, videos } = body;
    
    // Проверка наличия обязательных полей
    if (!title || !description || !category) {
      return NextResponse.json({ 
        error: 'Необходимо указать название, описание и категорию курса' 
      }, { status: 400 });
    }
    
    // Начинаем сессию MongoDB для атомарных операций
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Создание нового курса
      const course = await Course.create([{
        title,
        description,
        category,
        tags: tags || [],
        thumbnail: thumbnail || '',
        videos: []
      }], { session });
      
      const courseId = course[0]._id;
      
      // Если есть видео, создаем их
      const videoIds = [];
      if (videos && videos.length > 0) {
        const videoPromises = videos.map(async (video: any, index: number) => {
          if (!video.title || !video.youtubeUrl) return null;
          
          const newVideo = await Video.create([{
            title: video.title,
            youtubeUrl: video.youtubeUrl,
            duration: video.duration || 0,
            description: video.description || '',
            tags: tags || [],
            courseId,
            order: index
          }], { session });
          
          return newVideo[0]._id;
        });
        
        const createdVideoIds = await Promise.all(videoPromises);
        const filteredVideoIds = createdVideoIds.filter(id => id !== null);
        
        // Обновляем курс с ID видео
        await Course.findByIdAndUpdate(
          courseId,
          { videos: filteredVideoIds },
          { session }
        );
      }
      
      // Коммит транзакции
      await session.commitTransaction();
      
      // Получаем полный курс с видео
      const populatedCourse = await Course.findById(courseId).populate('videos');
      
      return NextResponse.json({ 
        message: 'Курс успешно создан',
        course: populatedCourse
      }, { status: 201 });
    } catch (error) {
      // В случае ошибки отменяем транзакцию
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error: any) {
    console.error('Ошибка создания курса:', error);
    return NextResponse.json({ 
      error: error.message || 'Не удалось создать курс' 
    }, { status: 500 });
  }
}

export const POST = withAuth(createCourse); 