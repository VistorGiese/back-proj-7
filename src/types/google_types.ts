// Tipos mínimos necessários apenas para Google Calendar API

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
    }>;
  }
  
  // Tipos para respostas da API
  export interface GoogleAuthResponse {
    success: boolean;
    message: string;
    user?: {
      id: number;
      email: string;
      googleConnected: boolean;
    };
  }
  
  export interface SyncResponse {
    success: boolean;
    message: string;
    eventId?: string;
    syncedAt?: Date;
    error?: string;
  }