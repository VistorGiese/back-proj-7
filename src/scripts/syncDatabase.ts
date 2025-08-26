// Assumindo que este arquivo está em: src/scripts/sync.ts

import dotenv from 'dotenv';
// Alteração 1: Caminho mais robusto a partir da pasta 'src'
import syncDatabase from '../config/database';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

/**
 * Verifica se as variáveis de ambiente essenciais para o banco de dados estão definidas.
 * Se alguma estiver faltando, lança um erro.
 */
function checkDatabaseEnvVars() {
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    throw new Error(`Variáveis de ambiente faltando: ${missingVars.join(', ')}. Verifique seu arquivo .env.`);
  }
  console.log('✅ Variáveis de ambiente do banco de dados verificadas.');
}

/**
 * Executa a sincronização do banco de dados com a base de dados definida no .env.
 * Utiliza o argumento '--force' na linha de comando para recriar todas as tabelas.
 */
async function runSync() {
  try {
    console.log('🚀 Iniciando script de sincronização...');

    // Melhoria 2: Validação das variáveis de ambiente antes de continuar
    checkDatabaseEnvVars();

    // Lógica para forçar a recriação das tabelas
    const force = process.argv.includes('--force');

    if (force) {
      console.log('\n⚠️  ATENÇÃO: Modo FORCE ativado - todas as tabelas e dados serão PERDIDOS!');
      console.log('⏳ A sincronização começará em 5 segundos... (Pressione Ctrl+C para cancelar)\n');
      // Aguarda 5 segundos para dar chance de cancelamento
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Chama o método de sincronização do Sequelize
    await syncDatabase.sync({ force });

    console.log('✅ Sincronização concluída com sucesso!');
    process.exit(0); // Termina o processo com sucesso
  } catch (error) {
    console.error('❌ Erro durante a sincronização do banco de dados:', error);
    process.exit(1); // Termina o processo com um código de erro
  }
}

// Executa a função principal
runSync();

export {
  syncDatabase // Carrega as variáveis de ambiente do arquivo .env
};
