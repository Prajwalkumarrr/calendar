import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';

const DB_NAME = 'elevaite';

export type UserRecord = {
  _id: ObjectId;
  name?: string;
  email?: string;
  image?: string;
};

export async function getUserById(id: string): Promise<UserRecord | null> {
  if (!ObjectId.isValid(id)) return null;
  const client = await clientPromise;
  const u = await client
    .db(DB_NAME)
    .collection('users')
    .findOne({ _id: new ObjectId(id) });
  return u as UserRecord | null;
}
