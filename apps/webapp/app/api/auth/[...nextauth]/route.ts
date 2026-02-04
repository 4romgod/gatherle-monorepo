import type { NextRequest } from 'next/server';

import { handlers } from '@/auth';

type NextAuthHandler = (request: NextRequest) => Promise<Response>;

type NextAuthRouteContext = {
  params?: Promise<Record<string, string | string[] | undefined>>;
};

const { GET: nextAuthGET, POST: nextAuthPOST } = handlers as unknown as {
  GET: NextAuthHandler;
  POST: NextAuthHandler;
};

const adaptNextAuthHandler =
  (handler: NextAuthHandler) =>
  async (request: NextRequest, _context: NextAuthRouteContext): Promise<Response> =>
    handler(request);

export const GET = adaptNextAuthHandler(nextAuthGET);
export const POST = adaptNextAuthHandler(nextAuthPOST);
export const runtime = 'nodejs';
