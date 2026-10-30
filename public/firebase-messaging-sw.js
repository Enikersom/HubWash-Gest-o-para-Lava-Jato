// ============================================================================
// FIREBASE CLOUD MESSAGING SERVICE WORKER (FCM WEB PUSH)
// Localização: /public/firebase-messaging-sw.js
// Deve ficar na raiz pública para ter escopo sobre toda a aplicação
// ============================================================================

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Configuração do projeto Firebase HubWash
firebase.initializeApp({
  apiKey: "AIzaSyDyAQAQ3m-fdTLMce9lIc40_2soI3Ro0yA",
  authDomain: "hubwash-pro.firebaseapp.com",
  projectId: "hubwash-pro",
  storageBucket: "hubwash-pro.firebasestorage.app",
  messagingSenderId: "282309703337",
  appId: "1:282309703337:web:6682da99bc8871a4b55bb8"
});

const messaging = firebase.messaging();

// Manipula mensagens recebidas em segundo plano (background) quando a aba/app está fechada ou minimizada
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificação push recebida em segundo plano:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Lava Jato • HubWash';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Atualização no seu veículo!',
    icon: payload.notification?.icon || payload.data?.icon || '/pwa-192x192.png',
    badge: '/favicon.png',
    data: {
      url: payload.data?.url || payload.fcmOptions?.link || '/'
    },
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Ação de clique na notificação: abre a página do app ou foca na aba aberta
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlParaAbrir = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === urlParaAbrir && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlParaAbrir);
      }
    })
  );
});
