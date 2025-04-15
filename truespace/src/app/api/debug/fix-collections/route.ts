import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import mongoose from 'mongoose';
import { withAuth } from '../../../../lib/auth';

async function handler(req: NextRequest) {
  try {
    await dbConnect();
    
    // Get userId from auth
    const userData = (req as any).user;
    
    // Check if user is admin
    if (userData.type !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can perform this operation' }, { status: 403 });
    }
    
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection not established' }, { status: 500 });
    }
    
    // List collections to check what we have
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('Found collections:', collectionNames);
    
    // Check if we have both PromoCode and promocodes collections
    const hasPromoCodeCollection = collectionNames.includes('promocodes');
    const hasPromoCodes = collectionNames.includes('PromoCodes');
    
    console.log('Collection check:', {
      hasPromoCodeCollection,
      hasPromoCodes,
    });
    
    let report = {
      promo_collections_found: [],
      diagnostics: {
        collectionNames,
      },
      fixes_applied: [],
      issues_found: []
    };
    
    // Check the documents in each collection
    if (hasPromoCodeCollection) {
      const promoCodesCount = await db.collection('promocodes').countDocuments();
      console.log('promocodes collection has', promoCodesCount, 'documents');
      report.promo_collections_found.push({ name: 'promocodes', count: promoCodesCount });
    }
    
    if (hasPromoCodes) {
      const promoCodesCount = await db.collection('PromoCodes').countDocuments();
      console.log('PromoCodes collection has', promoCodesCount, 'documents');
      report.promo_collections_found.push({ name: 'PromoCodes', count: promoCodesCount });
    }
    
    // If we only have 'PromoCodes' but need 'promocodes', copy the documents
    if (hasPromoCodes && !hasPromoCodeCollection) {
      console.log('Need to create promocodes collection from PromoCodes');
      
      const promoCodes = await db.collection('PromoCodes').find({}).toArray();
      
      if (promoCodes.length > 0) {
        await db.createCollection('promocodes');
        const result = await db.collection('promocodes').insertMany(promoCodes);
        console.log('Copied', result.insertedCount, 'promo codes to promocodes collection');
        report.fixes_applied.push(`Created promocodes collection and copied ${result.insertedCount} documents from PromoCodes`);
      } else {
        report.issues_found.push('PromoCodes collection exists but is empty');
      }
    }
    
    // If we have neither, report the issue
    if (!hasPromoCodes && !hasPromoCodeCollection) {
      console.log('No promo code collections found');
      report.issues_found.push('No promo code collections found. You may need to create promo codes first.');
    }
    
    // Check for user collection issues
    const hasUsersCollection = collectionNames.includes('users');
    
    if (hasUsersCollection) {
      // Find users with activatedPromoCodes field
      const usersWithPromoCodes = await db.collection('users').find({
        activatedPromoCodes: { $exists: true, $ne: [] }
      }).toArray();
      
      console.log('Found', usersWithPromoCodes.length, 'users with activated promo codes');
      
      if (usersWithPromoCodes.length > 0) {
        report.diagnostics.users_with_promo_codes = usersWithPromoCodes.length;
        report.diagnostics.sample_user = {
          email: usersWithPromoCodes[0].email,
          activatedPromoCodes: usersWithPromoCodes[0].activatedPromoCodes
        };
      } else {
        report.issues_found.push('No users with activated promo codes found');
      }
    } else {
      report.issues_found.push('Users collection not found');
    }
    
    return NextResponse.json({
      message: 'Database collection diagnosis complete',
      report
    });
    
  } catch (error: any) {
    console.error('Collection fix error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withAuth(handler); 