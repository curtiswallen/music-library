import { readFileSync, writeFileSync, readdirSync, renameSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

// Move dist/client/* up to dist/ so static assets are served from the root URL
function moveDir(src, dest) {
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath  = join(src,  entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      moveDir(srcPath, destPath);
    } else {
      renameSync(srcPath, destPath);
    }
  }
}
moveDir('dist/client', 'dist');
rmSync('dist/client', { recursive: true, force: true });

// Pages Advanced Mode: _worker.js at the dist root is the entry point
writeFileSync('dist/_worker.js', 'export { default } from "./server/entry.mjs";\n');

// Clean dist/server/wrangler.json — keep only bindings + compat settings
const wranglerPath = 'dist/server/wrangler.json';
const cfg = JSON.parse(readFileSync(wranglerPath, 'utf8'));

const REMOVE = [
  'assets', 'images', 'kv_namespaces', 'previews',
  'main', 'rules', 'pages_build_output_dir',
  'configPath', 'userConfigPath', 'topLevelName',
  'definedEnvironments', 'legacy_env',
  'jsx_factory', 'jsx_fragment', 'no_bundle',
  'triggers', 'durable_objects', 'workflows', 'migrations',
  'cloudchamber', 'send_email', 'queues', 'r2_buckets',
  'vectorize', 'ai_search_namespaces', 'ai_search',
  'agent_memory', 'hyperdrive', 'services',
  'analytics_engine_datasets', 'dispatch_namespaces',
  'mtls_certificates', 'pipelines', 'secrets_store_secrets',
  'artifacts', 'unsafe_hello_world', 'flagship',
  'worker_loaders', 'ratelimits', 'vpc_services', 'vpc_networks',
  'logfwdr', 'python_modules', 'dev',
];
for (const key of REMOVE) delete cfg[key];

// Point Pages to dist/ (one level up from dist/server/)
cfg.pages_build_output_dir = '..';

writeFileSync(wranglerPath, JSON.stringify(cfg, null, 2));

console.log('postbuild: moved static files, created _worker.js, cleaned wrangler.json');
