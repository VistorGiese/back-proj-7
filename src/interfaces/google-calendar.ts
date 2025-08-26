// Interfaces para integração Google Calendar

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  colorId?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface GoogleAuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    email: string;
    googleConnected: boolean;
  };
  token?: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  eventId?: string;
  syncedAt?: Date;
  error?: string;
}

// Enum para status de sincronização
export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  ERROR = 'error',
  DISABLED = 'disabled'
}

// Interface para dados do agendamento convertidos para Google Calendar
export interface BookingToGoogleEvent {
  summary: string;
  description: string;
  location?: string;
  start: Date;
  end: Date;
  attendees: string[]; // emails
}

// Interface para status de sincronização de agendamento
export interface BookingSyncStatus {
  bookingId: number;
  googleEventId?: string;
  synced: boolean;
  lastSyncAt?: Date;
  syncError?: string;
}