export interface FarmerProfile {
  id: string;
  name: string;
  village: string;
  phone: string;
  createdAt: string;
}

export interface SoilReading {
  id: string;
  farmerId: string;
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  organicMatter: number;
  notes: string;
  location: string;
  recordedAt: string;
}

export interface MarketPrice {
  id: string;
  cropType: string;
  pricePerKg: number;
  currency: "IDR";
  location: string;
  qualityGrade: "A" | "B" | "C";
  reportedBy: string;
  reportedAt: string;
}

export interface SubsidyDistribution {
  id: string;
  farmerId: string;
  itemType: "seed" | "fertilizer";
  itemName: string;
  quantity: number;
  unit: string;
  distributorId: string;
  signature: string;
  timestamp: string;
  txHash?: string;
}

export interface SyncStatus {
  mode: "local" | "p2p" | "cloud";
  lastSynced: string;
  pendingChanges: number;
  isOnline: boolean;
}
