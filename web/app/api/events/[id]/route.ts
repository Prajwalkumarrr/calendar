import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import {
  updateEvent, deleteEvent,
  editThisOnly, editThisAndFuture,
  deleteThisOnly, deleteThisAndFuture,
  CHIP_COLORS, ChipColor, parseRecurrenceInput,
  type RecurringScope, type UpdateEventInput,
} from '@/lib/events';
import { upsertCandidateFromInterview } from '@/lib/hiring';

function parsePatch(body: Record<string, unknown>): UpdateEventInput {
  const patch: UpdateEventInput = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.start === 'string') {
    const d = new Date(body.start);
    if (!isNaN(+d)) patch.start = d;
  }
  if (typeof body.end === 'string') {
    const d = new Date(body.end);
    if (!isNaN(+d)) patch.end = d;
  }
  if (typeof body.allDay === 'boolean') patch.allDay = body.allDay;
  if (CHIP_COLORS.includes(body.color as ChipColor)) patch.color = body.color as ChipColor;
  if (typeof body.location === 'string') patch.location = body.location;
  if (typeof body.description === 'string') patch.description = body.description;
  if ('recurrence' in body) {
    const r = parseRecurrenceInput(body.recurrence);
    patch.recurrence = r ?? undefined;
  }
  return patch;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const scope = (body.scope ?? 'all') as RecurringScope;
    const originalDateRaw = body.originalDate;
    const originalDate = typeof originalDateRaw === 'string' ? new Date(originalDateRaw) : null;

    if ((scope === 'this' || scope === 'future') && !originalDate) {
      return NextResponse.json({ error: 'originalDate required for scoped edits' }, { status: 400 });
    }

    const patch = parsePatch(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
    }

    // Sync hiring stage to candidate when hiringMeta is present
    if (body.hiringMeta && typeof body.hiringMeta === 'object') {
      const hm = body.hiringMeta as { candidateId?: string; candidateName?: string; role?: string; stage?: string };
      if (hm.candidateName && hm.stage) {
        patch.hiringMeta = hm as UpdateEventInput['hiringMeta'];
        upsertCandidateFromInterview(user.id, {
          candidateId: hm.candidateId,
          candidateName: hm.candidateName,
          role: hm.role ?? '',
          stage: hm.stage as 'screen' | 'technical' | 'founder' | 'offer' | 'rejected',
        }).catch((e) => console.error('[PATCH /api/events/:id] hiring sync failed', e));
      }
    }

    let result;
    if (scope === 'this' && originalDate) {
      result = await editThisOnly(user.id, id, originalDate, patch);
    } else if (scope === 'future' && originalDate) {
      result = await editThisAndFuture(user.id, id, originalDate, patch);
    } else {
      result = await updateEvent(user.id, id, patch);
    }

    if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ event: result });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/events/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // scope + originalDate come from query string for DELETE (no body)
    const { searchParams } = req.nextUrl;
    const scope = (searchParams.get('scope') ?? 'all') as RecurringScope;
    const originalDateRaw = searchParams.get('originalDate');
    const originalDate = originalDateRaw ? new Date(originalDateRaw) : null;

    if ((scope === 'this' || scope === 'future') && !originalDate) {
      return NextResponse.json({ error: 'originalDate required for scoped deletes' }, { status: 400 });
    }

    let ok: boolean;
    if (scope === 'this' && originalDate) {
      ok = await deleteThisOnly(user.id, id, originalDate);
    } else if (scope === 'future' && originalDate) {
      ok = await deleteThisAndFuture(user.id, id, originalDate);
    } else {
      ok = await deleteEvent(user.id, id);
    }

    if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/events/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
