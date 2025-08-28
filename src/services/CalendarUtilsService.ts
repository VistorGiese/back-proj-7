import BookingModel, { BookingStatus } from '@models/BookingModel';
import UserModel from '@models/UserModel';
import BandModel from '@models/BandModel';
import EstablishmentModel from '@models/EstablishmentModel';
import { AuthService } from '@services/AuthService';
import { GoogleCalendarService } from './GoogleCalendarService';
import { BookingSyncService } from './BookingSyncService';
import { GoogleCalendarEvent } from '@interfaces/google-calendar';
import { addDays, getStartOfDay, getEndOfDay, formatDateTimeToPTBR } from '@utils/dateUtils';

export interface SyncStatistics {
  totalBookings: number;
  syncedBookings: number;
  unsyncedBookings: number;
  syncErrors: number;
  lastSyncAt?: Date;
  syncPercentage: number;
}

export interface ConflictCheck {
  hasConflicts: boolean;
  conflicts: Array<{
    bookingId: number;
    conflictWith: string;
    conflictDate: Date;
    conflictType: 'overlap' | 'same_time';
  }>;
}

export class CalendarUtilsService {
  /**
   * Obter estatísticas de sincronização para um usuário
   */
  static async getSyncStatistics(userId: number): Promise<SyncStatistics> {
    try {
      const { Op } = require('sequelize');

      // Buscar todos os agendamentos do usuário (futuros e ativos)
      const allBookings = await this.getUserBookingsCount(userId, {
        status: [BookingStatus.ACEITO, BookingStatus.EM_NEGOCIACAO],
        data_show: { [Op.gte]: new Date() }
      });

      // Buscar agendamentos sincronizados
      const syncedBookings = await this.getUserBookingsCount(userId, {
        google_calendar_synced: true,
        google_calendar_event_id: { [Op.ne]: null },
        status: [BookingStatus.ACEITO, BookingStatus.EM_NEGOCIACAO],
        data_show: { [Op.gte]: new Date() }
      });

      // Buscar agendamentos com erro de sincronização
      const errorBookings = await this.getUserBookingsCount(userId, {
        google_calendar_synced: false,
        google_calendar_event_id: { [Op.ne]: null }, // Tentou sincronizar mas falhou
        status: [BookingStatus.ACEITO, BookingStatus.EM_NEGOCIACAO],
        data_show: { [Op.gte]: new Date() }
      });

      // Buscar última sincronização
      const lastSyncBooking = await this.getLastSyncedBooking(userId);

      const unsyncedBookings = allBookings - syncedBookings;
      const syncPercentage = allBookings > 0 ? Math.round((syncedBookings / allBookings) * 100) : 0;

      return {
        totalBookings: allBookings,
        syncedBookings,
        unsyncedBookings,
        syncErrors: errorBookings,
        lastSyncAt: lastSyncBooking?.last_sync_at,
        syncPercentage
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de sincronização:', error);
      return {
        totalBookings: 0,
        syncedBookings: 0,
        unsyncedBookings: 0,
        syncErrors: 0,
        syncPercentage: 0
      };
    }
  }

  /**
   * Verificar conflitos de horários no Google Calendar
   */
  static async checkScheduleConflicts(userId: number, startDate?: Date, endDate?: Date): Promise<ConflictCheck> {
    try {
      // Definir período de verificação (padrão: próximos 30 dias)
      const checkStart = startDate || new Date();
      const checkEnd = endDate || addDays(new Date(), 30);

      // Buscar eventos do Google Calendar no período
      const calendarResult = await GoogleCalendarService.listEvents(userId, {
        startDate: checkStart,
        endDate: checkEnd,
        maxResults: 100
      });

      if (!calendarResult.success || !calendarResult.events) {
        return { hasConflicts: false, conflicts: [] };
      }

      // Buscar agendamentos do Toca Aqui no mesmo período
      const bookings = await this.getUserBookingsInPeriod(userId, checkStart, checkEnd);

      const conflicts: ConflictCheck['conflicts'] = [];

      // Verificar cada agendamento contra eventos do calendário
      for (const booking of bookings) {
        const bookingStart = new Date(booking.data_show);
        const bookingEnd = new Date(bookingStart.getTime() + (booking.duracao_estimada * 60 * 1000));

        for (const event of calendarResult.events) {
          // Pular se for o próprio evento sincronizado
          if (event.id === booking.google_calendar_event_id) continue;

          const eventStart = new Date(event.start.dateTime);
          const eventEnd = new Date(event.end.dateTime);

          // Verificar sobreposição
          const isOverlapping = this.checkTimeOverlap(
            bookingStart, bookingEnd,
            eventStart, eventEnd
          );

          if (isOverlapping) {
            const conflictType = bookingStart.getTime() === eventStart.getTime() && bookingEnd.getTime() === eventEnd.getTime()
              ? 'same_time' : 'overlap';

            conflicts.push({
              bookingId: booking.id,
              conflictWith: event.summary || 'Evento sem título',
              conflictDate: bookingStart,
              conflictType
            });
          }
        }
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts
      };
    } catch (error) {
      console.error('Erro ao verificar conflitos de agenda:', error);
      return { hasConflicts: false, conflicts: [] };
    }
  }

  /**
   * Sincronização inteligente - sincronizar apenas o que precisa
   */
  static async intelligentSync(userId: number): Promise<{
    success: boolean;
    message: string;
    actions: Array<{
      type: 'create' | 'update' | 'delete';
      bookingId: number;
      success: boolean;
      message: string;
    }>;
  }> {
    try {
      const actions: any[] = [];

      // 1. Sincronizar novos agendamentos (não sincronizados)
      const newBookings = await this.getUnsyncedBookings(userId);
      for (const booking of newBookings) {
        const result = await BookingSyncService.syncBookingToCalendar(booking.id);
        actions.push({
          type: 'create',
          bookingId: booking.id,
          success: result.success,
          message: result.message
        });
      }

      // 2. Atualizar agendamentos modificados
      const modifiedBookings = await this.getModifiedBookings(userId);
      for (const booking of modifiedBookings) {
        const result = await BookingSyncService.syncBookingToCalendar(booking.id);
        actions.push({
          type: 'update',
          bookingId: booking.id,
          success: result.success,
          message: result.message
        });
      }

      // 3. Remover agendamentos cancelados
      const cancelledBookings = await this.getCancelledSyncedBookings(userId);
      for (const booking of cancelledBookings) {
        const result = await BookingSyncService.removeBookingFromCalendar(booking.id);
        actions.push({
          type: 'delete',
          bookingId: booking.id,
          success: result.success,
          message: result.message
        });
      }

      const successActions = actions.filter(a => a.success);
      const failedActions = actions.filter(a => !a.success);

      return {
        success: true,
        message: `Sincronização inteligente concluída: ${successActions.length} sucessos, ${failedActions.length} falhas`,
        actions
      };
    } catch (error: any) {
      console.error('Erro na sincronização inteligente:', error);
      return {
        success: false,
        message: `Erro na sincronização inteligente: ${error.message}`,
        actions: []
      };
    }
  }

  /**
   * Verificar status de saúde da integração Google Calendar
   */
  static async checkIntegrationHealth(userId: number): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
    details: {
      tokenValid: boolean;
      calendarAccess: boolean;
      recentSyncActivity: boolean;
      conflictsCount: number;
    };
  }> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // 1. Verificar validade do token
      const tokenValid = !!(await AuthService.getValidGoogleTokens(userId));
      if (!tokenValid) {
        issues.push('Token Google Calendar inválido ou expirado');
        recommendations.push('Reconecte sua conta Google Calendar');
      }

      // 2. Verificar acesso ao calendário
      const calendarAccess = await GoogleCalendarService.checkCalendarAccess(userId);
      if (!calendarAccess.hasAccess) {
        issues.push('Sem acesso ao Google Calendar');
        recommendations.push('Verifique as permissões da sua conta Google');
      }

      // 3. Verificar atividade de sincronização recente
      const stats = await this.getSyncStatistics(userId);
      const recentSyncActivity = stats.lastSyncAt && 
        (new Date().getTime() - stats.lastSyncAt.getTime()) < (7 * 24 * 60 * 60 * 1000); // 7 dias

      if (!recentSyncActivity) {
        issues.push('Nenhuma atividade de sincronização recente');
        recommendations.push('Execute uma sincronização manual');
      }

      // 4. Verificar conflitos
      const conflicts = await this.checkScheduleConflicts(userId);
      if (conflicts.hasConflicts) {
        issues.push(`${conflicts.conflicts.length} conflito(s) de agenda detectado(s)`);
        recommendations.push('Revise e resolva os conflitos de horário');
      }

      // 5. Verificar estatísticas de sincronização
      if (stats.syncPercentage < 80 && stats.totalBookings > 0) {
        issues.push('Baixa taxa de sincronização de agendamentos');
        recommendations.push('Execute uma sincronização completa');
      }

      const healthy = issues.length === 0;

      return {
        healthy,
        issues,
        recommendations,
        details: {
          tokenValid,
          calendarAccess: calendarAccess.hasAccess,
          recentSyncActivity: !!recentSyncActivity,
          conflictsCount: conflicts.conflicts.length
        }
      };
    } catch (error) {
      console.error('Erro ao verificar saúde da integração:', error);
      return {
        healthy: false,
        issues: ['Erro ao verificar status da integração'],
        recommendations: ['Tente novamente ou contacte o suporte'],
        details: {
          tokenValid: false,
          calendarAccess: false,
          recentSyncActivity: false,
          conflictsCount: 0
        }
      };
    }
  }

  // ==================== MÉTODOS AUXILIARES PRIVADOS ====================

  /**
   * Contar agendamentos do usuário com condições específicas
   */
  private static async getUserBookingsCount(userId: number, conditions: any): Promise<number> {
    const { Op } = require('sequelize');
    
    return await BookingModel.count({
      include: [
        {
          model: BandModel,
          as: 'banda',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        },
        {
          model: EstablishmentModel,
          as: 'estabelecimento',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        }
      ],
      where: {
        ...conditions,
        [Op.or]: [
          { '$banda.usuario.id$': userId },
          { '$estabelecimento.usuario.id$': userId }
        ]
      }
    });
  }

  /**
   * Buscar último agendamento sincronizado
   */
  private static async getLastSyncedBooking(userId: number): Promise<BookingModel | null> {
    const { Op } = require('sequelize');
    
    return await BookingModel.findOne({
      include: [
        {
          model: BandModel,
          as: 'banda',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        },
        {
          model: EstablishmentModel,
          as: 'estabelecimento',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        }
      ],
      where: {
        last_sync_at: { [Op.ne]: null },
        [Op.or]: [
          { '$banda.usuario.id$': userId },
          { '$estabelecimento.usuario.id$': userId }
        ]
      },
      order: [['last_sync_at', 'DESC']]
    });
  }

  /**
   * Buscar agendamentos em um período específico
   */
  private static async getUserBookingsInPeriod(userId: number, startDate: Date, endDate: Date): Promise<BookingModel[]> {
    const { Op } = require('sequelize');
    
    return await BookingModel.findAll({
      include: [
        {
          model: BandModel,
          as: 'banda',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        },
        {
          model: EstablishmentModel,
          as: 'estabelecimento',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        }
      ],
      where: {
        data_show: {
          [Op.between]: [startDate, endDate]
        },
        status: [BookingStatus.ACEITO, BookingStatus.EM_NEGOCIACAO],
        [Op.or]: [
          { '$banda.usuario.id$': userId },
          { '$estabelecimento.usuario.id$': userId }
        ]
      }
    });
  }

  /**
   * Verificar sobreposição entre dois períodos de tempo
   */
  private static checkTimeOverlap(
    start1: Date, end1: Date,
    start2: Date, end2: Date
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Buscar agendamentos não sincronizados
   */
  private static async getUnsyncedBookings(userId: number): Promise<BookingModel[]> {
    const { Op } = require('sequelize');
    
    return await BookingModel.findAll({
      include: [
        {
          model: BandModel,
          as: 'banda',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        },
        {
          model: EstablishmentModel,
          as: 'estabelecimento',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        }
      ],
      where: {
        google_calendar_synced: false,
        google_calendar_event_id: null,
        status: [BookingStatus.ACEITO, BookingStatus.EM_NEGOCIACAO],
        data_show: { [Op.gte]: new Date() },
        [Op.or]: [
          { '$banda.usuario.id$': userId },
          { '$estabelecimento.usuario.id$': userId }
        ]
      }
    });
  }

  /**
   * Buscar agendamentos modificados após última sincronização
   */
  private static async getModifiedBookings(userId: number): Promise<BookingModel[]> {
    const { Op } = require('sequelize');
    
    return await BookingModel.findAll({
      include: [
        {
          model: BandModel,
          as: 'banda',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        },
        {
          model: EstablishmentModel,
          as: 'estabelecimento',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        }
      ],
      where: {
        google_calendar_synced: true,
        google_calendar_event_id: { [Op.ne]: null },
        status: [BookingStatus.ACEITO, BookingStatus.EM_NEGOCIACAO],
        data_show: { [Op.gte]: new Date() },
        [Op.or]: [
          // Modificado após última sincronização
          {
            [Op.and]: [
              { '$banda.usuario.id$': userId },
              { data_atualizacao: { [Op.gt]: require('sequelize').col('last_sync_at') } }
            ]
          },
          {
            [Op.and]: [
              { '$estabelecimento.usuario.id$': userId },
              { data_atualizacao: { [Op.gt]: require('sequelize').col('last_sync_at') } }
            ]
          }
        ]
      }
    });
  }

  /**
   * Buscar agendamentos cancelados que ainda estão sincronizados
   */
  private static async getCancelledSyncedBookings(userId: number): Promise<BookingModel[]> {
    const { Op } = require('sequelize');
    
    return await BookingModel.findAll({
      include: [
        {
          model: BandModel,
          as: 'banda',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        },
        {
          model: EstablishmentModel,
          as: 'estabelecimento',
          include: [{ model: UserModel, as: 'usuario', where: { id: userId } }],
          required: false
        }
      ],
      where: {
        google_calendar_synced: true,
        google_calendar_event_id: { [Op.ne]: null },
        status: [BookingStatus.CANCELADO, BookingStatus.REJEITADO],
        [Op.or]: [
          { '$banda.usuario.id$': userId },
          { '$estabelecimento.usuario.id$': userId }
        ]
      }
    });
  }
}