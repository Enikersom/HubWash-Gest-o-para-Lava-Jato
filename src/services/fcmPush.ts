// ============================================================================
// SERVIÇO FRONTEND: SOLICITAÇÃO DE PERMISSÃO E CAPTURA DO TOKEN FCM
// Localização: /src/services/fcmPush.ts
// ============================================================================

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { app, db } from '../firebase';
import { FCM_VAPID_KEY } from '../constants';

/**
 * Solicita permissão ao usuário para enviar notificações push,
 * gera o token FCM Web Push e salva no Cloud Firestore.
 * 
 * @param clienteId ID único do cliente (ex: e-mail, telefone ou ID do Firestore)
 * @param vapidKey Chave VAPID pública gerada no Console do Firebase (opcional, utiliza a chave cadastrada por padrão)
 * @param unidadeId ID da unidade/empresa do lava-jato
 */
export async function solicitarPermissaoPushFCM(
  clienteId: string,
  vapidKey: string = (import.meta.env.VITE_FIREBASE_VAPID_KEY || FCM_VAPID_KEY),
  unidadeId?: string
): Promise<{ sucesso: boolean; token?: string; erro?: string }> {
  try {
    // 1. Verifica compatibilidade do navegador
    if (!('Notification' in window)) {
      return { sucesso: false, erro: 'Este navegador não suporta notificações de sistema.' };
    }

    if (!('serviceWorker' in navigator)) {
      return { sucesso: false, erro: 'Service Workers não suportados neste navegador.' };
    }

    // 2. Solicita permissão explícita ao usuário no navegador
    const permissao = await Notification.requestPermission();
    if (permissao !== 'granted') {
      return { sucesso: false, erro: 'Permissão de notificação negada pelo usuário.' };
    }

    // 3. Registra ou obtém o Service Worker de mensageria
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // 4. Inicializa o Firebase Messaging
    if (!app) {
      return { sucesso: false, erro: 'Instância do Firebase App não inicializada.' };
    }
    const messaging = getMessaging(app);

    // 5. Gera o token do dispositivo FCM
    const fcmToken = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swRegistration
    });

    if (!fcmToken) {
      return { sucesso: false, erro: 'Não foi possível gerar o token FCM deste dispositivo.' };
    }

    // 6. Salva o token FCM no Cloud Firestore vinculado ao cliente e unidade
    if (db && clienteId) {
      const clienteDocRef = doc(db, 'clientes', clienteId);
      await setDoc(clienteDocRef, {
        fcmToken: fcmToken,
        fcmTokenAtualizadoEm: new Date().toISOString(),
        unidadeVinculadaId: unidadeId || 'pitstop',
        notificacoesAtivas: true
      }, { merge: true });

      // Também pode salvar em uma coleção dedicada 'dispositivos_fcm'
      const dispositivoRef = doc(db, 'dispositivos_fcm', fcmToken);
      await setDoc(dispositivoRef, {
        token: fcmToken,
        clienteId: clienteId,
        unidadeId: unidadeId || 'pitstop',
        atualizadoEm: new Date().toISOString()
      }, { merge: true });
    }

    // Salva cópia localmente
    localStorage.setItem('hubwash_fcm_token', fcmToken);

    return { sucesso: true, token: fcmToken };
  } catch (error: any) {
    console.error('Erro ao registrar notificações FCM:', error);
    return { sucesso: false, erro: error.message || 'Falha ao ativar notificações.' };
  }
}

/**
 * Escuta notificações recebidas em primeiro plano (quando o app está aberto na tela)
 */
export function ouvirNotificacoesForeground(onMensagemRecebida: (payload: any) => void) {
  try {
    if (!app || typeof window === 'undefined') return;
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      console.log('Push recebido em primeiro plano (foreground):', payload);
      onMensagemRecebida(payload);
    });
  } catch (err) {
    console.warn('Erro ao registrar listener foreground FCM:', err);
  }
}

/**
 * Envia uma notificação push chamando a Netlify Function send-push
 */
export async function enviarNotificacaoPushNetlify({
  token,
  tokens,
  title,
  body,
  url,
  data
}: {
  token?: string;
  tokens?: string[];
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
}): Promise<{ sucesso: boolean; error?: string }> {
  try {
    const res = await fetch('/.netlify/functions/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, tokens, title, body, url, data })
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error('Erro ao chamar Netlify Function send-push:', err);
    return { sucesso: false, error: err.message };
  }
}
