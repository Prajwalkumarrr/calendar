import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';

const DB_NAME = 'elevaite';

export type Role = 'owner' | 'admin' | 'member' | 'guest';

export type WorkspaceDoc = {
  _id?: ObjectId;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MembershipDoc = {
  _id?: ObjectId;
  workspaceId: ObjectId;
  userId: string;
  role: Role;
  joinedAt: Date;
};

export type InvitationDoc = {
  _id?: ObjectId;
  workspaceId: ObjectId;
  email: string;
  role: Role;
  token: string;          // random URL-safe id
  invitedBy: string;      // userId
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: string;
};

export type WorkspaceDTO = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  role: Role;             // calling user's role in this workspace
  memberCount: number;
};

export type MemberDTO = {
  userId: string;
  name?: string;
  email?: string;
  image?: string;
  role: Role;
  joinedAt: string;
};

export type InvitationDTO = {
  id: string;
  email: string;
  role: Role;
  token: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
};

async function wsCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<WorkspaceDoc>('workspaces');
}
async function memCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<MembershipDoc>('memberships');
}
async function invCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<InvitationDoc>('invitations');
}
async function userCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection('users');
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'workspace';
}

function makeToken(): string {
  // URL-safe random token, 32 chars
  const bytes = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Buffer.from(bytes).toString('base64url');
}

// ── Workspace CRUD ──────────────────────────────────────────────────

export async function createWorkspace(args: { name: string; ownerId: string }): Promise<WorkspaceDTO> {
  const ws = await wsCol();
  const mem = await memCol();
  const base = slugify(args.name);
  let slug = base;
  for (let i = 2; i < 100; i++) {
    if (!(await ws.findOne({ slug }))) break;
    slug = `${base}-${i}`;
  }
  const now = new Date();
  const doc: WorkspaceDoc = {
    name: args.name.trim().slice(0, 80) || 'Workspace',
    slug,
    ownerId: args.ownerId,
    createdAt: now,
    updatedAt: now,
  };
  const res = await ws.insertOne(doc);
  await mem.insertOne({
    workspaceId: res.insertedId,
    userId: args.ownerId,
    role: 'owner',
    joinedAt: now,
  });
  return {
    id: res.insertedId.toHexString(),
    name: doc.name,
    slug: doc.slug,
    ownerId: doc.ownerId,
    role: 'owner',
    memberCount: 1,
  };
}

export async function listWorkspacesForUser(userId: string): Promise<WorkspaceDTO[]> {
  const mem = await memCol();
  const memberships = await mem.find({ userId }).toArray();
  if (memberships.length === 0) return [];
  const ws = await wsCol();
  const docs = await ws.find({ _id: { $in: memberships.map((m) => m.workspaceId) } }).toArray();
  const roleByWs = new Map(memberships.map((m) => [m.workspaceId.toHexString(), m.role] as const));
  const countByWs = new Map<string, number>();
  await Promise.all(
    docs.map(async (w) => {
      const count = await mem.countDocuments({ workspaceId: w._id });
      countByWs.set(w._id!.toHexString(), count);
    }),
  );
  return docs.map((w) => ({
    id: w._id!.toHexString(),
    name: w.name,
    slug: w.slug,
    ownerId: w.ownerId,
    role: roleByWs.get(w._id!.toHexString()) ?? 'member',
    memberCount: countByWs.get(w._id!.toHexString()) ?? 1,
  }));
}

export async function getRoleInWorkspace(userId: string, workspaceId: string): Promise<Role | null> {
  if (!ObjectId.isValid(workspaceId)) return null;
  const mem = await memCol();
  const m = await mem.findOne({ userId, workspaceId: new ObjectId(workspaceId) });
  return m?.role ?? null;
}

export async function listMembers(workspaceId: string): Promise<MemberDTO[]> {
  if (!ObjectId.isValid(workspaceId)) return [];
  const mem = await memCol();
  const memberships = await mem.find({ workspaceId: new ObjectId(workspaceId) }).toArray();
  if (memberships.length === 0) return [];
  const userIds = memberships.map((m) => m.userId).filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const users = await userCol();
  const userDocs = await users.find({ _id: { $in: userIds } }).toArray();
  const byId = new Map(userDocs.map((u) => [u._id.toHexString(), u]));
  return memberships.map((m) => {
    const u = byId.get(m.userId);
    return {
      userId: m.userId,
      name: u?.name,
      email: u?.email,
      image: u?.image,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    };
  });
}

export async function updateMemberRole(workspaceId: string, userId: string, role: Role): Promise<boolean> {
  if (!ObjectId.isValid(workspaceId)) return false;
  const mem = await memCol();
  const res = await mem.updateOne(
    { workspaceId: new ObjectId(workspaceId), userId },
    { $set: { role } },
  );
  return res.modifiedCount === 1;
}

export async function removeMember(workspaceId: string, userId: string): Promise<boolean> {
  if (!ObjectId.isValid(workspaceId)) return false;
  const mem = await memCol();
  const res = await mem.deleteOne({ workspaceId: new ObjectId(workspaceId), userId });
  return res.deletedCount === 1;
}

// ── Invitations ─────────────────────────────────────────────────────

export async function createInvitation(args: {
  workspaceId: string;
  email: string;
  role: Role;
  invitedBy: string;
}): Promise<InvitationDTO> {
  if (!ObjectId.isValid(args.workspaceId)) throw new Error('invalid workspace id');
  const inv = await invCol();
  const doc: InvitationDoc = {
    workspaceId: new ObjectId(args.workspaceId),
    email: args.email.toLowerCase().trim(),
    role: args.role,
    token: makeToken(),
    invitedBy: args.invitedBy,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60_000), // 14 days
  };
  const res = await inv.insertOne(doc);
  return {
    id: res.insertedId.toHexString(),
    email: doc.email,
    role: doc.role,
    token: doc.token,
    invitedBy: doc.invitedBy,
    createdAt: doc.createdAt.toISOString(),
    expiresAt: doc.expiresAt.toISOString(),
  };
}

export async function listInvitations(workspaceId: string): Promise<InvitationDTO[]> {
  if (!ObjectId.isValid(workspaceId)) return [];
  const inv = await invCol();
  const docs = await inv.find({ workspaceId: new ObjectId(workspaceId), acceptedAt: { $exists: false } }).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => ({
    id: d._id!.toHexString(),
    email: d.email,
    role: d.role,
    token: d.token,
    invitedBy: d.invitedBy,
    createdAt: d.createdAt.toISOString(),
    expiresAt: d.expiresAt.toISOString(),
    acceptedAt: d.acceptedAt?.toISOString(),
  }));
}

export async function revokeInvitation(workspaceId: string, invitationId: string): Promise<boolean> {
  if (!ObjectId.isValid(workspaceId) || !ObjectId.isValid(invitationId)) return false;
  const inv = await invCol();
  const res = await inv.deleteOne({ _id: new ObjectId(invitationId), workspaceId: new ObjectId(workspaceId) });
  return res.deletedCount === 1;
}

export async function findInvitationByToken(token: string): Promise<{ invitation: InvitationDTO; workspaceName: string } | null> {
  const inv = await invCol();
  const doc = await inv.findOne({ token });
  if (!doc) return null;
  if (doc.acceptedAt) return null;
  if (new Date() > new Date(doc.expiresAt)) return null;
  const ws = await wsCol();
  const w = await ws.findOne({ _id: doc.workspaceId });
  if (!w) return null;
  return {
    invitation: {
      id: doc._id!.toHexString(),
      email: doc.email,
      role: doc.role,
      token: doc.token,
      invitedBy: doc.invitedBy,
      createdAt: doc.createdAt.toISOString(),
      expiresAt: doc.expiresAt.toISOString(),
    },
    workspaceName: w.name,
  };
}

export async function acceptInvitation(token: string, userId: string): Promise<{ workspaceId: string } | null> {
  const inv = await invCol();
  const mem = await memCol();
  const doc = await inv.findOne({ token });
  if (!doc || doc.acceptedAt) return null;
  if (new Date() > new Date(doc.expiresAt)) return null;
  // Idempotent: if user is already a member, just mark accepted.
  const existing = await mem.findOne({ workspaceId: doc.workspaceId, userId });
  if (!existing) {
    await mem.insertOne({
      workspaceId: doc.workspaceId,
      userId,
      role: doc.role,
      joinedAt: new Date(),
    });
  }
  await inv.updateOne({ _id: doc._id }, { $set: { acceptedAt: new Date(), acceptedBy: userId } });
  return { workspaceId: doc.workspaceId.toHexString() };
}
