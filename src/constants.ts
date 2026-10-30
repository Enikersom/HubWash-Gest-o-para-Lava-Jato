// Constantes globais e URLs base da aplicação HubWash
export const URL_BASE_APP = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')
  ? window.location.origin
  : 'https://ais-pre-nkmcuhhfcxk3jjddg2q4ar-163280791843.us-east1.run.app';

export const URL_BASE_NETLIFY = URL_BASE_APP;

// Chave pública VAPID oficial do Firebase Cloud Messaging (Web Push)
export const FCM_VAPID_KEY = 'BLs84-jdq2Rrm2Sa9pqJLsMyaQkzme5zeD9xwmy3sEfgJXAxt5X2uHLXkK1wh2cy6K0yqB2KDcSN3whkOBieQyA';
