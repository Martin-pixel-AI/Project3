import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getCollection, toObjectId, getMongoDb } from './db-utils';

/**
 * Middleware that checks for direct access tokens in request headers
 * and attaches the relevant course access to the request if token is valid
 * 
 * @param handler The next handler function to call
 * @returns A function that processes the request and calls the handler
 */
export function withDirectAccess(handler: (req: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context?: any) => {
    try {
      // Check if there's a direct access token in the headers
      const directAccessToken = req.headers.get('X-Direct-Access-Token');
      
      if (!directAccessToken) {
        // No token, just continue with the handler
        return handler(req, context);
      }
      
      console.log('Direct access token found, validating...');
      
      // Decode the token
      let decodedToken: string;
      try {
        decodedToken = Buffer.from(directAccessToken, 'base64').toString('utf-8');
      } catch (error) {
        console.error('Invalid direct access token format:', error);
        return handler(req, context);
      }
      
      // Token format should be userId:courseId:timestamp
      const parts = decodedToken.split(':');
      if (parts.length !== 3) {
        console.error('Invalid direct access token format: parts length !=3');
        return handler(req, context);
      }
      
      const [userId, courseId, timestamp] = parts;
      
      // Validate token timestamp (must be within the last 24 hours)
      const tokenTime = parseInt(timestamp, 10);
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (isNaN(tokenTime) || now - tokenTime > oneDayMs) {
        console.error('Direct access token expired or invalid timestamp');
        return handler(req, context);
      }
      
      // Get database connection
      const db = getMongoDb();
      if (!db) {
        console.error('Database connection not established');
        return handler(req, context);
      }
      
      // Verify the token exists in the database
      const directAccessCollection = await getCollection(db, 'directAccess');
      const tokenRecord = await directAccessCollection.findOne({
        token: directAccessToken,
        userId: toObjectId(userId),
        courseId: toObjectId(courseId)
      });
      
      if (!tokenRecord) {
        console.error('Direct access token not found in database');
        return handler(req, context);
      }
      
      console.log('Valid direct access token for:', {
        userId,
        courseId,
        created: new Date(tokenTime).toISOString()
      });
      
      // Modify the request to include the direct access info
      const enhancedReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      }) as NextRequest & { directAccess?: { userId: string, courseId: string } };
      
      // Add the directAccess property to the request
      (enhancedReq as any).directAccess = {
        userId,
        courseId,
        token: directAccessToken
      };
      
      // Continue with the handler, passing the enhanced request
      return handler(enhancedReq, context);
    } catch (error) {
      console.error('Error in direct access middleware:', error);
      // If there's an error, continue with the original request
      return handler(req, context);
    }
  };
} 