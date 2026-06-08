import { vi } from 'vitest';

// Mock Next.js server environment
vi.mock('next/server', () => ({
  NextRequest: class NextRequest {
    url: string;
    method: string;
    headers: Headers;
    private _body: any;
    constructor(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
      this.url = url;
      this.method = init?.method ?? 'GET';
      this.headers = new Headers(init?.headers);
      this._body = init?.body;
    }
    async json() { return JSON.parse(this._body ?? '{}'); }
  },
  NextResponse: {
    json: (data: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

// Reset module caches between tests
beforeEach(() => {
  vi.clearAllMocks();
});
