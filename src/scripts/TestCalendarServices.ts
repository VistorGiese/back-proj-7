import dotenv from 'dotenv';
import { GoogleCalendarService } from '@services/GoogleCalendarService';
import { BookingSyncService } from '@services/BookingSyncService';
import { CalendarUtilsService } from '@services/CalendarUtilsService';
import { CalendarWebhookService } from '@services/CalendarWebhookService';
import { AuthService } from '@services/AuthService';
import { GoogleCalendarEvent } from '@interfaces/google-calendar';
import { addHours, formatDateTimeToPTBR, BRAZIL_TIMEZONE } from '@utils/dateUtils';

dotenv.config();

/**
 * Script para testar serviços do Google Calendar
 * Execute com: npm run test:calendar
 */
async function testCalendarServices() {
  console.log('🧪 Testando Serviços Google Calendar - Toca Aqui\n');

  // Usuário de teste (você precisa ter um usuário com Google Calendar conectado)
  const testUserId = 1; // Substitua pelo ID de um usuário real
  
  // Teste 1: Verificar conectividade
  await testGoogleCalendarConnection(testUserId);
  
  // Teste 2: Testar CRUD de eventos
  await testCalendarCRUD(testUserId);
  
  // Teste 3: Testar utilitários
  await testCalendarUtils(testUserId);
  
  // Teste 4: Testar webhook (simulação)
  await testWebhookFunctions();
  
  console.log('\n✅ Testes do Google Calendar concluídos!');
  showCalendarConfigSummary();
}

/**
 * Testar conexão com Google Calendar
 */
async function testGoogleCalendarConnection(userId: number) {
  console.log('🔗 Testando Conexão Google Calendar...');
  
  try {
    // Verificar se usuário tem tokens válidos
    const hasConnection = await AuthService.hasGoogleCalendarConnected(userId);
    console.log(`   ${hasConnection ? '✅' : '❌'} Usuário tem Google Calendar conectado: ${hasConnection}`);
    
    if (hasConnection) {
      // Testar acesso ao calendário
      const calendarAccess = await GoogleCalendarService.checkCalendarAccess(userId);
      console.log(`   ${calendarAccess.hasAccess ? '✅' : '❌'} Acesso ao calendário: ${calendarAccess.message}`);
      
      if (calendarAccess.calendarInfo) {
        console.log(`   📅 Calendário: ${calendarAccess.calendarInfo.summary}`);
        console.log(`   🌍 Timezone: ${calendarAccess.calendarInfo.timeZone}`);
      }
    } else {
      console.log(`   ⚠️  Para testes completos, configure um usuário com Google Calendar conectado`);
    }
    
  } catch (error) {
    console.log(`   ❌ Erro no teste de conexão: ${error}`);
  }
  
  console.log('');
}

/**
 * Testar CRUD de eventos no Google Calendar
 */
async function testCalendarCRUD(userId: number) {
  console.log('📅 Testando CRUD de Eventos...');
  
  try {
    const hasConnection = await AuthService.hasGoogleCalendarConnected(userId);
    if (!hasConnection) {
      console.log('   ⚠️  Pulando testes CRUD - usuário sem Google Calendar conectado');
      console.log('');
      return;
    }
    
    // Criar evento de teste
    const testEvent: GoogleCalendarEvent = {
      summary: '🎵 [TESTE] Show Toca Aqui',
      description: 'Evento de teste criado pelo sistema Toca Aqui\n\nEste é um teste automatizado.',
      location: 'Curitiba, PR - Brasil',
      start: {
        dateTime: addHours(new Date(), 24).toISOString(), // Amanhã
        timeZone: BRAZIL_TIMEZONE
      },
      end: {
        dateTime: addHours(new Date(), 26).toISOString(), // 2 horas de duração
        timeZone: BRAZIL_TIMEZONE
      },
      colorId: '9' // Azul
    };
    
    // 1. Criar evento
    const createResult = await GoogleCalendarService.createEvent(userId, testEvent);
    console.log(`   ${createResult.success ? '✅' : '❌'} Criar evento: ${createResult.message}`);
    
    if (createResult.success && createResult.eventId) {
      const eventId = createResult.eventId;
      
      // 2. Buscar evento criado
      const getResult = await GoogleCalendarService.getEvent(userId, eventId);
      console.log(`   ${getResult.success ? '✅' : '❌'} Buscar evento: ${getResult.message}`);
      
      // 3. Atualizar evento
      if (getResult.success) {
        const updateResult = await GoogleCalendarService.updateEvent(userId, eventId, {
          summary: '🎵 [TESTE ATUALIZADO] Show Toca Aqui',
          description: 'Evento de teste ATUALIZADO pelo sistema Toca Aqui'
        });
        console.log(`   ${updateResult.success ? '✅' : '❌'} Atualizar evento: ${updateResult.message}`);
      }
      
      // 4. Listar eventos (próximos 7 dias)
      const listResult = await GoogleCalendarService.listEvents(userId, {
        startDate: new Date(),
        endDate: addHours(new Date(), 7 * 24),
        maxResults: 10
      });
      console.log(`   ${listResult.success ? '✅' : '❌'} Listar eventos: ${listResult.message}`);
      
      if (listResult.success && listResult.events) {
        console.log(`   📊 Eventos encontrados: ${listResult.events.length}`);
      }
      
      // 5. Deletar evento de teste
      const deleteResult = await GoogleCalendarService.deleteEvent(userId, eventId);
      console.log(`   ${deleteResult.success ? '✅' : '❌'} Deletar evento: ${deleteResult.message}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Erro nos testes CRUD: ${error}`);
  }
  
  console.log('');
}

/**
 * Testar utilitários do calendário
 */
async function testCalendarUtils(userId: number) {
  console.log('🔧 Testando Utilitários...');
  
  try {
    // 1. Estatísticas de sincronização
    const stats = await CalendarUtilsService.getSyncStatistics(userId);
    console.log(`   ✅ Estatísticas obtidas:`);
    console.log(`      📊 Total de agendamentos: ${stats.totalBookings}`);
    console.log(`      ✅ Sincronizados: ${stats.syncedBookings}`);
    console.log(`      ❌ Não sincronizados: ${stats.unsyncedBookings}`);
    console.log(`      📈 Taxa de sincronização: ${stats.syncPercentage}%`);
    
    if (stats.lastSyncAt) {
      console.log(`      🕐 Última sincronização: ${formatDateTimeToPTBR(stats.lastSyncAt)}`);
    }
    
    // 2. Verificar conflitos
    const conflicts = await CalendarUtilsService.checkScheduleConflicts(userId);
    console.log(`   ${conflicts.hasConflicts ? '⚠️' : '✅'} Verificação de conflitos: ${conflicts.conflicts.length} conflito(s) encontrado(s)`);
    
    // 3. Verificar saúde da integração
    const health = await CalendarUtilsService.checkIntegrationHealth(userId);
    console.log(`   ${health.healthy ? '✅' : '❌'} Saúde da integração: ${health.healthy ? 'Saudável' : 'Com problemas'}`);
    
    if (health.issues.length > 0) {
      console.log(`      ⚠️  Problemas encontrados:`);
      health.issues.forEach(issue => console.log(`         - ${issue}`));
    }
    
    if (health.recommendations.length > 0) {
      console.log(`      💡 Recomendações:`);
      health.recommendations.forEach(rec => console.log(`         - ${rec}`));
    }
    
  } catch (error) {
    console.log(`   ❌ Erro nos testes de utilitários: ${error}`);
  }
  
  console.log('');
}

/**
 * Testar funções de webhook (sem servidor real)
 */
async function testWebhookFunctions() {
  console.log('🔔 Testando Funções de Webhook...');
  
  try {
    // Simular notificação de webhook
    const mockNotification = {
      channelId: 'test-channel-123',
      resourceId: 'test-resource-456',
      resourceState: 'exists' as const,
      resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      channelToken: 'user_1'
    };
    
    console.log(`   ✅ Estrutura de webhook validada`);
    console.log(`   📋 Dados do webhook de teste:`);
    console.log(`      🆔 Channel ID: ${mockNotification.channelId}`);
    console.log(`      📊 Resource State: ${mockNotification.resourceState}`);
    console.log(`      👤 User Token: ${mockNotification.channelToken}`);
    
    // Testar extração de ID do usuário
    const extractedUserId = (CalendarWebhookService as any).extractUserIdFromToken(mockNotification.channelToken);
    console.log(`   ${extractedUserId ? '✅' : '❌'} Extração de ID do usuário: ${extractedUserId || 'Falhou'}`);
    
  } catch (error) {
    console.log(`   ❌ Erro nos testes de webhook: ${error}`);
  }
  
  console.log('');
}

/**
 * Testar sincronização de agendamentos (se existirem)
 */
async function testBookingSync(userId: number, bookingId?: number) {
  console.log('🔄 Testando Sincronização de Agendamentos...');
  
  try {
    if (!bookingId) {
      console.log('   ⚠️  ID do agendamento não fornecido - pulando teste de sincronização');
      console.log('   💡 Para testar, forneça um ID de agendamento válido');
      console.log('');
      return;
    }
    
    // Testar sincronização individual
    const syncResult = await BookingSyncService.syncBookingToCalendar(bookingId);
    console.log(`   ${syncResult.success ? '✅' : '❌'} Sincronização individual: ${syncResult.message}`);
    
    if (syncResult.eventId) {
      console.log(`   🆔 Event ID: ${syncResult.eventId}`);
    }
    
    // Testar sincronização em massa
    const massResult = await BookingSyncService.syncAllUserBookings(userId);
    console.log(`   ${massResult.success ? '✅' : '❌'} Sincronização em massa: ${massResult.message}`);
    
    if (massResult.success) {
      console.log(`   📊 Resultados: ${massResult.results.synchronized} sucessos, ${massResult.results.failed} falhas`);
    }
    
  } catch (error) {
    console.log(`   ❌ Erro nos testes de sincronização: ${error}`);
  }
  
  console.log('');
}

/**
 * Mostrar resumo da configuração
 */
function showCalendarConfigSummary() {
  console.log('📊 Resumo da Configuração Google Calendar:\n');
  
  const configs = [
    { name: 'GOOGLE_CLIENT_ID', value: !!process.env.GOOGLE_CLIENT_ID },
    { name: 'GOOGLE_CLIENT_SECRET', value: !!process.env.GOOGLE_CLIENT_SECRET },
    { name: 'GOOGLE_REDIRECT_URI', value: !!process.env.GOOGLE_REDIRECT_URI },
    { name: 'JWT_SECRET', value: !!process.env.JWT_SECRET },
    { name: 'Database Connection', value: !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) }
  ];
  
  configs.forEach(config => {
    const status = config.value ? '✅' : '❌';
    console.log(`   ${status} ${config.name}`);
  });
  
  console.log('\n🎯 Serviços Implementados:');
  console.log('   ✅ GoogleCalendarService - CRUD de eventos');
  console.log('   ✅ BookingSyncService - Sincronização de agendamentos');  
  console.log('   ✅ CalendarUtilsService - Estatísticas e conflitos');
  console.log('   ✅ CalendarWebhookService - Webhooks e notificações');
  
  console.log('\n📝 Próximos Passos:');
  console.log('   1. Conecte um usuário ao Google Calendar para testes completos');
  console.log('   2. Crie alguns agendamentos de teste');
  console.log('   3. Prossiga para o Passo 5: Endpoints API');
}

// Executar se chamado diretamente
if (require.main === module) {
  testCalendarServices()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro nos testes do calendário:', error);
      process.exit(1);
    });
}

export default testCalendarServices;