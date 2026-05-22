import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

let clientPromise: Promise<MongoClient>;

if (!uri) {
  console.error(
    '[mongodb] MONGODB_URI is not set. Add it to web/.env.local and restart the dev server.',
  );
  // Rejected promise — keeps the module loading so other routes still work,
  // but any NextAuth request that needs the DB will fail with a clear error.
  const rejected = Promise.reject(new Error('MONGODB_URI is not set in web/.env.local'));
  rejected.catch(() => {}); // silence unhandled-rejection warning
  clientPromise = rejected;
} else {
  // Cache the client promise globally so warm serverless invocations reuse the connection.
  const g = globalThis as unknown as { _mongoClientPromise?: Promise<MongoClient> };
  if (!g._mongoClientPromise) {
    g._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = g._mongoClientPromise;
}

export default clientPromise;
