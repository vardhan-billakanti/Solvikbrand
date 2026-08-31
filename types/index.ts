// Types for SolvikBrand application

export interface Owner {
  id: string;
  username: string;
  createdAt: Date;
}

export interface Investigation {
  id: string;
  publicToken: string;
  publicUrl?: string;
  name: string;
  description?: string | null;
  destinationUrl?: string | null;
  enabled: boolean;
  createdAt: Date;
  ownerId: string;
  _count?: {
    visits: number;
  };
  visits?: Visit[];
  latestVisit?: Date | null;
}

export interface Visit {
  id: string;
  investigationId: string;
  visitedAt: Date;
  consentGiven: boolean;
  locationPermission: string;
  batteryPermission: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  locationTimestamp?: Date | null;
  userAgent?: string | null;
  browser?: string | null;
  browserVersion?: string | null;
  os?: string | null;
  osVersion?: string | null;
  screenWidth?: number | null;
  screenHeight?: number | null;
  pixelRatio?: number | null;
  language?: string | null;
  timezone?: string | null;
  platform?: string | null;
  deviceType?: string | null;
  batteryLevel?: number | null;
  batteryCharging?: boolean | null;
  ipHash?: string | null;
}

export interface VisitSubmission {
  token: string;
  consentGiven: boolean;
  locationPermission: string;
  batteryPermission: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationTimestamp?: number;
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  screenWidth?: number;
  screenHeight?: number;
  pixelRatio?: number;
  language?: string;
  timezone?: string;
  platform?: string;
  deviceType?: string;
  batteryLevel?: number;
  batteryCharging?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  totalInvestigations: number;
  activeInvestigations: number;
  totalVisits: number;
  visitsToday: number;
}

export type PermissionStatus = 'granted' | 'denied' | 'pending' | 'unsupported';
