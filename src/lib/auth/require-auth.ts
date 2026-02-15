import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

export async function requireAuth() {
  const { data: session, error } = await auth.getSession();
  if (error || !session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return null;
}
