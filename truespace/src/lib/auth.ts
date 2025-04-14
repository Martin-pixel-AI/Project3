import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { IUser } from '../models/User';
import { IAdmin } from '../models/Admin';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

if (!JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable');
}

export interface JwtPayload {
  id: string;
  email: string;
  role?: string;
  type: 'user' | 'admin';
}

// Generate token for user or admin
export function generateToken(user: IUser | IAdmin, type: 'user' | 'admin'): string {
  const payload: JwtPayload = {
    id: user._id.toString(),
    email: user.email,
    type,
  };

  if (type === 'admin' && (user as IAdmin).role) {
    payload.role = (user as IAdmin).role;
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify token
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

// Get token from request header
export function getTokenFromHeader(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

// Auth middleware for API routes
export function withAuth(handler: Function, options?: { adminOnly?: boolean }) {
  return async (req: NextRequest) => {
    const token = getTokenFromHeader(req);
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Check if admin access is required
    if (options?.adminOnly && decoded.type !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Add user data to request
    (req as any).user = decoded;
    
    return handler(req);
  };
}

// Auth middleware for pages (client-side)
export function useAuth({ adminOnly = false } = {}) {
  // This will be implemented in a React hook
  // For now, just a placeholder
  return { adminOnly };
} 