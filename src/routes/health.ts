import { Router, Request, Response } from 'express';
import { indexerState } from '../indexer/state';

export const healthRouter = Router();

healthRouter.get('/', (req: Request, res: Response) => {
  const app = req.app as Express.Application & { hub?: { connectionCount: number } };
  const indexer = indexerState.snapshot();

  const degraded = indexer.status === 'stalled' || indexer.status === 'starting';

  res.status(200).json({
    status: degraded ? 'degraded' : 'ok',
    service: 'cargoledger-backend',
    timestamp: new Date().toISOString(),
    indexer,
    wsConnections: app.hub?.connectionCount ?? 0,
  });
});
