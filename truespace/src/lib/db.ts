import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/truespace';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface DatabaseConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Define the global mongoose type
declare global {
  var mongoose: DatabaseConnection | undefined;
}

let cached: DatabaseConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) {
    console.log('Using cached database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      maxPoolSize: 10, // Maintain up to 10 socket connections
    };

    console.log('Creating new database connection to:', MONGODB_URI);
    
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('Database connection established successfully');
        mongoose.connection.on('error', (err) => {
          console.error('MongoDB connection error:', err);
        });
        return mongoose;
      })
      .catch((error) => {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
      });
  } else {
    console.log('Using existing database connection promise');
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error('Error resolving database connection:', error);
    throw error;
  }
}

export default dbConnect; 