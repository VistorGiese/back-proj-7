import dotenv from 'dotenv';
import { getAuthUrl } from '../config/google';

dotenv.config();

/**
 * Script para testar configurações do Google Calendar
 * Execute com: npm run test:google
 */
async function testGoogleConfig() {
  console.log('🧪 Testando configurações do Google Calendar...\n');

  // Verificar variáveis de ambiente
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET', 
    'GOOGLE_REDIRECT_URI'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente faltando:', missingVars.join(', '));
    console.log('\n📝 Certifique-se de configurar o arquivo .env com:');
    missingVars.forEach(varName => {
      console.log(`   ${varName}=seu_valor_aqui`);
    });
    process.exit(1);
  }

  console.log('✅ Todas as variáveis de ambiente estão definidas');

  // Gerar URL de autorização
  try {
    const authUrl = getAuthUrl();
    console.log('\n🔗 URL de autorização gerada com sucesso:');
    console.log(authUrl);
    console.log('\n📋 Para testar a integração:');
    console.log('1. Copie a URL acima');
    console.log('2. Cole no navegador');
    console.log('3. Faça login com sua conta Google');
    console.log('4. Autorize o aplicativo Toca Aqui');
  } catch (error) {
    console.error('❌ Erro ao gerar URL de autorização:', error);
    process.exit(1);
  }

  console.log('\n✅ Configuração do Google Calendar está funcionando!');
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testGoogleConfig().catch(console.error);
}

export default testGoogleConfig;