/**
 * Cloudflare Pages Function: serve index.html only for real SPA routes.
 *
 * Missing hashed assets must return a real 404, not index.html. We therefore
 * let asset-like requests pass through to the static asset server and only
 * fall back to /index.html for extensionless navigation requests.
 *
 * @param {{ request: Request; next: (input?: Request | string, init?: RequestInit) => Promise<Response>; env: { ASSETS: { fetch: (input: Request | string | URL, init?: RequestInit) => Promise<Response> } } }} context
 */
export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return next();
  }

  if (pathname.startsWith('/assets/')) {
    return next();
  }

  const lastSegment = pathname.split('/').filter(Boolean).pop() ?? '';
  const looksLikeStaticAsset = lastSegment.includes('.');
  if (looksLikeStaticAsset) {
    return next();
  }

  const response = await next();
  if (response.status !== 404) {
    return response;
  }

  const indexRequest = new Request(new URL('/index.html', url), {
    method: request.method,
    headers: request.headers,
  });
  const indexResponse = await env.ASSETS.fetch(indexRequest);

  return new Response(indexResponse.body, {
    status: 200,
    headers: indexResponse.headers,
  });
}