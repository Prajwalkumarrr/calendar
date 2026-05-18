import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';
import { getUserById } from './users';

const DB_NAME = 'elevaite';
const COLLECTION = 'auditLog';

export type AuditAction =
  | 'workspace.created'
  | 'invitation.sent'
  | 'invitation.revoked'
  | 'member.joined'
  | 'member.removed'
  | 'member.role_changed';

export type AuditLogDoc = {
  _id?: ObjectId;
  workspaceId: ObjectId;
  actorId: string;
  actorName?: string;
  actorEmail?: string;
  action: AuditAction;
  targetUserId?: string;
  targetEmail?: string;
  targetName?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
};

export type AuditLogDTO = Omit<AuditLogDoc, '_id' | 'workspaceId' | 'createdAt'> & {
  id: string;
  workspaceId: string;
  createdAt: string;
};

async function col() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<AuditLogDoc>(COLLECTION);
}

function toDTO(d: AuditLogDoc): AuditLogDTO {
  return {
    id: d._id!.toHexString(),
    workspaceId: d.workspaceId.toHexString(),
    actorId: d.actorId,
    actorName: d.actorName,
    actorEmail: d.actorEmail,
    action: d.action,
    targetUserId: d.targetUserId,
    targetEmail: d.targetEmail,
    targetName: d.targetName,
    details: d.details,
    createdAt: d.createdAt.toISOString(),
  };
}

export type LogAuditInput = {
  workspaceId: string;
  actorId: string;
  action: AuditAction;
  targetUserId?: string;
  targetEmail?: string;
  targetName?: string;
  details?: Record<string, unknown>;
};

export async function logAudit(input: LogAuditInput): Promise<void> {
  if (!ObjectId.isValid(input.workspaceId)) return;
  // Cache actor display info so the audit log doesn't need a join on read.
  const actor = await getUserById(input.actorId).catch(() => null);
  const c = await col();
  await c.insertOne({
    workspaceId: new ObjectId(input.workspaceId),
    actorId: input.actorId,
    actorName: actor?.name ?? actor?.email ?? undefined,
    actorEmail: actor?.email ?? undefined,
    action: input.action,
    targetUserId: input.targetUserId,
    targetEmail: input.targetEmail,
    targetName: input.targetName,
    details: input.details,
    createdAt: new Date(),
  });
}

export async function listAudit(workspaceId: string, limit = 50): Promise<AuditLogDTO[]> {
  if (!ObjectId.isValid(workspaceId)) return [];
  const c = await col();
  const docs = await c
    .find({ workspaceId: new ObjectId(workspaceId) })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .toArray();
  return docs.map(toDTO);
}
