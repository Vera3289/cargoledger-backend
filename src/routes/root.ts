import { Router } from 'express';

export const rootRouter = Router();

rootRouter.get('/', (_req, res) => {
  res.json({
    service: 'cargoledger-backend',
    version: '1.0.0',
    description: 'Decentralized logistics and freight management API on the Stellar network',
    docs: 'https://github.com/CodeGirlsInc/CargoLedger#readme',
  });
});
