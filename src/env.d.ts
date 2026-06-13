/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

// Extend Cloudflare.Env so `import { env } from "cloudflare:workers"` is typed.
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
  }
}

declare namespace App {
  interface Locals {
    cfContext: ExecutionContext;
  }
}
