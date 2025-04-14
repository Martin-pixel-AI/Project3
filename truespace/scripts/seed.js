// Script to seed the database with initial data
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

// Define schema for models
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  promoCode: { type: String },
  activatedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
}, { timestamps: true });

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  tags: [{ type: String }],
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  thumbnail: { type: String }
}, { timestamps: true });

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  youtubeUrl: { type: String, required: true },
  duration: { type: Number, required: true },
  tags: [{ type: String }],
  description: { type: String },
  thumbnail: { type: String },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

const PromoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  expiresAt: { type: Date, required: true },
  maxUses: { type: Number, default: 1 },
  uses: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'admin', enum: ['admin', 'superadmin'] }
}, { timestamps: true });

// Create models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
const Video = mongoose.models.Video || mongoose.model('Video', VideoSchema);
const PromoCode = mongoose.models.PromoCode || mongoose.model('PromoCode', PromoCodeSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

// Hash password function
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function seedDatabase() {
  try {
    // Connect to the database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clean the database
    await User.deleteMany({});
    await Course.deleteMany({});
    await Video.deleteMany({});
    await PromoCode.deleteMany({});
    await Admin.deleteMany({});
    console.log('Cleaned database');

    // Create admin user
    const adminPassword = await hashPassword('admin123');
    const admin = await Admin.create({
      email: 'admin@truespace.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin'
    });
    console.log('Created admin user:', admin.email);

    // Create courses
    const programmingCourse = await Course.create({
      title: 'Web Development Fundamentals',
      description: 'Learn the basics of web development with HTML, CSS, and JavaScript. This course covers everything you need to know to get started with building modern websites.',
      category: 'Programming',
      tags: ['html', 'css', 'javascript', 'web development'],
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1172&q=80'
    });

    const designCourse = await Course.create({
      title: 'UI/UX Design Principles',
      description: 'Master the art of user interface and user experience design. Learn how to create beautiful, intuitive interfaces that users love.',
      category: 'Design',
      tags: ['ui', 'ux', 'design', 'figma', 'user experience'],
      thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1064&q=80'
    });

    const marketingCourse = await Course.create({
      title: 'Digital Marketing Strategies',
      description: 'Learn effective digital marketing strategies to grow your business online. This course covers SEO, social media marketing, email campaigns, and more.',
      category: 'Marketing',
      tags: ['marketing', 'seo', 'social media', 'growth'],
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1115&q=80'
    });

    console.log('Created courses');

    // Create videos for programming course
    const progVideos = await Video.create([
      {
        title: 'HTML Basics - Document Structure',
        youtubeUrl: 'dQw4w9WgXcQ', // A placeholder video ID
        duration: 720, // 12 minutes
        tags: ['html', 'basics'],
        description: 'Learn the fundamentals of HTML document structure and key elements.',
        courseId: programmingCourse._id,
        order: 1
      },
      {
        title: 'CSS Fundamentals - Styling Your First Page',
        youtubeUrl: 'dQw4w9WgXcQ',
        duration: 840, // 14 minutes
        tags: ['css', 'styling'],
        description: 'Learn how to add styles to your HTML page with CSS.',
        courseId: programmingCourse._id,
        order: 2
      },
      {
        title: 'JavaScript Introduction - Variables and Functions',
        youtubeUrl: 'dQw4w9WgXcQ',
        duration: 960, // 16 minutes
        tags: ['javascript', 'programming'],
        description: 'Get started with JavaScript by learning about variables and functions.',
        courseId: programmingCourse._id,
        order: 3
      }
    ]);

    // Create videos for design course
    const designVideos = await Video.create([
      {
        title: 'Introduction to UI/UX Design',
        youtubeUrl: 'dQw4w9WgXcQ',
        duration: 780, // 13 minutes
        tags: ['ui', 'ux', 'design principles'],
        description: 'An overview of UI/UX design principles and their importance.',
        courseId: designCourse._id,
        order: 1
      },
      {
        title: 'User Research Methods',
        youtubeUrl: 'dQw4w9WgXcQ',
        duration: 900, // 15 minutes
        tags: ['research', 'user testing'],
        description: 'Learn different methods to conduct user research for your products.',
        courseId: designCourse._id,
        order: 2
      }
    ]);

    // Create videos for marketing course
    const marketingVideos = await Video.create([
      {
        title: 'Digital Marketing Overview',
        youtubeUrl: 'dQw4w9WgXcQ',
        duration: 720, // 12 minutes
        tags: ['marketing', 'digital'],
        description: 'An introduction to digital marketing channels and strategies.',
        courseId: marketingCourse._id,
        order: 1
      },
      {
        title: 'SEO Fundamentals',
        youtubeUrl: 'dQw4w9WgXcQ',
        duration: 840, // 14 minutes
        tags: ['seo', 'search engines'],
        description: 'Learn the basics of search engine optimization.',
        courseId: marketingCourse._id,
        order: 2
      },
      {
        title: 'Social Media Marketing Strategies',
        youtubeUrl: 'dQw4w9WgXcQ',
        duration: 900, // 15 minutes
        tags: ['social media', 'marketing'],
        description: 'Effective strategies for marketing on different social media platforms.',
        courseId: marketingCourse._id,
        order: 3
      }
    ]);

    console.log('Created videos');

    // Update courses with their videos
    programmingCourse.videos = progVideos.map(video => video._id);
    await programmingCourse.save();

    designCourse.videos = designVideos.map(video => video._id);
    await designCourse.save();

    marketingCourse.videos = marketingVideos.map(video => video._id);
    await marketingCourse.save();

    console.log('Updated courses with videos');

    // Create promo codes
    const allCourses = [programmingCourse._id, designCourse._id, marketingCourse._id];
    
    // Expiry dates
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    await PromoCode.create([
      {
        code: 'FREE2023',
        courseIds: [programmingCourse._id],
        expiresAt: oneMonthFromNow,
        maxUses: 100,
        uses: 0,
        isActive: true
      },
      {
        code: 'DESIGN50',
        courseIds: [designCourse._id],
        expiresAt: oneMonthFromNow,
        maxUses: 50,
        uses: 0,
        isActive: true
      },
      {
        code: 'ALLACCESS',
        courseIds: allCourses,
        expiresAt: oneYearFromNow,
        maxUses: 10,
        uses: 0,
        isActive: true
      }
    ]);

    console.log('Created promo codes');

    // Create test user
    const userPassword = await hashPassword('password123');
    const user = await User.create({
      email: 'user@example.com',
      password: userPassword,
      name: 'Test User',
      favorites: [designCourse._id],
      promoCode: 'FREE2023',
      activatedCourses: [programmingCourse._id]
    });
    
    console.log('Created test user:', user.email);
    console.log('Database seeded successfully!');
    console.log('\nTest user credentials:');
    console.log('Email: user@example.com');
    console.log('Password: password123');
    console.log('\nAdmin credentials:');
    console.log('Email: admin@truespace.com');
    console.log('Password: admin123');
    console.log('\nPromo codes:');
    console.log('FREE2023 - Access to Web Development Fundamentals');
    console.log('DESIGN50 - Access to UI/UX Design Principles');
    console.log('ALLACCESS - Access to all courses');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedDatabase(); 