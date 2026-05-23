import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { getTeamGroups, updateTeamGroups, type TeamGroup } from '@/lib/users';

export async function GET() {
  try {
    const user = await requireUser();
    const groups = await getTeamGroups(user.id);
    return NextResponse.json({ groups });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const { groups } = await req.json();
    if (!Array.isArray(groups)) {
      return NextResponse.json({ error: 'groups must be an array' }, { status: 400 });
    }
    // Basic shape validation
    for (const g of groups) {
      if (typeof g.id !== 'string' || typeof g.name !== 'string' || !Array.isArray(g.members)) {
        return NextResponse.json({ error: 'invalid group shape' }, { status: 400 });
      }
    }
    const saved = await updateTeamGroups(user.id, groups as TeamGroup[]);
    return NextResponse.json({ groups: saved });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
