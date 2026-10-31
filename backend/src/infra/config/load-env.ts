import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

export function loadEnv(): void {
  loadDotenv({ path: `${REPO_ROOT}.env`, quiet: true });
}
