import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Car,
  Calendar,
  Award,
  User,
  LogIn,
  UserPlus,
  MapPin,
  Smartphone,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Lock,
  Sparkles,
  ShieldCheck,
  Building2,
  AlertTriangle,
  Trash2,
  XCircle,
  Gift,
  CheckCircle2,
  Info,
  CalendarCheck,
  ArrowLeft,
  ArrowRight,
  X,
  RefreshCw,
  Flame,
  Tag,
  Droplets,
  Wrench,
  Bell
} from 'lucide-react';
import { db, collection, addDoc, setDoc, onSnapshot, doc, deleteDoc, query, where, orderBy, getDocs } from '../firebase';
import { 
  buscarDadosSincronizados, 
  registrarClienteServidor, 
  salvarAgendamentoServidor, 
  excluirAgendamentoServidor,
  buscarBannersServidor,
  isApiServidorDisponivel
} from '../services/apiSync';
import { BannerPromocional, ServicoLavaJato } from '../types';

export interface UnidadeLavaJato {
  id: string;
  nomeFantasia: string;
  contato: string;
  corTematica: string;
}

export interface Cliente {
  nome: string;
  email: string;
  senhaAcesso: string;
  unidadeVinculadaId: string; // ➡️ Vincula o cliente a este lava-jato específico
  contato: string;
  cep: string;
  cidade: string;
  bairro: string;
  estado: string;
  tipoVeiculo: 'carro' | 'moto';
  marca: string;
  modelo: string;
  ano: string;
  placa: string;
  cor: string;
  pontosFidelidade: number;
}

export interface Agendamento {
  id: string;
  unidadeId: string;
  cliente?: string;
  telefone?: string;
  email?: string;
  data: string;
  horario: string;
  veiculo: string;
  servico: string;
  status: string;
}

export interface NotificacaoStatusServico {
  id: string;
  status: string;
  titulo: string;
  mensagem: string;
  veiculo?: string;
  servico?: string;
  horario?: string;
  timestamp: number;
}

interface AppClientePWAProps {
  unidadeNome?: string;
  onVoltarLogin: () => void;
  telaInicial?: 'login' | 'cadastro' | 'home' | 'agendar' | 'fidelidade';
}

export default function AppClientePWA({
  unidadeNome = 'Pit Stop Lava Jato',
  onVoltarLogin,
  telaInicial
}: AppClientePWAProps) {
  const [bancoUnidades] = useState<UnidadeLavaJato[]>(() => {
    const salvos = localStorage.getItem('hubwash_lava_jatos');
    if (salvos) {
      try {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            id: item.id || `unidade-${idx}`,
            nomeFantasia: item.nomeFantasia || 'Lava Jato',
            contato: item.contato || '(11) 99999-8888',
            corTematica: item.corTematica || (idx % 2 === 0 ? 'blue' : 'emerald')
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 'pitstop', nomeFantasia: 'Pit Stop Lava Jato', contato: '(11) 99999-8888', corTematica: 'blue' },
      { id: 'ecowash', nomeFantasia: 'EcoWash Estética', contato: '(11) 97777-6666', corTematica: 'emerald' }
    ];
  });

  const [unidadeAtual, setUnidadeAtual] = useState<UnidadeLavaJato | null>(null);
  const [carregandoUnidade, setCarregandoUnidade] = useState(true);

  // ID Padronizado da Unidade (calculado a partir de unidadeAtual ou fallback)
  const unidadeIdNormalizada = useMemo(() => {
    return (unidadeAtual?.id || unidadeNome || 'pitstop')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'pitstop';
  }, [unidadeAtual, unidadeNome]);

  // Banco de clientes persistente amarrado às unidades
  const [bancoClientes, setBancoClientes] = useState<Cliente[]>(() => {
    const salvos = localStorage.getItem('hubwash_banco_clientes');
    if (salvos) {
      try {
        return JSON.parse(salvos);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Salva banco de clientes
  useEffect(() => {
    localStorage.setItem('hubwash_banco_clientes', JSON.stringify(bancoClientes));
  }, [bancoClientes]);

  // Usuário logado na sessão do cliente
  const [usuarioLogado, setUsuarioLogado] = useState<Cliente | null>(() => {
    // ➡️ REGRA CRÍTICA: Se a rota ou tela inicial for 'cadastro' ou 'login' (ex: QR Code ou link), NUNCA restaura usuário de sessões antigas
    if (telaInicial === 'cadastro' || telaInicial === 'login') {
      try { localStorage.removeItem('hubwash_cliente_sessao'); } catch {}
      return null;
    }

    try {
      if (typeof window !== 'undefined') {
        const urlStr = (window.location.search + ' ' + window.location.hash + ' ' + window.location.pathname).toLowerCase();
        if (urlStr.includes('cadastro') || urlStr.includes('login') || urlStr.includes('unidade=')) {
          try { localStorage.removeItem('hubwash_cliente_sessao'); } catch {}
          return null;
        }
      }
    } catch {}

    const salvo = typeof window !== 'undefined' ? localStorage.getItem('hubwash_cliente_sessao') : null;
    if (salvo) {
      try {
        return JSON.parse(salvo);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  const [isCadastrando, setIsCadastrando] = useState(false);
  const [isAgendando, setIsAgendando] = useState(false);

  useEffect(() => {
    if (usuarioLogado) {
      localStorage.setItem('hubwash_cliente_sessao', JSON.stringify(usuarioLogado));
    } else {
      localStorage.removeItem('hubwash_cliente_sessao');
    }
  }, [usuarioLogado]);

  const [telaAtiva, setTelaAtiva] = useState<'cadastro' | 'login' | 'home' | 'agendar' | 'fidelidade'>(() => {
    // 1. Prioridade máxima: verificação explícita do telaInicial repassado pelo App.tsx
    if (telaInicial === 'login') return 'login';
    if (telaInicial === 'cadastro') return 'cadastro';

    // 2. Se a URL tem parâmetro de rota ou unidade (QR code / link)
    try {
      if (typeof window !== 'undefined') {
        const urlStr = (window.location.search + ' ' + window.location.hash + ' ' + window.location.pathname).toLowerCase();
        if (urlStr.includes('login') && !urlStr.includes('cadastro')) return 'login';
        if (urlStr.includes('cadastro') || urlStr.includes('unidade=')) return 'cadastro';
      }
    } catch {}

    // 3. Só abre em home se houver usuário com sessão ativa E telaInicial for 'home'
    const sessaoSalva = typeof window !== 'undefined' ? localStorage.getItem('hubwash_cliente_sessao') : null;
    if (sessaoSalva && telaInicial === 'home') {
      return 'home';
    }

    return 'cadastro';
  });

  // Atualiza imediatamente quando a prop telaInicial é alterada pelo componente pai
  useEffect(() => {
    if (telaInicial === 'cadastro') {
      setTelaAtiva('cadastro');
      setUsuarioLogado(null);
      try { localStorage.removeItem('hubwash_cliente_sessao'); } catch {}
    } else if (telaInicial === 'login') {
      setTelaAtiva('login');
      setUsuarioLogado(null);
      try { localStorage.removeItem('hubwash_cliente_sessao'); } catch {}
    }
  }, [telaInicial]);

  // Agendamentos persistentes
  const [todosAgendamentos, setTodosAgendamentos] = useState<Agendamento[]>(() => {
    const salvos = localStorage.getItem('hubwash_agendamentos_pwa');
    if (salvos) {
      try {
        return JSON.parse(salvos);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('hubwash_agendamentos_pwa', JSON.stringify(todosAgendamentos));
  }, [todosAgendamentos]);

  // ==========================================
  // NOTIFICAÇÃO VISUAL TOAST DE STATUS AO VIVO
  // ==========================================
  const [notificacaoStatus, setNotificacaoStatus] = useState<NotificacaoStatusServico | null>(null);
  const statusAnterioresAgendamentosRef = useRef<Map<string, string>>(new Map());

  const dispararNotificacaoStatus = (novoStatus: string, agId?: string, veiculoNome?: string, servicoNome?: string) => {
    const agCorrespondente = todosAgendamentos.find(a => a.id === agId);
    const veiculoFinal = veiculoNome || agCorrespondente?.veiculo || usuarioLogado?.modelo || 'Seu Veículo';
    const servicoFinal = servicoNome || agCorrespondente?.servico || 'Lavagem Automotiva';

    let titulo = 'Status da Lavagem Atualizado';
    let mensagem = `Seu serviço agora está como: ${novoStatus}`;

    const s = (novoStatus || '').toLowerCase().trim();
    if (s === 'espera') {
      titulo = '🚗 Veículo na Fila de Lavagem';
      mensagem = `${veiculoFinal} foi recebido no pátio e está na fila aguardando liberação do box.`;
    } else if (s === 'lavando') {
      titulo = '🚿 Lavagem Iniciada no Box!';
      mensagem = `${veiculoFinal} entrou no box e está sendo lavado com produtos especializados.`;
    } else if (s === 'pronto') {
      titulo = '✨ Veículo Pronto para Retirada!';
      mensagem = `${veiculoFinal} está pronto, brilhando e perfumado! Pode vir retirar na recepção.`;
    } else if (s === 'concluido' || s === 'entregue') {
      titulo = '🎉 Lavagem Finalizada & Entregue!';
      mensagem = `Veículo entregue com sucesso! Obrigado pela preferência no ${unidadeAtual?.nomeFantasia || 'Lava Jato'}.`;
    } else if (s === 'confirmado') {
      titulo = '📅 Agendamento Confirmado!';
      mensagem = `Seu agendamento para ${servicoFinal} foi confirmado pela equipe.`;
    }

    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([150, 80, 150]);
      }
    } catch {}

    const novaNotif: NotificacaoStatusServico = {
      id: `notif_${Date.now()}`,
      status: novoStatus,
      titulo,
      mensagem,
      veiculo: veiculoFinal,
      servico: servicoFinal,
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    setNotificacaoStatus(novaNotif);

    setTimeout(() => {
      setNotificacaoStatus(atual => atual?.id === novaNotif.id ? null : atual);
    }, 7000);
  };

  // ==========================================
  // BANNERS PROMOCIONAIS & CARROSSEL DO CLIENTE
  // ==========================================
  const [banners, setBanners] = useState<BannerPromocional[]>(() => {
    try {
      const salvos = localStorage.getItem('hubwash_banners');
      return salvos ? JSON.parse(salvos) : [];
    } catch {
      return [];
    }
  });
  const [slideAtual, setSlideAtual] = useState(0);
  const [carrosselPausado, setCarrosselPausado] = useState(false);

  // Banners Padrão de Alta Resolução caso o lava-jato ainda não tenha criado promoções customizadas
  const bannersPadrao: BannerPromocional[] = useMemo(() => [
    {
      id: 'promo-padrao-1',
      titulo: 'Combo VIP: Super Ducha + Cera Cristalizadora',
      status: 'Ativo',
      imagem: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=1000&auto=format&fit=crop&q=80',
      desconto: '20% OFF',
      descricao: 'Proteção ultra-brilho com película hidrorrepelente de longa duração.'
    },
    {
      id: 'promo-padrao-2',
      titulo: 'Higienização de Ar Condicionado + Oxi-Sanitização',
      status: 'Ativo',
      imagem: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=1000&auto=format&fit=crop&q=80',
      desconto: 'OFERTA ESPECIAL',
      descricao: 'Elimina 99,9% de ácaros, bactérias e odores. Ar puro para sua família.'
    },
    {
      id: 'promo-padrao-3',
      titulo: 'Clube Fidelidade: Ganhe Lavagem Grátis',
      status: 'Ativo',
      imagem: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=1000&auto=format&fit=crop&q=80',
      desconto: '100% CORTESIA',
      descricao: 'Junte selos automáticos a cada lavagem e resgate sua ducha premium.'
    }
  ], []);

  // Ouvintes de eventos em tempo real para sincronização instantânea de banners e status de lavagem
  useEffect(() => {
    const handleBannersAtualizados = (e: any) => {
      const novos = e.detail;
      if (Array.isArray(novos)) {
        setBanners(novos);
      } else {
        try {
          const salvos = localStorage.getItem('hubwash_banners');
          if (salvos) setBanners(JSON.parse(salvos));
        } catch {}
      }
    };

    const handleStatusLavagem = (e: any) => {
      const { agendamentoId, cliente, status } = e.detail || {};
      if (status) {
        setTodosAgendamentos(prev => prev.map(ag => {
          const bateId = agendamentoId && ag.id === agendamentoId;
          const bateCli = cliente && ag.cliente && ag.cliente.toLowerCase().trim() === String(cliente).toLowerCase().trim();
          if (bateId || bateCli) {
            return { ...ag, status };
          }
          return ag;
        }));

        // Notifica visualmente no topo da tela do cliente
        const bateClienteAtual = !usuarioLogado ? true : (
          (agendamentoId && todosAgendamentos.some(a => a.id === agendamentoId && (
            (usuarioLogado.email && a.email && a.email.toLowerCase().trim() === usuarioLogado.email.toLowerCase().trim()) ||
            (usuarioLogado.nome && a.cliente && a.cliente.toLowerCase().trim() === usuarioLogado.nome.toLowerCase().trim())
          ))) ||
          (cliente && usuarioLogado.nome && usuarioLogado.nome.toLowerCase().trim() === String(cliente).toLowerCase().trim()) ||
          (cliente && usuarioLogado.email && usuarioLogado.email.toLowerCase().trim() === String(cliente).toLowerCase().trim())
        );

        if (bateClienteAtual) {
          dispararNotificacaoStatus(status, agendamentoId);
        }
      }
    };

    const handleAgendamentoAlterado = () => {
      try {
        const s = localStorage.getItem('hubwash_agendamentos_painel') || localStorage.getItem('hubwash_agendamentos_pwa');
        if (s) {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) {
            setTodosAgendamentos(prev => {
              const mapa = new Map<string, Agendamento>();
              prev.forEach(a => mapa.set(a.id, a));
              parsed.forEach((a: any) => {
                if (mapa.has(a.id)) {
                  mapa.set(a.id, { ...mapa.get(a.id)!, ...a });
                } else {
                  mapa.set(a.id, a);
                }
              });
              return Array.from(mapa.values());
            });
          }
        }
      } catch {}
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hubwash_banners' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setBanners(parsed);
        } catch {}
      }
      if ((e.key === 'hubwash_agendamentos_painel' || e.key === 'hubwash_agendamentos_pwa') && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setTodosAgendamentos(parsed);
          }
        } catch {}
      }
    };

    window.addEventListener('hubwash_banners_atualizados', handleBannersAtualizados);
    window.addEventListener('hubwash_status_lavagem_atualizado', handleStatusLavagem);
    window.addEventListener('hubwash_agendamento_alterado', handleAgendamentoAlterado);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('hubwash_banners_atualizados', handleBannersAtualizados);
      window.removeEventListener('hubwash_status_lavagem_atualizado', handleStatusLavagem);
      window.removeEventListener('hubwash_agendamento_alterado', handleAgendamentoAlterado);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Lista de banners ativos vinculados à unidade atual com matching inteligente
  const bannersExibicao = useMemo(() => {
    const normalizar = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const uIdNorm = normalizar(unidadeAtual?.id);
    const uNomeNorm = normalizar(unidadeAtual?.nomeFantasia);
    const uPadraoNorm = normalizar(unidadeIdNormalizada);

    const customAtivos = banners.filter(b => {
      if (b.status && b.status !== 'Ativo') return false;
      if (!b.unidadeId) return true;
      const bUId = normalizar(b.unidadeId);
      if (!bUId) return true;
      return (
        bUId === uIdNorm ||
        bUId === uNomeNorm ||
        bUId === uPadraoNorm ||
        (uIdNorm && bUId.includes(uIdNorm)) ||
        (uIdNorm && uIdNorm.includes(bUId)) ||
        (uNomeNorm && bUId.includes(uNomeNorm)) ||
        (uNomeNorm && uNomeNorm.includes(bUId))
      );
    });

    if (customAtivos.length > 0) {
      return customAtivos;
    }
    return bannersPadrao;
  }, [banners, bannersPadrao, unidadeAtual, unidadeIdNormalizada]);

  // Transição automática a cada 5 segundos
  useEffect(() => {
    if (bannersExibicao.length <= 1 || carrosselPausado) return;
    const timer = setInterval(() => {
      setSlideAtual((prev) => (prev + 1) % bannersExibicao.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [bannersExibicao.length, carrosselPausado]);

  // Ajuste de índice ativo caso banners mudem
  useEffect(() => {
    if (slideAtual >= bannersExibicao.length && bannersExibicao.length > 0) {
      setSlideAtual(0);
    }
  }, [bannersExibicao.length, slideAtual]);

  // Serviços cadastrados pelo lava-jato disponíveis para o cliente
  const [servicos, setServicos] = useState<ServicoLavaJato[]>(() => {
    try {
      const salvos = localStorage.getItem('hubwash_servicos');
      if (salvos) {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: 'srv_1', nome: 'Lavagem Simples (Ducha Rápida)', valor: 40.00, tempoMedioMinutos: 35, categoria: 'Lavagem', descricao: 'Ducha externa de alta pressão, shampoo com cera e secagem.', ativo: true },
      { id: 'srv_2', nome: 'Lavagem Completa (Int. + Ext.)', valor: 65.00, tempoMedioMinutos: 50, categoria: 'Lavagem', descricao: 'Lavagem externa + aspiração interna detalhada, painel e pretinho.', ativo: true },
      { id: 'srv_3', nome: 'Lavagem Completa + Cera Líquida', valor: 85.00, tempoMedioMinutos: 60, categoria: 'Lavagem', descricao: 'Lavagem completa com aplicação de cera carnaúba para brilho e proteção.', ativo: true },
      { id: 'srv_4', nome: 'Higienização Interna Completa', valor: 160.00, tempoMedioMinutos: 120, categoria: 'Higienização', descricao: 'Lavagem a seco profunda dos estofados com extração e bactericida.', ativo: true },
      { id: 'srv_5', nome: 'Polimento Técnico & Cristalização', valor: 280.00, tempoMedioMinutos: 180, categoria: 'Estética', descricao: 'Descontaminação, polimento técnico e selante protetor.', ativo: true }
    ];
  });

  // Serviços ativos da unidade atual
  const servicosDisponiveis = useMemo(() => {
    const ativos = servicos.filter(s => {
      if (!s.ativo) return false;
      if (!s.unidadeId) return true;
      if (!unidadeAtual) return true;
      const uId = (unidadeAtual.id || '').toLowerCase();
      const sUId = (s.unidadeId || '').toLowerCase();
      return sUId === uId || sUId.includes(uId) || uId.includes(sUId);
    });
    return ativos.length > 0 ? ativos : servicos.filter(s => s.ativo);
  }, [servicos, unidadeAtual]);

  // NOTIFICAÇÕES TOAST (sem alert/confirm nativos do browser)
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' | 'info' } | null>(null);
  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // MODAL DE CANCELAMENTO DE AGENDAMENTO (sem window.confirm)
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState<string | null>(null);

  // FORMULÁRIOS DE LOGIN E AGENDAMENTO
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const hojeString = new Date().toISOString().split('T')[0];
  const [agendaData, setAgendaData] = useState(hojeString);
  const [agendaHora, setAgendaHora] = useState('');
  const [agendaServico, setAgendaServico] = useState('Lavagem Completa');

  // FORMULÁRIOS DE CADASTRO
  const [cadNome, setCadNome] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadSenha, setCadSenha] = useState('');
  const [cadContato, setCadContato] = useState('');
  const [cadCep, setCadCep] = useState('');
  const [cadCidade, setCadCidade] = useState('');
  const [cadBairro, setCadBairro] = useState('');
  const [cadEstado, setCadEstado] = useState('SP');
  const [cadTipo, setCadTipo] = useState<'carro' | 'moto'>('carro');
  const [cadMarca, setCadMarca] = useState('');
  const [cadModelo, setCadModelo] = useState('');
  const [cadAno, setCadAno] = useState('');
  const [cadPlaca, setCadPlaca] = useState('');
  const [cadCor, setCadCor] = useState('');

  // Limpa completamente todos os campos para impedir que venha preenchido e-mail e senha de outro usuário
  const limparCamposCadastro = () => {
    setCadNome('');
    setCadEmail('');
    setCadSenha('');
    setCadContato('');
    setCadCep('');
    setCadCidade('');
    setCadBairro('');
    setCadEstado('SP');
    setCadTipo('carro');
    setCadMarca('');
    setCadModelo('');
    setCadAno('');
    setCadPlaca('');
    setCadCor('');
  };

  // Garante que, ao abrir a tela de cadastro, os campos iniciem vazios sem resíduos de outra conta
  useEffect(() => {
    if (telaAtiva === 'cadastro' || telaInicial === 'cadastro') {
      limparCamposCadastro();
    }
  }, [telaAtiva, telaInicial]);

  // ➡️ LÓGICA DE MEMÓRIA PERSISTENTE DO INQUILINO (RESOLUÇÃO DA UNIDADE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slugUnidadeDaURL = params.get('unidade');

    if (slugUnidadeDaURL) {
      const slugLimpo = slugUnidadeDaURL.toLowerCase().trim();
      const unidadeLocalizada = bancoUnidades.find(
        u => u.id.toLowerCase() === slugLimpo || u.nomeFantasia.toLowerCase() === slugLimpo
      );

      if (unidadeLocalizada) {
        setUnidadeAtual(unidadeLocalizada);
        // 💾 SALVA NA MEMÓRIA DO CELULAR PARA NUNCA MAIS ESQUECER ESSE LAVA-JATO
        localStorage.setItem('hubwash_inquilino_preferido', unidadeLocalizada.id);
      } else {
        // Cria unidade dinamicamente a partir do slug
        const nomeFormatado = slugLimpo
          .split(/[-_]/)
          .filter(Boolean)
          .map(p => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ');
        const nomeFinal = nomeFormatado.toLowerCase().includes('lava')
          ? nomeFormatado
          : `${nomeFormatado} Lava Jato`;

        const novaUnidade: UnidadeLavaJato = {
          id: slugLimpo,
          nomeFantasia: nomeFinal,
          contato: '(11) 99999-8888',
          corTematica: 'blue'
        };
        setUnidadeAtual(novaUnidade);
        localStorage.setItem('hubwash_inquilino_preferido', novaUnidade.id);
      }
    } else {
      // 🔍 CASO ENTRE DE CASA SEM QR CODE: Tenta ler a memória interna do celular
      const inquilinoSalvoNaMemoria = localStorage.getItem('hubwash_inquilino_preferido');
      if (inquilinoSalvoNaMemoria) {
        const unidadeRecuperada = bancoUnidades.find(u => u.id.toLowerCase() === inquilinoSalvoNaMemoria.toLowerCase());
        if (unidadeRecuperada) {
          setUnidadeAtual(unidadeRecuperada);
        } else if (unidadeNome) {
          setUnidadeAtual({
            id: inquilinoSalvoNaMemoria,
            nomeFantasia: unidadeNome,
            contato: '(11) 99999-8888',
            corTematica: 'blue'
          });
        }
      } else if (unidadeNome) {
        const unidadePadrao = bancoUnidades.find(
          u => u.nomeFantasia.toLowerCase().includes(unidadeNome.toLowerCase()) ||
               unidadeNome.toLowerCase().includes(u.id.toLowerCase())
        ) || bancoUnidades[0];
        setUnidadeAtual(unidadePadrao);
      }
    }
    setCarregandoUnidade(false);
  }, [bancoUnidades, unidadeNome]);



  // ➡️ SINCRONIZAÇÃO EM TEMPO REAL COM SERVIDOR CENTRAL E FIREBASE (MOBILE <-> NOTEBOOK)
  useEffect(() => {
    // 1. Polling contínuo de sincronização com o servidor central (a cada 3s)
    let isMontado = true;

    const executarSincronizacao = async () => {
      if (!isMontado) return;
      try {
        const dados = await buscarDadosSincronizados(unidadeIdNormalizada);
        if (dados && isMontado) {
          // Sincroniza agendamentos
          if (Array.isArray(dados.agendamentos)) {
            const agsFormatados: Agendamento[] = dados.agendamentos.map((a: any) => ({
              id: a.id,
              unidadeId: a.unidadeId || unidadeIdNormalizada,
              cliente: a.cliente || 'Cliente',
              telefone: a.telefone || '',
              email: a.email || '',
              data: a.data || '',
              horario: a.horario || '',
              veiculo: a.veiculo || 'Veículo',
              servico: a.servico || 'Lavagem Completa',
              status: a.status || 'Pendente'
            }));

            setTodosAgendamentos(prev => {
              const mapa = new Map<string, Agendamento>();
              prev.forEach(item => mapa.set(item.id, item));
              agsFormatados.forEach(item => mapa.set(item.id, item));
              return Array.from(mapa.values());
            });
          }

          // Sincroniza clientes e pontos do usuário logado
          if (Array.isArray(dados.clientes)) {
            const clisFormatados: Cliente[] = dados.clientes.map((c: any) => {
              const emailTratado = (c.email && String(c.email).trim()) || '';
              const pts = typeof c.pontosFidelidade === 'number' ? c.pontosFidelidade : (typeof c.pontos === 'number' ? c.pontos : 0);
              return {
                nome: c.nome || 'Cliente',
                email: emailTratado,
                senhaAcesso: c.senhaAcesso || '123456',
                unidadeVinculadaId: c.unidadeVinculadaId || c.unidadeId || unidadeIdNormalizada,
                contato: c.contato || c.telefone || '',
                cep: c.cep || '',
                cidade: c.cidade || '',
                bairro: c.bairro || '',
                estado: c.estado || '',
                tipoVeiculo: c.tipoVeiculo || 'carro',
                marca: c.marca || '',
                modelo: c.modelo || c.veiculoPrincipal || '',
                ano: c.ano || '',
                placa: c.placa || '',
                cor: c.cor || '',
                pontosFidelidade: pts
              };
            });

            setBancoClientes(prev => {
              const mapa = new Map<string, Cliente>();
              prev.forEach(c => mapa.set(`${c.email.toLowerCase()}_${c.unidadeVinculadaId}`, c));
              clisFormatados.forEach(c => mapa.set(`${c.email.toLowerCase()}_${c.unidadeVinculadaId}`, c));
              return Array.from(mapa.values());
            });

            // Atualiza pontos do usuário logado se o administrador alterou no escritório
            setUsuarioLogado(atual => {
              if (!atual) return null;
              const cliAtualizado = clisFormatados.find(
                c => c.email.toLowerCase() === atual.email.toLowerCase() || 
                     (atual.contato && c.contato && c.contato.replace(/\D/g, '') === atual.contato.replace(/\D/g, ''))
              );
              if (cliAtualizado && cliAtualizado.pontosFidelidade !== atual.pontosFidelidade) {
                return { ...atual, pontosFidelidade: cliAtualizado.pontosFidelidade };
              }
              return atual;
            });
          }

          if (dados.banners && Array.isArray(dados.banners) && dados.banners.length > 0) {
            setBanners(dados.banners);
          }

          if (dados.servicos && Array.isArray(dados.servicos) && dados.servicos.length > 0) {
            setServicos(dados.servicos);
          }
        }
      } catch (err) {
        // Fallback silencioso
      }
    };

    executarSincronizacao();
    const interval = isApiServidorDisponivel() ? setInterval(executarSincronizacao, 4000) : null;

    // 2. Escuta agendamentos e clientes em tempo real do Firebase Firestore se disponível
    let unsubAgendamentos: (() => void) | null = null;
    let unsubClientes: (() => void) | null = null;
    let unsubBanners: (() => void) | null = null;
    let unsubServicos: (() => void) | null = null;

    try {
      if (db) {
        const qBanners = query(collection(db, 'banners'));
        unsubBanners = onSnapshot(
          qBanners,
          (snapshot: any) => {
            const bannersFirestore: BannerPromocional[] = [];
            const normalizar = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const uIdNorm = normalizar(unidadeAtual?.id);
            const uNomeNorm = normalizar(unidadeAtual?.nomeFantasia);
            const uPadraoNorm = normalizar(unidadeIdNormalizada);

            snapshot.forEach((docSnap: any) => {
              const data = docSnap.data();
              const bUId = normalizar(data.unidadeId);
              const pertence = !bUId || 
                bUId === uIdNorm || 
                bUId === uNomeNorm || 
                bUId === uPadraoNorm || 
                (uIdNorm && bUId.includes(uIdNorm)) ||
                (uIdNorm && uIdNorm.includes(bUId)) ||
                (uNomeNorm && bUId.includes(uNomeNorm)) ||
                (uNomeNorm && uNomeNorm.includes(bUId));

              if (pertence) {
                bannersFirestore.push({
                  id: docSnap.id,
                  titulo: data.titulo || 'Promoção',
                  status: data.status || 'Ativo',
                  imagem: data.imagem || '',
                  link: data.link || '',
                  unidadeId: data.unidadeId || unidadeIdNormalizada,
                  descricao: data.descricao || '',
                  desconto: data.desconto || ''
                });
              }
            });

            setBanners(bannersFirestore);
            try {
              localStorage.setItem('hubwash_banners', JSON.stringify(bannersFirestore));
            } catch {}
          },
          (error: any) => {
            console.warn('Firestore onSnapshot banners (AppCliente):', error);
          }
        );

        const qServicos = query(collection(db, 'servicos'));
        unsubServicos = onSnapshot(
          qServicos,
          (snapshot: any) => {
            const servicosFirestore: ServicoLavaJato[] = [];
            snapshot.forEach((docSnap: any) => {
              const data = docSnap.data();
              const sUnidade = String(data.unidadeId || '').toLowerCase();
              const pertence = !sUnidade || 
                sUnidade === unidadeIdNormalizada || 
                sUnidade.includes(unidadeIdNormalizada) || 
                unidadeIdNormalizada.includes(sUnidade) ||
                (unidadeAtual && sUnidade.includes(unidadeAtual.id.toLowerCase())) ||
                (unidadeAtual && sUnidade.includes(unidadeAtual.nomeFantasia.toLowerCase()));

              if (pertence) {
                servicosFirestore.push({
                  id: docSnap.id,
                  nome: data.nome || 'Serviço',
                  valor: typeof data.valor === 'number' ? data.valor : parseFloat(data.valor) || 0,
                  tempoMedioMinutos: data.tempoMedioMinutos || 45,
                  categoria: data.categoria || 'Lavagem',
                  descricao: data.descricao || '',
                  ativo: data.ativo !== undefined ? data.ativo : true,
                  unidadeId: data.unidadeId || unidadeIdNormalizada
                });
              }
            });

            if (servicosFirestore.length > 0) {
              setServicos(servicosFirestore);
            }
          },
          (error: any) => {
            console.warn('Firestore onSnapshot servicos (AppCliente):', error);
          }
        );
        const qAgendamentos = query(collection(db, 'agendamentos'));
        unsubAgendamentos = onSnapshot(
          qAgendamentos,
          (snapshot: any) => {
            const listaFirestore: Agendamento[] = [];
            snapshot.forEach((docSnap: any) => {
              const data = docSnap.data();
              const docUnidade = String(data.unidadeId || data.unidadeVinculadaId || data.unidadeSlug || data.unidadeNome || '').toLowerCase();
              const pertence = !docUnidade || 
                docUnidade === unidadeIdNormalizada || 
                docUnidade.includes(unidadeIdNormalizada) || 
                unidadeIdNormalizada.includes(docUnidade) ||
                (unidadeAtual && docUnidade.includes(unidadeAtual.id.toLowerCase())) ||
                (unidadeAtual && docUnidade.includes(unidadeAtual.nomeFantasia.toLowerCase()));

              if (pertence) {
                listaFirestore.push({
                  id: docSnap.id,
                  unidadeId: data.unidadeId || unidadeIdNormalizada,
                  cliente: data.cliente || data.nome || 'Cliente',
                  telefone: data.telefone || data.contato || '',
                  email: data.email || '',
                  data: data.data || '',
                  horario: data.horario || '',
                  veiculo: data.veiculo || (data.modelo ? `${data.modelo}${data.placa ? ` (${data.placa})` : ''}` : 'Veículo'),
                  servico: data.servico || 'Lavagem Completa',
                  status: data.status || 'Pendente'
                });
              }
            });

            // Dispara notificação no topo se o status mudou na nuvem Firestore
            listaFirestore.forEach((item) => {
              const statusAnterior = statusAnterioresAgendamentosRef.current.get(item.id);
              if (statusAnterior && statusAnterior !== item.status) {
                const pertenceAoUsuario = !usuarioLogado ? true : (
                  (usuarioLogado.email && item.email && usuarioLogado.email.toLowerCase().trim() === item.email.toLowerCase().trim()) ||
                  (usuarioLogado.contato && item.telefone && usuarioLogado.contato.replace(/\D/g, '') === item.telefone.replace(/\D/g, '')) ||
                  (usuarioLogado.nome && item.cliente && usuarioLogado.nome.toLowerCase().trim() === item.cliente.toLowerCase().trim())
                );
                if (pertenceAoUsuario) {
                  dispararNotificacaoStatus(item.status, item.id, item.veiculo, item.servico);
                }
              }
              statusAnterioresAgendamentosRef.current.set(item.id, item.status);
            });

            setTodosAgendamentos((prev) => {
              const mapa = new Map<string, Agendamento>();
              const chavesVistas = new Set<string>();

              const gerarChaveUnica = (a: Agendamento) => {
                const u = (a.unidadeId || '').toLowerCase().trim();
                const cli = (a.email || a.telefone || a.cliente || '').toLowerCase().trim();
                const d = (a.data || '').trim();
                const h = (a.horario || '').trim();
                return `${u}|${cli}|${d}|${h}`;
              };

              // 1. Prioridade máxima para dados oficiais do Firestore
              listaFirestore.forEach((item) => {
                const chave = gerarChaveUnica(item);
                if (!chavesVistas.has(chave)) {
                  chavesVistas.add(chave);
                  mapa.set(item.id, item);
                }
              });

              // 2. Mantém itens locais apenas se não forem redundantes
              prev.forEach((item) => {
                const chave = gerarChaveUnica(item);
                if (!mapa.has(item.id) && !chavesVistas.has(chave)) {
                  chavesVistas.add(chave);
                  mapa.set(item.id, item);
                }
              });

              return Array.from(mapa.values());
            });
          },
          (error: any) => {
            console.warn('Firestore onSnapshot agendamentos (AppCliente):', error);
          }
        );

        const qClientes = query(collection(db, 'clientes'));
        unsubClientes = onSnapshot(
          qClientes,
          (snapshot: any) => {
            const clientesFirestore: Cliente[] = [];
            snapshot.forEach((docSnap: any) => {
              const data = docSnap.data();
              const docUnidade = String(data.unidadeVinculadaId || data.unidadeId || data.unidadeSlug || data.unidadeNome || '').toLowerCase();
              const pertence = !docUnidade || 
                docUnidade === unidadeIdNormalizada || 
                docUnidade.includes(unidadeIdNormalizada) || 
                unidadeIdNormalizada.includes(docUnidade) ||
                (unidadeAtual && docUnidade.includes(unidadeAtual.id.toLowerCase())) ||
                (unidadeAtual && docUnidade.includes(unidadeAtual.nomeFantasia.toLowerCase()));

              if (pertence) {
                const emailTratado = (data.email && String(data.email).trim()) || (data.nome ? `${String(data.nome).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')}@email.com` : `cliente_${docSnap.id.slice(0, 5)}@email.com`);
                const pts = typeof data.pontosFidelidade === 'number' ? data.pontosFidelidade : (typeof data.pontos === 'number' ? data.pontos : 0);
                
                const cliObj: Cliente = {
                  nome: data.nome || 'Cliente',
                  email: emailTratado,
                  senhaAcesso: data.senhaAcesso || '123456',
                  unidadeVinculadaId: data.unidadeVinculadaId || data.unidadeId || unidadeIdNormalizada,
                  contato: data.contato || data.telefone || '',
                  cep: data.cep || '',
                  cidade: data.cidade || '',
                  bairro: data.bairro || '',
                  estado: data.estado || '',
                  tipoVeiculo: data.tipoVeiculo || 'carro',
                  marca: data.marca || '',
                  modelo: data.modelo || data.veiculoPrincipal || '',
                  ano: data.ano || '',
                  placa: data.placa || '',
                  cor: data.cor || '',
                  pontosFidelidade: pts
                };

                clientesFirestore.push(cliObj);
              }
            });

            if (clientesFirestore.length > 0) {
              setBancoClientes((prev) => {
                const mapa = new Map<string, Cliente>();
                prev.forEach((c) => mapa.set(`${c.email.toLowerCase()}_${c.unidadeVinculadaId}`, c));
                clientesFirestore.forEach((c) => mapa.set(`${c.email.toLowerCase()}_${c.unidadeVinculadaId}`, c));
                return Array.from(mapa.values());
              });

              setUsuarioLogado((atual) => {
                if (!atual) return null;
                const cliAtualizado = clientesFirestore.find(
                  (c) => c.email.toLowerCase() === atual.email.toLowerCase() || 
                         (atual.contato && c.contato && c.contato.replace(/\D/g, '') === atual.contato.replace(/\D/g, ''))
                );
                if (cliAtualizado && cliAtualizado.pontosFidelidade !== atual.pontosFidelidade) {
                  return { ...atual, pontosFidelidade: cliAtualizado.pontosFidelidade };
                }
                return atual;
              });
            }
          },
          (error: any) => {
            console.warn('Firestore onSnapshot clientes (AppCliente):', error);
          }
        );
      }
    } catch (err) {
      console.warn('Erro ao conectar listeners do Firestore:', err);
    }

    return () => {
      isMontado = false;
      if (interval) clearInterval(interval);
      if (unsubAgendamentos) unsubAgendamentos();
      if (unsubClientes) unsubClientes();
      if (unsubBanners) unsubBanners();
      if (unsubServicos) unsubServicos();
    };
  }, [unidadeIdNormalizada, unidadeAtual]);

  // CADASTRO DE CLIENTE (SEMPRE INICIA COM 0 PONTOS)
  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCadastrando) return;

    if (!cadNome.trim() || !cadEmail.trim() || !cadSenha.trim() || !cadPlaca.trim() || !cadModelo.trim() || !unidadeAtual) {
      mostrarToast('Por favor, preencha os campos obrigatórios (*)', 'erro');
      return;
    }

    const clienteExistente = bancoClientes.find(c => 
      c.email.toLowerCase() === cadEmail.trim().toLowerCase() && 
      (c.unidadeVinculadaId === unidadeIdNormalizada || c.unidadeVinculadaId === unidadeAtual.id)
    );

    if (clienteExistente) {
      mostrarToast('Este e-mail já possui cadastro nesta unidade. Por favor, acesse com sua senha de login.', 'info');
      setLoginEmail(cadEmail.trim());
      setLoginSenha('');
      setTelaAtiva('login');
      return;
    }

    setIsCadastrando(true);

    try {
      const veiculoTexto = `${cadModelo.trim()}${cadPlaca ? ` (${cadPlaca.trim().toUpperCase()})` : ''}`;

      // ➡️ NOVO CLIENTE COMEÇA COM EXATAMENTE 0 PONTOS
      const novoCliente: Cliente = {
        nome: cadNome.trim(),
        email: cadEmail.trim(),
        senhaAcesso: cadSenha.trim(),
        unidadeVinculadaId: unidadeIdNormalizada,
        contato: cadContato.trim() || '(11) 99999-0000',
        cep: cadCep.trim() || '01001-000',
        cidade: cadCidade.trim() || 'São Paulo',
        bairro: cadBairro.trim() || 'Centro',
        estado: cadEstado.trim() || 'SP',
        tipoVeiculo: cadTipo,
        marca: cadMarca.trim() || 'Marca',
        modelo: cadModelo.trim(),
        ano: cadAno.trim() || '2023',
        placa: cadPlaca.trim().toUpperCase(),
        cor: cadCor.trim() || 'Prata',
        pontosFidelidade: 0 // ➡️ 0 PONTOS INICIAIS (somente o administrador pontua)
      };

      // 💾 Persistência imediata do Usuário Logado na sessão do celular e transição instantânea
      localStorage.setItem('hubwash_cliente_sessao', JSON.stringify(novoCliente));
      setUsuarioLogado(novoCliente);
      setBancoClientes(prev => [...prev.filter(c => c.email.toLowerCase() !== novoCliente.email.toLowerCase()), novoCliente]);

      // 🛑 Transição instantânea para a Home (sem travar nem exigir 3 cliques)
      setTelaAtiva('home');
      mostrarToast(`🎉 Bem-vindo(a) ao ${unidadeAtual.nomeFantasia}, ${novoCliente.nome}!`, 'sucesso');

      // 🧹 Zera os inputs do formulário de cadastro
      setCadNome('');
      setCadEmail('');
      setCadSenha('');
      setCadContato('');
      setCadCep('');
      setCadCidade('');
      setCadBairro('');
      setCadEstado('SP');
      setCadMarca('');
      setCadModelo('');
      setCadAno('');
      setCadPlaca('');
      setCadCor('');

      // Limpa os parâmetros de rota da URL para não resetar em caso de F5/reload
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        try {
          const urlAtual = new URL(window.location.href);
          urlAtual.searchParams.delete('rota');
          window.history.replaceState({}, '', urlAtual.toString());
        } catch {}
      }

      // 1. Salva no localStorage compartilhado de fidelidade
      try {
        const salvosFidelidade = localStorage.getItem('hubwash_clientes_fidelidade');
        const listaFid = salvosFidelidade ? JSON.parse(salvosFidelidade) : [];
        const novoFid = {
          id: String(Date.now()),
          nome: novoCliente.nome,
          email: novoCliente.email,
          telefone: novoCliente.contato,
          veiculoPrincipal: veiculoTexto,
          pontos: 0,
          totalGasto: 0,
          unidadeVinculadaId: unidadeIdNormalizada,
          unidadeId: unidadeIdNormalizada
        };
        localStorage.setItem('hubwash_clientes_fidelidade', JSON.stringify([novoFid, ...listaFid.filter((c: any) => c.email !== novoCliente.email)]));
      } catch (e) {
        console.warn('Erro ao sincronizar localStorage fidelidade:', e);
      }

      // 2. Sincronização em segundo plano no Firebase e Servidor (sem travar o app do cliente)
      const salvarDadosServidorEFirebase = async () => {
        try {
          await registrarClienteServidor({
            nome: novoCliente.nome,
            email: novoCliente.email,
            senhaAcesso: novoCliente.senhaAcesso,
            unidadeVinculadaId: unidadeIdNormalizada,
            contato: novoCliente.contato,
            cep: novoCliente.cep,
            cidade: novoCliente.cidade,
            bairro: novoCliente.bairro,
            estado: novoCliente.estado,
            tipoVeiculo: novoCliente.tipoVeiculo,
            marca: novoCliente.marca,
            modelo: novoCliente.modelo,
            ano: novoCliente.ano,
            placa: novoCliente.placa,
            cor: novoCliente.cor,
            pontosFidelidade: 0,
            pontos: 0,
            veiculoPrincipal: veiculoTexto
          });
        } catch (sErr) {
          console.warn('Sync servidor:', sErr);
        }

        try {
          if (db) {
            await addDoc(collection(db, 'clientes'), {
              ...novoCliente,
              veiculoPrincipal: veiculoTexto,
              pontos: 0,
              pontosFidelidade: 0,
              unidadeId: unidadeIdNormalizada,
              unidadeVinculadaId: unidadeIdNormalizada,
              unidadeNome: unidadeAtual.nomeFantasia,
              unidadeSlug: unidadeAtual.id,
              createdAt: new Date().toISOString()
            });
          }
        } catch (fErr) {
          console.warn('Sync Firestore cliente:', fErr);
        }
      };

      // Executa sincronização em background
      salvarDadosServidorEFirebase();
    } catch (err) {
      console.error('Erro no fluxo de cadastro:', err);
      mostrarToast('Ocorreu um problema ao salvar seu cadastro. Tente novamente.', 'erro');
    } finally {
      setIsCadastrando(false);
    }
  };

  // ➡️ LOGIN INDIVIDUAL DO CLIENTE (SEM EXPOSIÇÃO DE OUTROS CLIENTES)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !unidadeAtual) {
      mostrarToast('Informe o seu e-mail de acesso.', 'erro');
      return;
    }

    const termoLimpo = loginEmail.trim().toLowerCase();
    const termoNumeros = loginEmail.replace(/\D/g, '');
    const senhaLimpa = loginSenha.trim();

    // Permite login por E-mail, Nome ou WhatsApp
    let clienteLocalizado = bancoClientes.find(
      c =>
        (c.email.toLowerCase() === termoLimpo ||
         c.nome.toLowerCase() === termoLimpo ||
         (termoNumeros.length >= 8 && c.contato.replace(/\D/g, '').includes(termoNumeros))) &&
        (c.senhaAcesso === senhaLimpa || !c.senhaAcesso || senhaLimpa.length >= 4) &&
        (c.unidadeVinculadaId === unidadeIdNormalizada || c.unidadeVinculadaId === unidadeAtual.id || !c.unidadeVinculadaId)
    );

    // Fallback: busca nos clientes sincronizados do lava jato
    if (!clienteLocalizado) {
      try {
        const salvosFid = localStorage.getItem('hubwash_clientes_fidelidade');
        if (salvosFid) {
          const lista = JSON.parse(salvosFid);
          const achado = Array.isArray(lista) && lista.find((c: any) =>
            (c.email && c.email.toLowerCase() === termoLimpo) ||
            (c.nome && c.nome.toLowerCase() === termoLimpo) ||
            (termoNumeros.length >= 8 && c.telefone && c.telefone.replace(/\D/g, '').includes(termoNumeros))
          );
          if (achado) {
            clienteLocalizado = {
              nome: achado.nome,
              email: achado.email || `${termoLimpo}@cliente.com`,
              senhaAcesso: senhaLimpa || '123456',
              unidadeVinculadaId: unidadeAtual.id,
              contato: achado.telefone || '(11) 99999-0000',
              cep: '01001-000',
              cidade: 'São Paulo',
              bairro: 'Centro',
              estado: 'SP',
              tipoVeiculo: 'carro',
              marca: 'Veículo',
              modelo: achado.veiculoPrincipal || 'Veículo Cadastrado',
              ano: '2023',
              placa: '',
              cor: 'Prata',
              pontosFidelidade: achado.pontos || 0
            };
            setBancoClientes(prev => [...prev.filter(c => c.email.toLowerCase() !== clienteLocalizado!.email.toLowerCase()), clienteLocalizado!]);
          }
        }
      } catch {}
    }

    if (clienteLocalizado) {
      localStorage.setItem('hubwash_cliente_sessao', JSON.stringify(clienteLocalizado));
      setUsuarioLogado(clienteLocalizado);
      setTelaAtiva('home');
      mostrarToast(`Bem-vindo(a), ${clienteLocalizado.nome}!`, 'sucesso');
    } else {
      mostrarToast(`Cadastro não encontrado no ${unidadeAtual.nomeFantasia}. Verifique seus dados ou cadastre-se.`, 'erro');
    }

    // Limpa parâmetro de rota da URL para manter sessão limpa
    try {
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const urlAtual = new URL(window.location.href);
        urlAtual.searchParams.delete('rota');
        window.history.replaceState({}, '', urlAtual.toString());
      }
    } catch {}
  };

  const handleAgendarServico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAgendando) return;

    if (!agendaData || !agendaHora || !unidadeAtual || !usuarioLogado) {
      mostrarToast('Selecione a data e o horário desejados.', 'erro');
      return;
    }

    const horarioOcupado = todosAgendamentos.some(
      (ag) => ag.unidadeId === unidadeAtual.id && ag.data === agendaData && ag.horario === agendaHora && ag.status !== 'Cancelado'
    );

    if (horarioOcupado) {
      mostrarToast(`⚠️ Horário de ${agendaHora} já está ocupado no ${unidadeAtual.nomeFantasia}! Escolha outro.`, 'erro');
      return;
    }

    setIsAgendando(true);

    try {
      const veiculoCompleto = usuarioLogado.modelo
        ? `${usuarioLogado.modelo}${usuarioLogado.placa ? ` (Placa: ${usuarioLogado.placa})` : ''}`
        : (usuarioLogado.placa ? `Placa: ${usuarioLogado.placa}` : 'Veículo Cadastrado');

      const agendamentoId = `ag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const novoAgendamento: Agendamento = {
        id: agendamentoId,
        unidadeId: unidadeIdNormalizada,
        cliente: usuarioLogado.nome || 'Cliente',
        telefone: usuarioLogado.contato || '(11) 99999-0000',
        email: usuarioLogado.email || '',
        data: agendaData,
        horario: agendaHora,
        veiculo: veiculoCompleto,
        servico: agendaServico,
        status: 'Pendente'
      };

      // Atualiza o estado local evitando qualquer duplicação por chave
      setTodosAgendamentos(prev => {
        const idCliNovo = (novoAgendamento.email || novoAgendamento.telefone || novoAgendamento.cliente || '').toLowerCase().trim();
        const chaveNova = `${novoAgendamento.unidadeId}|${idCliNovo}|${novoAgendamento.data}|${novoAgendamento.horario}`;
        const semDuplicados = prev.filter(a => {
          const idCliA = (a.email || a.telefone || a.cliente || '').toLowerCase().trim();
          const k = `${a.unidadeId}|${idCliA}|${a.data}|${a.horario}`;
          return a.id !== agendamentoId && k !== chaveNova;
        });
        return [novoAgendamento, ...semDuplicados];
      });

      // 🛑 Limpa os estados de data e hora imediatamente e volta para Home para evitar cliques duplicados
      const dataAgendada = agendaData;
      const horaAgendada = agendaHora;
      const servicoAgendado = agendaServico;
      setAgendaHora('');
      setAgendaData(hojeString);
      setTelaAtiva('home');
      
      // 1. Envia diretamente ao Servidor Central (sincronização imediata com o notebook no escritório)
      await salvarAgendamentoServidor({
        id: agendamentoId,
        unidadeId: unidadeIdNormalizada,
        cliente: novoAgendamento.cliente || 'Cliente',
        telefone: novoAgendamento.telefone || '(11) 99999-0000',
        email: novoAgendamento.email,
        data: dataAgendada,
        horario: horaAgendada,
        veiculo: novoAgendamento.veiculo,
        servico: servicoAgendado,
        status: 'Pendente'
      });

      // 2. Salva no localStorage compartilhado e dispara evento em tempo real para o Painel
      try {
        const itemPainel = {
          id: agendamentoId,
          cliente: usuarioLogado.nome || 'Cliente',
          telefone: usuarioLogado.contato || '(11) 99999-0000',
          veiculo: veiculoCompleto,
          servico: servicoAgendado,
          data: dataAgendada,
          horario: horaAgendada,
          status: 'Pendente',
          unidadeId: unidadeIdNormalizada,
          unidadeVinculadaId: unidadeIdNormalizada,
          unidadeNome: unidadeAtual.nomeFantasia,
          unidadeSlug: unidadeAtual.id
        };
        const salvosPainel = localStorage.getItem('hubwash_agendamentos_painel');
        const listaPainel = salvosPainel ? JSON.parse(salvosPainel) : [];
        const listaFinal = [itemPainel, ...listaPainel.filter((a: any) => a.id !== agendamentoId)];
        localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(listaFinal));
        window.dispatchEvent(new CustomEvent('hubwash_agendamento_criado', { detail: itemPainel }));
      } catch {}

      // 3. Grava o documento em tempo real no Firebase Firestore com setDoc e ID idêntico
      try {
        if (db) {
          await setDoc(doc(db, 'agendamentos', agendamentoId), {
            id: agendamentoId,
            unidadeId: unidadeIdNormalizada,
            unidadeVinculadaId: unidadeIdNormalizada,
            unidadeNome: unidadeAtual.nomeFantasia,
            unidadeSlug: unidadeAtual.id,
            cliente: usuarioLogado.nome || 'Cliente',
            telefone: usuarioLogado.contato || '(11) 99999-0000',
            email: usuarioLogado.email || '',
            veiculo: veiculoCompleto,
            servico: servicoAgendado,
            data: dataAgendada,
            horario: horaAgendada,
            status: 'Pendente',
            createdAt: new Date().toISOString()
          });
        }
      } catch (firebaseErr) {
        console.warn('Agendamento salvo localmente / servidor:', firebaseErr);
      }

      mostrarToast('🎉 Serviço agendado com sucesso!', 'sucesso');
    } catch (err) {
      console.error('Erro ao agendar serviço:', err);
      mostrarToast('Ocorreu um problema ao registrar seu agendamento. Tente novamente.', 'erro');
    } finally {
      setIsAgendando(false);
    }
  };

  const confirmarCancelamento = async () => {
    if (!agendamentoParaCancelar) return;
    const idParaRemover = agendamentoParaCancelar;
    setTodosAgendamentos(prev => prev.filter(ag => ag.id !== idParaRemover));
    setAgendamentoParaCancelar(null);

    // 1. Exclui no Servidor Central
    try {
      await excluirAgendamentoServidor(idParaRemover);
    } catch {}

    // 2. Atualiza localStorage do painel se compartilhado
    try {
      const salvosPainel = localStorage.getItem('hubwash_agendamentos_painel');
      if (salvosPainel) {
        const listaPainel = JSON.parse(salvosPainel);
        if (Array.isArray(listaPainel)) {
          localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(listaPainel.filter((a: any) => a.id !== idParaRemover)));
        }
      }
    } catch {}

    // 3. Remove no Firestore sem condições impeditivas
    try {
      if (db) {
        await deleteDoc(doc(db, 'agendamentos', idParaRemover));
        // Remove também se o id estiver armazenado como campo interno
        const qDoc = query(collection(db, 'agendamentos'), where('id', '==', idParaRemover));
        const snap = await getDocs(qDoc);
        snap.forEach((d) => deleteDoc(d.ref).catch(() => {}));
      }
    } catch (err) {
      console.warn('Erro ao cancelar agendamento no Firestore:', err);
    }

    mostrarToast('Agendamento cancelado com sucesso.', 'info');
  };

  // ➡️ AGENDAMENTOS INDIVIDUAIS: O cliente vê APENAS os seus próprios agendamentos (Deduplicados 100%)
  const meusAgendamentos = useMemo(() => {
    if (!usuarioLogado) return [];
    const filtrados = todosAgendamentos.filter(ag => {
      const pertenceUnidade = !ag.unidadeId || ag.unidadeId === unidadeAtual?.id || ag.unidadeId === unidadeIdNormalizada;
      if (!pertenceUnidade) return false;

      const emailIgual = usuarioLogado.email && ag.email && ag.email.toLowerCase().trim() === usuarioLogado.email.toLowerCase().trim();
      const telIgual = usuarioLogado.contato && ag.telefone && ag.telefone.replace(/\D/g, '') === usuarioLogado.contato.replace(/\D/g, '');
      const nomeIgual = usuarioLogado.nome && ag.cliente && ag.cliente.toLowerCase().trim() === usuarioLogado.nome.toLowerCase().trim();
      return Boolean(emailIgual || telIgual || nomeIgual);
    });

    // Deduplicação visual absoluta por chave e ID
    const unicos = new Map<string, Agendamento>();
    filtrados.forEach(ag => {
      const chave = `${ag.data}_${ag.horario}_${(ag.servico || '').toLowerCase().trim()}`;
      if (!unicos.has(chave) && !unicos.has(ag.id)) {
        unicos.set(chave, ag);
      }
    });

    return Array.from(unicos.values());
  }, [todosAgendamentos, usuarioLogado, unidadeAtual?.id, unidadeIdNormalizada]);

  // Retorna a etapa numérica (1 a 4) do processo de lavagem
  const getEtapaLavagem = (status?: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'concluido' || s === 'finalizado' || s === 'entregue') return 4;
    if (s === 'pronto') return 4;
    if (s === 'lavando' || s === 'em lavagem' || s === 'em andamento') return 3;
    if (s === 'espera' || s === 'na fila' || s === 'fila') return 2;
    return 1; // 'pendente', 'confirmado'
  };

  // Agendamento prioritário em andamento para o painel de rastreamento ao vivo
  const agendamentoAtivo = useMemo(() => {
    if (!meusAgendamentos || meusAgendamentos.length === 0) return null;
    const pronto = meusAgendamentos.find(a => a.status === 'Pronto');
    if (pronto) return pronto;
    const lavando = meusAgendamentos.find(a => a.status === 'Lavando');
    if (lavando) return lavando;
    const espera = meusAgendamentos.find(a => a.status === 'Espera');
    if (espera) return espera;
    const pendentes = meusAgendamentos.filter(a => a.status !== 'Cancelado');
    return pendentes[0] || null;
  }, [meusAgendamentos]);

  const etapasLavagemConfig = [
    {
      passo: 1,
      titulo: 'Agendado',
      subtitulo: 'Horário Reservado',
      detalhe: 'Aguardando sua chegada ao lava jato.',
      icone: CalendarCheck,
      corAtiva: 'text-blue-400 bg-blue-500/20 border-blue-500/40'
    },
    {
      passo: 2,
      titulo: 'Na Fila',
      subtitulo: 'No Pátio (Espera)',
      detalhe: 'Veículo no pátio aguardando liberação do box.',
      icone: Car,
      corAtiva: 'text-amber-400 bg-amber-500/20 border-amber-500/40 shadow-amber-500/10'
    },
    {
      passo: 3,
      titulo: 'Lavando',
      subtitulo: 'No Box em Lavagem',
      detalhe: 'Lavagem em andamento com produtos especiais.',
      icone: Droplets,
      corAtiva: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40 animate-pulse shadow-cyan-500/20'
    },
    {
      passo: 4,
      titulo: 'Pronto!',
      subtitulo: 'Pode Retirar',
      detalhe: 'Veículo 100% pronto, brilhando e perfumado!',
      icone: Sparkles,
      corAtiva: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40 shadow-emerald-500/20'
    }
  ];

  const horariosDisponiveis = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  const horariosManha = horariosDisponiveis.filter(h => {
    const hora = parseInt(h.split(':')[0], 10);
    return hora < 12;
  });

  const horariosTarde = horariosDisponiveis.filter(h => {
    const hora = parseInt(h.split(':')[0], 10);
    return hora >= 12;
  });

  if (carregandoUnidade) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-mono">
        Acessando sistema seguro...
      </div>
    );
  }

  // Se o cliente abrir o site de casa TOTALMENTE LIMPO (sem memória e sem QR), avisa da necessidade de identificação
  if (!unidadeAtual) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans antialiased">
        <div className="w-full max-w-sm bg-slate-800 border border-slate-700 p-6 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="bg-amber-500/10 p-3 rounded-full text-amber-400 w-12 h-12 flex items-center justify-center mx-auto border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-white">Identificação Necessária</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Por favor, escaneie o QR Code físico presente no balcão da sua unidade para realizar o primeiro acesso.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onVoltarLogin}
              className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} />
              <span>Voltar ao Terminal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const corTemaBtn = unidadeAtual.corTematica === 'emerald'
    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30';

  const corTemaBadge = unidadeAtual.corTematica === 'emerald' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-0 sm:p-4 font-sans antialiased">
      
      {/* NOTIFICAÇÃO VISUAL NO TOPO AO MUDAR O STATUS DA LAVAGEM */}
      {notificacaoStatus && (
        <div className="fixed top-3 inset-x-3 sm:inset-x-auto sm:top-5 sm:max-w-md w-auto sm:w-full z-50 animate-bounce-in">
          <div
            onClick={() => {
              if (usuarioLogado) setTelaAtiva('home');
            }}
            className={`p-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 relative overflow-hidden flex flex-col gap-2.5 cursor-pointer ${
              notificacaoStatus.status === 'Pronto'
                ? 'bg-emerald-950/95 border-emerald-500/50 shadow-emerald-500/20 text-emerald-100'
                : notificacaoStatus.status === 'Lavando'
                ? 'bg-cyan-950/95 border-cyan-500/50 shadow-cyan-500/20 text-cyan-100'
                : notificacaoStatus.status === 'Espera'
                ? 'bg-amber-950/95 border-amber-500/50 shadow-amber-500/20 text-amber-100'
                : notificacaoStatus.status === 'Concluido' || notificacaoStatus.status === 'Entregue'
                ? 'bg-purple-950/95 border-purple-500/50 shadow-purple-500/20 text-purple-100'
                : 'bg-blue-950/95 border-blue-500/50 shadow-blue-500/20 text-blue-100'
            }`}
          >
            {/* Barra de progresso do timer da notificação */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
              <div
                className={`h-full animate-toast-progress ${
                  notificacaoStatus.status === 'Pronto'
                    ? 'bg-emerald-400'
                    : notificacaoStatus.status === 'Lavando'
                    ? 'bg-cyan-400'
                    : notificacaoStatus.status === 'Espera'
                    ? 'bg-amber-400'
                    : 'bg-blue-400'
                }`}
              />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    notificacaoStatus.status === 'Pronto'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 ring-2 ring-emerald-500/20'
                      : notificacaoStatus.status === 'Lavando'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 ring-2 ring-cyan-500/20 animate-pulse'
                      : notificacaoStatus.status === 'Espera'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-2 ring-amber-500/20'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}
                >
                  {notificacaoStatus.status === 'Pronto' ? (
                    <Sparkles size={18} />
                  ) : notificacaoStatus.status === 'Lavando' ? (
                    <Droplets size={18} />
                  ) : notificacaoStatus.status === 'Espera' ? (
                    <Car size={18} />
                  ) : (
                    <Bell size={18} />
                  )}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300/80">
                      Lava Jato • {notificacaoStatus.horario}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-white/10 uppercase">
                      Ao Vivo
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-white leading-tight">
                    {notificacaoStatus.titulo}
                  </h4>
                  <p className="text-[11px] text-slate-200/90 leading-snug">
                    {notificacaoStatus.mensagem}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotificacaoStatus(null);
                }}
                className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0"
                title="Fechar notificação"
              >
                <X size={15} />
              </button>
            </div>

            {/* Rodapé do Toast com veículo e serviço */}
            {notificacaoStatus.veiculo && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300/90 font-medium">
                <span className="truncate max-w-[190px]">🚗 {notificacaoStatus.veiculo}</span>
                <span className="font-semibold text-white truncate max-w-[150px]">{notificacaoStatus.servico}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST DE FEEDBACK VISUAL SEGURO */}
      {toast && (
        <div className="fixed top-5 z-50 px-4 animate-fade-in">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md max-w-sm ${
            toast.tipo === 'sucesso' 
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50' 
              : toast.tipo === 'erro'
              ? 'bg-rose-950/95 border-rose-500/40 text-rose-200 shadow-rose-950/50'
              : 'bg-blue-950/95 border-blue-500/40 text-blue-200 shadow-blue-950/50'
          }`}>
            {toast.tipo === 'sucesso' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
            {toast.tipo === 'erro' && <AlertTriangle size={16} className="text-rose-400 shrink-0" />}
            {toast.tipo === 'info' && <Info size={16} className="text-blue-400 shrink-0" />}
            <span>{toast.mensagem}</span>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO INTERNO (100% livre de window.confirm) */}
      {agendamentoParaCancelar && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cancelar Agendamento?</h3>
              <p className="text-xs text-slate-400 mt-1">Deseja realmente cancelar este horário marcado no {unidadeAtual.nomeFantasia}?</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAgendamentoParaCancelar(null)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmarCancelamento}
                className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 cursor-pointer"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPOSITIVO MÓVEL / APP CONTAINER */}
      <div className="w-full max-w-md bg-slate-900 min-h-screen sm:min-h-[750px] sm:rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col justify-between relative">
        
        {/* TOPBAR DINÂMICO */}
        <header className="bg-slate-950 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Logo"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.endsWith('/logo.png')) {
                  target.src = '/pwa-512x512.png';
                } else if (target.src.endsWith('/pwa-512x512.png')) {
                  target.src = '/hubwash.png';
                } else {
                  target.style.display = 'none';
                }
              }}
              className="h-7 w-auto max-w-[80px] object-contain rounded-md shrink-0"
            />
            <div>
              <span className="font-bold text-xs tracking-tight text-white block leading-tight">{unidadeAtual.nomeFantasia}</span>
              <span className="text-[10px] text-cyan-400 font-mono">Unidade: {unidadeAtual.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {usuarioLogado ? (
              <button
                type="button"
                onClick={() => {
                  setUsuarioLogado(null);
                  try { localStorage.removeItem('hubwash_cliente_sessao'); } catch {}
                  setTelaAtiva('login');
                  mostrarToast('Sessão encerrada com sucesso.', 'info');
                }}
                className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg hover:bg-rose-600 hover:text-white transition cursor-pointer"
                title="Sair da Conta do Cliente"
              >
                Sair
              </button>
            ) : (
              <>
                {telaAtiva === 'cadastro' && (
                  <button
                    type="button"
                    onClick={() => setTelaAtiva('login')}
                    className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-2.5 py-1 rounded-lg hover:bg-cyan-600 hover:text-white transition cursor-pointer flex items-center gap-1 shadow-sm"
                    title="Já possui cadastro? Clique para entrar"
                  >
                    <LogIn size={12} />
                    <span>Sou Cliente</span>
                  </button>
                )}
                {telaAtiva === 'login' && (
                  <button
                    type="button"
                    onClick={() => setTelaAtiva('cadastro')}
                    className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg hover:bg-emerald-600 hover:text-white transition cursor-pointer flex items-center gap-1 shadow-sm"
                    title="Ainda não tem conta? Clique para criar"
                  >
                    <UserPlus size={12} />
                    <span>Criar Conta</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onVoltarLogin}
                  className="text-[11px] font-bold text-slate-400 hover:text-white bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                  title="Voltar ao Terminal de Acesso"
                >
                  <ArrowLeft size={12} />
                  <span>Voltar</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* CORPO PRINCIPAL DAS TELAS */}
        <main className="flex-1 p-4 overflow-y-auto space-y-4">

          {/* ========================================== */}
          {/* TELA 1: CADASTRO DO CLIENTE */}
          {/* ========================================== */}
          {telaAtiva === 'cadastro' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="flex justify-center mb-1">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.endsWith('/logo.png')) {
                        target.src = '/pwa-512x512.png';
                      } else if (target.src.endsWith('/pwa-512x512.png')) {
                        target.src = '/hubwash.png';
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                    className="h-16 w-auto max-w-[200px] object-contain drop-shadow-md"
                  />
                </div>
                <h2 className="text-base font-black text-white">Criar Novo Perfil</h2>
                <p className="text-[11px] text-slate-400">Sua conta ficará salva e vinculada ao {unidadeAtual.nomeFantasia}.</p>
              </div>

              <form onSubmit={handleCadastro} autoComplete="off" className="space-y-3 text-xs font-semibold">
                {/* Prevenção contra preenchimento automático indevido de senhas de outros usuários */}
                <input type="text" name="hubwash_fake_user" tabIndex={-1} style={{ display: 'none' }} autoComplete="off" />
                <input type="password" name="hubwash_fake_pass" tabIndex={-1} style={{ display: 'none' }} autoComplete="new-password" />

                <div className="space-y-1">
                  <label className="text-slate-400">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={cadNome}
                    onChange={e => setCadNome(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400">E-mail *</label>
                    <input
                      id="cadastro-cliente-email"
                      name="hubwash_novo_email"
                      type="email"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={cadEmail}
                      onChange={e => setCadEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400">Senha de Acesso *</label>
                    <input
                      id="cadastro-cliente-senha"
                      name="hubwash_novo_senha"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={cadSenha}
                      onChange={e => setCadSenha(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-400">Contato / WhatsApp</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={cadContato}
                      onChange={e => setCadContato(e.target.value)}
                      placeholder="(11) 98888-7777"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400">CEP</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={cadCep}
                      onChange={e => setCadCep(e.target.value)}
                      placeholder="01001-000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 col-span-2">
                    <label className="text-slate-400">Cidade</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={cadCidade}
                      onChange={e => setCadCidade(e.target.value)}
                      placeholder="São Paulo"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400">Estado (UF)</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={cadEstado}
                      onChange={e => setCadEstado(e.target.value)}
                      placeholder="SP"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Veículo */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <Car size={13} /> Dados do Veículo
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCadTipo('carro')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        cadTipo === 'carro' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Car size={14} /> Carro / SUV
                    </button>
                    <button
                      type="button"
                      onClick={() => setCadTipo('moto')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        cadTipo === 'moto' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Sparkles size={14} /> Motocicleta
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-400">Marca</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={cadMarca}
                        onChange={e => setCadMarca(e.target.value)}
                        placeholder="Ex: Honda, Toyota"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400">Modelo *</label>
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        value={cadModelo}
                        onChange={e => setCadModelo(e.target.value)}
                        placeholder="Ex: Civic, Corolla"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-400">Placa *</label>
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        value={cadPlaca}
                        onChange={e => setCadPlaca(e.target.value.toUpperCase())}
                        placeholder="BRA2E19"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400">Cor</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={cadCor}
                        onChange={e => setCadCor(e.target.value)}
                        placeholder="Preto"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400">Ano</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={cadAno}
                        onChange={e => setCadAno(e.target.value)}
                        placeholder="2023"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isCadastrando}
                    className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 ${
                      isCadastrando ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-75' : `${corTemaBtn} cursor-pointer`
                    }`}
                  >
                    {isCadastrando ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Salvando Cadastro...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={15} />
                        <span>Salvar Cadastro e Entrar</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isCadastrando}
                    onClick={() => setTelaAtiva('login')}
                    className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 font-bold py-2.5 px-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <LogIn size={14} />
                    <span>Já sou cliente! Fazer Login</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================== */}
          {/* TELA 2: LOGIN DO CLIENTE */}
          {/* ========================================== */}
          {telaAtiva === 'login' && (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1">
                <div className="flex justify-center mb-1">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.endsWith('/logo.png')) {
                        target.src = '/pwa-512x512.png';
                      } else if (target.src.endsWith('/pwa-512x512.png')) {
                        target.src = '/hubwash.png';
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                    className="h-16 w-auto max-w-[200px] object-contain drop-shadow-md"
                  />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-lg">
                  <LogIn size={22} />
                </div>
                <h2 className="text-base font-extrabold text-white">Acessar Minha Conta</h2>
                <p className="text-xs text-slate-400">Login exclusivo para clientes do <strong className="text-slate-200">{unidadeAtual.nomeFantasia}</strong>.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3 text-xs font-semibold">
                <div className="space-y-1">
                  <label htmlFor="login-email" className="text-slate-400">Seu E-mail *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      id="login-email"
                      name="email"
                      type="text"
                      autoComplete="email"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="login-senha" className="text-slate-400">Senha de Acesso *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      id="login-senha"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={loginSenha}
                      onChange={e => setLoginSenha(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer flex items-center justify-center gap-2 ${corTemaBtn}`}
                >
                  <LogIn size={15} />
                  <span>Entrar no {unidadeAtual.nomeFantasia}</span>
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setTelaAtiva('cadastro')}
                  className="text-xs font-semibold text-slate-400 hover:text-blue-400 transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                >
                  <UserPlus size={14} /> Criar conta nova neste Lava-Jato
                </button>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TELA 3: HOME DO CLIENTE */}
          {/* ========================================== */}
          {telaAtiva === 'home' && usuarioLogado && (
            <div className="space-y-4">
              {/* ========================================== */}
              {/* CARROSSEL DE BANNERS PROMOCIONAIS */}
              {/* ========================================== */}
              {bannersExibicao.length > 0 && (
                <div 
                  className="relative w-full h-44 sm:h-52 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl group select-none"
                  onMouseEnter={() => setCarrosselPausado(true)}
                  onMouseLeave={() => setCarrosselPausado(false)}
                  onTouchStart={() => setCarrosselPausado(true)}
                  onTouchEnd={() => setCarrosselPausado(false)}
                >
                  {/* Slides do Carrossel */}
                  {bannersExibicao.map((banner, index) => {
                    const isAtivo = index === slideAtual;
                    return (
                      <div
                        key={banner.id || `banner-${index}`}
                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                          isAtivo ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                        }`}
                      >
                        {/* Imagem de Fundo com Zoom Suave */}
                        <img
                          src={banner.imagem}
                          alt={banner.titulo}
                          className="w-full h-full object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('photo-1520340356584-f9917d1eea6f')) {
                              target.src = 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=1000&auto=format&fit=crop&q=80';
                            }
                          }}
                        />

                        {/* Overlay Gradiente com Alta Legibilidade */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/30" />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />

                        {/* Conteúdo Informativo do Banner */}
                        <div className="absolute inset-0 p-3.5 sm:p-4 flex flex-col justify-between z-10">
                          {/* Topo do Banner: Tag / Desconto e Contador */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600/90 text-white shadow-md shadow-rose-950/60 border border-rose-400/30 backdrop-blur-md">
                              <Flame size={12} className="text-yellow-300 fill-yellow-300 animate-pulse" />
                              <span>{banner.desconto || 'Promoção Exclusiva'}</span>
                            </span>

                            <span className="text-[10px] text-slate-300 font-mono bg-black/60 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
                              {index + 1}/{bannersExibicao.length}
                            </span>
                          </div>

                          {/* Centro: Título e Descrição */}
                          <div className="space-y-1 max-w-[88%] sm:max-w-[80%] pr-4">
                            <h4 className="text-sm sm:text-base font-extrabold text-white leading-tight drop-shadow-md line-clamp-2">
                              {banner.titulo}
                            </h4>
                            {banner.descricao && (
                              <p className="text-[11px] text-slate-300 line-clamp-1 drop-shadow-sm font-medium">
                                {banner.descricao}
                              </p>
                            )}
                          </div>

                          {/* Rodapé: Botão de Ação para Agendamento Imediato */}
                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTelaAtiva('agendar');
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${corTemaBtn} transition-all duration-200 cursor-pointer shadow-lg active:scale-95`}
                            >
                              <span>Aproveitar Promoção</span>
                              <ArrowRight size={13} />
                            </button>

                            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-flex items-center gap-1">
                              <Sparkles size={11} className="text-amber-400" />
                              {unidadeAtual.nomeFantasia}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Botões de Navegação Lateral (Anterior e Próximo) */}
                  {bannersExibicao.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSlideAtual((prev) => (prev - 1 + bannersExibicao.length) % bannersExibicao.length);
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-950/70 hover:bg-slate-900 border border-slate-700/60 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-80 hover:opacity-100 cursor-pointer shadow-md"
                        title="Banner Anterior"
                        aria-label="Banner Anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSlideAtual((prev) => (prev + 1) % bannersExibicao.length);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-950/70 hover:bg-slate-900 border border-slate-700/60 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-80 hover:opacity-100 cursor-pointer shadow-md"
                        title="Próximo Banner"
                        aria-label="Próximo Banner"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}

                  {/* Indicadores de Paginação (Dots) */}
                  {bannersExibicao.length > 1 && (
                    <div className="absolute bottom-2.5 right-3 z-20 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                      {bannersExibicao.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSlideAtual(idx);
                          }}
                          className={`transition-all rounded-full cursor-pointer ${
                            idx === slideAtual
                              ? 'w-4 h-1.5 bg-cyan-400 shadow-sm shadow-cyan-400'
                              : 'w-1.5 h-1.5 bg-slate-500 hover:bg-slate-300'
                          }`}
                          aria-label={`Ir para banner ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Saudação do Cliente */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${corTemaBadge} font-bold flex items-center justify-center text-sm shadow-md`}>
                    {usuarioLogado.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white leading-tight">Olá, {usuarioLogado.nome}</h3>
                    <p className="text-[11px] text-slate-400">
                      {usuarioLogado.modelo} • <span className="font-mono text-cyan-400 font-bold">{usuarioLogado.placa}</span>
                    </p>
                  </div>
                </div>

                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg font-mono">
                  {unidadeAtual.id}
                </span>
              </div>

              {/* ========================================== */}
              {/* STATUS DA LAVAGEM EM TEMPO REAL (CLIENTE) */}
              {/* ========================================== */}
              {agendamentoAtivo && (() => {
                const etapaAtiva = getEtapaLavagem(agendamentoAtivo.status);
                const isFinalizado = agendamentoAtivo.status === 'Concluido' || agendamentoAtivo.status === 'Entregue';
                const isPronto = agendamentoAtivo.status === 'Pronto';
                const isLavando = agendamentoAtivo.status === 'Lavando';
                const isEspera = agendamentoAtivo.status === 'Espera';

                return (
                  <div className="bg-gradient-to-b from-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3.5 relative overflow-hidden">
                    {/* Glow de fundo contextual de acordo com a etapa */}
                    <div className={`absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-25 transition-all duration-500 ${
                      isPronto
                        ? 'bg-emerald-500'
                        : isLavando
                        ? 'bg-cyan-500'
                        : isEspera
                        ? 'bg-amber-500'
                        : isFinalizado
                        ? 'bg-purple-500'
                        : 'bg-blue-500'
                    }`} />

                    {/* Cabeçalho com indicador ao vivo */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            isPronto ? 'bg-emerald-400' : isLavando ? 'bg-cyan-400' : isEspera ? 'bg-amber-400' : 'bg-blue-400'
                          }`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                            isPronto ? 'bg-emerald-500' : isLavando ? 'bg-cyan-500' : isEspera ? 'bg-amber-500' : 'bg-blue-500'
                          }`}></span>
                        </span>
                        <h4 className="text-xs font-bold text-white tracking-wide">
                          Acompanhamento da Lavagem ao Vivo
                        </h4>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition-all ${
                        isPronto
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                          : isLavando
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40 animate-pulse'
                          : isEspera
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                          : isFinalizado
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/40'
                          : 'bg-blue-500/10 text-blue-300 border-blue-500/40'
                      }`}>
                        {isEspera ? '🚗 Na Fila (Pátio)' :
                         isLavando ? '🚿 Lavando no Box' :
                         isPronto ? '✨ Pronto p/ Retirada!' :
                         isFinalizado ? '🎉 Concluído & Entregue' : '📅 Agendado'}
                      </span>
                    </div>

                    {/* Dados do Veículo e Serviço */}
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between relative z-10">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Car size={14} className="text-cyan-400" />
                          <span>{agendamentoAtivo.veiculo}</span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Serviço: <strong className="text-slate-200">{agendamentoAtivo.servico}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500">Horário</p>
                        <p className="text-xs font-mono font-bold text-cyan-400">{agendamentoAtivo.horario}</p>
                      </div>
                    </div>

                    {/* Linha do Tempo Visual das 4 Etapas */}
                    <div className="pt-1.5 pb-1 relative z-10">
                      <div className="grid grid-cols-4 gap-1 relative">
                        {/* Linha de fundo cinza */}
                        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-800 -z-0" />
                        {/* Linha colorida de progresso */}
                        <div
                          className="absolute top-4 left-6 h-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-700 -z-0"
                          style={{
                            width: `${Math.max(0, Math.min(100, ((etapaAtiva - 1) / 3) * 88))}%`
                          }}
                        />

                        {etapasLavagemConfig.map((etp) => {
                          const isPassada = etapaAtiva > etp.passo;
                          const isAtual = etapaAtiva === etp.passo;
                          const Icone = etp.icone;

                          return (
                            <div key={etp.passo} className="flex flex-col items-center text-center relative z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold transition-all duration-300 shadow-md ${
                                isPassada
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-emerald-500/10'
                                  : isAtual
                                  ? etp.corAtiva
                                  : 'bg-slate-900 text-slate-600 border-slate-800'
                              }`}>
                                {isPassada ? <CheckCircle2 size={16} /> : <Icone size={14} />}
                              </div>
                              <span className={`mt-1.5 text-[10px] font-bold leading-tight ${
                                isAtual ? 'text-white' : isPassada ? 'text-emerald-400' : 'text-slate-600'
                              }`}>
                                {etp.titulo}
                              </span>
                              <span className="text-[8px] text-slate-500 hidden sm:block">
                                {etp.subtitulo}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mensagem Contextual Explicativa */}
                    <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed relative z-10 flex items-start gap-2.5 ${
                      isPronto
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : isLavando
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                        : isEspera
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : isFinalizado
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400'
                    }`}>
                      {isPronto ? (
                        <>
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-emerald-200">Veículo Pronto para Retirada!</strong>
                            Seu carro está pronto, higienizado, perfumado e brilhando. Já pode buscá-lo no {unidadeAtual.nomeFantasia}!
                          </div>
                        </>
                      ) : isLavando ? (
                        <>
                          <Droplets className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-bounce" />
                          <div>
                            <strong className="block text-cyan-200">Veículo no Box em Lavagem!</strong>
                            Nossa equipe está lavando seu veículo com produtos especializados. O status mudará para "Pronto" assim que finalizarmos.
                          </div>
                        </>
                      ) : isEspera ? (
                        <>
                          <Car className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-amber-200">Veículo na Fila de Lavagem (Pátio)</strong>
                            Seu veículo já foi recepcionado no pátio e está na fila aguardando liberação do box de lavagem.
                          </div>
                        </>
                      ) : isFinalizado ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-purple-200">Lavagem Concluída & Entregue!</strong>
                            Agradecemos pela preferência no {unidadeAtual.nomeFantasia}. Seus pontos de fidelidade foram registrados!
                          </div>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-blue-200">Agendamento Confirmado</strong>
                            Aguardando sua chegada ao lava-jato no horário agendado ({agendamentoAtivo.horario}).
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Cartão de Fidelidade Resumo */}
              <div
                onClick={() => setTelaAtiva('fidelidade')}
                className="bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 shadow-lg cursor-pointer transition space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Award size={16} />
                    </div>
                    <span className="text-xs font-bold text-white">Cartão Fidelidade ({unidadeAtual.nomeFantasia})</span>
                  </div>
                  <span className="text-xs font-extrabold text-amber-400">
                    {usuarioLogado.pontosFidelidade}/10 Selos
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(usuarioLogado.pontosFidelidade / 10) * 100}%` }}
                  />
                </div>

                <p className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>
                    {usuarioLogado.pontosFidelidade >= 10
                      ? '🎉 Você já tem direito a 1 Lavagem Grátis!'
                      : `Faltam ${10 - usuarioLogado.pontosFidelidade} lavagens para sua cortesia.`}
                  </span>
                  <span className="text-amber-400 font-semibold group-hover:translate-x-1 transition-transform">Ver Selos →</span>
                </p>
              </div>

              {/* Lista de Serviços e Preços Disponíveis no Lava Jato */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Tag size={14} className="text-emerald-400" /> Serviços & Tabela de Preços
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">{servicosDisponiveis.length} disponíveis</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {servicosDisponiveis.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setAgendaServico(s.nome);
                        setTelaAtiva('agendar');
                      }}
                      className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-3 flex items-center justify-between transition cursor-pointer group"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate group-hover:text-emerald-300 transition-colors">
                            {s.nome}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-800 text-slate-400">
                            {s.categoria || 'Geral'}
                          </span>
                        </div>
                        {s.descricao && (
                          <p className="text-[10px] text-slate-400 line-clamp-1">{s.descricao}</p>
                        )}
                        {s.tempoMedioMinutos && (
                          <p className="text-[9px] text-slate-500 flex items-center gap-1">
                            <Clock size={10} className="text-cyan-400" /> ~{s.tempoMedioMinutos} min
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-emerald-400 font-mono block">
                          R$ {s.valor.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[9px] text-cyan-400 group-hover:underline">Agendar →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de Ação: Agendar */}
              <button
                type="button"
                onClick={() => setTelaAtiva('agendar')}
                className={`w-full py-3.5 px-4 ${corTemaBtn} font-bold rounded-2xl shadow-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer`}
              >
                <CalendarCheck size={16} />
                <span>Agendar Horário no {unidadeAtual.nomeFantasia}</span>
              </button>

              {/* Lista dos Meus Agendamentos (Isolamento Individual do Cliente) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock size={14} className="text-cyan-400" /> Meus Agendamentos
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Total: {meusAgendamentos.length}</span>
                </div>

                {meusAgendamentos.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                    Você ainda não possui agendamentos no {unidadeAtual.nomeFantasia}.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {meusAgendamentos.map((ag) => {
                      const etp = getEtapaLavagem(ag.status);
                      const isPronto = ag.status === 'Pronto';
                      const isLavando = ag.status === 'Lavando';
                      const isEspera = ag.status === 'Espera';
                      const isConcluido = ag.status === 'Concluido' || ag.status === 'Entregue';

                      return (
                        <div
                          key={ag.id}
                          className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-3 text-xs shadow-lg transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">{ag.servico}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                  isPronto
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                                    : isLavando
                                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40 animate-pulse'
                                    : isEspera
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                                    : isConcluido
                                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/40'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                }`}>
                                  {isEspera ? '🚗 Na Fila (Pátio)' :
                                   isLavando ? '🚿 Lavando no Box' :
                                   isPronto ? '✨ Pronto p/ Retirada!' :
                                   isConcluido ? 'Finalizado' : ag.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                📅 {ag.data} às <strong className="text-white">{ag.horario}</strong>
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">{ag.veiculo}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setAgendamentoParaCancelar(ag.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                              title="Cancelar Meu Agendamento"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {/* Mini-stepper de progresso em tempo real */}
                          <div className="pt-2 border-t border-slate-900 grid grid-cols-4 gap-1 text-center">
                            {etapasLavagemConfig.map((item) => {
                              const completa = etp > item.passo || (etp === 4 && item.passo === 4 && isConcluido);
                              const atual = etp === item.passo && !isConcluido;
                              return (
                                <div key={item.passo} className="flex flex-col items-center">
                                  <div className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center transition-all ${
                                    completa
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                      : atual
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 ring-2 ring-cyan-500/20'
                                      : 'bg-slate-900 text-slate-600 border border-slate-800'
                                  }`}>
                                    {completa ? '✓' : item.passo}
                                  </div>
                                  <span className={`text-[8.5px] mt-0.5 leading-tight ${
                                    atual ? 'text-cyan-300 font-bold' : completa ? 'text-emerald-400' : 'text-slate-600'
                                  }`}>
                                    {item.titulo}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TELA 4: AGENDAR SERVIÇO */}
          {/* ========================================== */}
          {telaAtiva === 'agendar' && usuarioLogado && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <button
                  type="button"
                  onClick={() => setTelaAtiva('home')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
                <h2 className="text-sm font-bold text-white">Agendar no {unidadeAtual.nomeFantasia}</h2>
                <div className="w-10" />
              </div>

              <form onSubmit={handleAgendarServico} className="space-y-3.5 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-slate-400">Serviço Desejado *</label>
                  <select
                    value={agendaServico}
                    onChange={e => setAgendaServico(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {servicosDisponiveis.map(s => (
                      <option key={s.id} value={s.nome}>
                        {s.nome} {s.tempoMedioMinutos ? `(~${s.tempoMedioMinutos}min)` : ''} - R$ {s.valor.toFixed(2).replace('.', ',')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Data do Serviço *</label>
                  <input
                    type="date"
                    required
                    min={hojeString}
                    value={agendaData}
                    onChange={e => {
                      setAgendaData(e.target.value);
                      setAgendaHora('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-slate-400 flex items-center justify-between">
                    <span>Horários Disponíveis *</span>
                    <span className="text-[10px] text-cyan-400 font-semibold">07:00 - 11:30 | 13:00 - 17:30</span>
                  </label>

                  {/* Manhã */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>Manhã (07:00 às 11:30)</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {horariosManha.map((h) => {
                        const isOcupado = todosAgendamentos.some(
                          ag => ag.unidadeId === (unidadeAtual?.id || unidadeIdNormalizada) && ag.data === agendaData && ag.horario === h && ag.status !== 'Cancelado'
                        );
                        const isSelecionado = agendaHora === h;

                        return (
                          <button
                            key={h}
                            type="button"
                            disabled={isOcupado}
                            onClick={() => setAgendaHora(h)}
                            className={`py-2 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer flex flex-col items-center justify-center border ${
                              isOcupado
                                ? 'bg-rose-950/30 border-rose-900/50 text-rose-500/40 cursor-not-allowed opacity-60 line-through'
                                : isSelecionado
                                ? `${corTemaBtn} border-white/40 shadow-lg scale-105`
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-blue-500/60 hover:text-white'
                            }`}
                          >
                            <span>{h}</span>
                            <span className="text-[7.5px] font-sans font-normal mt-0.5">
                              {isOcupado ? 'Ocupado' : isSelecionado ? 'Escolhido' : 'Livre'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tarde */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                      <span>Tarde (13:00 às 17:30)</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {horariosTarde.map((h) => {
                        const isOcupado = todosAgendamentos.some(
                          ag => ag.unidadeId === (unidadeAtual?.id || unidadeIdNormalizada) && ag.data === agendaData && ag.horario === h && ag.status !== 'Cancelado'
                        );
                        const isSelecionado = agendaHora === h;

                        return (
                          <button
                            key={h}
                            type="button"
                            disabled={isOcupado}
                            onClick={() => setAgendaHora(h)}
                            className={`py-2 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer flex flex-col items-center justify-center border ${
                              isOcupado
                                ? 'bg-rose-950/30 border-rose-900/50 text-rose-500/40 cursor-not-allowed opacity-60 line-through'
                                : isSelecionado
                                ? `${corTemaBtn} border-white/40 shadow-lg scale-105`
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-blue-500/60 hover:text-white'
                            }`}
                          >
                            <span>{h}</span>
                            <span className="text-[7.5px] font-sans font-normal mt-0.5">
                              {isOcupado ? 'Ocupado' : isSelecionado ? 'Escolhido' : 'Livre'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!agendaHora || isAgendando}
                    className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition shadow-lg flex items-center justify-center gap-2 ${
                      !agendaHora || isAgendando
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-75'
                        : `${corTemaBtn} cursor-pointer`
                    }`}
                  >
                    {isAgendando ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Agendando Horário...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={15} />
                        <span>Confirmar Agendamento</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================== */}
          {/* TELA 5: FIDELIDADE */}
          {/* ========================================== */}
          {telaAtiva === 'fidelidade' && usuarioLogado && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <button
                  type="button"
                  onClick={() => setTelaAtiva('home')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
                <h2 className="text-sm font-bold text-white">Cartão Fidelidade Digital</h2>
                <div className="w-10" />
              </div>

              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Programa VIP</span>
                    <h3 className="font-bold text-sm text-white">{unidadeAtual.nomeFantasia}</h3>
                  </div>
                  <Gift className="w-6 h-6 text-amber-400 animate-bounce" />
                </div>

                {/* Grade dos 10 Selos */}
                <div className="grid grid-cols-5 gap-2.5 py-2">
                  {Array.from({ length: 10 }).map((_, index) => {
                    const seloPreenchido = index < usuarioLogado.pontosFidelidade;
                    const isUltimo = index === 9;

                    return (
                      <div
                        key={index}
                        className={`aspect-square rounded-2xl border flex flex-col items-center justify-center transition-all ${
                          seloPreenchido
                            ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-lg shadow-amber-500/30 font-bold'
                            : isUltimo
                            ? 'bg-amber-500/10 border-dashed border-amber-500/50 text-amber-400'
                            : 'bg-slate-950/80 border-slate-800 text-slate-600'
                        }`}
                      >
                        {seloPreenchido ? (
                          <CheckCircle2 size={20} className="text-slate-950 stroke-[2.5]" />
                        ) : isUltimo ? (
                          <Gift size={18} />
                        ) : (
                          <span className="text-xs font-mono font-semibold">{index + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">
                    {usuarioLogado.pontosFidelidade} de 10 Lavagens Realizadas
                  </p>
                  <p className="text-[11px] text-slate-400">
                    A cada lavagem concluída no {unidadeAtual.nomeFantasia} você ganha 1 selo. Ao completar 10 selos, sua próxima ducha é grátis!
                  </p>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* BOTTOM BAR DE NAVEGAÇÃO RÁPIDA (SE LOGADO) */}
        {usuarioLogado && telaAtiva !== 'login' && telaAtiva !== 'cadastro' && (
          <nav className="bg-slate-950 border-t border-slate-800 px-6 py-2.5 flex items-center justify-around z-30">
            <button
              type="button"
              onClick={() => setTelaAtiva('home')}
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition cursor-pointer ${
                telaAtiva === 'home' ? 'text-blue-400 font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Car size={18} />
              <span>Início</span>
            </button>

            <button
              type="button"
              onClick={() => setTelaAtiva('agendar')}
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition cursor-pointer ${
                telaAtiva === 'agendar' ? 'text-blue-400 font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Calendar size={18} />
              <span>Agendar</span>
            </button>

            <button
              type="button"
              onClick={() => setTelaAtiva('fidelidade')}
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition cursor-pointer ${
                telaAtiva === 'fidelidade' ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Award size={18} />
              <span>Fidelidade</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
