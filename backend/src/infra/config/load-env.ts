import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';

/** Корінь монорепо (backend/src/infra/config -> 4 рівні вгору). */
export const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** Підхоплює .env з кореня репозиторію (npm -w backend запускає скрипти з папки backend/). */
export function loadEnv(): void {
  loadDotenv({ path: `${REPO_ROOT}.env`, quiet: true });
}
