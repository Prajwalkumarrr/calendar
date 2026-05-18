import { MongoClient, type MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not set in web/.env.local');
}

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {};

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // Cache the client on the global object so HMR doesn't create new connections every reload
  const g = globalThis as unknown as { _mongoClientPromise?: Promise<MongoClient> };
  if (!g._mongoClientPromise) {
    g._mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = g._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export default clientPromise;
