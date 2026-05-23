import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { listCandidates, createCandidate, HIRING_STAGES, type HiringStage } from '@/lib/hiring';
import { getUserById } from '@/lib/users';

export async function GET() {
  try {
    const user = await requireUser();
    const candidates = await listCandidates(user.id);
    return NextResponse.json({ candidates });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/hiring/candidates]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    // Gate to startup persona
    const profile = await getUserById(user.id);
    if (profile?.persona !== 'startup') {
      return NextResponse.json({ error: 'startup_only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? '').trim();
    const role = String(body.role ?? '').trim();
    if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
    if (!role) return NextResponse.json({ error: 'role_required' }, { status: 400 });

    const validStages = HIRING_STAGES.map((s) => s.id);
    const stage = validStages.includes(body.stage) ? (body.stage as HiringStage) : 'screen';

    const candidate = await createCandidate({
      ownerId: user.id,
      name,
      role,
      email: typeof body.email === 'string' ? body.email : undefined,
      stage,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      linkedinUrl: typeof body.linkedinUrl === 'string' ? body.linkedinUrl : undefined,
    });

    return NextResponse.json({ candidate }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/hiring/candidates]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
