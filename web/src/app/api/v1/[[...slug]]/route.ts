import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { auth } from '@/lib/auth';

function getCorsHeaders(req?: Request): HeadersInit {
  const allowed = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
  ];
  if (process.env.NEXT_PUBLIC_APP_URL) {
    allowed.push(process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, ''));
  }
  if (process.env.ALLOWED_ORIGINS) {
    for (const o of process.env.ALLOWED_ORIGINS.split(',')) {
      if (o.trim()) allowed.push(o.trim());
    }
  }

  const origin = req?.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workspace-ID',
    'Vary': 'Origin',
  };

  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

function json(data: unknown, status = 200, req?: Request) {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(req),
  });
}

function error(detail: string, status = 400, req?: Request) {
  return NextResponse.json({ detail }, {
    status,
    headers: getCorsHeaders(req),
  });
}

function getBackendBase(): string {
  const backend = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  let raw = backend.replace(/\/+$/, '');
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `http://${raw}`;
  }
  return raw.endsWith('/v1') ? raw : `${raw}/v1`;
}

// SMELL-1 fix: Proxy Next.js API requests directly to the real Go backend orchestrator
async function proxyToBackend(req: NextRequest, slug: string[]): Promise<Response | null> {
  const backendBase = getBackendBase();
  const path = slug.join('/');
  const query = req.nextUrl.search;
  const targetUrl = `${backendBase}/${path}${query}`;

  const headers = new Headers(req.headers);
  headers.delete('host');

  try {
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    if (session?.user && !headers.has('Authorization')) {
      const token = req.cookies.get('better-auth.session_token')?.value ||
                    req.cookies.get('__Secure-better-auth.session_token')?.value ||
                    req.cookies.get('session_token')?.value;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
  } catch {}

  try {
    let body: BodyInit | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await req.arrayBuffer();
    }

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error duplex required for streaming bodies in Node
      duplex: 'half',
    });

    const resHeaders = new Headers(backendRes.headers);
    const cors = getCorsHeaders(req);
    Object.entries(cors).forEach(([k, v]) => {
      if (typeof v === 'string') resHeaders.set(k, v);
    });

    return new Response(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });
  } catch {
    if (process.env.NODE_ENV === 'production' || process.env.DISABLE_MOCK_FALLBACK === 'true') {
      return NextResponse.json(
        {
          error: 'Bad Gateway',
          detail: `Weave Go backend service unreachable at ${backendBase}. Please ensure weave-backend is running and healthy.`,
        },
        { status: 502, headers: getCorsHeaders(req) }
      );
    }
    return null;
  }
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await params;
  const path = slug.join('/');

  // Proxy to real Go backend first
  if (path !== 'me') {
    const proxied = await proxyToBackend(req, slug);
    if (proxied) return proxied;
  }

  const searchParams = req.nextUrl.searchParams;

  // GET /api/v1/healthz
  if (path === 'healthz' || path === 'readyz') {
    return json({ status: 'ok' });
  }

  // GET /api/v1/me
  if (path === 'me') {
    try {
      const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
      if (session?.user) {
        return json({
          authenticated: true,
          user_id: session.user.id,
          user_name: session.user.name,
          user_email: session.user.email,
          active_organization_id: (session.session as { activeOrganizationId?: string })?.activeOrganizationId || 'org_weave_internal',
          workspace_id: '00000000-0000-0000-0000-000000000001',
          workspace_name: 'Production',
          expires_at: session.session.expiresAt.toISOString(),
        });
      }
    } catch {
      // Fall through to unauthenticated
    }
    return json({
      authenticated: false,
      workspace_id: '00000000-0000-0000-0000-000000000001',
    });
  }

  // GET /api/v1/models
  if (path === 'models') {
    return json(serverStore.listModels());
  }

  // GET /api/v1/gates
  if (path === 'gates') {
    return json(serverStore.listGates());
  }

  // GET /api/v1/workflows
  if (path === 'workflows') {
    return json(serverStore.listWorkflows());
  }

  // GET /api/v1/workflows/:id
  if (slug.length === 2 && slug[0] === 'workflows') {
    const wf = serverStore.getWorkflow('00000000-0000-0000-0000-000000000001', slug[1]);
    if (!wf) return error('Workflow not found', 404);
    return json(wf);
  }

  // GET /api/v1/workflows/:id/draft
  if (slug.length === 3 && slug[0] === 'workflows' && slug[2] === 'draft') {
    const draft = serverStore.getWorkflowDraft('00000000-0000-0000-0000-000000000001', slug[1]);
    if (!draft) return error('Workflow draft not found', 404);
    return json(draft);
  }

  // GET /api/v1/workflows/:id/versions
  if (slug.length === 3 && slug[0] === 'workflows' && slug[2] === 'versions') {
    return json(serverStore.listVersions(slug[1]));
  }

  // GET /api/v1/workflows/:id/versions/:v
  if (slug.length === 4 && slug[0] === 'workflows' && slug[2] === 'versions') {
    const versionNum = parseInt(slug[3], 10);
    const ver = serverStore.getVersion(slug[1], versionNum);
    if (!ver) return error('Workflow version not found', 404);
    return json(ver);
  }

  // GET /api/v1/runs
  if (path === 'runs') {
    const status = searchParams.get('status') || undefined;
    return json(serverStore.listRuns('00000000-0000-0000-0000-000000000001', status));
  }

  // GET /api/v1/runs/:id
  if (slug.length === 2 && slug[0] === 'runs') {
    const run = serverStore.getRun(slug[1]);
    if (!run) return error('Run not found', 404);
    return json(run);
  }

  // GET /api/v1/runs/:id/events or stream
  if (slug.length === 3 && slug[0] === 'runs' && (slug[2] === 'events' || slug[2] === 'stream')) {
    const runId = slug[1];
    const afterSeq = parseInt(searchParams.get('after_seq') || '0', 10);
    const events = serverStore.getRunEvents(runId, afterSeq);

    const acceptHeader = req.headers.get('accept') || '';
    if (acceptHeader.includes('text/event-stream') || slug[2] === 'stream') {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const ev of events) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
          }
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          ...getCorsHeaders(req),
        },
      });
    }

    return json(events);
  }

  return error(`Not found: GET /api/v1/${path}`, 404);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await params;
  const path = slug.join('/');

  const proxied = await proxyToBackend(req, slug);
  if (proxied) return proxied;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // POST /api/v1/workflows
  if (path === 'workflows') {
    if (!body.name) return error('Workflow name is required', 400);
    const wf = serverStore.createWorkflow(
      '00000000-0000-0000-0000-000000000001',
      body.name,
      body.description,
      body.initial_graph
    );
    return json(wf, 201);
  }

  // POST /api/v1/workflows/:id/validate
  if (slug.length === 3 && slug[0] === 'workflows' && slug[2] === 'validate') {
    const workflowId = slug[1];
    const wf = serverStore.getWorkflow('00000000-0000-0000-0000-000000000001', workflowId);
    const graphToValidate = body?.nodes ? body : wf?.draft_graph;
    if (!graphToValidate) return error('No graph provided for validation', 400);
    const validation = serverStore.validateWorkflow(graphToValidate);
    return json(validation);
  }

  // POST /api/v1/workflows/:id/publish
  if (slug.length === 3 && slug[0] === 'workflows' && slug[2] === 'publish') {
    const workflowId = slug[1];
    const version = serverStore.publishWorkflow('00000000-0000-0000-0000-000000000001', workflowId);
    if (!version) return error('Validation failed or workflow draft not found', 400);
    return json(version, 201);
  }

  // POST /api/v1/workflows/:id/versions/:v/runs
  if (slug.length === 5 && slug[0] === 'workflows' && slug[2] === 'versions' && slug[4] === 'runs') {
    const workflowId = slug[1];
    const versionNumber = parseInt(slug[3], 10);
    const run = serverStore.createRun(
      '00000000-0000-0000-0000-000000000001',
      workflowId,
      versionNumber,
      body
    );
    return json(run, 201);
  }

  // POST /api/v1/runs/:id/cancel
  if (slug.length === 3 && slug[0] === 'runs' && slug[2] === 'cancel') {
    const success = serverStore.cancelRun(slug[1]);
    if (!success) return error('Run not found or cannot be cancelled', 404);
    return json({ status: 'cancelled' });
  }

  // POST /api/v1/runs/:id/replay
  if (slug.length === 3 && slug[0] === 'runs' && slug[2] === 'replay') {
    const replayed = serverStore.replayRun(slug[1]);
    if (!replayed) return error('Run not found or cannot be replayed', 404);
    return json({ replay_mode: 'deterministic', state: replayed });
  }

  // POST /api/v1/gates/:id/resolve
  if (slug.length === 3 && slug[0] === 'gates' && slug[2] === 'resolve') {
    const gateId = slug[1];
    const { resolution, actor, payload } = body || {};
    if (!resolution || !['approve', 'reject', 'edit'].includes(resolution)) {
      return error('Invalid resolution. Must be approve, reject, or edit.', 400);
    }
    const success = serverStore.resolveGate(gateId, resolution, actor || 'user', payload);
    if (!success) return error('Gate not found or already resolved', 404);
    return json({ status: 'resolved', gate_id: gateId });
  }

  return error(`Not found: POST /api/v1/${path}`, 404);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await params;

  const proxied = await proxyToBackend(req, slug);
  if (proxied) return proxied;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // PUT /api/v1/workflows/:id/draft
  if (slug.length === 3 && slug[0] === 'workflows' && slug[2] === 'draft') {
    const success = serverStore.updateWorkflowDraft('00000000-0000-0000-0000-000000000001', slug[1], body);
    if (!success) return error('Workflow not found', 404);
    return json({ status: 'saved' });
  }

  return error('Not found', 404);
}
