import mongoose from 'mongoose';

/**
 * Finds the actual collection name for a given collection name pattern.
 * Checks for variations in case (camelCase, lowercase, PascalCase).
 * 
 * @param db MongoDB database connection
 * @param collectionName The collection name to search for
 * @returns The actual collection name if found, null otherwise
 */
export async function getCollectionName(db: any, collectionName: string) {
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c: any) => c.name);
  
  // Check for both camelCase and lowercase versions
  const possibleNames = [
    collectionName,
    collectionName.toLowerCase(),
    collectionName.charAt(0).toUpperCase() + collectionName.slice(1) // PascalCase
  ];
  
  for (const name of possibleNames) {
    if (collectionNames.includes(name)) {
      return name;
    }
  }
  
  // Return null if no match found
  return null;
}

/**
 * Gets a MongoDB collection reference by name, handling case variations.
 * 
 * @param db MongoDB database connection
 * @param collectionName The collection name to get
 * @returns The collection reference
 */
export async function getCollection(db: any, collectionName: string) {
  const actualName = await getCollectionName(db, collectionName);
  if (actualName) {
    return db.collection(actualName);
  }
  // Default to the original name if no match found
  return db.collection(collectionName);
}

/**
 * Helper function to standardize working with MongoDB ObjectIds.
 * Ensures the ID is in the correct format for MongoDB operations.
 * 
 * @param id ID as string or ObjectId
 * @returns MongoDB ObjectId
 */
export function toObjectId(id: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  if (typeof id === 'string') {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
}

/**
 * Converts an ObjectId to a string representation.
 * Safely handles both ObjectId and string inputs.
 * 
 * @param id ID as string or ObjectId
 * @returns String representation of the ID
 */
export function toIdString(id: string | mongoose.Types.ObjectId): string {
  if (typeof id === 'string') {
    return id;
  }
  return id.toString();
}

/**
 * Gets the MongoDB connection object from the mongoose connection.
 * 
 * @returns The MongoDB database connection or null if not connected
 */
export function getMongoDb(): any {
  if (!mongoose.connection || !mongoose.connection.db) {
    return null;
  }
  return mongoose.connection.db;
} 