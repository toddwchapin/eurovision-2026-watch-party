import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
// Never infer the project from .firebaserc (which points at production).
const scratch = path.join(homedir(), '.hermes/cache/scratch'); mkdirSync(scratch, { recursive: true });
const env = { ...process.env, TMPDIR: scratch, GCLOUD_PROJECT: 'demo-eurovision' };
if (existsSync('/opt/homebrew/opt/openjdk@21/bin/java')) env.PATH = '/opt/homebrew/opt/openjdk@21/bin:' + env.PATH;
const result = spawnSync('npx', ['firebase', 'emulators:exec', '--project', 'demo-eurovision', '--config', 'firebase.test.json', '--only', 'auth,database', 'npm run test:gates'], { stdio: 'inherit', env });
process.exit(result.status ?? 1);
