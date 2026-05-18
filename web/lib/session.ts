import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/**
 * Get the current authenticated user, or null if not signed in.
 * Use this in Server Components and Route Handlers.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user as SessionUser;
}

/**
 * For Route Handlers: returns the user, or throws a Response(401) to short-circuit.
 *
 *   const user = await requireUser();   // throws if not signed in
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  return user;
}
