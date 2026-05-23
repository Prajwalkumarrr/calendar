// Server-only — imports mongodb. Never import this in client components.
// Client components should import from '@/lib/hiring-types' instead.
import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';
export type { HiringStage, CandidateDTO } from './hiring-types';
export { HIRING_STAGES } from './hiring-types';
import type { HiringStage, CandidateDTO } from './hiring-types';

const DB_NAME = 'elevaite';
const COLLECTION = 'candidates';

export type CandidateDoc = {
  _id?: ObjectId;
  ownerId: string;
  name: string;
  email?: string;
  role: string;
  stage: HiringStage;
  notes?: string;
  linkedinUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};

function toDTO(doc: CandidateDoc): CandidateDTO {
  return {
    id: doc._id!.toHexString(),
    ownerId: doc.ownerId,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    stage: doc.stage,
    notes: doc.notes,
    linkedinUrl: doc.linkedinUrl,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function col() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<CandidateDoc>(COLLECTION);
}

export async function listCandidates(ownerId: string): Promise<CandidateDTO[]> {
  const c = await col();
  const docs = await c.find({ ownerId }).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => toDTO(d as CandidateDoc));
}

export async function createCandidate(input: {
  ownerId: string;
  name: string;
  email?: string;
  role: string;
  stage?: HiringStage;
  notes?: string;
  linkedinUrl?: string;
}): Promise<CandidateDTO> {
  const now = new Date();
  const doc: CandidateDoc = {
    ownerId: input.ownerId,
    name: input.name.trim(),
    email: input.email?.trim().toLowerCase(),
    role: input.role.trim(),
    stage: input.stage ?? 'screen',
    notes: input.notes,
    linkedinUrl: input.linkedinUrl,
    createdAt: now,
    updatedAt: now,
  };
  const c = await col();
  const res = await c.insertOne(doc);
  return toDTO({ ...doc, _id: res.insertedId });
}

export async function updateCandidate(
  ownerId: string,
  id: string,
  patch: Partial<Pick<CandidateDoc, 'name' | 'email' | 'role' | 'stage' | 'notes' | 'linkedinUrl'>>,
): Promise<CandidateDTO | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col();
  const res = await c.findOneAndUpdate(
    { _id: new ObjectId(id), ownerId },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after', includeResultMetadata: false },
  );
  if (!res) return null;
  return toDTO(res as CandidateDoc);
}

export async function deleteCandidate(ownerId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const c = await col();
  const res = await c.deleteOne({ _id: new ObjectId(id), ownerId });
  return res.deletedCount === 1;
}

export async function getCandidateById(ownerId: string, id: string): Promise<CandidateDTO | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col();
  const doc = await c.findOne({ _id: new ObjectId(id), ownerId });
  if (!doc) return null;
  return toDTO(doc as CandidateDoc);
}

/**
 * Find-or-create a candidate from an interview event's hiringMeta.
 * If candidateId is provided and valid, updates the stage and returns that candidate.
 * Otherwise searches by name (case-insensitive) and creates if not found.
 * Returns { candidate, isNew } so caller can store candidateId back on the event.
 */
export async function upsertCandidateFromInterview(
  ownerId: string,
  meta: { candidateId?: string; candidateName: string; role: string; stage: HiringStage },
): Promise<{ candidate: CandidateDTO; isNew: boolean }> {
  // 1. Known candidateId — just sync the stage
  if (meta.candidateId && ObjectId.isValid(meta.candidateId)) {
    const updated = await updateCandidate(ownerId, meta.candidateId, { stage: meta.stage });
    if (updated) return { candidate: updated, isNew: false };
  }

  // 2. Look up by exact name (case-insensitive)
  const c = await col();
  const escaped = meta.candidateName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await c.findOne({
    ownerId,
    name: { $regex: new RegExp(`^${escaped}$`, 'i') },
  });
  if (existing) {
    const updated = await updateCandidate(ownerId, existing._id!.toHexString(), { stage: meta.stage });
    if (updated) return { candidate: updated, isNew: false };
  }

  // 3. Create new candidate
  const candidate = await createCandidate({
    ownerId,
    name: meta.candidateName.trim(),
    role: meta.role.trim(),
    stage: meta.stage,
  });
  return { candidate, isNew: true };
}
