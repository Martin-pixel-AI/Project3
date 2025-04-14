import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';
import crypto from 'crypto';

// In a real application, you would send an email with a reset link
// For this demo, we'll just generate a temporary password

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { email } = body;
    
    // Validate input
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json({ message: 'If your email is registered, you will receive a password reset email.' });
    }
    
    // Generate a temporary password
    const tempPassword = crypto.randomBytes(4).toString('hex');
    
    // Update the user's password
    user.password = tempPassword;
    await user.save();
    
    // In a real application, we would send an email here
    // For demo purposes, we'll return the temporary password
    console.log(`Temporary password for ${email}: ${tempPassword}`);
    
    return NextResponse.json({ 
      message: 'If your email is registered, you will receive a password reset email.',
      tempPassword // In a real application, do NOT return this!
    });
    
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process password reset' }, { status: 500 });
  }
} 