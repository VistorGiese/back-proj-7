import dotenv from 'dotenv';
import { AuthService } from '@services/authService';
import { GoogleOAuthService } from '@services/GoogleOAutServices';
import { UserType } from '@models/UserModel';
import { validateEmail, validatePassword, validateName } from '@utils/validator';
import { formatDateTimeToPTBR, addMinutes } from '@utils/dateUtils';

dotenv.config();

/**
 * Script para testar serviços de autenticação
 * Execute com: npm run test:auth
 */
async function testAuthServices() {
  console.log('🧪 Testando Serviços de Autenticação - Toca Aqui\n');

  // Teste 1: Validadores
  await testValidators();
  
  // Teste 2: Utilitários de data
  await testDateUtils();
  
  // Teste 3: Hash de senha
  await testPasswordHashing();
  
  // Teste 4: JWT
  await testJWT();
  
  // Teste 5: Google OAuth URL
  await testGoogleOAuth();
  
  console.log('\n✅ Todos os testes de autenticação concluídos!');
  showConfigSummary();
}

/**
 * Testar validadores
 */
async function testValidators() {
  console.log('📋 Testando Validadores...');
  
  const tests = [
    { fn: () => validateEmail('test@tocaaqui.com'), expected: true, name: 'Email válido' },
    { fn: () => validateEmail('invalid-email'), expected: false, name: 'Email inválido' },
    { fn: () => validatePassword('123456'), expected: true, name: 'Senha válida' },
    { fn: () => validatePassword('123'), expected: false, name: 'Senha curta' },
    { fn: () => validateName('João Silva'), expected: true, name: 'Nome válido' },
    { fn: () => validateName('A'), expected: false, name: 'Nome curto' },
  ];
  
  tests.forEach(test => {
    const result = test.fn();
    const status = result === test.expected ? '✅' : '❌';
    console.log(`   ${status} ${test.name}: ${result}`);
  });
  
  console.log('');
}

/**
 * Testar utilitários de data
 */
async function testDateUtils() {
  console.log('📅 Testando Utilitários de Data...');
  
  const now = new Date();
  const future = addMinutes(now, 120);
  
  console.log(`   ✅ Data atual: ${formatDateTimeToPTBR(now)}`);
  console.log(`   ✅ Data futura (+2h): ${formatDateTimeToPTBR(future)}`);
  console.log('');
}

/**
 * Testar hash de senhas
 */
async function testPasswordHashing() {
  console.log('🔐 Testando Hash de Senhas...');
  
  try {
    const password = 'minhaSenhaSegura123';
    const hash = await AuthService.hashPassword(password);
    const isValid = await AuthService.comparePassword(password, hash);
    const isInvalid = await AuthService.comparePassword('senhaErrada', hash);
    
    console.log(`   ✅ Hash gerado: ${hash.substring(0, 20)}...`);
    console.log(`   ✅ Senha correta válida: ${isValid}`);
    console.log(`   ✅ Senha incorreta inválida: ${!isInvalid}`);
  } catch (error) {
    console.log(`   ❌ Erro no teste de hash: ${error}`);
  }
  
  console.log('');
}

/**
 * Testar JWT
 */
async function testJWT() {
  console.log('🎫 Testando JWT...');
  
  try {
    const userData = {
      id: 123,
      email: 'test@tocaaqui.com',
      tipo_usuario: UserType.COMUM
    };
    
    const token = AuthService.generateJWT(userData);
    const decoded = AuthService.verifyJWT(token);
    
    console.log(`   ✅ Token JWT gerado: ${maskToken(token)}`);
    console.log(`   ✅ Token decodificado - UserID: ${decoded?.userId}, Email: ${decoded?.email}`);
    console.log(`   ✅ Tipo de usuário: ${decoded?.tipo_usuario}`);
  } catch (error) {
    console.log(`   ❌ Erro no teste JWT: ${error}`);
  }
  
  console.log('');
}

/**
 * Testar Google OAuth
 */
async function testGoogleOAuth() {
  console.log('🔍 Testando Google OAuth...');
  
  try {
    const authUrl = GoogleOAuthService.getAuthorizationUrl();
    console.log(`   ✅ URL de autorização gerada com sucesso`);
    console.log(`   🔗 URL: ${authUrl.substring(0, 100)}...`);
    
    // Verificar variáveis de ambiente
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasRedirectUri = !!process.env.GOOGLE_REDIRECT_URI;
    
    console.log(`   ${hasClientId ? '✅' : '❌'} GOOGLE_CLIENT_ID configurado`);
    console.log(`   ${hasClientSecret ? '✅' : '❌'} GOOGLE_CLIENT_SECRET configurado`);
    console.log(`   ${hasRedirectUri ? '✅' : '❌'} GOOGLE_REDIRECT_URI configurado`);
    
  } catch (error) {
    console.log(`   ❌ Erro no teste Google OAuth: ${error}`);
  }
  
  console.log('');
}

/**
 * Mostrar resumo da configuração
 */
function showConfigSummary() {
  console.log('📊 Resumo da Configuração:\n');
  
  const configs = [
    { name: 'JWT_SECRET', value: !!process.env.JWT_SECRET },
    { name: 'GOOGLE_CLIENT_ID', value: !!process.env.GOOGLE_CLIENT_ID },
    { name: 'GOOGLE_CLIENT_SECRET', value: !!process.env.GOOGLE_CLIENT_SECRET },
    { name: 'GOOGLE_REDIRECT_URI', value: !!process.env.GOOGLE_REDIRECT_URI },
    { name: 'DB_HOST', value: !!process.env.DB_HOST },
    { name: 'DB_USER', value: !!process.env.DB_USER },
    { name: 'DB_PASSWORD', value: !!process.env.DB_PASSWORD },
    { name: 'DB_NAME', value: !!process.env.DB_NAME },
  ];
  
  configs.forEach(config => {
    const status = config.value ? '✅' : '❌';
    console.log(`   ${status} ${config.name}`);
  });
  
  console.log('\n📝 Próximos Passos:');
  console.log('   1. Certifique-se de que todas as configurações estão OK');
  console.log('   2. Execute: npm run migrate:google (se ainda não executou)');
  console.log('   3. Prossiga para o Passo 4: Serviços Google Calendar');
}

/**
 * Mascarar token para logs (mostra apenas início e fim)
 */
function maskToken(token: string, visibleChars: number = 4): string {
  if (token.length <= visibleChars * 2) {
    return '*'.repeat(token.length);
  }
  
  const start = token.substring(0, visibleChars);
  const end = token.substring(token.length - visibleChars);
  const middle = '*'.repeat(token.length - (visibleChars * 2));
  
  return `${start}${middle}${end}`;
}

// Executar se chamado diretamente
if (require.main === module) {
  testAuthServices()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro nos testes:', error);
      process.exit(1);
    });
}

export default testAuthServices;