import { readFileSync, writeFileSync } from 'fs';

// Pages Advanced Mode: _worker.js at the dist root is the entry point.
// It re-exports the Astro adapter's generated module worker.
writeFileSync(
  'dist/_worker.js',
  'export { default } from "./server/entry.mjs";\n'
);

// Strip fields from the generated dist/server/wrangler.json that conflict
// with a Pages deployment (wrangler reads this file and merges with root config).
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

writeFileSync(wranglerPath, JSON.stringify(cfg, null, 2));

console.log('postbuild: created dist/_worker.js and cleaned dist/server/wrangler.json');
