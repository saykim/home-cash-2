'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const completeCallback = async () => {
      await authClient.getSession();
      router.replace('/');
      router.refresh();
    };

    completeCallback();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="surface-card w-full max-w-md rounded-2xl p-6">
        <p className="text-sm text-muted">로그인 정보를 확인하는 중입니다...</p>
      </div>
    </main>
  );
}
