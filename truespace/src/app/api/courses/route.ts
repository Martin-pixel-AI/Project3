import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/db';
import Course from '../../../models/Course';

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