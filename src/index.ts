import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import http from 'http';
import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { rootRouter } from './routes/root';
import { healthRouter } from './routes/health';
import { shipmentsRouter } from './routes/shipments';
import { StreamHub } from './ws/hub';
import { indexerState } from './indexer/state';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestId);
  app.use(requestLogger);

  app.use('/', rootRouter);
  app.use('/health', healthRouter);
  app.use('/api/shipments', shipmentsRouter);

  app.use(errorHandler);

  return app;
}

export function createServer() {
  const app = createApp();
  const server = http.createServer(app);
  const hub = new StreamHub(server);

  (app as unknown as { hub: StreamHub }).hub = hub;

  return { server, hub };
}

if (require.main === module) {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const { server, hub } = createServer();

  server.listen(port, () => {
    console.log(JSON.stringify({ level: 'info', msg: 'CargoLedger backend started', port }));
  });

  const shutdown = () => {
    console.log(JSON.stringify({ level: 'info', msg: 'Shutting down' }));
    hub.close();
    indexerState.stop();
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
