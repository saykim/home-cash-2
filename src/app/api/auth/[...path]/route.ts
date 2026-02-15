import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path: string[] }> };

function missingAuthConfigResponse() {
  return NextResponse.json(
    { error: 'NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET must be set' },
    { status: 500 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const auth = getAuth();
  if (!auth) {
    return missingAuthConfigResponse();
  }
  return auth.handler().GET(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  const auth = getAuth();
  if (!auth) {
    return missingAuthConfigResponse();
  }
  return auth.handler().POST(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = getAuth();
  if (!auth) {
    return missingAuthConfigResponse();
  }
  return auth.handler().PUT(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = getAuth();
  if (!auth) {
    return missingAuthConfigResponse();
  }
  return auth.handler().DELETE(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = getAuth();
  if (!auth) {
    return missingAuthConfigResponse();
  }
  return auth.handler().PATCH(request, context);
}
