'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const { error } = await authClient.signUp.email({
      email,
      password,
      name: name.trim() || email.split('@')[0],
    });

    if (error) {
      setErrorMessage(error.message || '회원가입에 실패했습니다.');
      setSubmitting(false);
      return;
    }

    router.replace('/');
    router.refresh();
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="surface-card w-full max-w-md rounded-2xl p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-primary">회원가입</h1>
          <p className="text-sm text-muted">새 계정을 만들고 가계부를 시작하세요.</p>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="이름 (선택)"
            className="w-full rounded-lg border px-3 py-2 bg-[var(--surface-strong)] text-primary"
          />
          <input
            type="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="이메일"
            className="w-full rounded-lg border px-3 py-2 bg-[var(--surface-strong)] text-primary"
          />
          <input
            type="password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="비밀번호"
            className="w-full rounded-lg border px-3 py-2 bg-[var(--surface-strong)] text-primary"
          />
          {errorMessage && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg px-3 py-2 font-medium text-white bg-[var(--accent)] disabled:opacity-60"
          >
            {submitting ? '가입 중...' : '회원가입'}
          </button>
        </form>
        <p className="text-sm text-secondary">
          이미 계정이 있나요?{' '}
          <Link href="/auth/sign-in" className="text-[var(--accent)] font-medium hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
