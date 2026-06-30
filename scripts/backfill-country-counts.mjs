#!/usr/bin/env node
/**
 * Backfill country_counts on all users from their current library.
 *
 * Counts rated, non-hidden albums grouped by country (stored as full names,
 * e.g. "United States"). Runs as a single UPDATE with a correlated subquery.
 *
 * Usage:
 *   node scripts/backfill-country-counts.mjs           (local D1 — default)
 *   node scripts/backfill-country-counts.mjs --remote  (remote D1)
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const REMOTE      = process.argv.includes('--remote');
const REMOTE_FLAG = REMOTE ? '--remote' : '--local';
const DB_NAME     = 'music-library';

console.log(`Backfilling country_counts (${REMOTE ? 'remote' : 'local'})...`);

const sql = `
UPDATE users SET country_counts = (
  SELECT json_group_object(country, cnt) FROM (
    SELECT a.country, COUNT(*) AS cnt
    FROM user_albums ua
    JOIN albums a ON a.id = ua.album_id
    WHERE ua.user_id = users.id
      AND ua.rating IS NOT NULL
      AND ua.is_hidden = 0
      AND a.country IS NOT NULL
      AND a.country != ''
    GROUP BY a.country
  )
);
`.trim();

const tmpFile = join(root, '.backfill-country-counts-tmp.sql');
writeFileSync(tmpFile, sql, 'utf8');
try {
  execSync(
    `npx wrangler d1 execute ${DB_NAME} ${REMOTE_FLAG} --file="${tmpFile}" --yes`,
    { cwd: root, stdio: 'inherit' }
  );
  console.log('Done.');
} finally {
  try { unlinkSync(tmpFile); } catch {}
}
