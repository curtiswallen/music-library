/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    /** Comma-separated list of emails allowed to sign in */
    ALLOWED_EMAILS: string;
  }
}

declare namespace App {
  interface Locals {
    cfContext: ExecutionContext;
    user: import('./types').User | null;
    sessionId: string | null;
  }
}
