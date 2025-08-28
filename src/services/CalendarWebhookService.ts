import BookingModel, { BookingStatus } from '@models/BookingModel';
import BandModel from '@models/BandModel';
import EstablishmentModel from '@models/EstablishmentModel';
import UserModel from '@models/UserModel';
import AddressModel from '@models/AddressModel';
import { GoogleCalendarService } from './GoogleCalendarService';
import { AuthService } from '@services/AuthService';
import { GoogleCalendarEvent, SyncResponse, BookingToGoogleEvent } from '@interfaces/google-calendar';
import { addMinutes, formatDateTimeToPTBR, BRAZIL_TIMEZONE } from '@utils/dateUtils';

export class BookingSyncService {
  /**
   * Sincronizar agendamento com Google Calendar
   */
  static async syncBookingToCalendar(bookingId: number): Promise<SyncResponse> {
    try {
      // Buscar agendamento com relacionamentos
      const booking = await this.getBookingWithDetails(bookingId);
      if (!booking) {
        return {
          success: false,
          message: 'Agendamento não encontrado'
        };
      }

      // Verificar se agendamento está em status válido para sincronização
      if (!this.canSyncBooking(booking)) {
        return {
          success: false,
          message: `Agendamento não pode ser sincronizado. Status atual: ${booking.status}`
        };
      }

      // Determinar usuários para sincronizar (banda e estabelecimento)
      const syncUsers = await this.getUsersToSync(booking);
      if (syncUsers.length === 0) {
        return {
          success: false,
          message: 'Nenhum usuário possui Google Calendar conectado'
        };
      }

      // Converter agendamento para formato Google Calendar
      const eventData = await this.convertBookingToEvent(booking);

      let syncResults: SyncResponse[] = [];

      // Sincronizar com cada usuário
      for (const userId of syncUsers) {
        let result: SyncResponse;

        if (booking.google_calendar_event_id) {
          // Atualizar evento existente
          result = await GoogleCalendarService.updateEvent(userId, booking.google_calendar_event_id, eventData);
        } else {
          // Criar novo evento
          result = await GoogleCalendarService.createEvent(userId, eventData);
          
          // Salvar ID do evento no primeiro usuário sincronizado com sucesso
          if (result.success && result.eventId && !booking.google_calendar_event_id) {
            await this.updateBookingSyncData(bookingId, result.eventId, true);
          }
        }

        syncResults.push(result);
      }

      // Verificar resultados da sincronização
      const successfulSyncs = syncResults.filter(r => r.success);
      const failedSyncs = syncResults.filter(r => !r.success);

      if (successfulSyncs.length > 0) {
        // Atualizar status de sincronização
        await this.updateBookingSyncData(
          bookingId, 
          successfulSyncs[0].eventId || booking.google_calendar_event_id, 
          true
        );

        return {
          success: true,
          message: `Sincronizado com sucesso em ${successfulSyncs.length} calendário(s)`,
          eventId: successfulSyncs[0].eventId || booking.google_calendar_event_id,
          syncedAt: new Date()
        };
      } else {
        return {
          success: false,
          message: `Falha na sincronização: ${failedSyncs[0]?.message}`,
          error: failedSyncs[0]?.error
        };
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar agendamento:', error);
      return {
        success: false,
        message: `Erro na sincronização: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Remover agendamento do Google Calendar
   */
  static async removeBookingFromCalendar(bookingId: number): Promise<SyncResponse> {
    try {
      // Buscar agendamento
      const booking = await BookingModel.findByPk(bookingId, {
        include: [
          { model: BandModel, as: 'banda', include: [{ model: UserModel, as: 'usuario' }] },
          { model: EstablishmentModel, as: 'estabelecimento', include: [{ model: UserModel, as: 'usuario' }] }
        ]
      });

      if (!booking) {
        return {
          success: false,
          message: 'Agendamento não encontrado'
        };
      }

      if (!booking.google_calendar_event_id) {
        return {
          success: false,
          message: 'Agendamento não está sincronizado com Google Calendar'
        };
      }

      // Determinar usuários para remover o evento
      const syncUsers = await this.getUsersToSync(booking);
      
      let removeResults: SyncResponse[] = [];

      // Remover evento de cada calendário
      for (const userId of syncUsers) {
        const result = await GoogleCalendarService.deleteEvent(userId, booking.google_calendar_event_id);
        removeResults.push(result);
      }

      // Atualizar status de sincronização no banco
      await this.updateBookingSyncData(bookingId, null, false);

      const successfulRemoves = removeResults.filter(r => r.success);

      return {
        success: successfulRemoves.length > 0,
        message: successfulRemoves.length > 0 
          ? `Removido de ${successfulRemoves.length} calendário(s)`
          : 'Falha ao remover de todos os calendários',
        syncedAt: new Date()
      };
    } catch (error: any) {
      console.error('Erro ao remover agendamento do calendário:', error);
      return {
        success: false,
        message: `Erro ao remover: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Sincronizar todos os agendamentos aceitos de um usuário
   */
  static async syncAllUserBookings(userId: number): Promise<{
    success: boolean;
    message: string;
    results: {
      total: number;
      synchronized: number;
      failed: number;
      details: Array<{ bookingId: number; success: boolean; message: string }>;
    };
  }> {
    try {
      // Verificar se usuário tem Google Calendar conectado
      const hasCalendar = await AuthService.hasGoogleCalendarConnected(userId);
      if (!hasCalendar) {
        return {
          success: false,
          message: 'Usuário não possui Google Calendar conectado',
          results: { total: 0, synchronized: 0, failed: 0, details: [] }
        };
      }

      // Buscar agendamentos do usuário (banda ou estabelecimento)
      const bookings = await this.getUserBookings(userId);

      let results = {
        total: bookings.length,
        synchronized: 0,
        failed: 0,
        details: [] as Array<{ bookingId: number; success: boolean; message: string }>
      };

      // Sincronizar cada agendamento
      for (const booking of bookings) {
        const syncResult = await this.syncBookingToCalendar(booking.id);
        
        if (syncResult.success) {
          results.synchronized++;
        } else {
          results.failed++;
        }

        results.details.push({
          bookingId: booking.id,
          success: syncResult.success,
          message: syncResult.message
        });
      }

      return {
        success: true,
        message: `Sincronização concluída: ${results.synchronized} sucessos, ${results.failed} falhas`,
        results
      };
    } catch (error: any) {
      console.error('Erro ao sincronizar todos os agendamentos:', error);
      return {
        success: false,
        message: `Erro na sincronização em massa: ${error.message}`,
        results: { total: 0, synchronized: 0, failed: 0, details: [] }
      };
    }
  }

  /**
   * Buscar agendamento com todos os detalhes necessários
   */
  private static async getBookingWithDetails(bookingId: number): Promise<any> {
    return await BookingModel.findByPk(bookingId, {
      include: [
        {
          model: BandModel,
          as: 'banda',
          include: [{ model: UserModel, as: 'usuario' }]
        },
        {
          model: EstablishmentModel,
          as: 'estabelecimento',
          include: [
            { model: UserModel, as: 'usuario' },
            { model: AddressModel, as: 'endereco' }
          ]
        }
      ]
    });
  }

  /**
   * Verificar se agendamento pode ser sincronizado
   */
  private static canSyncBooking(booking: any): boolean {
    return [BookingStatus.ACEITO, BookingStatus.EM_NEGOCIACAO].includes(booking.status);
  }

  /**
   * Obter IDs dos usuários que devem ter o evento sincronizado
   */
  private static async getUsersToSync(booking: any): Promise<number[]> {
    const userIds: number[] = [];

    // Verificar se a banda tem Google Calendar conectado
    if (booking.banda?.usuario?.id) {
      const bandHasCalendar = await AuthService.hasGoogleCalendarConnected(booking.banda.usuario.id);
      if (bandHasCalendar) {
        userIds.push(booking.banda.usuario.id);
      }
    }

    // Verificar se o estabelecimento tem Google Calendar conectado
    if (booking.estabelecimento?.usuario?.id) {
      const establishmentHasCalendar = await AuthService.hasGoogleCalendarConnected(booking.estabelecimento.usuario.id);
      if (establishmentHasCalendar) {
        userIds.push(booking.estabelecimento.usuario.id);
      }
    }

    return userIds;
  }

  /**
   * Converter agendamento para formato Google Calendar
   */
  private static async convertBookingToEvent(booking: any): Promise<GoogleCalendarEvent> {
    // Calcular data de fim baseada na duração
    const startDate = new Date(booking.data_show);
    const endDate = addMinutes(startDate, booking.duracao_estimada);

    // Preparar título do evento
    const bandName = booking.banda?.usuario?.nome || 'Banda';
    const establishmentName = booking.estabelecimento?.usuario?.nome || 'Estabelecimento';
    const eventTitle = booking.titulo_evento || `Show: ${bandName} - ${establishmentName}`;

    // Preparar descrição
    let description = `🎵 AGENDAMENTO TOCA AQUI\n\n`;
    description += `📅 Data: ${formatDateTimeToPTBR(startDate)}\n`;
    description += `⏰ Duração: ${booking.duracao_estimada} minutos\n`;
    description += `🎤 Banda: ${bandName}\n`;
    description += `🏢 Estabelecimento: ${establishmentName}\n`;
    
    if (booking.valor_final) {
      description += `💰 Valor: R$ ${Number(booking.valor_final).toFixed(2)}\n`;
    }
    
    if (booking.descricao_evento) {
      description += `\n📝 Descrição: ${booking.descricao_evento}\n`;
    }

    // Informações técnicas
    const techInfo = [];
    if (booking.precisa_som) techInfo.push('🔊 Som necessário');
    if (booking.precisa_iluminacao) techInfo.push('💡 Iluminação necessária');
    if (booking.instrumentos_necessarios) techInfo.push(`🎸 Instrumentos: ${booking.instrumentos_necessarios}`);
    
    if (techInfo.length > 0) {
      description += `\n🔧 Necessidades Técnicas:\n${techInfo.join('\n')}\n`;
    }

    if (booking.observacoes_solicitante) {
      description += `\n💬 Observações: ${booking.observacoes_solicitante}\n`;
    }

    description += `\n🆔 ID do Agendamento: ${booking.id}`;

    // Preparar localização
    let location = '';
    if (booking.estabelecimento?.endereco) {
      const endereco = booking.estabelecimento.endereco;
      location = `${endereco.logradouro}`;
      if (endereco.numero) location += `, ${endereco.numero}`;
      if (endereco.complemento) location += `, ${endereco.complemento}`;
      location += ` - ${endereco.bairro}, ${endereco.cidade}/${endereco.estado}`;
      if (endereco.cep) location += ` - CEP: ${endereco.cep}`;
    }

    // Preparar participantes
    const attendees = [];
    if (booking.banda?.usuario?.email) {
      attendees.push({
        email: booking.banda.usuario.email,
        displayName: `${bandName} (Banda)`,
        responseStatus: 'accepted' as const
      });
    }
    if (booking.estabelecimento?.usuario?.email) {
      attendees.push({
        email: booking.estabelecimento.usuario.email,
        displayName: `${establishmentName} (Estabelecimento)`,
        responseStatus: 'accepted' as const
      });
    }

    return {
      summary: eventTitle,
      description: description,
      location: location,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: BRAZIL_TIMEZONE
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: BRAZIL_TIMEZONE
      },
      attendees: attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 }, // 1 dia antes
          { method: 'popup', minutes: 60 },   // 1 hora antes
          { method: 'popup', minutes: 15 }    // 15 minutos antes
        ]
      },
      colorId: '9', // Azul para eventos de show
      status: 'confirmed'
    };
  }

  /**
   * Atualizar dados de sincronização do agendamento
   */
  private static async updateBookingSyncData(
    bookingId: number, 
    googleEventId: string | null, 
    synced: boolean
  ): Promise<void> {
    await BookingModel.update({
      google_calendar_event_id: googleEventId,
      google_calendar_synced: synced,
      last_sync_at: new Date()
    }, {
      where: { id: bookingId }
    });
  }

  /**
   * Buscar agendamentos de um usuário (banda ou estabelecimento)
   */
  private static async getUserBookings(userId: number): Promise<BookingModel[]> {
    // Buscar tanto agendamentos onde o usuário é banda quanto estabelecimento
    const userBookings = await BookingModel.findAll({
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
        status: [BookingStatus.ACEITO, BookingStatus.EM_NEGOCIACAO],
        data_show: {
          [require('sequelize').Op.gte]: new Date() // Apenas eventos futuros
        }
      }
    });

    // Filtrar apenas os agendamentos onde o usuário está realmente envolvido
    return userBookings.filter(booking => 
      (booking as any).banda?.usuario?.id === userId || 
      (booking as any).estabelecimento?.usuario?.id === userId
    );
  }
}