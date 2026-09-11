import { NextResponse, type NextRequest } from 'next/server';

// The ChatGPT Sites platform injects oai-authenticated-user-* headers in
// production. Locally there is no such platform in front of `vinext dev`, so
// requireChatGPTUser() would otherwise redirect every request to a sign-in
// page that doesn't exist in this repo. import.meta.env.DEV is a build-time
// Vite flag, false in any production build, so this is a no-op once deployed.
export function middleware(request: NextRequest) {
  if (!import.meta.env.DEV) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set('oai-authenticated-user-id', 'dev-local');
  headers.set('oai-authenticated-user-email', 'dev@localhost');
  return NextResponse.next({ request: { headers } });
}
