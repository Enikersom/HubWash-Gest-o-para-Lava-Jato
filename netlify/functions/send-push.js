// ============================================================================
// NETLIFY FUNCTION: DISPARO DE NOTIFICAÇÃO PUSH VIA FIREBASE CLOUD MESSAGING (FCM)
// Localização: /netlify/functions/send-push.js
// Rota pública Netlify: /.netlify/functions/send-push
// ============================================================================

const admin = require('firebase-admin');

// Inicialização segura do SDK Admin do Firebase (executa apenas uma vez)
if (!admin.apps.length) {
  try {
    // Opção 1: Credenciais completas em JSON numa única variável de ambiente
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } 
    // Opção 2: Variáveis separadas no Netlify (Project ID, Client Email, Private Key)
    else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Garante substituição correta de quebras de linha na chave privada RSA
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    } else {
      // Fallback para Google Application Default Credentials
      admin.initializeApp();
    }
  } catch (initErr) {
    console.error('[send-push] Erro ao inicializar firebase-admin:', initErr);
  }
}

exports.handler = async (event, context) => {
  // Configuração de cabeçalhos CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Trata pre-flight request do CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS OK' })
    };
  }

  // Permite apenas método POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Utilize POST.' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { token, tokens, title, body, icon, url, data } = payload;

    // Valida destinatário
    if (!token && (!tokens || tokens.length === 0)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Destinatário ausente: forneça "token" (único) ou "tokens" (lista).' })
      };
    }

    // Valida mensagem
    if (!title || !body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Conteúdo incompleto: "title" e "body" são obrigatórios.' })
      };
    }

    const iconePadrao = icon || 'https://hubwash.netlify.app/pwa-192x192.png';
    const linkPadrao = url || 'https://hubwash.netlify.app/';

    // 1. DISPARO PARA DISPOSITIVO ÚNICO (token)
    if (token) {
      const message = {
        token: token,
        notification: {
          title: title,
          body: body
        },
        webpush: {
          notification: {
            title: title,
            body: body,
            icon: iconePadrao,
            badge: 'https://hubwash.netlify.app/favicon.png'
          },
          fcmOptions: {
            link: linkPadrao
          }
        },
        data: {
          url: linkPadrao,
          ...(data || {})
        }
      };

      const response = await admin.messaging().send(message);
      console.log('[send-push] Push enviado com sucesso:', response);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          sucesso: true,
          messageId: response,
          mensagem: 'Notificação push enviada com sucesso!'
        })
      };
    }

    // 2. DISPARO PARA MÚLTIPLOS DISPOSITIVOS (tokens)
    if (tokens && Array.isArray(tokens)) {
      const multicastMessage = {
        tokens: tokens,
        notification: {
          title: title,
          body: body
        },
        webpush: {
          notification: {
            title: title,
            body: body,
            icon: iconePadrao
          },
          fcmOptions: {
            link: linkPadrao
          }
        },
        data: {
          url: linkPadrao,
          ...(data || {})
        }
      };

      const response = await admin.messaging().sendEachForMulticast(multicastMessage);
      console.log(`[send-push] Enviado para ${response.successCount} de ${tokens.length} dispositivos.`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          sucesso: true,
          total: tokens.length,
          sucessos: response.successCount,
          falhas: response.failureCount
        })
      };
    }

  } catch (error) {
    console.error('[send-push] Erro ao enviar notificação push:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        sucesso: false,
        error: error.message || 'Erro interno ao processar o disparo FCM'
      })
    };
  }
};
