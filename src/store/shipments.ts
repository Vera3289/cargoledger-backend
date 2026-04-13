export interface Shipment {
  id: string;
  sender: string;
  recipient: string;
  freightAmount: string;  // decimal string — total freight value
  ratePerKg: string;      // decimal string — rate per kilogram
  origin: string;
  destination: string;
  scheduledAt: number;    // Unix timestamp
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  createdAt: string;
  cancelledAt?: string;
  deliveredAt?: string;
}

interface ListFilters {
  status?: string;
  sender?: string;
  recipient?: string;
}

class ShipmentStore {
  private shipments = new Map<string, Shipment>();

  create(shipment: Shipment): Shipment {
    this.shipments.set(shipment.id, shipment);
    return shipment;
  }

  get(id: string): Shipment | undefined {
    return this.shipments.get(id);
  }

  list(filters: ListFilters = {}): Shipment[] {
    return Array.from(this.shipments.values()).filter(s => {
      if (filters.status && s.status !== filters.status) return false;
      if (filters.sender && s.sender !== filters.sender) return false;
      if (filters.recipient && s.recipient !== filters.recipient) return false;
      return true;
    });
  }

  cancel(id: string): Shipment | undefined {
    const shipment = this.shipments.get(id);
    if (!shipment) return undefined;
    const updated: Shipment = { ...shipment, status: 'cancelled', cancelledAt: new Date().toISOString() };
    this.shipments.set(id, updated);
    return updated;
  }

  clear() {
    this.shipments.clear();
  }
}

export const shipmentStore = new ShipmentStore();
