import { calendar, oauth2Client } from '@config/google';
import { AuthService } from '@services/AuthService';
import { GoogleCalendarEvent, SyncResponse, BookingToGoogleEvent } from '@interfaces/google-calendar';
import { toGoogleCalendarFormat, BRAZIL_TIMEZONE } from '@utils/dateUtils';

export class GoogleCalendarService {
  /**
   * Configurar cliente OAuth2 com tokens do usuário
   */
  private static async setupUserAuth(userId: number): Promise<boolean> {
    try {
      const tokens = await AuthService.getValidGoogleTokens(userId);
      if (!tokens) {
        return false;
      }

      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      });

      return true;
    } catch (error) {
      console.error('Erro ao configurar autenticação do usuário:', error);
      return false;
    }
  }

  /**
   * Criar evento no Google Calendar
   */
  static async createEvent(userId: number, eventData: GoogleCalendarEvent): Promise<SyncResponse> {
    try {
      // Configurar autenticação do usuário
      const authSetup = await this.setupUserAuth(userId);
      if (!authSetup) {
        return {
          success: false,
          message: 'Usuário não possui Google Calendar conectado ou token inválido'
        };
      }

      // Criar evento no Google Calendar
      const response = await calendar.events.insert({
        calendarId: 'primary', // Calendário principal do usuário
        requestBody: {
          summary: eventData.summary,
          description: eventData.description,
          location: eventData.location,
          start: {
            dateTime: eventData.start.dateTime,
            timeZone: eventData.start.timeZone || BRAZIL_TIMEZONE
          },
          end: {
            dateTime: eventData.end.dateTime,
            timeZone: eventData.end.timeZone || BRAZIL_TIMEZONE
          },
          attendees: eventData.attendees,
          reminders: eventData.reminders || {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 60 }, // 1 hora antes
              { method: 'popup', minutes: 15 }  // 15 minutos antes
            ]
          },
          colorId: eventData.colorId || '9', // Azul para shows
          status: eventData.status || 'confirmed'
        }
      });

      if (!response.data.id) {
        throw new Error('ID do evento não retornado pelo Google Calendar');
      }

      return {
        success: true,
        message: 'Evento criado com sucesso no Google Calendar',
        eventId: response.data.id,
        syncedAt: new Date()
      };
    } catch (error: any) {
      console.error('Erro ao criar evento no Google Calendar:', error);
      return {
        success: false,
        message: `Erro ao criar evento: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Atualizar evento no Google Calendar
   */
  static async updateEvent(
    userId: number, 
    eventId: string, 
    eventData: Partial<GoogleCalendarEvent>
  ): Promise<SyncResponse> {
    try {
      // Configurar autenticação do usuário
      const authSetup = await this.setupUserAuth(userId);
      if (!authSetup) {
        return {
          success: false,
          message: 'Usuário não possui Google Calendar conectado ou token inválido'
        };
      }

      // Buscar evento existente primeiro
      const existingEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      if (!existingEvent.data) {
        return {
          success: false,
          message: 'Evento não encontrado no Google Calendar'
        };
      }

      // Preparar dados para atualização (mesclar com dados existentes)
      const updateData: any = {
        summary: eventData.summary || existingEvent.data.summary,
        description: eventData.description || existingEvent.data.description,
        location: eventData.location || existingEvent.data.location,
        status: eventData.status || existingEvent.data.status
      };

      // Atualizar horários se fornecidos
      if (eventData.start) {
        updateData.start = {
          dateTime: eventData.start.dateTime,
          timeZone: eventData.start.timeZone || BRAZIL_TIMEZONE
        };
      }

      if (eventData.end) {
        updateData.end = {
          dateTime: eventData.end.dateTime,
          timeZone: eventData.end.timeZone || BRAZIL_TIMEZONE
        };
      }

      // Atualizar participantes se fornecidos
      if (eventData.attendees) {
        updateData.attendees = eventData.attendees;
      }

      // Atualizar evento
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: updateData
      });

      return {
        success: true,
        message: 'Evento atualizado com sucesso no Google Calendar',
        eventId: response.data.id!,
        syncedAt: new Date()
      };
    } catch (error: any) {
      console.error('Erro ao atualizar evento no Google Calendar:', error);
      return {
        success: false,
        message: `Erro ao atualizar evento: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Deletar evento do Google Calendar
   */
  static async deleteEvent(userId: number, eventId: string): Promise<SyncResponse> {
    try {
      // Configurar autenticação do usuário
      const authSetup = await this.setupUserAuth(userId);
      if (!authSetup) {
        return {
          success: false,
          message: 'Usuário não possui Google Calendar conectado ou token inválido'
        };
      }

      // Deletar evento
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      return {
        success: true,
        message: 'Evento removido com sucesso do Google Calendar',
        syncedAt: new Date()
      };
    } catch (error: any) {
      console.error('Erro ao deletar evento do Google Calendar:', error);
      return {
        success: false,
        message: `Erro ao remover evento: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Buscar evento do Google Calendar
   */
  static async getEvent(userId: number, eventId: string): Promise<{
    success: boolean;
    event?: GoogleCalendarEvent;
    message: string;
  }> {
    try {
      // Configurar autenticação do usuário
      const authSetup = await this.setupUserAuth(userId);
      if (!authSetup) {
        return {
          success: false,
          message: 'Usuário não possui Google Calendar conectado ou token inválido'
        };
      }

      // Buscar evento
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      if (!response.data) {
        return {
          success: false,
          message: 'Evento não encontrado'
        };
      }

      // Converter para formato interno
      const event: GoogleCalendarEvent = {
        id: response.data.id!,
        summary: response.data.summary || '',
        description: response.data.description || '',
        location: response.data.location || '',
        start: {
          dateTime: response.data.start?.dateTime || '',
          timeZone: response.data.start?.timeZone || BRAZIL_TIMEZONE
        },
        end: {
          dateTime: response.data.end?.dateTime || '',
          timeZone: response.data.end?.timeZone || BRAZIL_TIMEZONE
        },
        attendees: response.data.attendees?.map(attendee => ({
          email: attendee.email || '',
          displayName: attendee.displayName || '',
          responseStatus: attendee.responseStatus as any
        })),
        status: response.data.status as any,
        colorId: response.data.colorId
      };

      return {
        success: true,
        event,
        message: 'Evento encontrado'
      };
    } catch (error: any) {
      console.error('Erro ao buscar evento do Google Calendar:', error);
      return {
        success: false,
        message: `Erro ao buscar evento: ${error.message}`
      };
    }
  }

  /**
   * Listar eventos do Google Calendar (por período)
   */
  static async listEvents(
    userId: number, 
    options: {
      startDate?: Date;
      endDate?: Date;
      maxResults?: number;
    } = {}
  ): Promise<{
    success: boolean;
    events?: GoogleCalendarEvent[];
    message: string;
  }> {
    try {
      // Configurar autenticação do usuário
      const authSetup = await this.setupUserAuth(userId);
      if (!authSetup) {
        return {
          success: false,
          message: 'Usuário não possui Google Calendar conectado ou token inválido'
        };
      }

      // Preparar parâmetros da consulta
      const queryParams: any = {
        calendarId: 'primary',
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: options.maxResults || 50
      };

      if (options.startDate) {
        queryParams.timeMin = options.startDate.toISOString();
      }

      if (options.endDate) {
        queryParams.timeMax = options.endDate.toISOString();
      }

      // Buscar eventos
      const response = await calendar.events.list(queryParams);

      const events: GoogleCalendarEvent[] = response.data.items?.map(item => ({
        id: item.id!,
        summary: item.summary || '',
        description: item.description || '',
        location: item.location || '',
        start: {
          dateTime: item.start?.dateTime || '',
          timeZone: item.start?.timeZone || BRAZIL_TIMEZONE
        },
        end: {
          dateTime: item.end?.dateTime || '',
          timeZone: item.end?.timeZone || BRAZIL_TIMEZONE
        },
        attendees: item.attendees?.map(attendee => ({
          email: attendee.email || '',
          displayName: attendee.displayName || '',
          responseStatus: attendee.responseStatus as any
        })),
        status: item.status as any,
        colorId: item.colorId
      })) || [];

      return {
        success: true,
        events,
        message: `${events.length} eventos encontrados`
      };
    } catch (error: any) {
      console.error('Erro ao listar eventos do Google Calendar:', error);
      return {
        success: false,
        message: `Erro ao listar eventos: ${error.message}`
      };
    }
  }

  /**
   * Verificar se usuário tem permissão para acessar Google Calendar
   */
  static async checkCalendarAccess(userId: number): Promise<{
    hasAccess: boolean;
    calendarInfo?: {
      id: string;
      summary: string;
      timeZone: string;
    };
    message: string;
  }> {
    try {
      // Configurar autenticação do usuário
      const authSetup = await this.setupUserAuth(userId);
      if (!authSetup) {
        return {
          hasAccess: false,
          message: 'Usuário não possui Google Calendar conectado ou token inválido'
        };
      }

      // Buscar informações do calendário principal
      const response = await calendar.calendars.get({
        calendarId: 'primary'
      });

      if (!response.data) {
        return {
          hasAccess: false,
          message: 'Não foi possível acessar o calendário do usuário'
        };
      }

      return {
        hasAccess: true,
        calendarInfo: {
          id: response.data.id!,
          summary: response.data.summary || 'Calendário Principal',
          timeZone: response.data.timeZone || BRAZIL_TIMEZONE
        },
        message: 'Acesso ao Google Calendar confirmado'
      };
    } catch (error: any) {
      console.error('Erro ao verificar acesso ao Google Calendar:', error);
      return {
        hasAccess: false,
        message: `Erro ao verificar acesso: ${error.message}`
      };
    }
  }
}