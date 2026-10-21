import { createApp } from './app';
import { loadConfig } from './infra/config/config';
import { buildContainer } from './infra/config/container';
import { loadEnv } from './infra/config/load-env';

loadEnv();
const config = loadConfig();
const container = await buildContainer(config);
const { app } = createApp(container.deps);

const server = app.listen(config.PORT, () => {
  console.log(
    `Merch backend on http://localhost:${config.PORT} (persistence=${config.PERSISTENCE}, storage=${config.STORAGE_DRIVER})`,
  );
});

const shutdown = (): void => {
  server.close(() => {
    container.close().finally(() => process.exit(0));
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
