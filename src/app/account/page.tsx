'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

export default function AccountPage() {
  const router = useRouter();
  const session = authClient.useSession();

  const handleSignOut = async () => {
    try {
      const { error } = await authClient.signOut();
      if (error) {
        throw new Error(error.message || '로그아웃에 실패했습니다.');
      }
    } catch {
      try {
        await fetch('/api/auth/sign-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          credentials: 'include',
        });
      } catch {
        // Ignore fallback errors and force redirect below.
      }
    } finally {
      window.location.assign('/auth/sign-in');
    }
  };

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      router.replace('/auth/sign-in');
    }
  }, [router, session.data?.user, session.isPending]);

  if (session.isPending) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="surface-card rounded-xl px-4 py-3 text-sm text-muted">세션 확인 중...</div>
      </main>
    );
  }

  if (!session.data?.user) {
    return null;
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-primary">계정 관리</h1>
          <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
            홈으로
          </Link>
        </div>
        <div className="surface-card rounded-2xl p-4 md:p-6 space-y-4">
          <div>
            <p className="text-sm text-muted">이메일</p>
            <p className="text-primary font-medium">{session.data.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted">이름</p>
            <p className="text-primary font-medium">{session.data.user.name}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg px-3 py-2 text-sm font-medium text-white bg-[var(--danger)]"
          >
            로그아웃
          </button>
        </div>
      </div>
    </main>
  );
}
