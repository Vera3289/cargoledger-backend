import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateDecimal } from '../decimal/validate';
import { shipmentStore } from '../store/shipments';

export const shipmentsRouter = Router();

const STELLAR_ADDRESS = /^G[A-Z0-9]{54}$/;

function validateAddress(value: unknown, field: string): string | null {
  if (typeof value !== 'string' || !STELLAR_ADDRESS.test(value)) {
    return `${field} must be a valid Stellar public key (G...)`;
  }
  return null;
}

// GET /api/shipments — list with optional filters
shipmentsRouter.get('/', (req: Request, res: Response) => {
  const { status, sender, recipient } = req.query;

  const validStatuses = ['pending', 'in_transit', 'delivered', 'cancelled'];
  if (status && !validStatuses.includes(status as string)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: `status must be one of: ${validStatuses.join(', ')}`,
    });
  }
  if (sender && !STELLAR_ADDRESS.test(sender as string)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'sender must be a valid Stellar public key' });
  }
  if (recipient && !STELLAR_ADDRESS.test(recipient as string)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'recipient must be a valid Stellar public key' });
  }

  const shipments = shipmentStore.list({
    status: status as string,
    sender: sender as string,
    recipient: recipient as string,
  });
  return res.json({ shipments });
});

// GET /api/shipments/:id
shipmentsRouter.get('/:id', (req: Request, res: Response) => {
  const shipment = shipmentStore.get(req.params.id);
  if (!shipment) return res.status(404).json({ error: 'NOT_FOUND', message: 'Shipment not found' });
  return res.json(shipment);
});

// POST /api/shipments — create a new freight shipment
shipmentsRouter.post('/', (req: Request, res: Response) => {
  const { sender, recipient, freightAmount, ratePerKg, origin, destination, scheduledAt } = req.body;

  const addrErr = validateAddress(sender, 'sender') ?? validateAddress(recipient, 'recipient');
  if (addrErr) return res.status(400).json({ error: 'VALIDATION_ERROR', message: addrErr });

  const freightResult = validateDecimal(freightAmount, 'freightAmount');
  if (!freightResult.ok) return res.status(400).json({ error: freightResult.code, message: freightResult.message });

  const rateResult = validateDecimal(ratePerKg, 'ratePerKg');
  if (!rateResult.ok) return res.status(400).json({ error: rateResult.code, message: rateResult.message });

  if (typeof origin !== 'string' || !origin.trim()) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'origin must be a non-empty string' });
  }
  if (typeof destination !== 'string' || !destination.trim()) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'destination must be a non-empty string' });
  }
  if (typeof scheduledAt !== 'number') {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'scheduledAt must be a Unix timestamp (number)' });
  }

  const shipment = shipmentStore.create({
    id: `shipment-${uuidv4()}`,
    sender,
    recipient,
    freightAmount,
    ratePerKg,
    origin: origin.trim(),
    destination: destination.trim(),
    scheduledAt,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json(shipment);
});

// DELETE /api/shipments/:id — cancel a shipment
shipmentsRouter.delete('/:id', (req: Request, res: Response) => {
  const shipment = shipmentStore.get(req.params.id);
  if (!shipment) return res.status(404).json({ error: 'NOT_FOUND', message: 'Shipment not found' });
  if (shipment.status !== 'pending') {
    return res.status(409).json({ error: 'CONFLICT', message: `Shipment is already ${shipment.status}` });
  }
  const updated = shipmentStore.cancel(req.params.id);
  return res.json(updated);
});
