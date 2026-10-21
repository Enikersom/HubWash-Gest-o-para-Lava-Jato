import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  Layers,
  CheckSquare,
  Wrench,
  Package,
  DollarSign,
  Award,
  Settings,
  Image as ImageIcon,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Play,
  PackagePlus,
  Eye,
  Camera,
  Upload,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Paintbrush,
  LogOut,
  Car,
  AlertTriangle,
  Check,
  Fuel,
  Smartphone,
  Gift,
  Sparkles,
  ShieldCheck,
  Building2,
  ArrowLeft,
  QrCode,
  Copy,
  Download,
  X,
  UserPlus,
  Minus,
  RotateCcw,
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  Tag,
  Edit3
} from 'lucide-react';
import { db, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, orderBy, getDocs, getFirebaseStatus, salvarFirebaseConfig } from '../firebase';
import { 
  buscarDadosSincronizados, 
  registrarClienteServidor, 
  atualizarPontosClienteServidor, 
  atualizarStatusAgendamentoServidor, 
  salvarAgendamentoServidor, 
  excluirAgendamentoServidor, 
  excluirClienteServidor,
  salvarBannerServidor,
  excluirBannerServidor,
  buscarServicosServidor,
  salvarServicoServidor,
  atualizarServicoServidor,
  excluirServicoServidor,
  isApiServidorDisponivel
} from '../services/apiSync';
import { URL_BASE_NETLIFY } from '../App';
import {
  ItemFila,
  Funcionario,
  MovimentacaoCaixa,
  ItemChecklist,
  ProdutoEstoque,
  ClienteFidelidade,
  BannerPromocional,
  AgendamentoPWA,
  ServicoLavaJato
} from '../types';
import RelatorioFinanceiro from './RelatorioFinanceiro';
import SistemaChecklist from './SistemaChecklist';

interface PainelLavaJatoProps {
  unidadeNome?: string;
  onLogout: () => void;
}

export default function PainelLavaJato({
  unidadeNome = 'Pit Stop Lava Jato',
  onLogout
}: PainelLavaJatoProps) {
  // CONFIGURAÇÃO DO MENU LATERAL RECOLHÍVEL
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<
    'fila' | 'agendamentos' | 'servicos' | 'checklist' | 'relatorio' | 'clientes' | 'funcionarios' | 'produtos' | 'caixa' | 'banner' | 'configuracao'
  >('fila');

  // CONTROLADORES DE CORES PARA PERSONALIZAÇÃO DO APP
  const [corPrimaria, setCorPrimaria] = useState<'blue' | 'indigo' | 'emerald' | 'cyan' | 'violet' | 'amber'>('blue');
  const [nomeLavaJato, setNomeLavaJato] = useState(unidadeNome);

  // ESTADO DE FEEDBACK (TOAST & MODAL DE CONFIRMAÇÃO DE EXCLUSÃO)
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' | 'info' } | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<{
    tipo: 'fila' | 'agendamento' | 'checklist' | 'cliente' | 'funcionario' | 'produto' | 'movimentacao' | 'banner' | 'servico';
    id: string;
    nome: string;
  } | null>(null);

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // ==========================================
  // 1. FILA DE LAVAGEM
  // ==========================================
  const [veiculosFila, setVeiculosFila] = useState<ItemFila[]>(() => {
    const salvos = localStorage.getItem('hubwash_fila');
    return salvos ? JSON.parse(salvos) : [];
  });
  const [novoClienteFila, setNovoClienteFila] = useState('');
  const [novoVeiculoFila, setNovoVeiculoFila] = useState('');
  const [novoServicoFila, setNovoServicoFila] = useState('Lavagem Completa');
  const [novoValorFila, setNovoValorFila] = useState('80.00');
  const [novoFuncFila, setNovoFuncFila] = useState('');
  const [buscaFila, setBuscaFila] = useState('');

  useEffect(() => {
    localStorage.setItem('hubwash_fila', JSON.stringify(veiculosFila));
  }, [veiculosFila]);

  // ==========================================
  // 2. FUNCIONÁRIOS & COMISSÕES
  // ==========================================
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(() => {
    const salvos = localStorage.getItem('hubwash_funcionarios');
    return salvos ? JSON.parse(salvos) : [];
  });
  const [novoFuncNome, setNovoFuncNome] = useState('');
  const [novoFuncCargo, setNovoFuncCargo] = useState('Lavador');
  const [novoFuncComissao, setNovoFuncComissao] = useState(30);
  const [novoFuncTel, setNovoFuncTel] = useState('');

  useEffect(() => {
    localStorage.setItem('hubwash_funcionarios', JSON.stringify(funcionarios));
  }, [funcionarios]);

  // ==========================================
  // 3. FLUXO DE CAIXA
  // ==========================================
  const [movimentacoesCaixa, setMovimentacoesCaixa] = useState<MovimentacaoCaixa[]>(() => {
    const salvos = localStorage.getItem('hubwash_caixa');
    return salvos ? JSON.parse(salvos) : [];
  });
  const [novaDescCaixa, setNovaDescCaixa] = useState('');
  const [novoValorCaixa, setNovoValorCaixa] = useState('');
  const [novoTipoCaixa, setNovoTipoCaixa] = useState<'entrada' | 'saida'>('entrada');

  useEffect(() => {
    localStorage.setItem('hubwash_caixa', JSON.stringify(movimentacoesCaixa));
  }, [movimentacoesCaixa]);

  // ==========================================
  // 4. CHECKLIST COM FOTOS E AVARIAS
  // ==========================================
  const [checklists, setChecklists] = useState<ItemChecklist[]>(() => {
    const salvos = localStorage.getItem('hubwash_checklist');
    return salvos ? JSON.parse(salvos) : [];
  });
  const [novoCheckVeiculo, setNovoCheckVeiculo] = useState('');
  const [novoCheckAvaria, setNovoCheckAvaria] = useState('');
  const [novoCheckCombustivel, setNovoCheckCombustivel] = useState('3/4');
  const [novoCheckPertences, setNovoCheckPertences] = useState('');

  useEffect(() => {
    localStorage.setItem('hubwash_checklist', JSON.stringify(checklists));
  }, [checklists]);

  // ==========================================
  // 5. PRODUTOS / ESTOQUE INTERNO
  // ==========================================
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>(() => {
    const salvos = localStorage.getItem('hubwash_produtos');
    return salvos ? JSON.parse(salvos) : [];
  });
  const [novoProdNome, setNovoProdNome] = useState('');
  const [novoProdQtd, setNovoProdQtd] = useState('10');
  const [novoProdMin, setNovoProdMin] = useState('3');
  const [novoProdCat, setNovoProdCat] = useState('Geral');

  useEffect(() => {
    localStorage.setItem('hubwash_produtos', JSON.stringify(produtos));
  }, [produtos]);

  // ==========================================
  // 6. CLIENTES & FIDELIDADE
  // ==========================================
  const [clientes, setClientes] = useState<ClienteFidelidade[]>(() => {
    const salvos = localStorage.getItem('hubwash_clientes_fidelidade');
    return salvos ? JSON.parse(salvos) : [];
  });
  const [novoCliNome, setNovoCliNome] = useState('');
  const [novoCliEmail, setNovoCliEmail] = useState('');
  const [novoCliTel, setNovoCliTel] = useState('');
  const [novoCliVeiculo, setNovoCliVeiculo] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');

  useEffect(() => {
    localStorage.setItem('hubwash_clientes_fidelidade', JSON.stringify(clientes));
  }, [clientes]);

  // ==========================================
  // 7. AGENDAMENTOS PWA
  // ==========================================
  const [agendamentos, setAgendamentos] = useState<AgendamentoPWA[]>(() => {
    const salvos = localStorage.getItem('hubwash_agendamentos_painel');
    return salvos ? JSON.parse(salvos) : [];
  });
  const [novoAgendCliente, setNovoAgendCliente] = useState('');
  const [novoAgendTel, setNovoAgendTel] = useState('');
  const [novoAgendVeiculo, setNovoAgendVeiculo] = useState('');
  const [novoAgendServico, setNovoAgendServico] = useState('Lavagem Completa');
  const [novoAgendHorario, setNovoAgendHorario] = useState('15:00');

  useEffect(() => {
    if (agendamentos.length > 0) {
      try {
        const salvos = localStorage.getItem('hubwash_agendamentos_painel');
        const listaExistente = salvos ? JSON.parse(salvos) : [];
        const mapa = new Map<string, any>();
        if (Array.isArray(listaExistente)) {
          listaExistente.forEach(item => mapa.set(item.id, item));
        }
        agendamentos.forEach(item => mapa.set(item.id, item));
        localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(Array.from(mapa.values())));
      } catch {}
    }
  }, [agendamentos]);

  // Slug limpo e padronizado SEM ESPAÇOS nem caracteres especiais para links e QR Codes
  const unidadeSlugSanitizada = useMemo(() => {
    try {
      const salvos = localStorage.getItem('hubwash_lava_jatos');
      if (salvos) {
        const lista = JSON.parse(salvos);
        if (Array.isArray(lista)) {
          const encontrada = lista.find((u: any) => 
            String(u.nomeFantasia || '').toLowerCase().trim() === String(unidadeNome || '').toLowerCase().trim() ||
            String(u.id || '').toLowerCase().trim() === String(unidadeNome || '').toLowerCase().trim()
          );
          if (encontrada && encontrada.id) {
            return String(encontrada.id).toLowerCase().trim();
          }
        }
      }
    } catch {}

    return (unidadeNome || 'pitstop')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'pitstop';
  }, [unidadeNome]);

  // Helper para identificar a unidade logada padronizada e todos os seus apelidos/slugs
  const aliasesUnidade = useMemo(() => {
    const aliases = new Set<string>();
    const limpo = (unidadeNome || 'pitstop').trim().toLowerCase();
    aliases.add(limpo);
    aliases.add(unidadeSlugSanitizada);
    
    const semAcento = limpo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    aliases.add(semAcento);
    
    const slugComTraco = semAcento.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    aliases.add(slugComTraco);
    
    const slugSemTraco = semAcento.replace(/[^a-z0-9]/g, '');
    aliases.add(slugSemTraco);

    // Adiciona palavras-chave individuais (ex: 'pit', 'stop') para não perder correspondência
    semAcento.split(/[^a-z0-9]+/).filter(w => w.length > 2).forEach(p => aliases.add(p));

    try {
      const salvos = localStorage.getItem('hubwash_lava_jatos');
      if (salvos) {
        const lista = JSON.parse(salvos);
        if (Array.isArray(lista)) {
          const encontrada = lista.find((u: any) => 
            String(u.id).toLowerCase() === limpo || 
            String(u.nomeFantasia).toLowerCase() === limpo ||
            String(u.id).toLowerCase() === slugComTraco ||
            String(u.id).toLowerCase() === slugSemTraco ||
            String(u.id).toLowerCase() === unidadeSlugSanitizada
          );
          if (encontrada) {
            if (encontrada.id) aliases.add(String(encontrada.id).toLowerCase());
            if (encontrada.nomeFantasia) aliases.add(String(encontrada.nomeFantasia).toLowerCase());
          }
        }
      }
    } catch {}

    return Array.from(aliases).filter(Boolean);
  }, [unidadeNome, unidadeSlugSanitizada]);

  const unidadeLogada = unidadeSlugSanitizada;

  // 🔄 Ouvinte em tempo real de novos agendamentos criados no celular/PWA
  useEffect(() => {
    const sincronizarStorageLocal = () => {
      try {
        const salvos = localStorage.getItem('hubwash_agendamentos_painel');
        if (salvos) {
          const lista = JSON.parse(salvos);
          if (Array.isArray(lista) && lista.length > 0) {
            setAgendamentos((prev) => {
              const mapa = new Map<string, AgendamentoPWA>();
              prev.forEach(item => mapa.set(item.id, item));
              let novosAdicionados = false;
              lista.forEach((item: any) => {
                const docUnidade = String(item.unidadeId || item.unidadeVinculadaId || item.unidadeSlug || item.unidadeNome || '').toLowerCase().trim();
                const pertence = !docUnidade || aliasesUnidade.some(alias => 
                  docUnidade === alias || docUnidade.includes(alias) || alias.includes(docUnidade)
                );
                if (pertence && !mapa.has(item.id)) {
                  novosAdicionados = true;
                }
                if (pertence) {
                  mapa.set(item.id, item);
                }
              });
              if (novosAdicionados) {
                mostrarToast('🔔 Novo agendamento sincronizado pelo celular!', 'sucesso');
              }
              return Array.from(mapa.values());
            });
          }
        }
      } catch {}
    };

    window.addEventListener('storage', sincronizarStorageLocal);
    window.addEventListener('hubwash_agendamento_criado', sincronizarStorageLocal);
    const intervalStorage = setInterval(sincronizarStorageLocal, 2000);

    return () => {
      window.removeEventListener('storage', sincronizarStorageLocal);
      window.removeEventListener('hubwash_agendamento_criado', sincronizarStorageLocal);
      clearInterval(intervalStorage);
    };
  }, [aliasesUnidade]);

  // Modal de QR Code do Balcão para Cadastro de Clientes
  const [modalQrCode, setModalQrCode] = useState(false);
  const [copiadoQrLink, setCopiadoQrLink] = useState(false);

  // Link 100% HIGIENIZADO SEM ESPAÇOS (abre diretamente o navegador no celular, NUNCA o bloco de notas)
  const linkQrCodeCliente = useMemo(() => {
    const urlOrigem = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')
      ? window.location.origin
      : URL_BASE_NETLIFY;
    return `${urlOrigem}/?unidade=${encodeURIComponent(unidadeSlugSanitizada)}&rota=cadastro`;
  }, [unidadeSlugSanitizada]);

  const copiarLinkQrCode = () => {
    navigator.clipboard.writeText(linkQrCodeCliente);
    setCopiadoQrLink(true);
    mostrarToast('Link de cadastro de clientes copiado com sucesso!', 'sucesso');
    setTimeout(() => setCopiadoQrLink(false), 2000);
  };

  // Status da Nuvem Firebase (PC <-> Celular)
  const [firebaseStatus, setFirebaseStatus] = useState(() => getFirebaseStatus());
  const [modalFirebase, setModalFirebase] = useState(false);
  const [firebaseApiKeyInput, setFirebaseApiKeyInput] = useState('');
  const [firebaseProjectIdInput, setFirebaseProjectIdInput] = useState('');
  const [firebaseJsonInput, setFirebaseJsonInput] = useState('');

  // Sincronização Manual sob Demanda
  const [sincronizandoManual, setSincronizandoManual] = useState(false);

  const sincronizarAgendamentosAgora = async () => {
    setSincronizandoManual(true);
    try {
      let carregados = 0;

      // 1. Tenta buscar no Firebase Firestore com timeout de segurança
      if (db) {
        try {
          const snap: any = await Promise.race([
            getDocs(collection(db, 'agendamentos')),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ]);
          if (snap && 'forEach' in snap) {
            const agsFirestore: AgendamentoPWA[] = [];
            snap.forEach((docSnap: any) => {
              const data = docSnap.data();
              const docUnidade = String(data.unidadeId || data.unidadeVinculadaId || data.unidadeSlug || data.unidadeNome || '').toLowerCase();
              const pertence = !docUnidade || aliasesUnidade.some(alias => 
                docUnidade === alias || docUnidade.includes(alias) || alias.includes(docUnidade)
              );

            if (pertence) {
              const veiculoFormatado = data.veiculo || (data.modelo ? `${data.modelo}${data.placa ? ` (${data.placa})` : ''}` : 'Veículo Agendado');
              agsFirestore.push({
                id: docSnap.id,
                cliente: data.cliente || data.nome || 'Cliente App',
                telefone: data.telefone || data.contato || '(11) 99999-0000',
                veiculo: veiculoFormatado,
                servico: data.servico || 'Lavagem Completa',
                data: data.data || 'Hoje',
                horario: data.horario || '12:00',
                status: (data.status as any) || 'Pendente'
              });
            }
          });

          if (agsFirestore.length > 0) {
            setAgendamentos((prev) => {
              const mapa = new Map<string, AgendamentoPWA>();
              agsFirestore.forEach((a) => mapa.set(a.id, a));
              prev.forEach((a) => {
                if (!mapa.has(a.id)) mapa.set(a.id, a);
              });
              const final = Array.from(mapa.values());
              try {
                localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(final));
              } catch {}
              return final;
            });
            carregados += agsFirestore.length;
          }
        }
      } catch (fErr) {
        console.warn('Erro Firestore busca manual:', fErr);
      }
    }

      // 2. Tenta servidor central se houver
      try {
        const dados = await buscarDadosSincronizados(unidadeLogada);
        if (dados && Array.isArray(dados.agendamentos) && dados.agendamentos.length > 0) {
          const agsServidor: AgendamentoPWA[] = dados.agendamentos.map((a: any) => ({
            id: a.id,
            cliente: a.cliente || 'Cliente App',
            telefone: a.telefone || '(11) 99999-0000',
            veiculo: a.veiculo || 'Veículo Agendado',
            servico: a.servico || 'Lavagem Completa',
            data: a.data || 'Hoje',
            horario: a.horario || '12:00',
            status: a.status || 'Pendente'
          }));
          setAgendamentos((prev) => {
            const mapa = new Map<string, AgendamentoPWA>();
            agsServidor.forEach((a) => mapa.set(a.id, a));
            prev.forEach((a) => {
              if (!mapa.has(a.id)) mapa.set(a.id, a);
            });
            const final = Array.from(mapa.values());
            localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(final));
            return final;
          });
          carregados += agsServidor.length;
        }
      } catch {}

      // 3. Verifica armazenamento local compartilhado
      try {
        const salvos = localStorage.getItem('hubwash_agendamentos_painel');
        if (salvos) {
          const lista = JSON.parse(salvos);
          if (Array.isArray(lista) && lista.length > 0) {
            setAgendamentos((prev) => {
              const mapa = new Map<string, AgendamentoPWA>();
              prev.forEach((a) => mapa.set(a.id, a));
              lista.forEach((a: any) => {
                const docUnidade = String(a.unidadeId || a.unidadeVinculadaId || a.unidadeSlug || a.unidadeNome || '').toLowerCase();
                const pertence = !docUnidade || aliasesUnidade.some(alias => 
                  docUnidade === alias || docUnidade.includes(alias) || alias.includes(docUnidade)
                );
                if (pertence && !mapa.has(a.id)) {
                  mapa.set(a.id, a);
                  carregados++;
                }
              });
              return Array.from(mapa.values());
            });
          }
        }
      } catch {}

      if (carregados > 0) {
        mostrarToast(`Sincronizado! ${carregados} agendamentos verificados na nuvem.`, 'sucesso');
      } else {
        mostrarToast('Sincronização concluída. Nenhum novo agendamento pendente.', 'info');
      }
    } catch (e) {
      mostrarToast('Aviso: Verifique a conexão com o Firebase Firestore.', 'erro');
    } finally {
      setSincronizandoManual(false);
    }
  };

  // ==========================================
  // 8. BANNERS PROMOCIONAIS
  // ==========================================
  const [banners, setBanners] = useState<BannerPromocional[]>(() => {
    const salvos = localStorage.getItem('hubwash_banners');
    return salvos ? JSON.parse(salvos) : [];
  });
  const [novoBannerTitulo, setNovoBannerTitulo] = useState('');
  const [novoBannerImg, setNovoBannerImg] = useState('');

  useEffect(() => {
    localStorage.setItem('hubwash_banners', JSON.stringify(banners));
    if (unidadeLogada) {
      localStorage.setItem(`hubwash_banners_${unidadeLogada}`, JSON.stringify(banners));
    }
  }, [banners, unidadeLogada]);

  // ==========================================
  // 9. SERVIÇOS & VALORES DO LAVA-JATO
  // ==========================================
  const servicosPadraoLista: ServicoLavaJato[] = useMemo(() => [
    { id: 'srv_1', nome: 'Lavagem Simples', valor: 40.00, tempoMedioMinutos: 35, categoria: 'Lavagem', descricao: 'Ducha externa de alta pressão, shampoo com cera e secagem.', ativo: true, unidadeId: unidadeLogada },
    { id: 'srv_2', nome: 'Lavagem Completa', valor: 65.00, tempoMedioMinutos: 50, categoria: 'Lavagem', descricao: 'Lavagem externa + aspiração interna detalhada, painel e pretinho.', ativo: true, unidadeId: unidadeLogada },
    { id: 'srv_3', nome: 'Lavagem Completa + Cera Líquida', valor: 85.00, tempoMedioMinutos: 60, categoria: 'Lavagem', descricao: 'Lavagem completa com aplicação de cera carnaúba para brilho e proteção.', ativo: true, unidadeId: unidadeLogada },
    { id: 'srv_4', nome: 'Higienização Interna dos Bancos', valor: 160.00, tempoMedioMinutos: 120, categoria: 'Higienização', descricao: 'Lavagem a seco profunda dos estofados com extração e bactericida.', ativo: true, unidadeId: unidadeLogada },
    { id: 'srv_5', nome: 'Polimento Técnico Cristalizado', valor: 280.00, tempoMedioMinutos: 180, categoria: 'Estética', descricao: 'Descontaminação, polimento técnico e selante protetor.', ativo: true, unidadeId: unidadeLogada },
    { id: 'srv_6', nome: 'Lavagem de Motor e Chassi', valor: 90.00, tempoMedioMinutos: 45, categoria: 'Lavagem', descricao: 'Desengraxe térmico detalhado e verniz protetor de motor.', ativo: true, unidadeId: unidadeLogada }
  ], [unidadeLogada]);

  const [servicos, setServicos] = useState<ServicoLavaJato[]>(() => {
    try {
      const salvos = localStorage.getItem('hubwash_servicos');
      if (salvos) {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: 'srv_1', nome: 'Lavagem Simples', valor: 40.00, tempoMedioMinutos: 35, categoria: 'Lavagem', descricao: 'Ducha externa de alta pressão, shampoo com cera e secagem.', ativo: true, unidadeId: 'pitstop' },
      { id: 'srv_2', nome: 'Lavagem Completa', valor: 65.00, tempoMedioMinutos: 50, categoria: 'Lavagem', descricao: 'Lavagem externa + aspiração interna detalhada, painel e pretinho.', ativo: true, unidadeId: 'pitstop' },
      { id: 'srv_3', nome: 'Lavagem Completa + Cera Líquida', valor: 85.00, tempoMedioMinutos: 60, categoria: 'Lavagem', descricao: 'Lavagem completa com aplicação de cera carnaúba para brilho e proteção.', ativo: true, unidadeId: 'pitstop' },
      { id: 'srv_4', nome: 'Higienização Interna dos Bancos', valor: 160.00, tempoMedioMinutos: 120, categoria: 'Higienização', descricao: 'Lavagem a seco profunda dos estofados com extração e bactericida.', ativo: true, unidadeId: 'pitstop' },
      { id: 'srv_5', nome: 'Polimento Técnico Cristalizado', valor: 280.00, tempoMedioMinutos: 180, categoria: 'Estética', descricao: 'Descontaminação, polimento técnico e selante protetor.', ativo: true, unidadeId: 'pitstop' },
      { id: 'srv_6', nome: 'Lavagem de Motor e Chassi', valor: 90.00, tempoMedioMinutos: 45, categoria: 'Lavagem', descricao: 'Desengraxe térmico detalhado e verniz protetor de motor.', ativo: true, unidadeId: 'pitstop' }
    ];
  });

  const [novoServicoNome, setNovoServicoNome] = useState('');
  const [novoServicoValor, setNovoServicoValor] = useState('');
  const [novoServicoTempo, setNovoServicoTempo] = useState('45');
  const [novoServicoCategoria, setNovoServicoCategoria] = useState<'Lavagem' | 'Estética' | 'Higienização' | 'Adicional'>('Lavagem');
  const [novoServicoDescricao, setNovoServicoDescricao] = useState('');
  const [servicoEditandoId, setServicoEditandoId] = useState<string | null>(null);
  const [filtroCategoriaServico, setFiltroCategoriaServico] = useState<string>('Todos');
  const [buscaServico, setBuscaServico] = useState('');

  useEffect(() => {
    localStorage.setItem('hubwash_servicos', JSON.stringify(servicos));
    if (unidadeLogada) {
      localStorage.setItem(`hubwash_servicos_${unidadeLogada}`, JSON.stringify(servicos));
    }
  }, [servicos, unidadeLogada]);

  const isFirstLoadAgendamentos = useRef(true);

  // ➡️ SINCRONIZAÇÃO EM TEMPO REAL ENTRE MOBILE E COMPUTADOR/NOTEBOOK (API SERVIDOR + FIRESTORE)
  useEffect(() => {
    let ativo = true;

    // 1. Sincronização periódica com o servidor central (Garante comunicação PC <-> Mobile se ativo)
    const sincronizarComServidor = async () => {
      try {
        const dados = await buscarDadosSincronizados(unidadeLogada);
        if (!ativo || !dados) return;

        if (dados.clientes && dados.clientes.length > 0) {
          const clientesMapeados: ClienteFidelidade[] = dados.clientes
            .filter((c: any) => {
              const docUnidade = String(c.unidadeVinculadaId || c.unidadeId || c.unidadeSlug || c.unidadeNome || '').toLowerCase();
              return !docUnidade || aliasesUnidade.some(alias => 
                docUnidade === alias || 
                docUnidade.includes(alias) || 
                alias.includes(docUnidade)
              );
            })
            .map((c: any) => {
              const veiculoFormatado = c.modelo
                ? `${c.modelo}${c.placa ? ` (${c.placa})` : ''}`
                : (c.veiculoPrincipal || (c.placa ? `Placa: ${c.placa}` : 'Veículo Cadastrado'));

              return {
                id: c.id,
                nome: c.nome || 'Cliente',
                email: c.email || '',
                telefone: c.contato || c.telefone || '(11) 99999-0000',
                veiculoPrincipal: veiculoFormatado,
                pontos: typeof c.pontosFidelidade === 'number' ? c.pontosFidelidade : (typeof c.pontos === 'number' ? c.pontos : 0),
                totalGasto: c.totalGasto || 0
              };
            });

          setClientes((prev) => {
            const mapa = new Map<string, ClienteFidelidade>();
            prev.forEach((item) => mapa.set(item.id, item));
            clientesMapeados.forEach((item) => mapa.set(item.id, item));
            return Array.from(mapa.values());
          });
        }

        if (dados.agendamentos && dados.agendamentos.length > 0) {
          const agendamentosMapeados: AgendamentoPWA[] = dados.agendamentos
            .filter((a: any) => {
              const docUnidade = String(a.unidadeId || a.unidadeVinculadaId || a.unidadeSlug || a.unidadeNome || '').toLowerCase();
              return !docUnidade || aliasesUnidade.some(alias => 
                docUnidade === alias || 
                docUnidade.includes(alias) || 
                alias.includes(docUnidade)
              );
            })
            .map((a: any) => {
              const veiculoFormatado = a.veiculo || (a.modelo ? `${a.modelo}${a.placa ? ` (${a.placa})` : ''}` : 'Veículo Agendado');
              return {
                id: a.id,
                cliente: a.cliente || a.nome || 'Cliente App',
                telefone: a.telefone || a.contato || '(11) 99999-0000',
                veiculo: veiculoFormatado,
                servico: a.servico || 'Lavagem Completa',
                data: a.data || 'Hoje',
                horario: a.horario || '12:00',
                status: (a.status as any) || 'Pendente'
              };
            });

          setAgendamentos((prev) => {
            const mapa = new Map<string, AgendamentoPWA>();
            prev.forEach((item) => mapa.set(item.id, item));
            agendamentosMapeados.forEach((item) => mapa.set(item.id, item));
            return Array.from(mapa.values());
          });
        }

        if (dados.banners && Array.isArray(dados.banners) && dados.banners.length > 0) {
          setBanners((prev) => {
            const mapa = new Map<string, BannerPromocional>();
            prev.forEach((b) => mapa.set(b.id, b));
            dados.banners.forEach((b: any) => mapa.set(b.id, b));
            return Array.from(mapa.values());
          });
        }

        if (dados.servicos && Array.isArray(dados.servicos) && dados.servicos.length > 0) {
          setServicos((prev) => {
            const mapa = new Map<string, ServicoLavaJato>();
            prev.forEach((s) => mapa.set(s.id, s));
            dados.servicos.forEach((s: any) => mapa.set(s.id, s));
            return Array.from(mapa.values());
          });
        }
      } catch (err) {
        // Fallback silencioso
      }
    };

    sincronizarComServidor();
    const intervalId = isApiServidorDisponivel() ? setInterval(sincronizarComServidor, 4000) : null;

    // 2. Ouvintes em tempo real do Firebase Firestore (Canal direto PC <-> Mobile)
    let unsubClientes: (() => void) | null = null;
    let unsubAgendamentos: (() => void) | null = null;
    let unsubBanners: (() => void) | null = null;
    let unsubServicos: (() => void) | null = null;

    if (db) {
      try {
        const qClientes = query(collection(db, 'clientes'));
        unsubClientes = onSnapshot(
          qClientes,
          (snapshot: any) => {
            const clientesFirestore: ClienteFidelidade[] = [];
            snapshot.forEach((docSnap: any) => {
              const data = docSnap.data();
              const docUnidade = String(data.unidadeVinculadaId || data.unidadeId || data.unidadeSlug || data.unidadeNome || '').toLowerCase();
              
              const pertence = !docUnidade || aliasesUnidade.some(alias => 
                docUnidade === alias || 
                docUnidade.includes(alias) || 
                alias.includes(docUnidade)
              );

              if (pertence) {
                const veiculoFormatado = data.modelo
                  ? `${data.modelo}${data.placa ? ` (${data.placa})` : ''}`
                  : (data.veiculoPrincipal || (data.placa ? `Placa: ${data.placa}` : 'Veículo Cadastrado'));

                clientesFirestore.push({
                  id: docSnap.id,
                  nome: data.nome || 'Cliente',
                  email: data.email || '',
                  telefone: data.contato || data.telefone || '(11) 99999-0000',
                  veiculoPrincipal: veiculoFormatado,
                  pontos: typeof data.pontosFidelidade === 'number' ? data.pontosFidelidade : (typeof data.pontos === 'number' ? data.pontos : 0),
                  totalGasto: data.totalGasto || 0
                });
              }
            });

            if (clientesFirestore.length > 0) {
              setClientes((prev) => {
                const mapa = new Map<string, ClienteFidelidade>();
                const getChaveCliente = (c: ClienteFidelidade) => 
                  (c.email && c.email.trim().toLowerCase()) || 
                  (c.telefone && c.telefone.replace(/\D/g, '')) || 
                  c.id;

                clientesFirestore.forEach((c) => {
                  mapa.set(getChaveCliente(c), c);
                });
                prev.forEach((c) => {
                  const chave = getChaveCliente(c);
                  if (!mapa.has(chave)) {
                    mapa.set(chave, c);
                  }
                });
                const listaFinal = Array.from(mapa.values());
                try {
                  localStorage.setItem('hubwash_clientes_fidelidade', JSON.stringify(listaFinal));
                } catch {}
                return listaFinal;
              });
            }
          },
          (error: any) => {
            console.warn('Firestore onSnapshot clientes (Painel):', error);
          }
        );

        const qAgendamentos = query(collection(db, 'agendamentos'));
        unsubAgendamentos = onSnapshot(
          qAgendamentos,
          (snapshot: any) => {
            const agendamentosFirestore: AgendamentoPWA[] = [];
            snapshot.forEach((docSnap: any) => {
              const data = docSnap.data();
              const docUnidade = String(data.unidadeId || data.unidadeVinculadaId || data.unidadeSlug || data.unidadeNome || '').toLowerCase();
              
              const pertence = !docUnidade || aliasesUnidade.some(alias => 
                docUnidade === alias || 
                docUnidade.includes(alias) || 
                alias.includes(docUnidade)
              );

              if (pertence) {
                const veiculoFormatado = data.veiculo || (data.modelo ? `${data.modelo}${data.placa ? ` (${data.placa})` : ''}` : 'Veículo Agendado');
                agendamentosFirestore.push({
                  id: docSnap.id,
                  cliente: data.cliente || data.nome || 'Cliente App',
                  telefone: data.telefone || data.contato || '(11) 99999-0000',
                  veiculo: veiculoFormatado,
                  servico: data.servico || 'Lavagem Completa',
                  data: data.data || 'Hoje',
                  horario: data.horario || '12:00',
                  status: (data.status as any) || 'Pendente'
                });
              }
            });

            // Notifica em tempo real no PC se houver novo agendamento vindo do celular
            if (!isFirstLoadAgendamentos.current && snapshot.docChanges) {
              try {
                snapshot.docChanges().forEach((change: any) => {
                  if (change.type === 'added') {
                    const d = change.doc.data();
                    mostrarToast(`🔔 Novo agendamento via celular: ${d.cliente || 'Cliente'} às ${d.horario || ''} (${d.servico || 'Lavagem'})`, 'sucesso');
                  }
                });
              } catch {}
            }
            isFirstLoadAgendamentos.current = false;

            if (agendamentosFirestore.length > 0) {
              setAgendamentos((prev) => {
                const mapa = new Map<string, AgendamentoPWA>();
                agendamentosFirestore.forEach((a) => mapa.set(a.id, a));
                prev.forEach((a) => {
                  if (!mapa.has(a.id)) mapa.set(a.id, a);
                });
                const listaFinal = Array.from(mapa.values());
                try {
                  localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(listaFinal));
                } catch {}
                return listaFinal;
              });
            }
          },
          (error: any) => {
            console.warn('Firestore onSnapshot agendamentos (Painel):', error);
          }
        );

        const qBanners = query(collection(db, 'banners'));
        unsubBanners = onSnapshot(
          qBanners,
          (snapshot: any) => {
            const bannersFirestore: BannerPromocional[] = [];
            snapshot.forEach((docSnap: any) => {
              const data = docSnap.data();
              const docUnidade = String(data.unidadeId || '').toLowerCase();
              const pertence = !docUnidade || aliasesUnidade.some(alias => 
                docUnidade === alias || docUnidade.includes(alias) || alias.includes(docUnidade)
              );
              if (pertence) {
                bannersFirestore.push({
                  id: docSnap.id,
                  titulo: data.titulo || 'Promoção',
                  status: data.status || 'Ativo',
                  imagem: data.imagem || '',
                  link: data.link || '',
                  unidadeId: data.unidadeId || unidadeLogada,
                  descricao: data.descricao || '',
                  desconto: data.desconto || ''
                });
              }
            });

            if (bannersFirestore.length > 0) {
              setBanners((prev) => {
                const mapa = new Map<string, BannerPromocional>();
                bannersFirestore.forEach((b) => mapa.set(b.id, b));
                prev.forEach((b) => {
                  if (!mapa.has(b.id)) mapa.set(b.id, b);
                });
                return Array.from(mapa.values());
              });
            }
          },
          (error: any) => {
            console.warn('Firestore onSnapshot banners (Painel):', error);
          }
        );

        const qServicos = query(collection(db, 'servicos'));
        unsubServicos = onSnapshot(
          qServicos,
          (snapshot: any) => {
            const servicosFirestore: ServicoLavaJato[] = [];
            snapshot.forEach((docSnap: any) => {
              const data = docSnap.data();
              const docUnidade = String(data.unidadeId || '').toLowerCase();
              const pertence = !docUnidade || aliasesUnidade.some(alias => 
                docUnidade === alias || docUnidade.includes(alias) || alias.includes(docUnidade)
              );
              if (pertence) {
                servicosFirestore.push({
                  id: docSnap.id,
                  nome: data.nome || 'Serviço',
                  valor: typeof data.valor === 'number' ? data.valor : parseFloat(data.valor) || 0,
                  tempoMedioMinutos: data.tempoMedioMinutos || 45,
                  categoria: data.categoria || 'Lavagem',
                  descricao: data.descricao || '',
                  ativo: data.ativo !== undefined ? data.ativo : true,
                  unidadeId: data.unidadeId || unidadeLogada
                });
              }
            });

            if (servicosFirestore.length > 0) {
              setServicos((prev) => {
                const mapa = new Map<string, ServicoLavaJato>();
                servicosFirestore.forEach((s) => mapa.set(s.id, s));
                prev.forEach((s) => {
                  if (!mapa.has(s.id)) mapa.set(s.id, s);
                });
                return Array.from(mapa.values());
              });
            }
          },
          (error: any) => {
            console.warn('Firestore onSnapshot servicos (Painel):', error);
          }
        );
      } catch (err) {
        console.warn('Erro ao configurar listeners do Firestore:', err);
      }
    }

    return () => {
      ativo = false;
      if (intervalId) clearInterval(intervalId);
      if (unsubClientes) unsubClientes();
      if (unsubAgendamentos) unsubAgendamentos();
      if (unsubBanners) unsubBanners();
      if (unsubServicos) unsubServicos();
    };
  }, [aliasesUnidade, unidadeLogada]);

  // ==========================================
  // LOGICA: EXCLUSÃO CONFIRMADA (MODAL INTERNO)
  // ==========================================
  const confirmarExclusao = async () => {
    if (!itemParaExcluir) return;

    const { tipo, id, nome } = itemParaExcluir;

    if (tipo === 'fila') {
      setVeiculosFila(prev => prev.filter(item => item.id !== id));
    } else if (tipo === 'agendamento') {
      setAgendamentos(prev => prev.filter(item => item.id !== id));
      try {
        await excluirAgendamentoServidor(id);
        if (db && !id.startsWith('17') && isNaN(Number(id))) {
          await deleteDoc(doc(db, 'agendamentos', id));
        }
      } catch (err) {
        console.warn('Erro ao remover agendamento:', err);
      }
    } else if (tipo === 'checklist') {
      setChecklists(prev => prev.filter(item => item.id !== id));
    } else if (tipo === 'cliente') {
      setClientes(prev => prev.filter(item => item.id !== id));
      try {
        await excluirClienteServidor(id);
        if (db && !id.startsWith('17') && isNaN(Number(id))) {
          await deleteDoc(doc(db, 'clientes', id));
        }
      } catch (err) {
        console.warn('Erro ao remover cliente:', err);
      }
    } else if (tipo === 'funcionario') {
      setFuncionarios(prev => prev.filter(item => item.id !== id));
    } else if (tipo === 'produto') {
      setProdutos(prev => prev.filter(item => item.id !== id));
    } else if (tipo === 'movimentacao') {
      setMovimentacoesCaixa(prev => prev.filter(item => item.id !== id));
    } else if (tipo === 'banner') {
      setBanners(prev => prev.filter(item => item.id !== id));
      try {
        await excluirBannerServidor(id);
        if (db && !id.startsWith('17') && isNaN(Number(id))) {
          await deleteDoc(doc(db, 'banners', id));
        }
      } catch (err) {
        console.warn('Erro ao remover banner:', err);
      }
    } else if (tipo === 'servico') {
      setServicos(prev => prev.filter(item => item.id !== id));
      try {
        await excluirServicoServidor(id);
        if (db && !id.startsWith('srv_') && isNaN(Number(id))) {
          await deleteDoc(doc(db, 'servicos', id));
        }
      } catch (err) {
        console.warn('Erro ao remover serviço:', err);
      }
    }

    mostrarToast(`"${nome}" foi excluído com sucesso!`, 'info');
    setItemParaExcluir(null);
  };

  // ==========================================
  // FUNÇÕES DE AÇÃO
  // ==========================================

  // Avançar status da Fila
  const avancarStatusFila = (id: string) => {
    setVeiculosFila(veiculosFila.map(veiculo => {
      if (veiculo.id === id) {
        let proximoStatus: ItemFila['status'] = veiculo.status;

        if (veiculo.status === 'Espera') {
          proximoStatus = 'Lavando';
          mostrarToast(`Veículo "${veiculo.veiculo}" agora está em Lavagem!`, 'info');
        } else if (veiculo.status === 'Lavando') {
          proximoStatus = 'Pronto';
          // GERAR COMISSÃO AUTOMÁTICA
          const func = funcionarios.find(f => f.nome === veiculo.funcionario);
          const perc = func ? func.comissaoPorcentagem : 30;
          const valorComissao = (veiculo.valor * perc) / 100;

          setFuncionarios(funcionarios.map(f =>
            f.nome === veiculo.funcionario
              ? { ...f, totalComissaoAcumulada: f.totalComissaoAcumulada + valorComissao }
              : f
          ));

          // LANÇAR NO CAIXA AUTOMATICAMENTE
          setMovimentacoesCaixa([
            { id: String(Date.now()), descricao: `Recebimento: ${veiculo.servico} (${veiculo.veiculo})`, tipo: 'entrada', valor: veiculo.valor, data: 'Hoje' },
            ...movimentacoesCaixa
          ]);

          mostrarToast(`Veículo "${veiculo.veiculo}" pronto! R$ ${valorComissao.toFixed(2)} de comissão gerada e R$ ${veiculo.valor.toFixed(2)} lançado no Caixa.`, 'sucesso');
        } else if (veiculo.status === 'Pronto') {
          proximoStatus = 'Entregue';
          mostrarToast(`Veículo "${veiculo.veiculo}" finalizado e entregue ao cliente!`, 'sucesso');
        }

        return { ...veiculo, status: proximoStatus };
      }
      return veiculo;
    }));
  };

  // Adicionar Veículo na Fila
  const handleCadastrarFila = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoClienteFila.trim() || !novoVeiculoFila.trim()) {
      mostrarToast('Preencha o nome do cliente e veículo.', 'erro');
      return;
    }

    const novoItem: ItemFila = {
      id: String(Date.now()),
      cliente: novoClienteFila.trim(),
      veiculo: novoVeiculoFila.trim(),
      servico: novoServicoFila,
      status: 'Espera',
      funcionario: novoFuncFila,
      valor: parseFloat(novoValorFila) || 50,
      horaEntrada: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setVeiculosFila([novoItem, ...veiculosFila]);
    setNovoClienteFila('');
    setNovoVeiculoFila('');
    mostrarToast(`Veículo ${novoItem.veiculo} adicionado na fila de lavagem!`, 'sucesso');
  };

  // Pontos de Fidelidade (Exclusivo do Administrador)
  const adicionarPontoCliente = async (id: string) => {
    const clienteAlvo = clientes.find(c => c.id === id);
    if (!clienteAlvo) return;
    const novosPontos = clienteAlvo.pontos + 1 >= 10 ? 0 : clienteAlvo.pontos + 1;

    setClientes(clientes.map(c => c.id === id ? { ...c, pontos: novosPontos } : c));

    if (novosPontos === 0) {
      mostrarToast(`🎉 PARABÉNS! ${clienteAlvo.nome} atingiu 10 pontos e ganhou UMA LAVAGEM GRÁTIS!`, 'sucesso');
    } else {
      mostrarToast(`+1 Ponto adicionado para ${clienteAlvo.nome}. Total: ${novosPontos}/10`, 'sucesso');
    }

    try {
      await atualizarPontosClienteServidor(id, novosPontos);
      if (db && !id.startsWith('17') && isNaN(Number(id))) {
        await updateDoc(doc(db, 'clientes', id), {
          pontosFidelidade: novosPontos,
          pontos: novosPontos
        });
      }
    } catch (err) {
      console.warn('Erro ao atualizar pontos:', err);
    }
  };

  const removerPontoCliente = async (id: string) => {
    const clienteAlvo = clientes.find(c => c.id === id);
    if (!clienteAlvo) return;
    const novosPontos = Math.max(0, clienteAlvo.pontos - 1);

    setClientes(clientes.map(c => c.id === id ? { ...c, pontos: novosPontos } : c));
    mostrarToast(`Ponto ajustado para ${clienteAlvo.nome}. Total: ${novosPontos}/10`, 'info');

    try {
      await atualizarPontosClienteServidor(id, novosPontos);
      if (db && !id.startsWith('17') && isNaN(Number(id))) {
        await updateDoc(doc(db, 'clientes', id), {
          pontosFidelidade: novosPontos,
          pontos: novosPontos
        });
      }
    } catch (err) {
      console.warn('Erro ao atualizar pontos:', err);
    }
  };

  const zerarPontosCliente = async (id: string) => {
    const clienteAlvo = clientes.find(c => c.id === id);
    if (!clienteAlvo) return;

    setClientes(clientes.map(c => c.id === id ? { ...c, pontos: 0 } : c));
    mostrarToast(`Pontos de ${clienteAlvo.nome} zerados / resgatados!`, 'info');

    try {
      await atualizarPontosClienteServidor(id, 0);
      if (db && !id.startsWith('17') && isNaN(Number(id))) {
        await updateDoc(doc(db, 'clientes', id), {
          pontosFidelidade: 0,
          pontos: 0
        });
      }
    } catch (err) {
      console.warn('Erro ao zerar pontos:', err);
    }
  };

  // Pontuar cliente diretamente pelo agendamento recebido
  const handlePontuarAgendamento = async (ag: AgendamentoPWA) => {
    const termoNome = ag.cliente.trim().toLowerCase();
    const termoTel = ag.telefone.replace(/\D/g, '');

    const clienteExistente = clientes.find(
      (c) =>
        c.nome.trim().toLowerCase() === termoNome ||
        (termoTel.length >= 8 && c.telefone.replace(/\D/g, '').includes(termoTel))
    );

    if (clienteExistente) {
      await adicionarPontoCliente(clienteExistente.id);
    } else {
      const emailGerado = `${ag.cliente.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')}@email.com`;
      const tempId = `cli_${Date.now()}`;
      const novoCli: ClienteFidelidade = {
        id: tempId,
        nome: ag.cliente,
        email: emailGerado,
        telefone: ag.telefone,
        veiculoPrincipal: ag.veiculo,
        pontos: 1,
        totalGasto: 0
      };

      setClientes([novoCli, ...clientes]);

      try {
        await registrarClienteServidor({
          id: tempId,
          nome: novoCli.nome,
          email: emailGerado,
          senhaAcesso: '123456',
          contato: novoCli.telefone,
          telefone: novoCli.telefone,
          modelo: novoCli.veiculoPrincipal,
          veiculoPrincipal: novoCli.veiculoPrincipal,
          placa: '',
          unidadeVinculadaId: unidadeLogada,
          unidadeId: unidadeLogada,
          unidadeNome: unidadeNome,
          unidadeSlug: unidadeLogada,
          pontosFidelidade: 1,
          pontos: 1,
          createdAt: new Date().toISOString()
        });

        if (db) {
          await addDoc(collection(db, 'clientes'), {
            nome: novoCli.nome,
            email: emailGerado,
            senhaAcesso: '123456',
            contato: novoCli.telefone,
            telefone: novoCli.telefone,
            modelo: novoCli.veiculoPrincipal,
            veiculoPrincipal: novoCli.veiculoPrincipal,
            placa: '',
            unidadeVinculadaId: unidadeLogada,
            unidadeId: unidadeLogada,
            unidadeNome: unidadeNome,
            unidadeSlug: unidadeLogada,
            pontosFidelidade: 1,
            pontos: 1,
            createdAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('Erro ao gravar cliente pontuado:', e);
      }

      mostrarToast(`🎉 +1 Ponto Fidelidade creditado para ${ag.cliente}!`, 'sucesso');
    }
  };

  // Atualizar Status do Agendamento
  const handleAtualizarStatusAgendamento = async (id: string, novoStatus: 'Pendente' | 'Confirmado' | 'Concluido' | 'Cancelado') => {
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status: novoStatus } : a)));

    try {
      await atualizarStatusAgendamentoServidor(id, novoStatus);
      if (db && !id.startsWith('17') && isNaN(Number(id))) {
        await updateDoc(doc(db, 'agendamentos', id), {
          status: novoStatus
        });
      }
    } catch (e) {
      console.warn('Erro ao atualizar status do agendamento:', e);
    }

    mostrarToast(`Agendamento atualizado para "${novoStatus}"!`, 'sucesso');
  };

  // Cadastrar Cliente Fidelidade (Começa estritamente com 0 Pontos)
  const handleCadastrarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCliNome.trim()) {
      mostrarToast('Digite o nome do cliente.', 'erro');
      return;
    }

    const emailLimpo = novoCliEmail.trim() || `${novoCliNome.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')}@email.com`;
    const tempId = `cli_${Date.now()}`;
    const novoCli: ClienteFidelidade = {
      id: tempId,
      nome: novoCliNome.trim(),
      email: emailLimpo,
      telefone: novoCliTel.trim() || 'Não informado',
      veiculoPrincipal: novoCliVeiculo.trim() || 'Não informado',
      pontos: 0,
      totalGasto: 0
    };

    setClientes([novoCli, ...clientes]);
    setNovoCliNome('');
    setNovoCliEmail('');
    setNovoCliTel('');
    setNovoCliVeiculo('');

    try {
      await registrarClienteServidor({
        id: tempId,
        nome: novoCli.nome,
        email: emailLimpo,
        senhaAcesso: '123456',
        contato: novoCli.telefone,
        telefone: novoCli.telefone,
        modelo: novoCli.veiculoPrincipal,
        veiculoPrincipal: novoCli.veiculoPrincipal,
        placa: '',
        unidadeVinculadaId: unidadeLogada,
        unidadeId: unidadeLogada,
        unidadeNome: unidadeNome,
        unidadeSlug: unidadeLogada,
        pontosFidelidade: 0,
        pontos: 0,
        createdAt: new Date().toISOString()
      });

      if (db) {
        await addDoc(collection(db, 'clientes'), {
          nome: novoCli.nome,
          email: emailLimpo,
          senhaAcesso: '123456',
          contato: novoCli.telefone,
          telefone: novoCli.telefone,
          modelo: novoCli.veiculoPrincipal,
          veiculoPrincipal: novoCli.veiculoPrincipal,
          placa: '',
          unidadeVinculadaId: unidadeLogada,
          unidadeId: unidadeLogada,
          unidadeNome: unidadeNome,
          unidadeSlug: unidadeLogada,
          pontosFidelidade: 0,
          pontos: 0,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Cliente salvo localmente:', err);
    }

    mostrarToast(`Cliente ${novoCli.nome} (${emailLimpo}) cadastrado com sucesso (0 pontos)!`, 'sucesso');
  };

  // Cadastro de Funcionário
  const handleCadastrarFuncionario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFuncNome.trim()) {
      mostrarToast('Digite o nome do funcionário.', 'erro');
      return;
    }

    const novo: Funcionario = {
      id: String(Date.now()),
      nome: novoFuncNome.trim(),
      cargo: novoFuncCargo,
      comissaoPorcentagem: Number(novoFuncComissao) || 30,
      totalComissaoAcumulada: 0,
      telefone: novoFuncTel.trim() || '(11) 90000-0000'
    };

    setFuncionarios([...funcionarios, novo]);
    setNovoFuncNome('');
    setNovoFuncTel('');
    mostrarToast(`Funcionário ${novo.nome} adicionado com comissão de ${novo.comissaoPorcentagem}%!`, 'sucesso');
  };

  // Zerar comissão do funcionário (pagamento realizado)
  const zerarComissao = (id: string, nome: string) => {
    setFuncionarios(funcionarios.map(f => f.id === id ? { ...f, totalComissaoAcumulada: 0 } : f));
    mostrarToast(`Comissão de ${nome} foi marcada como paga e zerada!`, 'sucesso');
  };

  // Criar Checklist com Avarias
  const handleSalvarChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCheckVeiculo.trim()) {
      mostrarToast('Informe o veículo para a vistoria.', 'erro');
      return;
    }

    const novo: ItemChecklist = {
      id: String(Date.now()),
      veiculo: novoCheckVeiculo.trim(),
      avarias: novoCheckAvaria.trim() || 'Nenhuma avaria observada',
      fotos: 3,
      data: new Date().toLocaleDateString('pt-BR'),
      nivelCombustivel: novoCheckCombustivel,
      pertences: novoCheckPertences.trim() || 'Nenhum'
    };

    setChecklists([novo, ...checklists]);
    setNovoCheckVeiculo('');
    setNovoCheckAvaria('');
    setNovoCheckPertences('');
    mostrarToast('Vistoria e Checklist registrados com sucesso!', 'sucesso');
  };

  // Lançamento de Caixa
  const handleAdicionarCaixa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDescCaixa.trim() || !novoValorCaixa) {
      mostrarToast('Preencha a descrição e valor.', 'erro');
      return;
    }

    const nova: MovimentacaoCaixa = {
      id: String(Date.now()),
      descricao: novaDescCaixa.trim(),
      tipo: novoTipoCaixa,
      valor: parseFloat(novoValorCaixa) || 0,
      data: 'Hoje'
    };

    setMovimentacoesCaixa([nova, ...movimentacoesCaixa]);
    setNovaDescCaixa('');
    setNovoValorCaixa('');
    mostrarToast(`Lançamento de ${nova.tipo.toUpperCase()} no valor de R$ ${nova.valor.toFixed(2)} registrado!`, 'sucesso');
  };

  // Adicionar Estoque
  const handleAdicionarProduto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProdNome.trim()) {
      mostrarToast('Digite o nome do produto.', 'erro');
      return;
    }

    const novo: ProdutoEstoque = {
      id: String(Date.now()),
      nome: novoProdNome.trim(),
      estoque: parseInt(novoProdQtd) || 0,
      min: parseInt(novoProdMin) || 2,
      categoria: novoProdCat
    };

    setProdutos([...produtos, novo]);
    setNovoProdNome('');
    mostrarToast(`Produto "${novo.nome}" cadastrado no estoque!`, 'sucesso');
  };

  const ajustarEstoque = (id: string, delta: number) => {
    setProdutos(produtos.map(p => {
      if (p.id === id) {
        const novoEstoque = Math.max(0, p.estoque + delta);
        return { ...p, estoque: novoEstoque };
      }
      return p;
    }));
  };

  // Criar Agendamento
  const handleCriarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoAgendCliente.trim() || !novoAgendVeiculo.trim()) {
      mostrarToast('Preencha cliente e veículo do agendamento.', 'erro');
      return;
    }

    const tempId = `ag_${Date.now()}`;
    const novo: AgendamentoPWA = {
      id: tempId,
      cliente: novoAgendCliente.trim(),
      telefone: novoAgendTel.trim() || '(11) 99999-0000',
      veiculo: novoAgendVeiculo.trim(),
      servico: novoAgendServico,
      data: 'Hoje',
      horario: novoAgendHorario,
      status: 'Confirmado'
    };

    setAgendamentos([novo, ...agendamentos]);
    setNovoAgendCliente('');
    setNovoAgendVeiculo('');
    setNovoAgendTel('');

    try {
      await salvarAgendamentoServidor({
        id: tempId,
        unidadeId: unidadeLogada,
        unidadeVinculadaId: unidadeLogada,
        cliente: novo.cliente,
        telefone: novo.telefone,
        veiculo: novo.veiculo,
        servico: novo.servico,
        data: novo.data,
        horario: novo.horario,
        status: novo.status,
        createdAt: new Date().toISOString()
      });

      if (db) {
        await addDoc(collection(db, 'agendamentos'), {
          unidadeId: unidadeLogada,
          unidadeVinculadaId: unidadeLogada,
          cliente: novo.cliente,
          telefone: novo.telefone,
          veiculo: novo.veiculo,
          servico: novo.servico,
          data: novo.data,
          horario: novo.horario,
          status: novo.status,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Agendamento salvo localmente:', err);
    }

    mostrarToast(`Agendamento de ${novo.cliente} confirmado para as ${novo.horario}!`, 'sucesso');
  };

  // Adicionar Banner
  const handleAdicionarBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoBannerTitulo.trim()) {
      mostrarToast('Digite o título do banner promocional.', 'erro');
      return;
    }

    const novo: BannerPromocional = {
      id: String(Date.now()),
      titulo: novoBannerTitulo.trim(),
      status: 'Ativo',
      imagem: novoBannerImg.trim() || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&auto=format&fit=crop&q=60',
      unidadeId: unidadeLogada
    };

    setBanners([novo, ...banners]);
    setNovoBannerTitulo('');
    setNovoBannerImg('');
    mostrarToast('Novo banner promocional publicado no App Cliente!', 'sucesso');

    try {
      await salvarBannerServidor(novo);
      if (db) {
        await addDoc(collection(db, 'banners'), { ...novo, unidadeId: unidadeLogada });
      }
    } catch (err) {
      console.warn('Erro ao sincronizar banner:', err);
    }
  };

  // Salvar ou Atualizar Serviço & Preço
  const handleSalvarServico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoServicoNome.trim()) {
      mostrarToast('Digite o nome do serviço.', 'erro');
      return;
    }
    const valorNum = parseFloat(novoServicoValor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      mostrarToast('Informe um valor válido em R$ maior que zero.', 'erro');
      return;
    }

    if (servicoEditandoId) {
      const atualizado: ServicoLavaJato = {
        id: servicoEditandoId,
        nome: novoServicoNome.trim(),
        valor: valorNum,
        tempoMedioMinutos: Number(novoServicoTempo) || 45,
        categoria: novoServicoCategoria,
        descricao: novoServicoDescricao.trim(),
        ativo: true,
        unidadeId: unidadeLogada
      };

      setServicos(prev => prev.map(s => s.id === servicoEditandoId ? atualizado : s));
      setServicoEditandoId(null);
      setNovoServicoNome('');
      setNovoServicoValor('');
      setNovoServicoTempo('45');
      setNovoServicoDescricao('');
      mostrarToast(`Serviço "${atualizado.nome}" atualizado com sucesso!`, 'sucesso');

      try {
        await atualizarServicoServidor(servicoEditandoId, atualizado);
        if (db && !servicoEditandoId.startsWith('srv_') && isNaN(Number(servicoEditandoId))) {
          await updateDoc(doc(db, 'servicos', servicoEditandoId), atualizado as any);
        }
      } catch (err) {
        console.warn('Erro ao sincronizar atualização de serviço:', err);
      }
    } else {
      const novo: ServicoLavaJato = {
        id: `srv_${Date.now()}`,
        nome: novoServicoNome.trim(),
        valor: valorNum,
        tempoMedioMinutos: Number(novoServicoTempo) || 45,
        categoria: novoServicoCategoria,
        descricao: novoServicoDescricao.trim(),
        ativo: true,
        unidadeId: unidadeLogada
      };

      setServicos(prev => [novo, ...prev]);
      setNovoServicoNome('');
      setNovoServicoValor('');
      setNovoServicoTempo('45');
      setNovoServicoDescricao('');
      mostrarToast(`Novo serviço "${novo.nome}" cadastrado com sucesso!`, 'sucesso');

      try {
        await salvarServicoServidor(novo);
        if (db) {
          await addDoc(collection(db, 'servicos'), novo);
        }
      } catch (err) {
        console.warn('Erro ao salvar serviço na nuvem:', err);
      }
    }
  };

  const handleEditarServico = (s: ServicoLavaJato) => {
    setServicoEditandoId(s.id);
    setNovoServicoNome(s.nome);
    setNovoServicoValor(s.valor.toFixed(2));
    setNovoServicoTempo(String(s.tempoMedioMinutos || 45));
    setNovoServicoCategoria(s.categoria || 'Lavagem');
    setNovoServicoDescricao(s.descricao || '');
    mostrarToast(`Editando "${s.nome}". Altere os dados no formulário ao lado.`, 'info');
  };

  const handleCancelarEdicaoServico = () => {
    setServicoEditandoId(null);
    setNovoServicoNome('');
    setNovoServicoValor('');
    setNovoServicoTempo('45');
    setNovoServicoDescricao('');
  };

  const handleAlternarStatusServico = async (s: ServicoLavaJato) => {
    const novoAtivo = !s.ativo;
    const atualizado = { ...s, ativo: novoAtivo };
    setServicos(prev => prev.map(item => item.id === s.id ? atualizado : item));
    mostrarToast(`Serviço "${s.nome}" agora está ${novoAtivo ? 'Ativo' : 'Pausado'}!`, 'info');

    try {
      await atualizarServicoServidor(s.id, { ativo: novoAtivo });
      if (db && !s.id.startsWith('srv_') && isNaN(Number(s.id))) {
        await updateDoc(doc(db, 'servicos', s.id), { ativo: novoAtivo });
      }
    } catch {}
  };

  // Totais do Caixa
  const totalEntradas = movimentacoesCaixa.filter(m => m.tipo === 'entrada').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidas = movimentacoesCaixa.filter(m => m.tipo === 'saida').reduce((acc, curr) => acc + curr.valor, 0);
  const saldoCaixa = totalEntradas - totalSaidas;

  // Classes de cor dinâmica do tema selecionado
  const temaClasses = {
    blue: { bg: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500', shadow: 'shadow-blue-900/30' },
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-400', border: 'border-indigo-500', shadow: 'shadow-indigo-900/30' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-400', border: 'border-emerald-500', shadow: 'shadow-emerald-900/30' },
    cyan: { bg: 'bg-cyan-600', text: 'text-cyan-400', border: 'border-cyan-500', shadow: 'shadow-cyan-900/30' },
    violet: { bg: 'bg-violet-600', text: 'text-violet-400', border: 'border-violet-500', shadow: 'shadow-violet-900/30' },
    amber: { bg: 'bg-amber-600', text: 'text-amber-400', border: 'border-amber-500', shadow: 'shadow-amber-900/30' }
  }[corPrimaria];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex antialiased selection:bg-blue-500/30">
      
      {/* TOAST DE NOTIFICAÇÃO */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md ${
            toast.tipo === 'sucesso' 
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200' 
              : toast.tipo === 'erro'
              ? 'bg-rose-950/95 border-rose-500/40 text-rose-200'
              : 'bg-blue-950/95 border-blue-500/40 text-blue-200'
          }`}>
            {toast.tipo === 'sucesso' && <CheckCircle2 size={16} className="text-emerald-400" />}
            {toast.tipo === 'erro' && <AlertTriangle size={16} className="text-rose-400" />}
            {toast.tipo === 'info' && <CheckCircle2 size={16} className="text-blue-400" />}
            <span>{toast.mensagem}</span>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO INTERNO (100% ATIVO E SEGURO) */}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Confirmar Exclusão</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você tem certeza que deseja excluir permanentemente <strong className="text-white">"{itemParaExcluir.nome}"</strong>?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                Excluir Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE QR CODE DO BALCÃO (CADASTRO DIRETO DE CLIENTES) */}
      {modalQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center relative">
            <button 
              type="button" 
              onClick={() => setModalQrCode(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-slate-800"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
              <QrCode size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">QR Code do Balcão</h3>
              <p className="text-xs text-blue-300 font-semibold">{nomeLavaJato}</p>
              <p className="text-[11px] text-slate-400">
                Ao ler este QR Code, seus clientes abrem instantaneamente a <strong className="text-blue-300">Tela de Cadastro</strong> exclusiva do seu lava-jato.
              </p>
            </div>

            {/* IMAGEM DO QR CODE */}
            <div className="bg-white p-4 rounded-xl shadow-inner inline-block mx-auto border border-slate-700">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(linkQrCodeCliente)}&margin=10`} 
                alt={`QR Code ${nomeLavaJato}`}
                className="w-48 h-48 mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* LINK DO CLIENTE E BOTÕES */}
            <div className="space-y-2.5">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 break-all select-all text-left">
                {linkQrCodeCliente}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copiarLinkQrCode}
                  className="flex-1 min-w-[120px] py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30"
                >
                  {copiadoQrLink ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                  <span>{copiadoQrLink ? 'Copiado!' : 'Copiar Link'}</span>
                </button>

                <a
                  href={linkQrCodeCliente}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                  title="Abrir a tela de cadastro do cliente em uma nova aba para testar"
                >
                  <Eye size={14} />
                  <span>Testar Link</span>
                </a>

                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(linkQrCodeCliente)}&margin=10`}
                  target="_blank"
                  rel="noreferrer"
                  download={`qrcode-balcao-${unidadeLogada}.png`}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Baixar</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÃO NUVEM FIREBASE (SINCRONIZAÇÃO PC <-> CELULAR) */}
      {modalFirebase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button 
              type="button" 
              onClick={() => setModalFirebase(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-slate-800"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
              <Database size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Sincronização em Tempo Real (Firebase)</h3>
              <p className="text-xs text-slate-400">
                Garante que os agendamentos e cadastros do celular apareçam no notebook instantaneamente pelo site da Netlify.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span>Status Atual:</span>
                <span className={`font-bold ${firebaseStatus.configurado ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {firebaseStatus.configurado ? '● Conectado (Nuvem Ativa)' : '● Modo Demonstração / Local'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Project ID:</span>
                <span className="font-mono text-white">{firebaseStatus.projectId || 'Nenhum'}</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                let novaConfig: any = null;

                if (firebaseJsonInput.trim()) {
                  try {
                    // Tenta extrair JSON ou objeto colado
                    let limpo = firebaseJsonInput.trim();
                    if (limpo.includes('{') && limpo.includes('}')) {
                      limpo = limpo.substring(limpo.indexOf('{'), limpo.lastIndexOf('}') + 1);
                      // Converte formato chave: "valor" se não for JSON estrito
                      limpo = limpo.replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":').replace(/'/g, '"');
                    }
                    novaConfig = JSON.parse(limpo);
                  } catch (err) {
                    mostrarToast('Erro ao ler JSON do Firebase. Cole os campos individuais.', 'erro');
                    return;
                  }
                } else if (firebaseApiKeyInput.trim() && firebaseProjectIdInput.trim()) {
                  novaConfig = {
                    apiKey: firebaseApiKeyInput.trim(),
                    projectId: firebaseProjectIdInput.trim(),
                    authDomain: `${firebaseProjectIdInput.trim()}.firebaseapp.com`,
                    storageBucket: `${firebaseProjectIdInput.trim()}.appspot.com`
                  };
                }

                if (novaConfig && novaConfig.projectId) {
                  salvarFirebaseConfig(novaConfig);
                  mostrarToast('Configuração salva! Conectando ao Firestore...', 'sucesso');
                } else {
                  mostrarToast('Informe o Project ID e API Key do seu Firebase.', 'erro');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Cole o objeto do Firebase Console (ou preencha abaixo):
                </label>
                <textarea
                  rows={3}
                  value={firebaseJsonInput}
                  onChange={(e) => setFirebaseJsonInput(e.target.value)}
                  placeholder={'const firebaseConfig = {\n  apiKey: "...",\n  projectId: "..."\n};'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Firebase Project ID</label>
                  <input
                    type="text"
                    value={firebaseProjectIdInput}
                    onChange={(e) => setFirebaseProjectIdInput(e.target.value)}
                    placeholder="ex: meu-lavajato-123"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">API Key</label>
                  <input
                    type="text"
                    value={firebaseApiKeyInput}
                    onChange={(e) => setFirebaseApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/30"
                >
                  <Check size={14} />
                  <span>Salvar e Conectar Nuvem</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MENUBAR LATERAL RECOLHÍVEL (SIDEBAR) */}
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 relative z-30 shrink-0 ${sidebarAberta ? 'w-64' : 'w-20'}`}>
        <div>
          {/* Logo e Botão de Recolher */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            {sidebarAberta ? (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="HubWash"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.endsWith('/logo.png')) {
                      target.src = '/pwa-192x192.png';
                    } else if (target.src.endsWith('/pwa-192x192.png')) {
                      target.src = '/hubwash.png';
                    } else {
                      target.style.display = 'none';
                    }
                  }}
                  className="h-9 w-auto max-w-[95px] object-contain shrink-0 drop-shadow"
                />
                <div className="truncate">
                  <span className="font-bold text-sm tracking-tight text-white block truncate">{nomeLavaJato}</span>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide">Gestão & PWA</span>
                </div>
              </div>
            ) : (
              <img
                src="/logo.png"
                alt="HubWash"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src.endsWith('/logo.png')) {
                    target.src = '/pwa-192x192.png';
                  } else {
                    target.style.display = 'none';
                  }
                }}
                className="w-9 h-9 object-contain mx-auto drop-shadow"
              />
            )}
            <button 
              type="button"
              onClick={() => setSidebarAberta(!sidebarAberta)}
              className="absolute -right-3 top-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full p-1 text-slate-200 transition-colors z-50 shadow-md cursor-pointer"
              title={sidebarAberta ? 'Recolher Menu' : 'Expandir Menu'}
            >
              {sidebarAberta ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* ITENS DO MENU NAVEGAÇÃO */}
          <nav className="p-3 space-y-1">
            {[
              { id: 'fila', label: 'Fila de Lavagem', icon: Layers },
              { id: 'agendamentos', label: 'Agendamentos PWA', icon: Calendar },
              { id: 'servicos', label: 'Serviços & Valores', icon: Tag },
              { id: 'checklist', label: 'Checklist & Fotos', icon: CheckSquare },
              { id: 'relatorio', label: 'Relatório Financeiro', icon: TrendingUp },
              { id: 'caixa', label: 'Caixa Diário', icon: DollarSign },
              { id: 'clientes', label: 'Clientes & Fidelidade', icon: Users },
              { id: 'funcionarios', label: 'Funcionários / Comissão', icon: Wrench },
              { id: 'produtos', label: 'Estoque / Produtos', icon: Package },
              { id: 'banner', label: 'Banners Promocionais', icon: ImageIcon },
              { id: 'configuracao', label: 'Configurações App', icon: Settings },
            ].map((item) => {
              const Icone = item.icon;
              const ativo = abaAtiva === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAbaAtiva(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    ativo 
                      ? `${temaClasses.bg} text-white shadow-md ${temaClasses.shadow}` 
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                  title={item.label}
                >
                  <Icone className="w-4 h-4 shrink-0" />
                  {sidebarAberta && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="p-3.5 border-t border-slate-800 space-y-2">
          <p className="text-[10px] text-slate-500 font-mono text-center">
            {sidebarAberta ? 'Pit Stop v2.0 Realtime' : 'v2.0'}
          </p>
        </div>
      </aside>

      {/* ÁREA DO CONTEÚDO DA TELA DA DIREITA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* TOPBAR SUPERIOR COM BOTÃO VOLTAR AO LOGIN */}
        <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${temaClasses.bg}`} />
              {abaAtiva === 'fila' && 'Fila de Lavagens em Tempo Real'}
              {abaAtiva === 'agendamentos' && 'Agendamentos Online (PWA Clientes)'}
              {abaAtiva === 'servicos' && 'Serviços & Tabela de Preços do Lava Jato'}
              {abaAtiva === 'checklist' && 'Checklist de Entrada & Vistoria Veicular'}
              {abaAtiva === 'relatorio' && 'Relatório Financeiro & Atendimentos Diários'}
              {abaAtiva === 'clientes' && 'Clientes & Programa de Fidelidade'}
              {abaAtiva === 'funcionarios' && 'Funcionários & Comissões Automáticas'}
              {abaAtiva === 'produtos' && 'Controle de Estoque & Insumos'}
              {abaAtiva === 'caixa' && 'Caixa Diário & Movimentações'}
              {abaAtiva === 'banner' && 'Banners & Campanhas do App'}
              {abaAtiva === 'configuracao' && 'Configurações do Lava Jato'}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* BOTÃO QR CODE DO BALCÃO */}
            <button
              type="button"
              onClick={() => setModalQrCode(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs font-semibold transition cursor-pointer shadow-sm shadow-blue-950/50"
              title="Gerar e Ver QR Code do Balcão para Cadastro de Clientes"
            >
              <QrCode size={14} />
              <span className="hidden sm:inline">QR Code de Cadastro</span>
            </button>

            {/* BOTÃO DE RETORNO AO LOGIN SEMPRE ATIVO NO TOPO */}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition cursor-pointer shadow-sm shadow-rose-950/50"
              title="Voltar à tela de login / terminal OTP"
            >
              <ArrowLeft size={14} />
              <span>Voltar ao Login</span>
            </button>
          </div>
        </header>

        {/* CONTEÚDO DAS ABAS */}
        <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">

          {/* ========================================== */}
          {/* ABA 1: FILA DE LAVAGEM */}
          {/* ========================================== */}
          {abaAtiva === 'fila' && (
            <div className="space-y-6">
              {/* Formulário Rápido de Nova Entrada */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-400" /> Nova Entrada na Fila
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Total na Fila: <strong>{veiculosFila.filter(v => v.status !== 'Entregue').length}</strong>
                  </span>
                </div>

                <form onSubmit={handleCadastrarFila} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Cliente *</label>
                    <input
                      type="text"
                      value={novoClienteFila}
                      onChange={(e) => setNovoClienteFila(e.target.value)}
                      placeholder="Ex: João Ferreira"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Veículo / Placa *</label>
                    <input
                      type="text"
                      value={novoVeiculoFila}
                      onChange={(e) => setNovoVeiculoFila(e.target.value)}
                      placeholder="Ex: Corolla - ABC1234"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Serviço</label>
                    <select
                      value={novoServicoFila}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNovoServicoFila(val);
                        const sEncontrado = servicos.find(s => s.nome === val);
                        if (sEncontrado) {
                          setNovoValorFila(sEncontrado.valor.toFixed(2));
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {servicos.filter(s => s.ativo).length > 0 ? (
                        servicos.filter(s => s.ativo).map(s => (
                          <option key={s.id} value={s.nome}>
                            {s.nome} - R$ {s.valor.toFixed(2).replace('.', ',')}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Lavagem Simples">Lavagem Simples (Ducha)</option>
                          <option value="Lavagem Completa">Lavagem Completa</option>
                          <option value="Ducha e Cera">Ducha e Cera</option>
                          <option value="Higienização Interna">Higienização Interna</option>
                          <option value="Polimento e Cristalização">Polimento e Cristalização</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Lavador / Responsável</label>
                    <select
                      value={novoFuncFila}
                      onChange={(e) => setNovoFuncFila(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {funcionarios.map(f => (
                        <option key={f.id} value={f.nome}>{f.nome} ({f.comissaoPorcentagem}%)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={novoValorFila}
                      onChange={(e) => setNovoValorFila(e.target.value)}
                      placeholder="80.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className={`w-full py-2 px-3 ${temaClasses.bg} hover:opacity-90 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer`}
                    >
                      <Plus size={15} />
                      <span>Inserir</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Quadro da Fila (Colunas de Status ou Lista Interativa) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" /> Fila Ativa de Veículos
                  </h3>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={buscaFila}
                      onChange={(e) => setBuscaFila(e.target.value)}
                      placeholder="Buscar placa, cliente..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {veiculosFila
                    .filter(v => 
                      v.cliente.toLowerCase().includes(buscaFila.toLowerCase()) ||
                      v.veiculo.toLowerCase().includes(buscaFila.toLowerCase())
                    )
                    .map((item) => {
                      const statusStyles = {
                        Espera: { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', nextText: 'Iniciar Lavagem', nextIcon: Play },
                        Lavando: { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', nextText: 'Marcar Pronto', nextIcon: CheckCircle2 },
                        Pronto: { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', nextText: 'Entregar Veículo', nextIcon: Check },
                        Entregue: { bg: 'bg-slate-800/60 border-slate-700/60 text-slate-400', nextText: 'Finalizado', nextIcon: CheckCircle2 }
                      }[item.status];

                      const IconeBotao = statusStyles.nextIcon;

                      return (
                        <div
                          key={item.id}
                          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-lg hover:border-slate-700 transition"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyles.bg}`}>
                                {item.status}
                              </span>
                              <h4 className="text-sm font-bold text-white mt-1.5">{item.veiculo}</h4>
                              <p className="text-xs text-slate-400">{item.cliente}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setItemParaExcluir({ tipo: 'fila', id: item.id, nome: `${item.veiculo} (${item.cliente})` })}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                              title="Remover da Fila"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                            <div>
                              <span className="text-[10px] text-slate-500 block">Serviço</span>
                              <p className="font-semibold">{item.servico}</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block">Valor</span>
                              <p className="font-bold text-emerald-400">R$ {item.valor.toFixed(2)}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-[10px] text-slate-500 block">Responsável</span>
                              <p className="text-slate-300 font-medium">{item.funcionario}</p>
                            </div>
                          </div>

                          {item.status !== 'Entregue' ? (
                            <button
                              type="button"
                              onClick={() => avancarStatusFila(item.id)}
                              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <IconeBotao size={14} className="text-cyan-400" />
                              <span>{statusStyles.nextText}</span>
                            </button>
                          ) : (
                            <div className="text-center py-1 text-[11px] text-slate-500 font-semibold flex items-center justify-center gap-1">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              <span>Veículo Entregue</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* ABA 2: AGENDAMENTOS PWA */}
          {/* ========================================== */}
          {abaAtiva === 'agendamentos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulário Novo Agendamento */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Calendar className="w-4 h-4 text-blue-400" /> Novo Agendamento
                </h3>

                <form onSubmit={handleCriarAgendamento} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Cliente *</label>
                    <input
                      type="text"
                      value={novoAgendCliente}
                      onChange={(e) => setNovoAgendCliente(e.target.value)}
                      placeholder="Nome do cliente"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={novoAgendTel}
                      onChange={(e) => setNovoAgendTel(e.target.value)}
                      placeholder="(11) 98888-7777"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Veículo *</label>
                    <input
                      type="text"
                      value={novoAgendVeiculo}
                      onChange={(e) => setNovoAgendVeiculo(e.target.value)}
                      placeholder="Ex: Jeep Renegade"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Serviço</label>
                      <select
                        value={novoAgendServico}
                        onChange={(e) => setNovoAgendServico(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {servicos.filter(s => s.ativo).length > 0 ? (
                          servicos.filter(s => s.ativo).map(s => (
                            <option key={s.id} value={s.nome}>
                              {s.nome} (R$ {s.valor.toFixed(2).replace('.', ',')})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Lavagem Simples">Lavagem Simples</option>
                            <option value="Lavagem Completa">Lavagem Completa</option>
                            <option value="Polimento">Polimento</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Horário</label>
                      <input
                        type="time"
                        value={novoAgendHorario}
                        onChange={(e) => setNovoAgendHorario(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                      </input>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-2.5 px-4 ${temaClasses.bg} text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5`}
                  >
                    <Plus size={15} />
                    <span>Confirmar Agendamento</span>
                  </button>
                </form>
              </div>

              {/* Lista de Agendamentos */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" /> Agendamentos Recebidos pelo App ({agendamentos.length})
                  </h3>
                  <button
                    type="button"
                    onClick={sincronizarAgendamentosAgora}
                    disabled={sincronizandoManual}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                    title="Forçar atualização da nuvem"
                  >
                    <RefreshCw size={13} className={sincronizandoManual ? "animate-spin" : ""} />
                    <span>{sincronizandoManual ? "Buscando..." : "Sincronizar Celular / Nuvem"}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {agendamentos.length === 0 && (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                      <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-white">Nenhum agendamento online no momento</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Novos agendamentos feitos no celular aparecem aqui no mesmo instante. Se acabou de cadastrar no celular, clique no botão acima para sincronizar.
                      </p>
                    </div>
                  )}
                  {agendamentos.map((ag) => (
                    <div
                      key={ag.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{ag.cliente}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                            {ag.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {ag.veiculo} • <strong className="text-cyan-400">{ag.servico}</strong>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Horário: <span className="text-slate-300 font-semibold">{ag.data} às {ag.horario}</span> • Tel: {ag.telefone}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setNovoClienteFila(ag.cliente);
                            setNovoVeiculoFila(ag.veiculo);
                            setNovoServicoFila(ag.servico);
                            setAbaAtiva('fila');
                            mostrarToast(`Dados de ${ag.cliente} carregados na Fila de Lavagem!`, 'info');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Carregar na Fila de Lavagem"
                        >
                          <Play size={13} />
                          <span>Puxar p/ Fila</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePontuarAgendamento(ag)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Enviar +1 Ponto de Fidelidade para o Cliente"
                        >
                          <Sparkles size={13} className="text-amber-400" />
                          <span>+1 Ponto</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAtualizarStatusAgendamento(ag.id, ag.status === 'Confirmado' ? 'Concluido' : 'Confirmado')}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                            ag.status === 'Concluido'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                              : ag.status === 'Confirmado'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                          title="Alterar Status"
                        >
                          <CheckCircle2 size={13} />
                          <span>{ag.status === 'Confirmado' ? 'Concluir' : ag.status === 'Concluido' ? 'Concluído' : 'Confirmar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemParaExcluir({ tipo: 'agendamento', id: ag.id, nome: `Agendamento de ${ag.cliente}` })}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                          title="Excluir Agendamento"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* ABA: SERVIÇOS & VALORES DO LAVA-JATO */}
          {/* ========================================== */}
          {abaAtiva === 'servicos' && (
            <div className="space-y-6">
              {/* Cards de Métricas Resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-medium">Serviços Ativos</span>
                    <Tag size={16} className="text-cyan-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {servicos.filter(s => s.ativo).length}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">de {servicos.length}</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-medium">Preço Médio</span>
                    <DollarSign size={16} className="text-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-400">
                    R$ {servicos.length > 0 ? (servicos.reduce((acc, s) => acc + s.valor, 0) / servicos.length).toFixed(2).replace('.', ',') : '0,00'}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-medium">Menor Valor</span>
                    <TrendingUp size={16} className="text-blue-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-400">
                    R$ {servicos.length > 0 ? Math.min(...servicos.map(s => s.valor)).toFixed(2).replace('.', ',') : '0,00'}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-medium">Serviço VIP</span>
                    <Sparkles size={16} className="text-amber-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-amber-400">
                    R$ {servicos.length > 0 ? Math.max(...servicos.map(s => s.valor)).toFixed(2).replace('.', ',') : '0,00'}
                  </div>
                </div>
              </div>

              {/* Grid Principal: Formulário + Lista de Serviços */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Coluna Esquerda: Formulário de Cadastro / Edição */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl h-fit">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Tag className="w-4 h-4 text-cyan-400" />
                      {servicoEditandoId ? 'Editar Serviço' : 'Novo Serviço & Preço'}
                    </h3>
                    {servicoEditandoId && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Modo Edição
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleSalvarServico} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Nome do Serviço *</label>
                      <input
                        type="text"
                        value={novoServicoNome}
                        onChange={(e) => setNovoServicoNome(e.target.value)}
                        placeholder="Ex: Lavagem Completa + Cera Líquida"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Valor (R$) *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-500 font-bold">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={novoServicoValor}
                            onChange={(e) => setNovoServicoValor(e.target.value)}
                            placeholder="65.00"
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Tempo Médio (min)</label>
                        <div className="relative">
                          <Clock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="number"
                            value={novoServicoTempo}
                            onChange={(e) => setNovoServicoTempo(e.target.value)}
                            placeholder="45"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Categoria</label>
                      <select
                        value={novoServicoCategoria}
                        onChange={(e) => setNovoServicoCategoria(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="Lavagem">Lavagem</option>
                        <option value="Estética">Estética & Polimento</option>
                        <option value="Higienização">Higienização Interna</option>
                        <option value="Adicional">Adicional / Acessório</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Descrição para o Cliente</label>
                      <textarea
                        rows={3}
                        value={novoServicoDescricao}
                        onChange={(e) => setNovoServicoDescricao(e.target.value)}
                        placeholder="Ex: Lavagem externa detalhada, aspiração profunda, painel hidratado e pretinho nos pneus..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 placeholder-slate-600 resize-none text-xs"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      {servicoEditandoId && (
                        <button
                          type="button"
                          onClick={handleCancelarEdicaoServico}
                          className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}

                      <button
                        type="submit"
                        className={`flex-1 py-2.5 px-4 ${temaClasses.bg} text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5`}
                      >
                        <Plus size={15} />
                        <span>{servicoEditandoId ? 'Atualizar Serviço' : 'Cadastrar Serviço'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Coluna Direita: Catálogo e Lista de Serviços */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Barra de Filtro e Busca */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Filtros por Categoria */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                      {['Todos', 'Lavagem', 'Estética', 'Higienização', 'Adicional'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFiltroCategoriaServico(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                            filtroCategoriaServico === cat
                              ? `${temaClasses.bg} text-white shadow-md`
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Busca por Nome */}
                    <div className="relative min-w-[200px]">
                      <Search size={14} className="text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={buscaServico}
                        onChange={(e) => setBuscaServico(e.target.value)}
                        placeholder="Buscar serviço..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                      />
                    </div>
                  </div>

                  {/* Lista de Cards de Serviços */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {servicos
                      .filter((s) => {
                        const bateCategoria = filtroCategoriaServico === 'Todos' || s.categoria === filtroCategoriaServico;
                        const bateBusca = !buscaServico.trim() || s.nome.toLowerCase().includes(buscaServico.toLowerCase()) || (s.descricao && s.descricao.toLowerCase().includes(buscaServico.toLowerCase()));
                        return bateCategoria && bateBusca;
                      })
                      .map((s) => (
                        <div
                          key={s.id}
                          className={`bg-slate-900/90 border rounded-2xl p-4 shadow-lg transition flex flex-col justify-between space-y-3 relative group ${
                            s.ativo ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/60 opacity-60'
                          }`}
                        >
                          <div className="space-y-2">
                            {/* Topo do Card: Categoria e Badge de Status */}
                            <div className="flex items-center justify-between gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                s.categoria === 'Estética'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                  : s.categoria === 'Higienização'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : s.categoria === 'Adicional'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              }`}>
                                {s.categoria || 'Lavagem'}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.ativo 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                  {s.ativo ? 'Ativo no App' : 'Pausado'}
                                </span>
                              </div>
                            </div>

                            {/* Nome e Preço */}
                            <div className="flex items-start justify-between gap-2 pt-1">
                              <div>
                                <h4 className="text-sm font-bold text-white leading-tight">{s.nome}</h4>
                                {s.tempoMedioMinutos && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-1">
                                    <Clock size={11} className="text-cyan-400" />
                                    ~{s.tempoMedioMinutos} minutos
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                                  R$ {s.valor.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                            </div>

                            {/* Descrição */}
                            {s.descricao && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed pt-1">
                                {s.descricao}
                              </p>
                            )}
                          </div>

                          {/* Rodapé: Botões de Ação */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleAlternarStatusServico(s)}
                              className="text-xs text-cyan-400 hover:underline cursor-pointer font-medium"
                            >
                              {s.ativo ? 'Pausar no App' : 'Ativar no App'}
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditarServico(s)}
                                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition cursor-pointer"
                                title="Editar Serviço & Preço"
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setItemParaExcluir({ tipo: 'servico', id: s.id, nome: s.nome })}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                                title="Excluir Serviço"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* ABA: CHECKLIST DE ENTRADA & VISTORIA VEICULAR COM FOTOS */}
          {/* ========================================== */}
          {abaAtiva === 'checklist' && (
            <SistemaChecklist
              checklists={checklists}
              onSalvarChecklist={(novaVistoria) => {
                setChecklists(prev => [novaVistoria, ...prev]);
                if (db) {
                  try {
                    addDoc(collection(db, 'checklists'), {
                      ...novaVistoria,
                      unidadeId: unidadeSlugSanitizada,
                      unidadeNome,
                      createdAt: new Date().toISOString()
                    }).catch(err => console.warn('Sync checklist Firestore:', err));
                  } catch (e) {
                    console.warn('Erro ao salvar checklist:', e);
                  }
                }
                mostrarToast('Vistoria e Fotos arquivadas com sucesso!', 'sucesso');
              }}
              onExcluirChecklist={(id, nome) => {
                setItemParaExcluir({ tipo: 'checklist', id, nome });
              }}
              unidadeNome={unidadeNome}
              temaClasses={temaClasses}
            />
          )}

          {/* ========================================== */}
          {/* ABA: RELATÓRIO FINANCEIRO & ATENDIMENTOS DIÁRIOS (RECHARTS) */}
          {/* ========================================== */}
          {abaAtiva === 'relatorio' && (
            <RelatorioFinanceiro
              movimentacoes={movimentacoesCaixa}
              filaAtendimentos={veiculosFila}
              agendamentos={agendamentos}
              temaClasses={temaClasses}
            />
          )}

          {/* ========================================== */}
          {/* ABA 4: CLIENTES & FIDELIDADE */}
          {/* ========================================== */}
          {abaAtiva === 'clientes' && (
            <div className="space-y-6">
              {/* Card Banner do QR Code de Auto-Cadastro */}
              <div className="bg-gradient-to-r from-blue-950/60 to-cyan-950/60 border border-blue-500/30 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                    <QrCode size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      QR Code de Auto-Cadastro no Balcão
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">100% Automático</span>
                    </h4>
                    <p className="text-xs text-slate-300">
                      Disponibilize o QR Code impresso no balcão para que os clientes realizem o auto-cadastro direto no celular e ganhem pontos fidelidade.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setModalQrCode(true)}
                    className="flex-1 sm:flex-none py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <QrCode size={14} />
                    <span>Visualizar QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={copiarLinkQrCode}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition cursor-pointer"
                    title="Copiar Link de Cadastro"
                  >
                    {copiadoQrLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Topo com Cadastro de Cliente */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Gift className="w-4 h-4 text-pink-400" /> Cadastrar Cliente no Cartão Fidelidade
                </h3>

                <form onSubmit={handleCadastrarCliente} className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={novoCliNome}
                      onChange={(e) => setNovoCliNome(e.target.value)}
                      placeholder="Ex: Carlos Andrade"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">E-mail do Cliente</label>
                    <input
                      type="email"
                      value={novoCliEmail}
                      onChange={(e) => setNovoCliEmail(e.target.value)}
                      placeholder="carlos@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={novoCliTel}
                      onChange={(e) => setNovoCliTel(e.target.value)}
                      placeholder="(11) 98888-9999"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Veículo Principal</label>
                    <input
                      type="text"
                      value={novoCliVeiculo}
                      onChange={(e) => setNovoCliVeiculo(e.target.value)}
                      placeholder="Ex: Honda HR-V"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className={`w-full py-2 px-3 ${temaClasses.bg} text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer`}
                    >
                      <Plus size={15} />
                      <span>Cadastrar</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista dos Clientes & Pontuação de Fidelidade */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" /> Cartão Fidelidade (10 Pontos = 1 Lavagem Grátis)
                  </h3>

                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={buscaCliente}
                      onChange={(e) => setBuscaCliente(e.target.value)}
                      placeholder="Buscar por nome..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientes
                    .filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase()))
                    .map((c) => {
                      const progresso = (c.pontos / 10) * 100;

                      return (
                        <div
                          key={c.id}
                          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-lg"
                        >
                          <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
                            <div>
                              <h4 className="text-sm font-bold text-white">{c.nome}</h4>
                              <p className="text-xs text-cyan-400 font-mono">{c.email || 'sem e-mail'}</p>
                              <p className="text-xs text-slate-400">{c.telefone} • {c.veiculoPrincipal}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setItemParaExcluir({ tipo: 'cliente', id: c.id, nome: c.nome })}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                              title="Excluir Cliente"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Barra de Progresso Fidelidade */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-medium">Pontos Acumulados</span>
                              <span className="font-bold text-amber-400">{c.pontos} / 10 pontos</span>
                            </div>

                            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${progresso}%` }}
                              />
                            </div>
                          </div>

                          {/* Botões de Gestão de Pontos pelo Administrador */}
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => removerPontoCliente(c.id)}
                              disabled={c.pontos <= 0}
                              className="py-2 px-2 bg-slate-800/80 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 border border-slate-700 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              title="Remover 1 ponto"
                            >
                              <Minus size={13} />
                              <span>-1</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => adicionarPontoCliente(c.id)}
                              className="py-2 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                              title="Adicionar 1 ponto de fidelidade"
                            >
                              <Sparkles size={13} className="text-amber-400" />
                              <span>+1 Ponto</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => zerarPontosCliente(c.id)}
                              className="py-2 px-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                              title="Zerar pontos / Registrar resgate de lavagem grátis"
                            >
                              <RotateCcw size={12} />
                              <span>Zerar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* ABA 5: FUNCIONÁRIOS & COMISSÕES */}
          {/* ========================================== */}
          {abaAtiva === 'funcionarios' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cadastro de Funcionário */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Wrench className="w-4 h-4 text-blue-400" /> Cadastrar Funcionário
                </h3>

                <form onSubmit={handleCadastrarFuncionario} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Nome do Profissional *</label>
                    <input
                      type="text"
                      value={novoFuncNome}
                      onChange={(e) => setNovoFuncNome(e.target.value)}
                      placeholder="Ex: Mateus Ribeiro"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Cargo</label>
                    <select
                      value={novoFuncCargo}
                      onChange={(e) => setNovoFuncCargo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Lavador Master">Lavador Master</option>
                      <option value="Especialista Estética">Especialista Estética</option>
                      <option value="Polidor">Polidor</option>
                      <option value="Ajudante Geral">Ajudante Geral</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Comissão (%)</label>
                      <input
                        type="number"
                        value={novoFuncComissao}
                        onChange={(e) => setNovoFuncComissao(Number(e.target.value))}
                        placeholder="30"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Telefone</label>
                      <input
                        type="text"
                        value={novoFuncTel}
                        onChange={(e) => setNovoFuncTel(e.target.value)}
                        placeholder="(11) 99999-0000"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-2.5 px-4 ${temaClasses.bg} text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5`}
                  >
                    <Plus size={15} />
                    <span>Salvar Funcionário</span>
                  </button>
                </form>
              </div>

              {/* Lista dos Funcionários e Comissões */}
              <div className="lg:col-span-2 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Extrato de Comissões por Lavador
                </h3>

                <div className="space-y-3">
                  {funcionarios.map((f) => (
                    <div
                      key={f.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{f.nome}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                            {f.cargo}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Comissão Base: <strong className="text-slate-200">{f.comissaoPorcentagem}%</strong> de cada serviço concluído.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Comissão Acumulada</span>
                          <span className="text-base font-black text-emerald-400">
                            R$ {f.totalComissaoAcumulada.toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => zerarComissao(f.id, f.nome)}
                          disabled={f.totalComissaoAcumulada === 0}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                          title="Marcar como Pago"
                        >
                          Pagar / Zerar
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemParaExcluir({ tipo: 'funcionario', id: f.id, nome: f.nome })}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                          title="Excluir Funcionário"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* ABA 6: ESTOQUE / PRODUTOS */}
          {/* ========================================== */}
          {abaAtiva === 'produtos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cadastro de Produto */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <PackagePlus className="w-4 h-4 text-indigo-400" /> Cadastrar Produto no Estoque
                </h3>

                <form onSubmit={handleAdicionarProduto} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Nome do Insumo / Produto *</label>
                    <input
                      type="text"
                      value={novoProdNome}
                      onChange={(e) => setNovoProdNome(e.target.value)}
                      placeholder="Ex: Cera Líquida 5L"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Qtd Atual</label>
                      <input
                        type="number"
                        value={novoProdQtd}
                        onChange={(e) => setNovoProdQtd(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Qtd Mínima</label>
                      <input
                        type="number"
                        value={novoProdMin}
                        onChange={(e) => setNovoProdMin(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Categoria</label>
                    <input
                      type="text"
                      value={novoProdCat}
                      onChange={(e) => setNovoProdCat(e.target.value)}
                      placeholder="Ex: Químicos, Panos, Ceras"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-2.5 px-4 ${temaClasses.bg} text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5`}
                  >
                    <Plus size={15} />
                    <span>Adicionar ao Estoque</span>
                  </button>
                </form>
              </div>

              {/* Lista dos Produtos */}
              <div className="lg:col-span-2 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" /> Insumos & Materiais
                </h3>

                <div className="space-y-3">
                  {produtos.map((p) => {
                    const estoqueBaixo = p.estoque <= p.min;

                    return (
                      <div
                        key={p.id}
                        className={`bg-slate-900/80 border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg ${
                          estoqueBaixo ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{p.nome}</h4>
                            {estoqueBaixo && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center gap-1">
                                <AlertTriangle size={11} /> Estoque Baixo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            Categoria: {p.categoria || 'Geral'} • Mínimo recomendado: {p.min} unidades
                          </p>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                            <button
                              type="button"
                              onClick={() => ajustarEstoque(p.id, -1)}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-sm font-bold text-white px-2">{p.estoque}</span>
                            <button
                              type="button"
                              onClick={() => ajustarEstoque(p.id, 1)}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setItemParaExcluir({ tipo: 'produto', id: p.id, nome: p.nome })}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                            title="Excluir Insumo"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* ABA 7: CAIXA DIÁRIO */}
          {/* ========================================== */}
          {abaAtiva === 'caixa' && (
            <div className="space-y-6">
              {/* Cards de Resumo Financeiro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Total Entradas</span>
                    <ArrowUpRight className="text-emerald-400 w-4 h-4" />
                  </div>
                  <p className="text-2xl font-black text-emerald-400 mt-2">
                    R$ {totalEntradas.toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider">Total Saídas</span>
                    <ArrowDownRight className="text-rose-400 w-4 h-4" />
                  </div>
                  <p className="text-2xl font-black text-rose-400 mt-2">
                    R$ {totalSaidas.toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Saldo em Caixa</span>
                    <DollarSign className="text-cyan-400 w-4 h-4" />
                  </div>
                  <p className={`text-2xl font-black mt-2 ${saldoCaixa >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                    R$ {saldoCaixa.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Relatório Financeiro e Gráficos de Atendimentos Diários com Recharts */}
              <div className="pt-1">
                <RelatorioFinanceiro
                  movimentacoes={movimentacoesCaixa}
                  filaAtendimentos={veiculosFila}
                  agendamentos={agendamentos}
                  temaClasses={temaClasses}
                />
              </div>

              {/* Lançamento Rápido no Caixa */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Plus className="w-4 h-4 text-blue-400" /> Novo Lançamento no Caixa
                  </h3>

                  <form onSubmit={handleAdicionarCaixa} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Descrição *</label>
                      <input
                        type="text"
                        value={novaDescCaixa}
                        onChange={(e) => setNovaDescCaixa(e.target.value)}
                        placeholder="Ex: Pagamento Água / Refil Shampoo"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Tipo</label>
                        <select
                          value={novoTipoCaixa}
                          onChange={(e) => setNovoTipoCaixa(e.target.value as 'entrada' | 'saida')}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="entrada">Entrada (+)</option>
                          <option value="saida">Saída (-)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={novoValorCaixa}
                          onChange={(e) => setNovoValorCaixa(e.target.value)}
                          placeholder="50.00"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-2.5 px-4 ${temaClasses.bg} text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5`}
                    >
                      <DollarSign size={15} />
                      <span>Registrar Movimentação</span>
                    </button>
                  </form>
                </div>

                {/* Extrato do Caixa */}
                <div className="lg:col-span-2 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Extrato de Movimentações
                  </h3>

                  <div className="space-y-2.5">
                    {movimentacoesCaixa.map((m) => (
                      <div
                        key={m.id}
                        className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${m.tipo === 'entrada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {m.tipo === 'entrada' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{m.descricao}</p>
                            <span className="text-[10px] text-slate-500">{m.data}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-black ${m.tipo === 'entrada' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {m.tipo === 'entrada' ? '+' : '-'} R$ {m.valor.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => setItemParaExcluir({ tipo: 'movimentacao', id: m.id, nome: m.descricao })}
                            className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                            title="Excluir Lançamento"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* ABA 8: BANNERS PROMOCIONAIS */}
          {/* ========================================== */}
          {abaAtiva === 'banner' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cadastro de Banner */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <ImageIcon className="w-4 h-4 text-cyan-400" /> Publicar Novo Banner
                </h3>

                <form onSubmit={handleAdicionarBanner} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Título da Promoção *</label>
                    <input
                      type="text"
                      value={novoBannerTitulo}
                      onChange={(e) => setNovoBannerTitulo(e.target.value)}
                      placeholder="Ex: Quarta com Cera Grátis"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">URL da Imagem (ou Unsplash)</label>
                    <input
                      type="text"
                      value={novoBannerImg}
                      onChange={(e) => setNovoBannerImg(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-2.5 px-4 ${temaClasses.bg} text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5`}
                  >
                    <Upload size={15} />
                    <span>Publicar no App Cliente</span>
                  </button>
                </form>
              </div>

              {/* Lista dos Banners */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-cyan-400" /> Banners Ativos no PWA
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {banners.map((b) => (
                    <div
                      key={b.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-3"
                    >
                      <img
                        src={b.imagem}
                        alt={b.titulo}
                        className="w-full h-36 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="p-4 pt-0 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white">{b.titulo}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                            {b.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={async () => {
                              const novoStatus: 'Ativo' | 'Inativo' = b.status === 'Ativo' ? 'Inativo' : 'Ativo';
                              const atualizado = { ...b, status: novoStatus };
                              setBanners(banners.map(item => item.id === b.id ? atualizado : item));
                              mostrarToast(`Banner marcado como ${novoStatus}!`, 'info');
                              try {
                                await salvarBannerServidor(atualizado);
                                if (db && !b.id.startsWith('17') && isNaN(Number(b.id))) {
                                  await updateDoc(doc(db, 'banners', b.id), { status: novoStatus });
                                }
                              } catch {}
                            }}
                            className="text-xs text-cyan-400 hover:underline cursor-pointer"
                          >
                            Alternar Status
                          </button>

                          <button
                            type="button"
                            onClick={() => setItemParaExcluir({ tipo: 'banner', id: b.id, nome: b.titulo })}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                            title="Excluir Banner"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* ABA 9: CONFIGURAÇÕES DO APP */}
          {/* ========================================== */}
          {abaAtiva === 'configuracao' && (
            <div className="max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Settings className="w-5 h-5 text-blue-400" /> Personalização & Identidade Visual
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Nome do Lava Jato</label>
                  <input
                    type="text"
                    value={nomeLavaJato}
                    onChange={(e) => setNomeLavaJato(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm font-semibold"
                  />
                </div>

                {/* Paleta de Cores do Sistema */}
                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium flex items-center gap-1.5">
                    <Paintbrush size={14} className="text-cyan-400" /> Cor Primária do Sistema
                  </label>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    {[
                      { id: 'blue', label: 'Azul Clássico', bg: 'bg-blue-600' },
                      { id: 'indigo', label: 'Índigo Moderno', bg: 'bg-indigo-600' },
                      { id: 'emerald', label: 'Verde Esmeralda', bg: 'bg-emerald-600' },
                      { id: 'cyan', label: 'Ciano Tech', bg: 'bg-cyan-600' },
                      { id: 'violet', label: 'Violeta Royal', bg: 'bg-violet-600' },
                      { id: 'amber', label: 'Âmbar Dourado', bg: 'bg-amber-600' }
                    ].map((cor) => (
                      <button
                        key={cor.id}
                        type="button"
                        onClick={() => {
                          setCorPrimaria(cor.id as any);
                          mostrarToast(`Tema alterado para ${cor.label}!`, 'sucesso');
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          corPrimaria === cor.id
                            ? 'border-white text-white bg-slate-800 shadow-md'
                            : 'border-slate-800 text-slate-400 hover:text-white bg-slate-950'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${cor.bg}`} />
                        <span>{cor.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-slate-400 text-[11px]">
                    As alterações são salvas automaticamente na sessão atual.
                  </p>
                  <button
                    type="button"
                    onClick={() => mostrarToast('Configurações salvas com sucesso!', 'sucesso')}
                    className={`px-5 py-2 ${temaClasses.bg} text-white font-bold rounded-xl shadow-lg transition cursor-pointer`}
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
