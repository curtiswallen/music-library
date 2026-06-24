/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface Window {
  showConfirm(message: string, okLabel?: string, opts?: { coverUrl?: string; albumName?: string }): Promise<boolean>;
  showQueueAdd(onQueued?: (album: { slug: string; title: string; artist: string; year?: string; coverUrl?: string; releaseType?: string; albumId: number }) => void): void;
  showAlbumPick(): void;
}

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    GENRE_CACHE: KVNamespace;
    COVERS: R2Bucket;
    COVERS_PUBLIC_URL: string;
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
