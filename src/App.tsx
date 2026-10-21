import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import {
  db,
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  firebaseConfig
} from './firebase';
import LoginOTP from './components/LoginOTP';
import SplashScreen from './components/SplashScreen';

// Lazy loading para arranque ultrarrápido (0ms no Netlify e mobile)
const AdminMaster = lazy(() => import('./components/AdminMaster'));
const PainelLavaJato = lazy(() => import('./components/PainelLavaJato'));
const AppClientePWA = lazy(() => import('./components/AppClientePWA'));

export { db, collection, addDoc, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, firebaseConfig };

export const URL_BASE_APP = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')
  ? window.location.origin
  : 'https://ais-pre-nkmcuhhfcxk3jjddg2q4ar-163280791843.us-east1.run.app';

export const URL_BASE_NETLIFY = URL_BASE_APP;

// Função segura para ler parâmetros de busca na URL (query string, hash e pathname)
function getParamSafe(name: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.location) {
      return null;
    }
    // 1. Tenta nos parâmetros normais de busca (?unidade=...&rota=...)
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const val = params.get(name);
      if (val) return val.trim().toLowerCase();
    }
    // 2. Tenta nos parâmetros após hash (#/?unidade=... ou #/rota=...)
    if (window.location.hash) {
      const hashStr = window.location.hash.replace(/^#\/?/, '');
      if (hashStr.includes('?')) {
        const hashParams = new URLSearchParams(hashStr.slice(hashStr.indexOf('?')));
        const val = hashParams.get(name);
        if (val) return val.trim().toLowerCase();
      }
      if (hashStr.includes('=')) {
        const hashParams = new URLSearchParams(hashStr);
        const val = hashParams.get(name);
        if (val) return val.trim().toLowerCase();
      }
      if (name === 'rota') {
        const hLow = hashStr.toLowerCase();
        if (hLow.includes('cadastro')) return 'cadastro';
        if (hLow.includes('login')) return 'login';
      }
    }
    // 3. Tenta no pathname (/cadastro ou /login)
    if (window.location.pathname) {
      const path = window.location.pathname.toLowerCase();
      if (name === 'rota') {
        if (path.includes('cadastro')) return 'cadastro';
        if (path.includes('login')) return 'login';
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Resolver o nome da unidade com proteção contra quebras e suporte a novos inquilinos
function resolverNomeUnidade(slugParam: string | null): string {
  if (!slugParam) {
    return 'Pit Stop Lava Jato';
  }

  try {
    const salvos = localStorage.getItem('hubwash_lava_jatos');
    if (salvos) {
      const lista = JSON.parse(salvos);
      if (Array.isArray(lista) && lista.length > 0) {
        const encontrada = lista.find((u: any) => {
          const uId = String(u.id || '').trim().toLowerCase();
          const uNome = String(u.nomeFantasia || '').trim().toLowerCase();
          return uId === slugParam || uNome === slugParam;
        });
        if (encontrada && encontrada.nomeFantasia) {
          return encontrada.nomeFantasia;
        }
      }
    }
  } catch (e) {
    console.error('Erro ao resolver unidade no storage:', e);
  }

  // Se não encontrar no localStorage local do celular, gera um nome limpo e elegante a partir do slug
  const nomeFormatado = slugParam
    .split(/[-_]/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

  return nomeFormatado.toLowerCase().includes('lava')
    ? nomeFormatado
    : `${nomeFormatado} Lava Jato`;
}

// Função robusta e síncrona para extrair a intenção de rota diretamente da URL (search, hash e pathname)
function extrairRotasUrl() {
  if (typeof window === 'undefined') {
    return { isRotaCadastro: false, isRotaLogin: false, isRotaPainelDireto: false, unidadeSlug: null, rotaSlug: null };
  }

  const search = window.location.search || '';
  const hash = window.location.hash || '';
  const pathname = window.location.pathname || '';
  const searchParams = new URLSearchParams(search);

  const rotaParam = (searchParams.get('rota') || getParamSafe('rota') || '').trim().toLowerCase();
  const unidadeParam = (searchParams.get('unidade') || getParamSafe('unidade') || '').trim().toLowerCase();
  const modoParam = (searchParams.get('modo') || getParamSafe('modo') || '').trim().toLowerCase();
  const painelParam = (searchParams.get('painel') || getParamSafe('painel') || '').trim().toLowerCase();

  const fullUrl = (search + ' ' + hash + ' ' + pathname).toLowerCase();

  // Verifica se solicitou painel de gerenciamento
  const isPainel = (
    modoParam === 'painel' ||
    painelParam === '1' ||
    painelParam === 'true' ||
    fullUrl.includes('modo=painel') ||
    fullUrl.includes('painel=true')
  );

  // 1. Rota de login explícita
  const isLogin = !isPainel && (
    rotaParam === 'login' ||
    fullUrl.includes('rota=login') ||
    fullUrl.includes('#/login') ||
    pathname.endsWith('/login')
  );

  // 2. Rota de cadastro explícita ou por acesso de QR Code/link da unidade (?unidade=...)
  const isCadastro = !isPainel && !isLogin && (
    rotaParam === 'cadastro' ||
    fullUrl.includes('rota=cadastro') ||
    fullUrl.includes('#/cadastro') ||
    pathname.endsWith('/cadastro') ||
    Boolean(unidadeParam) ||
    fullUrl.includes('unidade=')
  );

  return {
    isRotaCadastro: isCadastro,
    isRotaLogin: isLogin,
    isRotaPainelDireto: isPainel,
    unidadeSlug: unidadeParam || null,
    rotaSlug: rotaParam || null
  };
}

export default function App() {
  const rotasUrl = extrairRotasUrl();
  const isRotaCadastro = rotasUrl.isRotaCadastro;
  const isRotaLogin = rotasUrl.isRotaLogin;
  const isRotaPainelDireto = rotasUrl.isRotaPainelDireto;
  const unidadeSlug = rotasUrl.unidadeSlug;
  const rotaSlug = rotasUrl.rotaSlug;

  // Lê sessão salva do operador (Dono do Lava Jato ou Admin Master)
  const sessaoOperadorSalva = (() => {
    try {
      if (typeof window !== 'undefined') {
        const salvo = localStorage.getItem('hubwash_operador_sessao');
        if (salvo) {
          const parsed = JSON.parse(salvo);
          if (parsed && (parsed.role === 'lavajato' || parsed.role === 'master')) {
            return parsed;
          }
        }
      }
    } catch {}
    return null;
  })();

  // 1. Verificação explícita do estado inicial do telaClienteInicial
  const [telaClienteInicial, setTelaClienteInicial] = useState<'login' | 'cadastro' | 'home'>(() => {
    if (isRotaLogin) return 'login';
    if (isRotaCadastro || unidadeSlug || rotaSlug === 'cadastro') return 'cadastro';
    return 'cadastro';
  });

  // 2. Controle de autenticação e tela atual para arranque instantâneo (0ms)
  const [autenticado, setAutenticado] = useState<boolean>(() => {
    if (isRotaCadastro || isRotaLogin || unidadeSlug) return true;
    if (isRotaPainelDireto) return true;
    return Boolean(sessaoOperadorSalva);
  });
  
  const [telaAtual, setTelaAtual] = useState<'lavajato' | 'master' | 'cliente'>(() => {
    if (isRotaCadastro || isRotaLogin || unidadeSlug) return 'cliente';
    if (isRotaPainelDireto) return 'lavajato';
    if (sessaoOperadorSalva) return sessaoOperadorSalva.role;
    return 'lavajato';
  });

  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>(() => {
    if (unidadeSlug) return resolverNomeUnidade(unidadeSlug);
    if (sessaoOperadorSalva && sessaoOperadorSalva.unidadeNome) return sessaoOperadorSalva.unidadeNome;
    return 'Pit Stop Lava Jato';
  });

  const [erroApp, setErroApp] = useState<string | null>(null);
  const [mostrarSplash, setMostrarSplash] = useState<boolean>(() => {
    // Acesso direto, via QR Code ou operador salvo abre imediatamente (0ms) sem splash
    if (isRotaCadastro || isRotaLogin || unidadeSlug || isRotaPainelDireto || sessaoOperadorSalva || rotaSlug) {
      return false;
    }
    try {
      return !sessionStorage.getItem('hubwash_splash_viewed');
    } catch {
      return false;
    }
  });

  // Efeito de sincronização de rota para suportar links dinâmicos e navegação
  useEffect(() => {
    const rotas = extrairRotasUrl();

    if (rotas.isRotaPainelDireto) {
      setAutenticado(true);
      setTelaAtual('lavajato');
      if (rotas.unidadeSlug) {
        setUnidadeSelecionada(resolverNomeUnidade(rotas.unidadeSlug));
      }
      return;
    }

    if (rotas.isRotaCadastro) {
      setAutenticado(true);
      setTelaAtual('cliente');
      setTelaClienteInicial('cadastro');
      if (rotas.unidadeSlug) {
        setUnidadeSelecionada(resolverNomeUnidade(rotas.unidadeSlug));
      }
      return;
    }

    if (rotas.isRotaLogin) {
      setAutenticado(true);
      setTelaAtual('cliente');
      setTelaClienteInicial('login');
      if (rotas.unidadeSlug) {
        setUnidadeSelecionada(resolverNomeUnidade(rotas.unidadeSlug));
      }
      return;
    }

    if (rotas.unidadeSlug) {
      setAutenticado(true);
      setTelaAtual('cliente');
      setTelaClienteInicial('cadastro');
      setUnidadeSelecionada(resolverNomeUnidade(rotas.unidadeSlug));
    }
  }, []);

  // TELA SPLASH SCREEN (ULTRARRÁPIDA E ELEGANTE - 0.4s apenas na raiz pura)
  if (mostrarSplash) {
    return (
      <SplashScreen 
        onFinish={() => {
          try {
            sessionStorage.setItem('hubwash_splash_viewed', '1');
          } catch {}
          setMostrarSplash(false);
        }} 
        duracaoSegundos={0.4} 
      />
    );
  }

  // Tratamento de Erro Seguro em HTML Estruturado (fundo visível, sem travar o celular)
  if (erroApp) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans antialiased">
        <div className="w-full max-w-sm bg-slate-800 border border-slate-700 p-6 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="bg-rose-500/10 p-3 rounded-full text-rose-400 w-12 h-12 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Ops! Algo deu errado</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{erroApp}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setErroApp(null);
              setAutenticado(false);
              setTelaAtual('master');
            }}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} />
            <span>Voltar ao Início</span>
          </button>
        </div>
      </div>
    );
  }

  // Fallback de carregamento rápido dos módulos em lazy
  const fallbackLoading = (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
      <span className="text-xs text-slate-400 font-medium tracking-wide">Carregando HubWash...</span>
    </div>
  );

  // TELA DE AUTENTICAÇÃO / LOGIN OTP
  if (!autenticado) {
    return (
      <LoginOTP
        onSuccess={(role, unidadeNome, telaCliente) => {
          setAutenticado(true);
          if (role === 'master') {
            setTelaAtual('master');
          } else if (role === 'cliente') {
            if (unidadeNome) setUnidadeSelecionada(unidadeNome);
            if (telaCliente) setTelaClienteInicial(telaCliente);
            setTelaAtual('cliente');
          } else {
            if (unidadeNome) {
              setUnidadeSelecionada(unidadeNome);
            }
            setTelaAtual('lavajato');
          }
        }}
      />
    );
  }

  // TELA: APLICATIVO DO CLIENTE (PWA)
  if (telaAtual === 'cliente') {
    // Verificação explícita do estado inicial do telaClienteInicial
    const viewClienteAtiva: 'login' | 'cadastro' = telaClienteInicial === 'login' ? 'login' : 'cadastro';

    return (
      <Suspense fallback={fallbackLoading}>
        <AppClientePWA
          key={`cliente-${unidadeSelecionada}-${viewClienteAtiva}`}
          unidadeNome={unidadeSelecionada}
          telaInicial={viewClienteAtiva}
          onVoltarLogin={() => {
            setAutenticado(false);
          }}
        />
      </Suspense>
    );
  }

  // TELA: ADMIN MASTER (HUBWASH)
  if (telaAtual === 'master') {
    return (
      <Suspense fallback={fallbackLoading}>
        <AdminMaster
          onLogout={() => {
            try {
              localStorage.removeItem('hubwash_operador_sessao');
            } catch {}
            setAutenticado(false);
            setTelaAtual('lavajato');
          }}
          onIrParaLavaJato={(nome?: string) => {
            if (nome) setUnidadeSelecionada(nome);
            setTelaAtual('lavajato');
          }}
          onIrParaCliente={(nome?: string) => {
            if (nome) setUnidadeSelecionada(nome);
            setTelaClienteInicial('cadastro');
            setTelaAtual('cliente');
          }}
        />
      </Suspense>
    );
  }

  // TELA: PAINEL OPERACIONAL LAVA JATO
  return (
    <Suspense fallback={fallbackLoading}>
      <PainelLavaJato
        unidadeNome={unidadeSelecionada}
        onLogout={() => {
          try {
            localStorage.removeItem('hubwash_operador_sessao');
          } catch {}
          setAutenticado(false);
          setTelaAtual('lavajato');
        }}
      />
    </Suspense>
  );
}

