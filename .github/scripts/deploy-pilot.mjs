import { execFileSync } from 'node:child_process';
const ns = 'saas-pilot';
const run = (...args) => execFileSync('kubectl', ['-n', ns, ...args], { stdio: 'inherit' });
if (process.argv[2] === 'stop') {
  try {
    run('scale', 'deployment/storefront', '--replicas=0');
  } finally {
    run('delete', 'secret', 'pilot-runtime', '--ignore-not-found');
  }
} else {
  for (const key of ['PILOT_IMAGE', 'HEADLESS_STORE_ID', 'HEADLESS_PUBLISHABLE_KEY', 'HEADLESS_LEASE_ID']) if (!process.env[key]) throw new Error(`Missing ${key}`);
  const metadata = { name: 'storefront', namespace: ns, labels: { app: 'saas-pilot-storefront' } };
  const items = [
    { apiVersion: 'v1', kind: 'Secret', metadata: { name: 'pilot-runtime', namespace: ns }, type: 'Opaque', stringData: { HEADLESS_STORE_ID: process.env.HEADLESS_STORE_ID, HEADLESS_PUBLISHABLE_KEY: process.env.HEADLESS_PUBLISHABLE_KEY, HEADLESS_ACCEPTANCE_LEASE_ID: process.env.HEADLESS_LEASE_ID, HEADLESS_API_URL: 'https://api.1ecomm.com' } },
    { apiVersion: 'apps/v1', kind: 'Deployment', metadata, spec: { replicas: 1, selector: { matchLabels: metadata.labels }, template: { metadata: { labels: metadata.labels, annotations: { '1ecomm.com/source-commit': process.env.GITHUB_SHA } }, spec: { containers: [{ name: 'storefront', image: process.env.PILOT_IMAGE, ports: [{ containerPort: 3000 }], envFrom: [{ secretRef: { name: 'pilot-runtime' } }], resources: { requests: { cpu: '100m', memory: '256Mi' }, limits: { cpu: '1', memory: '768Mi' } }, readinessProbe: { httpGet: { path: '/api/health', port: 3000 }, initialDelaySeconds: 5, periodSeconds: 5 } }] } } } },
    { apiVersion: 'v1', kind: 'Service', metadata, spec: { selector: metadata.labels, ports: [{ port: 80, targetPort: 3000 }] } },
  ];
  execFileSync('kubectl', ['-n', ns, 'apply', '-f', '-'], { input: JSON.stringify({ apiVersion: 'v1', kind: 'List', items }), stdio: ['pipe', 'inherit', 'inherit'] });
  run('rollout', 'status', 'deployment/storefront', '--timeout=180s');
}
