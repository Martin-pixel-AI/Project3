import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import mongoose from 'mongoose';
import { withAuth } from '../../../../lib/auth';
import { getCollectionName, getCollection } from '@/lib/db-utils';

// Define interfaces for the report structure
interface CollectionInfo {
  name: string;
  count: number;
}

interface DiagnosticsInfo {
  collectionNames: string[];
  users_with_promo_codes?: number;
  sample_user?: {
    email: string;
    activatedPromoCodes: string[];
  };
}

interface ReportData {
  promo_collections_found: CollectionInfo[];
  diagnostics: DiagnosticsInfo;
  fixes_applied: string[];
  issues_found: string[];
}

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
    
    // Check if we have promo code collections using our helper
    const promoCodesCollectionName = await getCollectionName(db, 'promocodes');
    const promoCodesUpperCollectionName = await getCollectionName(db, 'PromoCodes');
    
    console.log('Collection check:', {
      promoCodesCollectionName,
      promoCodesUpperCollectionName,
    });
    
    // Initialize properly typed report
    const report: ReportData = {
      promo_collections_found: [],
      diagnostics: {
        collectionNames,
      },
      fixes_applied: [],
      issues_found: []
    };
    
    // Check the documents in each collection
    if (promoCodesCollectionName) {
      const promoCodesCollection = db.collection(promoCodesCollectionName);
      const promoCodesCount = await promoCodesCollection.countDocuments();
      console.log(`${promoCodesCollectionName} collection has ${promoCodesCount} documents`);
      report.promo_collections_found.push({ name: promoCodesCollectionName, count: promoCodesCount });
    }
    
    if (promoCodesUpperCollectionName && promoCodesUpperCollectionName !== promoCodesCollectionName) {
      const promoCodesUpperCollection = db.collection(promoCodesUpperCollectionName);
      const promoCodesUpperCount = await promoCodesUpperCollection.countDocuments();
      console.log(`${promoCodesUpperCollectionName} collection has ${promoCodesUpperCount} documents`);
      report.promo_collections_found.push({ name: promoCodesUpperCollectionName, count: promoCodesUpperCount });
    }
    
    // If we have one format but not the other needed format, copy the documents
    const targetPromoName = 'promocodes'; // The name we want to standardize on
    
    if (promoCodesUpperCollectionName && promoCodesUpperCollectionName !== targetPromoName && !promoCodesCollectionName) {
      console.log(`Need to create ${targetPromoName} collection from ${promoCodesUpperCollectionName}`);
      
      const promoCodesUpperCollection = db.collection(promoCodesUpperCollectionName);
      const promoCodes = await promoCodesUpperCollection.find({}).toArray();
      
      if (promoCodes.length > 0) {
        await db.createCollection(targetPromoName);
        const result = await db.collection(targetPromoName).insertMany(promoCodes);
        console.log(`Copied ${result.insertedCount} promo codes to ${targetPromoName} collection`);
        report.fixes_applied.push(`Created ${targetPromoName} collection and copied ${result.insertedCount} documents from ${promoCodesUpperCollectionName}`);
      } else {
        report.issues_found.push(`${promoCodesUpperCollectionName} collection exists but is empty`);
      }
    }
    
    // If we have neither, report the issue
    if (!promoCodesCollectionName && !promoCodesUpperCollectionName) {
      console.log('No promo code collections found');
      report.issues_found.push('No promo code collections found. You may need to create promo codes first.');
    }
    
    // Check for user collection issues
    const usersCollectionName = await getCollectionName(db, 'users');
    
    if (usersCollectionName) {
      // Find users with activatedPromoCodes field
      const usersCollection = db.collection(usersCollectionName);
      const usersWithPromoCodes = await usersCollection.find({
        activatedPromoCodes: { $exists: true, $ne: [] }
      }).toArray();
      
      console.log(`Found ${usersWithPromoCodes.length} users with activated promo codes`);
      
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