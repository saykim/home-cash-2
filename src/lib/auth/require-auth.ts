import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/server';

export async function requireAuth() {
  const auth = getAuth();
  if (!auth) {
    return NextResponse.json(
      { error: 'server auth is not configured' },
      { status: 500 },
    );
  }

  const { data: session, error } = await auth.getSession();
  if (error || !session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return null;
}
