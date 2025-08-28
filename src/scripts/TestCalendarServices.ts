import dotenv from 'dotenv';
import { calendar, setCredentials, getAuthUrl } from '@config/google';
import UserModel from '@models/UserModel';
import BookingModel from '@models/BookingModel';

dotenv.config();

/**
 * Script para testar serviços do Google Calendar
 * Execute com: npm run test:calendar
 */

// Tipos definidos localmente (sem importações externas)
interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

interface SyncResponse {
  success: boolean;
  message: string;
  eventId?: string;
  syncedAt?: Date;
  error?: string;
}

/**
 * Testa autenticação básica do Google Calendar
 */
async function testGoogleAuth(): Promise<boolean> {
  console.log('🧪 Testando autenticação do Google Calendar...\n');
  
  try {
    const authUrl = getAuthUrl();
    console.log('✅ URL de autorização gerada com sucesso');
    console.log('🔗 URL:', authUrl);
    return true;
  } catch (error) {
    console.error('❌ Erro ao gerar URL de autorização:', error);
    return false;
  }
}

/**
 * Testa criação de evento no Google Calendar
 */
async function testCreateCalendarEvent(userId: number, bookingId: number): Promise<boolean> {
  console.log(`\n🧪 Testando criação de evento (User: ${userId}, Booking: ${bookingId})...\n`);
  
  try {
    // Buscar usuário e agendamento
    const user = await UserModel.findByPk(userId);
    const booking = await BookingModel.findByPk(bookingId);
    
    if (!user) {
      console.error('❌ Usuário não encontrado');
      return false;
    }
    
    if (!booking) {
      console.error('❌ Agendamento não encontrado');
      return false;
    }
    
    // Verificar se usuário tem tokens Google
    if (!user.google_token_acesso) {
      console.error('❌ Usuário não possui tokens do Google Calendar');
      console.log('💡 Execute a autenticação Google primeiro');
      return false;
    }
    
    // Configurar credenciais
    const tokens: GoogleTokens = {
      access_token: user.google_token_acesso,
      refresh_token: user.google_token_atualizado || undefined,
      expiry_date: user.google_token_expira_em?.getTime()
    };
    
    setCredentials(tokens);
    
    // Criar evento de teste
    const eventData = {
      summary: booking.titulo_evento || `Show - ${booking.id}`,
      description: booking.descricao_evento || 'Evento criado via teste',
      start: {
        dateTime: booking.data_show.toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: new Date(booking.data_show.getTime() + (booking.duracao_estimada * 60000)).toISOString(),
        timeZone: 'America/Sao_Paulo'
      }
    };
    
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventData
    });
    
    console.log('✅ Evento criado com sucesso!');
    console.log('📅 ID do evento:', event.data.id);
    console.log('🔗 Link:', event.data.htmlLink);
    
    // Atualizar agendamento com ID do evento
    await booking.update({
      id_evento_google: event.data.id,
      calendario_sincronizado: true,
      ultima_sincronizacao: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar evento:', error);
    return false;
  }
}

/**
 * Testa sincronização de agendamento
 */
async function testSyncBooking(userId: number, bookingId: number): Promise<SyncResponse> {
  console.log(`\n🧪 Testando sincronização (User: ${userId}, Booking: ${bookingId})...\n`);
  
  try {
    const user = await UserModel.findByPk(userId);
    const booking = await BookingModel.findByPk(bookingId);
    
    if (!user || !booking) {
      return {
        success: false,
        message: 'Usuário ou agendamento não encontrado',
        error: 'NOT_FOUND'
      };
    }
    
    if (!booking.id_evento_google) {
      return {
        success: false,
        message: 'Agendamento não possui evento no Google Calendar',
        error: 'NO_GOOGLE_EVENT'
      };
    }
    
    // Configurar credenciais
    if (user.google_token_acesso) {
      const tokens: GoogleTokens = {
        access_token: user.google_token_acesso,
        refresh_token: user.google_token_atualizado || undefined,
        expiry_date: user.google_token_expira_em?.getTime()
      };
      
      setCredentials(tokens);
      
      // Buscar evento no Google Calendar
      const event = await calendar.events.get({
        calendarId: 'primary',
        eventId: booking.id_evento_google
      });
      
      console.log('✅ Evento encontrado no Google Calendar');
      console.log('📅 Título:', event.data.summary);
      console.log('🕒 Data:', event.data.start?.dateTime);
      
      // Atualizar última sincronização
      await booking.update({
        ultima_sincronizacao: new Date()
      });
      
      return {
        success: true,
        message: 'Sincronização realizada com sucesso',
        eventId: event.data.id ?? undefined,
        syncedAt: new Date()
      };
    }
    
    return {
      success: false,
      message: 'Usuário não possui credenciais do Google',
      error: 'NO_CREDENTIALS'
    };
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return {
      success: false,
      message: 'Erro durante sincronização',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Executa todos os testes automaticamente
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 Iniciando testes dos serviços do Google Calendar...\n');
  
  // Teste 1: Autenticação
  const authTest = await testGoogleAuth();
  if (!authTest) {
    console.log('\n❌ Testes interrompidos - falha na autenticação');
    return;
  }
  
  // Teste 2: Criação de evento (exemplo com IDs fictícios)
  const userId = 1; // ID de usuário de exemplo
  const bookingId = 1; // ID de agendamento de exemplo
  
  console.log('\n⚠️  Usando IDs de exemplo para testes');
  console.log('💡 Certifique-se de que existam registros com estes IDs no banco');
  
  try {
    const createTest = await testCreateCalendarEvent(userId, bookingId);
    if (createTest) {
      // Teste 3: Sincronização
      const syncResult = await testSyncBooking(userId, bookingId);
      console.log('\n📊 Resultado da sincronização:', syncResult);
    }
  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error);
  }
  
  console.log('\n✅ Testes concluídos!');
}

// Executa automaticamente quando arquivo é chamado diretamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

// Exportações para uso externo
export {
  testGoogleAuth,
  testCreateCalendarEvent,
  testSyncBooking,
  runAllTests
};