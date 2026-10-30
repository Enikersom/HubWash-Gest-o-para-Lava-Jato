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
  Edit3,
  Crown,
  Infinity,
  Store
} from 'lucide-react';
import { db, collection, addDoc, setDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, orderBy, getDocs, getFirebaseStatus, salvarFirebaseConfig } from '../firebase';
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
  buscarProdutosServidor,
  salvarProdutoServidor,
  atualizarProdutoServidor,
  excluirProdutoServidor,
  buscarVendasServidor,
  salvarVendaServidor,
  isApiServidorDisponivel
} from '../services/apiSync';
import { URL_BASE_NETLIFY } from '../constants';
import { enviarNotificacaoPushNetlify } from '../services/fcmPush';
import {
  ItemFila,
  Funcionario,
  MovimentacaoCaixa,
  ItemChecklist,
  ProdutoEstoque,
  ClienteFidelidade,
  BannerPromocional,
  AgendamentoPWA,
  ServicoLavaJato,
  LavaJato,
  VendaPDV
} from '../types';
import RelatorioFinanceiro from './RelatorioFinanceiro';
import SistemaChecklist from './SistemaChecklist';
import ModuloPDV from './ModuloPDV';
import ModuloProdutos from './ModuloProdutos';
import { formatarCelular, formatarCEP } from '../utils/formatters';

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
    'fila' | 'pdv' | 'agendamentos' | 'servicos' | 'checklist' | 'relatorio' | 'caixa' | 'produtos' | 'clientes' | 'funcionarios' | 'banner' | 'configuracao'
  >('fila');

  // CONTROLADORES DE CORES PARA PERSONALIZAÇÃO DO APP
  const [corPrimaria, setCorPrimaria] = useState<'blue' | 'indigo' | 'emerald' | 'cyan' | 'violet' | 'amber'>('blue');
  const [nomeLavaJato, setNomeLavaJato] = useState(unidadeNome);
  const [contatoLavaJato, setContatoLavaJato] = useState(() => {
    try {
      const salvos = localStorage.getItem('hubwash_lava_jatos');
      if (salvos) {
        const lista = JSON.parse(salvos);
        const u = lista.find((x: any) => String(x.id).toLowerCase() === String(unidadeNome).toLowerCase() || String(x.nomeFantasia).toLowerCase() === String(unidadeNome).toLowerCase());
        if (u && u.contato) return u.contato;
      }
    } catch {}
    return '';
  });
  const [cepLavaJato, setCepLavaJato] = useState('');
  const [enderecoLavaJato, setEnderecoLavaJato] = useState(() => {
    try {
      const salvos = localStorage.getItem('hubwash_lava_jatos');
      if (salvos) {
        const lista = JSON.parse(salvos);
        const u = lista.find((x: any) => String(x.id).toLowerCase() === String(unidadeNome).toLowerCase() || String(x.nomeFantasia).toLowerCase() === String(unidadeNome).toLowerCase());
        if (u && u.endereco) return u.endereco;
      }
    } catch {}
    return '';
  });

  // LOGOTIPO PERSONALIZADO DA EMPRESA (INDIVIDUAL PARA ESTA UNIDADE, SEM AFETAR O ADMIN GERAL)
  const [logoLavaJato, setLogoLavaJato] = useState<string>(() => {
    try {
      const slug = (unidadeNome || 'pitstop').toLowerCase().trim();
      const salvoLogo = localStorage.getItem(`hubwash_logo_${slug}`);
      if (salvoLogo) return salvoLogo;
      const salvos = localStorage.getItem('hubwash_lava_jatos');
      if (salvos) {
        const lista = JSON.parse(salvos);
        const u = lista.find((x: any) => String(x.id).toLowerCase() === slug || String(x.nomeFantasia).toLowerCase() === slug);
        if (u && u.logoUrl) return u.logoUrl;
      }
    } catch {}
    return '';
  });
  const fileInputLogoRef = useRef<HTMLInputElement | null>(null);

  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      mostrarToast('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).', 'erro');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      if (file.type.includes('svg')) {
        setLogoLavaJato(result);
        mostrarToast('Logotipo SVG carregado com sucesso! Clique em "Salvar Alterações" para confirmar.', 'sucesso');
        return;
      }

      const img = new Image();
      img.src = result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDimension = 500;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const formato = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const compactado = canvas.toDataURL(formato, 0.9);
          setLogoLavaJato(compactado);
          mostrarToast('Novo logotipo da empresa selecionado! Clique em "Salvar Alterações" para confirmar.', 'sucesso');
        }
      };
    };
    reader.readAsDataURL(file);
  };

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
  // 5. PRODUTOS & ESTOQUE (PDV E INSUMOS)
  // ==========================================
  const PRODUTOS_PADRAO_LAVA_JATO: ProdutoEstoque[] = [
    { id: 'prod_1', nome: 'Aromatizante Little Trees Black Ice', precoVenda: 15.00, precoCusto: 6.50, estoque: 28, min: 5, categoria: 'Aromatizantes', codigoBarras: '761710001', ativo: true },
    { id: 'prod_2', nome: 'Aromatizante Gel Centralsul Tutti-Frutti', precoVenda: 12.00, precoCusto: 4.80, estoque: 15, min: 4, categoria: 'Aromatizantes', codigoBarras: '789823401', ativo: true },
    { id: 'prod_3', nome: 'Cera Carnaúba Express Vonixx 500ml', precoVenda: 45.00, precoCusto: 24.00, estoque: 8, min: 3, categoria: 'Ceras e Polimentos', codigoBarras: '789851101', ativo: true },
    { id: 'prod_4', nome: 'Pretinho Pneu Pret Vonixx 500ml', precoVenda: 28.00, precoCusto: 13.50, estoque: 12, min: 4, categoria: 'Pneus e Rodas', codigoBarras: '789851102', ativo: true },
    { id: 'prod_5', nome: 'Pano Microfibra 40x40cm 350GSM', precoVenda: 15.00, precoCusto: 5.50, estoque: 40, min: 10, categoria: 'Acessórios', codigoBarras: '789000105', ativo: true },
    { id: 'prod_6', nome: 'Silicone Gel Automotivo 200g', precoVenda: 20.00, precoCusto: 8.50, estoque: 10, min: 3, categoria: 'Interior', codigoBarras: '789000106', ativo: true },
    { id: 'prod_7', nome: 'Água Mineral sem Gás 500ml', precoVenda: 4.00, precoCusto: 1.20, estoque: 35, min: 10, categoria: 'Bebidas e Snacks', codigoBarras: '789100007', ativo: true },
    { id: 'prod_8', nome: 'Refrigerante Coca-Cola Lata 350ml', precoVenda: 6.00, precoCusto: 2.80, estoque: 24, min: 8, categoria: 'Bebidas e Snacks', codigoBarras: '789100008', ativo: true },
    { id: 'prod_9', nome: 'Energético Monster Energy 473ml', precoVenda: 12.00, precoCusto: 6.90, estoque: 16, min: 5, categoria: 'Bebidas e Snacks', codigoBarras: '789100009', ativo: true }
  ];

  const [produtos, setProdutos] = useState<ProdutoEstoque[]>(() => {
    try {
      const salvos = localStorage.getItem('hubwash_produtos');
      if (salvos) {
        const lista = JSON.parse(salvos);
        if (Array.isArray(lista) && lista.length > 0) {
          return lista.map((p: any) => ({
            ...p,
            precoVenda: typeof p.precoVenda === 'number' ? p.precoVenda : (parseFloat(p.precoVenda) || 15.00),
            precoCusto: typeof p.precoCusto === 'number' ? p.precoCusto : (parseFloat(p.precoCusto) || 7.00),
            estoque: typeof p.estoque === 'number' ? p.estoque : (parseInt(p.estoque) || 10),
            min: typeof p.min === 'number' ? p.min : (parseInt(p.min) || 3),
            categoria: p.categoria || 'Geral',
            ativo: p.ativo !== false
          }));
        }
      }
    } catch {}
    return PRODUTOS_PADRAO_LAVA_JATO;
  });

  useEffect(() => {
    try {
      localStorage.setItem('hubwash_produtos', JSON.stringify(produtos));
    } catch {}
  }, [produtos]);

  // Vendas PDV (Frente de Caixa)
  const [vendasPDV, setVendasPDV] = useState<VendaPDV[]>(() => {
    try {
      const salvos = localStorage.getItem('hubwash_vendas_pdv');
      return salvos ? JSON.parse(salvos) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hubwash_vendas_pdv', JSON.stringify(vendasPDV));
    } catch {}
  }, [vendasPDV]);

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

  // Agendamento atualmente pré-selecionado para abertura direta no Checklist & Fotos
  const [agendamentoSelecionadoParaChecklist, setAgendamentoSelecionadoParaChecklist] = useState<AgendamentoPWA | null>(null);

  // Registro de IDs excluídos para prevenir que listeners em tempo real ressuscitem itens deletados
  const idsExcluidosRef = useRef<Set<string>>(new Set((() => {
    try {
      const s = localStorage.getItem('hubwash_ids_excluidos');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  })()));

  const registrarIdExcluido = (id: string) => {
    idsExcluidosRef.current.add(id);
    try {
      localStorage.setItem('hubwash_ids_excluidos', JSON.stringify(Array.from(idsExcluidosRef.current)));
    } catch {}
  };

  useEffect(() => {
    try {
      localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(agendamentos));
    } catch {}
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

  // Informações da Unidade e Licença (Mensal ou Vitalícia)
  const [unidadeInfo, setUnidadeInfo] = useState<LavaJato | null>(() => {
    try {
      const salvos = localStorage.getItem('hubwash_lava_jatos');
      if (salvos) {
        const lista: LavaJato[] = JSON.parse(salvos);
        if (Array.isArray(lista)) {
          const limpo = (unidadeNome || 'pitstop').trim().toLowerCase();
          const encontrada = lista.find(u => 
            String(u.id).toLowerCase() === limpo || 
            String(u.nomeFantasia).toLowerCase() === limpo ||
            String(u.id).toLowerCase() === unidadeSlugSanitizada
          );
          if (encontrada) return encontrada;
        }
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    const carregarUnidade = () => {
      try {
        const salvos = localStorage.getItem('hubwash_lava_jatos');
        if (salvos) {
          const lista: LavaJato[] = JSON.parse(salvos);
          if (Array.isArray(lista)) {
            const encontrada = lista.find(u => 
              aliasesUnidade.some(alias => 
                String(u.id).toLowerCase() === alias || 
                String(u.nomeFantasia).toLowerCase() === alias
              )
            );
            if (encontrada) {
              setUnidadeInfo(encontrada);
              if (encontrada.logoUrl) setLogoLavaJato(encontrada.logoUrl);
            }
          }
        }
      } catch {}
    };

    carregarUnidade();
    window.addEventListener('storage', carregarUnidade);

    let unsubscribe: (() => void) | null = null;
    if (db && unidadeLogada) {
      try {
        unsubscribe = onSnapshot(doc(db, 'unidades', unidadeLogada), (docSnap) => {
          if (docSnap.exists()) {
            const dados = docSnap.data() as LavaJato;
            setUnidadeInfo(dados);
            if (dados.logoUrl) setLogoLavaJato(dados.logoUrl);
          }
        }, () => {});
      } catch {}
    }

    return () => {
      window.removeEventListener('storage', carregarUnidade);
      if (unsubscribe) unsubscribe();
    };
  }, [aliasesUnidade, unidadeLogada]);

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
              prev
                .filter(item => !idsExcluidosRef.current.has(item.id))
                .forEach(item => mapa.set(item.id, item));
              let novosAdicionados = false;
              lista.forEach((item: any) => {
                if (idsExcluidosRef.current.has(item.id)) return;
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

        if (dados.produtos && Array.isArray(dados.produtos) && dados.produtos.length > 0) {
          setProdutos((prev) => {
            const mapa = new Map<string, ProdutoEstoque>();
            prev.forEach((p) => mapa.set(p.id, p));
            dados.produtos.forEach((p: any) => {
              if (!idsExcluidosRef.current.has(p.id)) {
                mapa.set(p.id, {
                  ...p,
                  precoVenda: Number(p.precoVenda) || 0,
                  precoCusto: Number(p.precoCusto) || 0,
                  estoque: Number(p.estoque) || 0,
                  min: Number(p.min) || 0,
                  ativo: p.ativo !== false
                });
              }
            });
            return Array.from(mapa.values());
          });
        }

        if (dados.vendas && Array.isArray(dados.vendas) && dados.vendas.length > 0) {
          setVendasPDV((prev) => {
            const mapa = new Map<string, VendaPDV>();
            prev.forEach((v) => mapa.set(v.id, v));
            dados.vendas.forEach((v: any) => mapa.set(v.id, v));
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
    let unsubProdutos: (() => void) | null = null;
    let unsubVendas: (() => void) | null = null;

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
                agendamentosFirestore
                  .filter(a => !idsExcluidosRef.current.has(a.id))
                  .forEach((a) => mapa.set(a.id, a));
                prev
                  .filter(a => !idsExcluidosRef.current.has(a.id))
                  .forEach((a) => {
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
              if (pertence && !idsExcluidosRef.current.has(docSnap.id)) {
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
                bannersFirestore
                  .filter(b => !idsExcluidosRef.current.has(b.id))
                  .forEach((b) => mapa.set(b.id, b));
                prev
                  .filter(b => !idsExcluidosRef.current.has(b.id))
                  .forEach((b) => {
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
              if (pertence && !idsExcluidosRef.current.has(docSnap.id)) {
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
                servicosFirestore
                  .filter(s => !idsExcluidosRef.current.has(s.id))
                  .forEach((s) => mapa.set(s.id, s));
                prev
                  .filter(s => !idsExcluidosRef.current.has(s.id))
                  .forEach((s) => {
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

        const qProdutos = query(collection(db, 'produtos'));
        unsubProdutos = onSnapshot(
          qProdutos,
          (snapshot: any) => {
            const produtosFirestore: ProdutoEstoque[] = [];
            snapshot.forEach((docSnap: any) => {
              const data = docSnap.data();
              const docUnidade = String(data.unidadeId || '').toLowerCase();
              const pertence = !docUnidade || aliasesUnidade.some(alias => 
                docUnidade === alias || docUnidade.includes(alias) || alias.includes(docUnidade)
              );
              if (pertence && !idsExcluidosRef.current.has(docSnap.id)) {
                produtosFirestore.push({
                  id: docSnap.id,
                  nome: data.nome || 'Produto',
                  precoVenda: typeof data.precoVenda === 'number' ? data.precoVenda : (parseFloat(data.precoVenda) || 0),
                  precoCusto: typeof data.precoCusto === 'number' ? data.precoCusto : (parseFloat(data.precoCusto) || 0),
                  estoque: typeof data.estoque === 'number' ? data.estoque : (parseInt(data.estoque) || 0),
                  min: typeof data.min === 'number' ? data.min : (parseInt(data.min) || 2),
                  categoria: data.categoria || 'Geral',
                  codigoBarras: data.codigoBarras || '',
                  ativo: data.ativo !== false,
                  descricao: data.descricao || '',
                  unidadeId: data.unidadeId || unidadeLogada
                });
              }
            });

            if (produtosFirestore.length > 0) {
              setProdutos((prev) => {
                const mapa = new Map<string, ProdutoEstoque>();
                produtosFirestore
                  .filter(p => !idsExcluidosRef.current.has(p.id))
                  .forEach((p) => mapa.set(p.id, p));
                prev
                  .filter(p => !idsExcluidosRef.current.has(p.id))
                  .forEach((p) => {
                    if (!mapa.has(p.id)) mapa.set(p.id, p);
                  });
                const listaFinal = Array.from(mapa.values());
                try {
                  localStorage.setItem('hubwash_produtos', JSON.stringify(listaFinal));
                } catch {}
                return listaFinal;
              });
            }
          },
          (error: any) => {
            console.warn('Firestore onSnapshot produtos (Painel):', error);
          }
        );

        const qVendas = query(collection(db, 'vendas'));
        unsubVendas = onSnapshot(
          qVendas,
          (snapshot: any) => {
            const vendasFirestore: VendaPDV[] = [];
            snapshot.forEach((docSnap: any) => {
              const data = docSnap.data();
              const docUnidade = String(data.unidadeId || '').toLowerCase();
              const pertence = !docUnidade || aliasesUnidade.some(alias => 
                docUnidade === alias || docUnidade.includes(alias) || alias.includes(docUnidade)
              );
              if (pertence) {
                const sub = typeof data.subtotal === 'number' ? data.subtotal : (typeof data.valorSubtotal === 'number' ? data.valorSubtotal : 0);
                const tot = typeof data.total === 'number' ? data.total : (typeof data.valorFinal === 'number' ? data.valorFinal : 0);
                vendasFirestore.push({
                  id: docSnap.id,
                  itens: data.itens || [],
                  subtotal: sub,
                  valorSubtotal: sub,
                  desconto: data.desconto || 0,
                  total: tot,
                  valorFinal: tot,
                  formaPagamento: data.formaPagamento || 'dinheiro',
                  valorRecebido: data.valorRecebido || data.valorPago,
                  valorPago: data.valorPago || data.valorRecebido,
                  troco: data.troco,
                  clienteNome: data.clienteNome,
                  veiculoPlaca: data.veiculoPlaca,
                  operador: data.operador || data.atendenteNome,
                  atendenteNome: data.atendenteNome || data.operador,
                  unidadeId: data.unidadeId || unidadeLogada,
                  dataHora: data.dataHora || new Date().toISOString(),
                  data: data.data || new Date().toLocaleDateString('pt-BR')
                });
              }
            });

            if (vendasFirestore.length > 0) {
              setVendasPDV((prev) => {
                const mapa = new Map<string, VendaPDV>();
                vendasFirestore.forEach((v) => mapa.set(v.id, v));
                prev.forEach((v) => {
                  if (!mapa.has(v.id)) mapa.set(v.id, v);
                });
                const listaFinal = Array.from(mapa.values());
                try {
                  localStorage.setItem('hubwash_vendas_pdv', JSON.stringify(listaFinal));
                } catch {}
                return listaFinal;
              });
            }
          },
          (error: any) => {
            console.warn('Firestore onSnapshot vendas (Painel):', error);
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
      if (unsubProdutos) unsubProdutos();
      if (unsubVendas) unsubVendas();
    };
  }, [aliasesUnidade, unidadeLogada]);

  // ==========================================
  // LOGICA: EXCLUSÃO CONFIRMADA (MODAL INTERNO)
  // ==========================================
  const confirmarExclusao = async () => {
    if (!itemParaExcluir) return;

    const { tipo, id, nome } = itemParaExcluir;
    registrarIdExcluido(id);

    if (tipo === 'fila') {
      setVeiculosFila(prev => prev.filter(item => item.id !== id));
    } else if (tipo === 'agendamento') {
      setAgendamentos(prev => {
        const atualizados = prev.filter(item => item.id !== id);
        try {
          localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(atualizados));
        } catch {}
        return atualizados;
      });
      try {
        await excluirAgendamentoServidor(id);
      } catch {}
      if (db) {
        try {
          await deleteDoc(doc(db, 'agendamentos', id));
        } catch {}
        try {
          const qAg = query(collection(db, 'agendamentos'), where('id', '==', id));
          const snap = await getDocs(qAg);
          snap.forEach(d => deleteDoc(d.ref).catch(() => {}));
        } catch {}
      }
    } else if (tipo === 'checklist') {
      setChecklists(prev => {
        const atualizados = prev.filter(item => item.id !== id);
        try {
          localStorage.setItem('hubwash_checklists', JSON.stringify(atualizados));
        } catch {}
        return atualizados;
      });
      if (db) {
        try {
          await deleteDoc(doc(db, 'checklists', id));
        } catch {}
        try {
          const qChk = query(collection(db, 'checklists'), where('id', '==', id));
          const snap = await getDocs(qChk);
          snap.forEach(d => deleteDoc(d.ref).catch(() => {}));
        } catch {}
      }
    } else if (tipo === 'cliente') {
      setClientes(prev => {
        const atualizados = prev.filter(item => item.id !== id);
        try {
          localStorage.setItem('hubwash_clientes_fidelidade', JSON.stringify(atualizados));
        } catch {}
        return atualizados;
      });
      try {
        await excluirClienteServidor(id);
      } catch {}
      if (db) {
        try {
          await deleteDoc(doc(db, 'clientes', id));
        } catch {}
        try {
          const qCli = query(collection(db, 'clientes'), where('id', '==', id));
          const snap = await getDocs(qCli);
          snap.forEach(d => deleteDoc(d.ref).catch(() => {}));
        } catch {}
      }
    } else if (tipo === 'funcionario') {
      setFuncionarios(prev => prev.filter(item => item.id !== id));
    } else if (tipo === 'produto') {
      setProdutos(prev => {
        const atualizados = prev.filter(item => item.id !== id);
        try {
          localStorage.setItem('hubwash_produtos', JSON.stringify(atualizados));
        } catch {}
        return atualizados;
      });
      try {
        await excluirProdutoServidor(id);
      } catch {}
      if (db) {
        try {
          await deleteDoc(doc(db, 'produtos', id));
        } catch {}
        try {
          const qProd = query(collection(db, 'produtos'), where('id', '==', id));
          const snap = await getDocs(qProd);
          snap.forEach(d => deleteDoc(d.ref).catch(() => {}));
        } catch {}
      }
    } else if (tipo === 'movimentacao') {
      setMovimentacoesCaixa(prev => prev.filter(item => item.id !== id));
    } else if (tipo === 'banner') {
      setBanners(prev => {
        const atualizados = prev.filter(item => item.id !== id);
        try {
          localStorage.setItem('hubwash_banners', JSON.stringify(atualizados));
          if (unidadeLogada) localStorage.setItem(`hubwash_banners_${unidadeLogada}`, JSON.stringify(atualizados));
          window.dispatchEvent(new CustomEvent('hubwash_banners_atualizados', { detail: atualizados }));
          window.dispatchEvent(new Event('hubwash_banners_atualizados'));
        } catch {}
        return atualizados;
      });
      try {
        await excluirBannerServidor(id);
      } catch {}
      if (db) {
        try {
          await deleteDoc(doc(db, 'banners', id));
        } catch {}
        try {
          const qBan = query(collection(db, 'banners'), where('id', '==', id));
          const snap = await getDocs(qBan);
          snap.forEach(d => deleteDoc(d.ref).catch(() => {}));
        } catch {}
      }
    } else if (tipo === 'servico') {
      setServicos(prev => {
        const atualizados = prev.filter(item => item.id !== id);
        try {
          localStorage.setItem('hubwash_servicos', JSON.stringify(atualizados));
          if (unidadeLogada) localStorage.setItem(`hubwash_servicos_${unidadeLogada}`, JSON.stringify(atualizados));
        } catch {}
        return atualizados;
      });
      try {
        await excluirServicoServidor(id);
      } catch {}
      if (db) {
        try {
          await deleteDoc(doc(db, 'servicos', id));
        } catch {}
        try {
          const qSrv = query(collection(db, 'servicos'), where('id', '==', id));
          const snap = await getDocs(qSrv);
          snap.forEach(d => deleteDoc(d.ref).catch(() => {}));
        } catch {}
      }
    }

    mostrarToast(`"${nome}" foi excluído com sucesso!`, 'info');
    setItemParaExcluir(null);
  };

  // ==========================================
  // FUNÇÕES DE AÇÃO
  // ==========================================

  // Avançar status da Fila com sincronização em tempo real para o Cliente
  const avancarStatusFila = async (id: string) => {
    const itemAlvo = veiculosFila.find(v => v.id === id);
    if (!itemAlvo) return;

    let proximoStatus: ItemFila['status'] = itemAlvo.status;

    if (itemAlvo.status === 'Espera') {
      proximoStatus = 'Lavando';
      mostrarToast(`🚿 Veículo "${itemAlvo.veiculo}" agora está no Box em Lavagem!`, 'info');
    } else if (itemAlvo.status === 'Lavando') {
      proximoStatus = 'Pronto';
      // GERAR COMISSÃO AUTOMÁTICA
      const func = funcionarios.find(f => f.nome === itemAlvo.funcionario);
      const perc = func ? func.comissaoPorcentagem : 30;
      const valorComissao = (itemAlvo.valor * perc) / 100;

      setFuncionarios(funcionarios.map(f =>
        f.nome === itemAlvo.funcionario
          ? { ...f, totalComissaoAcumulada: f.totalComissaoAcumulada + valorComissao }
          : f
      ));

      // LANÇAR NO CAIXA AUTOMATICAMENTE
      setMovimentacoesCaixa([
        { id: String(Date.now()), descricao: `Recebimento: ${itemAlvo.servico} (${itemAlvo.veiculo})`, tipo: 'entrada', valor: itemAlvo.valor, data: 'Hoje' },
        ...movimentacoesCaixa
      ]);

      mostrarToast(`✨ Veículo "${itemAlvo.veiculo}" pronto para retirada! R$ ${valorComissao.toFixed(2)} de comissão gerada e R$ ${itemAlvo.valor.toFixed(2)} lançado no Caixa.`, 'sucesso');
    } else if (itemAlvo.status === 'Pronto') {
      proximoStatus = 'Entregue';
      mostrarToast(`🎉 Veículo "${itemAlvo.veiculo}" finalizado e entregue ao cliente!`, 'sucesso');
    }

    // 1. Atualiza Fila
    const filaAtualizada = veiculosFila.map(veiculo => {
      if (veiculo.id === id) {
        return { ...veiculo, status: proximoStatus };
      }
      return veiculo;
    });
    setVeiculosFila(filaAtualizada);
    try {
      localStorage.setItem('hubwash_fila', JSON.stringify(filaAtualizada));
    } catch {}

    // 2. Mapeia e sincroniza com o Agendamento do cliente
    const statusAgendamento: AgendamentoPWA['status'] = proximoStatus === 'Entregue' ? 'Concluido' : proximoStatus;

    const agCorrespondente = agendamentos.find(a =>
      (itemAlvo.agendamentoId && a.id === itemAlvo.agendamentoId) ||
      (a.cliente && a.cliente.toLowerCase().trim() === itemAlvo.cliente.toLowerCase().trim())
    );

    if (agCorrespondente) {
      const agId = agCorrespondente.id;
      const agsAtualizados = agendamentos.map(a => a.id === agId ? { ...a, status: statusAgendamento } : a);
      setAgendamentos(agsAtualizados);
      try {
        localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(agsAtualizados));
        localStorage.setItem('hubwash_agendamentos_pwa', JSON.stringify(agsAtualizados));
      } catch {}

      // Dispara evento em tempo real para o PWA do cliente
      window.dispatchEvent(new CustomEvent('hubwash_status_lavagem_atualizado', {
        detail: { agendamentoId: agId, cliente: itemAlvo.cliente, status: statusAgendamento }
      }));
      window.dispatchEvent(new Event('hubwash_agendamento_alterado'));

      // Atualiza Firestore
      if (db) {
        try {
          await setDoc(doc(db, 'agendamentos', agId), {
            status: statusAgendamento,
            statusLavagem: proximoStatus,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch {
          try {
            const q = query(collection(db, 'agendamentos'), where('id', '==', agId));
            const snap = await getDocs(q);
            snap.forEach(d => updateDoc(d.ref, { status: statusAgendamento, statusLavagem: proximoStatus }).catch(() => {}));
          } catch {}
        }
      }

      try {
        await atualizarStatusAgendamentoServidor(agId, statusAgendamento as any);
      } catch {}
    } else {
      window.dispatchEvent(new CustomEvent('hubwash_status_lavagem_atualizado', {
        detail: { cliente: itemAlvo.cliente, status: statusAgendamento }
      }));
    }

    // 3. Disparo Automático de Push Notification FCM para o celular do cliente
    try {
      const clienteNomeNormalizado = String(itemAlvo.cliente || '').trim().toLowerCase();
      const clienteEncontrado = clientes.find(c =>
        String(c.nome || '').trim().toLowerCase() === clienteNomeNormalizado ||
        (agCorrespondente?.telefone && c.telefone && c.telefone.replace(/\D/g, '') === agCorrespondente.telefone.replace(/\D/g, ''))
      );

      let tokenDestinatario = clienteEncontrado?.fcmToken;

      // Se o token ainda não estiver em memória, tenta buscar no documento do Firestore
      if (!tokenDestinatario && db && clienteEncontrado?.id) {
        try {
          const snapCliente = await getDocs(query(collection(db, 'clientes'), where('__name__', '==', clienteEncontrado.id)));
          if (!snapCliente.empty) {
            tokenDestinatario = snapCliente.docs[0].data()?.fcmToken;
          }
        } catch {}
      }

      if (tokenDestinatario) {
        let tituloPush = 'Atualização do seu Veículo • HubWash';
        let corpoPush = `Seu veículo ${itemAlvo.veiculo} teve o status atualizado para ${proximoStatus}.`;

        if (proximoStatus === 'Lavando') {
          tituloPush = '🚿 Veículo em Lavagem!';
          corpoPush = `Seu veículo ${itemAlvo.veiculo} já entrou no box e está sendo lavado com todo o cuidado!`;
        } else if (proximoStatus === 'Pronto') {
          tituloPush = '✨ Veículo Pronto para Retirada!';
          corpoPush = `Seu veículo ${itemAlvo.veiculo} está pronto, limpo e cheiroso para você retirar!`;
        } else if (proximoStatus === 'Entregue') {
          tituloPush = '🎉 Veículo Entregue!';
          corpoPush = `Agradecemos a preferência! Volte sempre e consulte seus pontos no aplicativo.`;
        }

        enviarNotificacaoPushNetlify({
          token: tokenDestinatario,
          title: tituloPush,
          body: corpoPush,
          url: window.location.origin
        }).catch(errPush => console.warn('Erro ao disparar push FCM via Netlify:', errPush));
      }
    } catch (errGeralPush) {
      console.warn('Erro ao processar notificação push FCM:', errGeralPush);
    }
  };

  // Puxar agendamento diretamente para a Fila de Lavagem com status inicial 'Espera'
  const puxarAgendamentoParaFila = async (ag: AgendamentoPWA) => {
    const jaNaFila = veiculosFila.find(v =>
      (v.agendamentoId && v.agendamentoId === ag.id) ||
      (v.cliente && ag.cliente && String(v.cliente).toLowerCase().trim() === String(ag.cliente).toLowerCase().trim() && v.status !== 'Entregue')
    );

    if (jaNaFila) {
      mostrarToast(`O veículo de ${ag.cliente} já está na Fila de Lavagem (Status: ${jaNaFila.status})!`, 'info');
      setAbaAtiva('fila');
      return;
    }

    const valorNumerico = parseFloat(ag.valor ? String(ag.valor).replace('R$', '').replace(',', '.').trim() : '80') || 80;

    const novoItem: ItemFila = {
      id: `fila_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      cliente: ag.cliente,
      veiculo: ag.veiculo,
      servico: ag.servico || 'Lavagem Completa',
      status: 'Espera',
      funcionario: funcionarios[0]?.nome || 'Equipe de Pátio',
      valor: valorNumerico,
      horaEntrada: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      agendamentoId: ag.id,
      unidadeId: ag.unidadeId || unidadeLogada || 'padrao'
    };

    const novaFila = [novoItem, ...veiculosFila];
    setVeiculosFila(novaFila);
    try {
      localStorage.setItem('hubwash_fila', JSON.stringify(novaFila));
    } catch {}

    // Sincroniza agendamento para 'Espera'
    const agsAtualizados = agendamentos.map(a => a.id === ag.id ? { ...a, status: 'Espera' as const } : a);
    setAgendamentos(agsAtualizados);
    try {
      localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(agsAtualizados));
      localStorage.setItem('hubwash_agendamentos_pwa', JSON.stringify(agsAtualizados));
    } catch {}

    window.dispatchEvent(new CustomEvent('hubwash_status_lavagem_atualizado', {
      detail: { agendamentoId: ag.id, cliente: ag.cliente, status: 'Espera' }
    }));
    window.dispatchEvent(new Event('hubwash_agendamento_alterado'));

    if (db) {
      try {
        await setDoc(doc(db, 'agendamentos', ag.id), {
          status: 'Espera',
          statusLavagem: 'Espera',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {
        try {
          const q = query(collection(db, 'agendamentos'), where('id', '==', ag.id));
          const snap = await getDocs(q);
          snap.forEach(d => updateDoc(d.ref, { status: 'Espera', statusLavagem: 'Espera' }).catch(() => {}));
        } catch {}
      }
    }

    try {
      await atualizarStatusAgendamentoServidor(ag.id, 'Espera' as any);
    } catch {}

    setAbaAtiva('fila');
    mostrarToast(`🚗 "${ag.cliente}" entrou na Fila de Lavagem (Status: Espera)! Cliente já visualiza em tempo real.`, 'sucesso');
  };

  // Adicionar Veículo na Fila manualmente
  const handleCadastrarFila = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoClienteFila.trim() || !novoVeiculoFila.trim()) {
      mostrarToast('Preencha o nome do cliente e veículo.', 'erro');
      return;
    }

    const agCorrespondente = agendamentos.find(a =>
      a.cliente && String(a.cliente).toLowerCase().trim() === novoClienteFila.toLowerCase().trim() &&
      a.status !== 'Concluido' && a.status !== 'Cancelado'
    );

    const novoItem: ItemFila = {
      id: String(Date.now()),
      cliente: novoClienteFila.trim(),
      veiculo: novoVeiculoFila.trim(),
      servico: novoServicoFila,
      status: 'Espera',
      funcionario: novoFuncFila || funcionarios[0]?.nome || 'Equipe de Pátio',
      valor: parseFloat(novoValorFila) || 50,
      horaEntrada: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      agendamentoId: agCorrespondente?.id,
      unidadeId: unidadeLogada
    };

    const novaFila = [novoItem, ...veiculosFila];
    setVeiculosFila(novaFila);
    try {
      localStorage.setItem('hubwash_fila', JSON.stringify(novaFila));
    } catch {}

    if (agCorrespondente) {
      const agId = agCorrespondente.id;
      const agsAtualizados = agendamentos.map(a => a.id === agId ? { ...a, status: 'Espera' as const } : a);
      setAgendamentos(agsAtualizados);
      try {
        localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(agsAtualizados));
        localStorage.setItem('hubwash_agendamentos_pwa', JSON.stringify(agsAtualizados));
      } catch {}

      window.dispatchEvent(new CustomEvent('hubwash_status_lavagem_atualizado', {
        detail: { agendamentoId: agId, cliente: agCorrespondente.cliente, status: 'Espera' }
      }));
      window.dispatchEvent(new Event('hubwash_agendamento_alterado'));

      if (db) {
        setDoc(doc(db, 'agendamentos', agId), {
          status: 'Espera',
          statusLavagem: 'Espera',
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
    }

    setNovoClienteFila('');
    setNovoVeiculoFila('');
    mostrarToast(`Veículo ${novoItem.veiculo} adicionado na fila com status "Espera"!`, 'sucesso');
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
    const termoNome = String(ag.cliente || '').trim().toLowerCase();
    const termoTel = String(ag.telefone || '').replace(/\D/g, '');

    const clienteExistente = clientes.find(
      (c) =>
        String(c.nome || '').trim().toLowerCase() === termoNome ||
        (termoTel.length >= 8 && String(c.telefone || '').replace(/\D/g, '').includes(termoTel))
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

  // Atualizar Status do Agendamento com sincronização imediata
  const handleAtualizarStatusAgendamento = async (id: string, novoStatus: 'Pendente' | 'Confirmado' | 'Espera' | 'Lavando' | 'Pronto' | 'Concluido' | 'Cancelado') => {
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status: novoStatus } : a)));

    try {
      const atualizados = agendamentos.map((a) => (a.id === id ? { ...a, status: novoStatus } : a));
      localStorage.setItem('hubwash_agendamentos_painel', JSON.stringify(atualizados));
      localStorage.setItem('hubwash_agendamentos_pwa', JSON.stringify(atualizados));
    } catch {}

    window.dispatchEvent(new CustomEvent('hubwash_status_lavagem_atualizado', {
      detail: { agendamentoId: id, status: novoStatus }
    }));
    window.dispatchEvent(new Event('hubwash_agendamento_alterado'));

    try {
      await atualizarStatusAgendamentoServidor(id, novoStatus);
    } catch {}

    if (db) {
      try {
        await setDoc(doc(db, 'agendamentos', id), {
          status: novoStatus,
          statusLavagem: novoStatus,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {
        try {
          await updateDoc(doc(db, 'agendamentos', id), {
            status: novoStatus,
            statusLavagem: novoStatus
          });
        } catch {
          try {
            const q = query(collection(db, 'agendamentos'), where('id', '==', id));
            const snap = await getDocs(q);
            snap.forEach(d => updateDoc(d.ref, { status: novoStatus, statusLavagem: novoStatus }).catch(() => {}));
          } catch {}
        }
      }
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

  // ==========================================
  // GESTÃO DE PRODUTOS & ESTOQUE
  // ==========================================
  const handleSalvarProduto = async (prod: ProdutoEstoque) => {
    const precoFinal = typeof prod.preco === 'number' ? prod.preco : (typeof prod.precoVenda === 'number' ? prod.precoVenda : 0);
    const prodFinal: ProdutoEstoque = {
      ...prod,
      preco: precoFinal,
      precoVenda: precoFinal,
      unidadeId: unidadeLogada
    };

    setProdutos(prev => {
      const existe = prev.some(p => p.id === prodFinal.id);
      const atualizados = existe ? prev.map(p => p.id === prodFinal.id ? prodFinal : p) : [prodFinal, ...prev];
      try {
        localStorage.setItem('hubwash_produtos', JSON.stringify(atualizados));
      } catch {}
      return atualizados;
    });

    mostrarToast(`Produto "${prodFinal.nome}" salvo com sucesso!`, 'sucesso');

    try {
      await salvarProdutoServidor(prodFinal);
      if (db) {
        await setDoc(doc(db, 'produtos', prodFinal.id), {
          ...prodFinal,
          nome: prodFinal.nome,
          preco: precoFinal,
          precoVenda: precoFinal,
          estoque: prodFinal.estoque,
          categoria: prodFinal.categoria || 'Geral',
          unidadeId: unidadeLogada,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Erro ao sincronizar produto:', err);
    }
  };

  const handleExcluirProduto = (id: string) => {
    const prod = produtos.find(p => p.id === id);
    setItemParaExcluir({
      tipo: 'produto',
      id,
      nome: prod?.nome || 'Produto'
    });
  };

  const handleAjustarEstoque = async (id: string, delta: number) => {
    let novoQtd = 0;
    setProdutos(prev => prev.map(p => {
      if (p.id === id) {
        novoQtd = Math.max(0, p.estoque + delta);
        return { ...p, estoque: novoQtd };
      }
      return p;
    }));

    try {
      await atualizarProdutoServidor(id, { estoque: novoQtd });
      if (db) {
        await updateDoc(doc(db, 'produtos', id), { estoque: novoQtd });
      }
    } catch {}
  };

  // ==========================================
  // REGISTRAR VENDA NO PDV (FRENTE DE CAIXA)
  // ==========================================
  const handleRegistrarVenda = async (novaVenda: VendaPDV) => {
    const valorVenda = typeof novaVenda.total === 'number' ? novaVenda.total : (novaVenda.valorFinal || 0);
    const metodo = novaVenda.metodoPagamento || novaVenda.formaPagamento || 'dinheiro';
    const dataVenda = novaVenda.data || new Date().toISOString().split('T')[0];

    const vendaCompleta: VendaPDV = {
      ...novaVenda,
      total: valorVenda,
      valorFinal: valorVenda,
      metodoPagamento: metodo,
      formaPagamento: metodo,
      data: dataVenda
    };

    // 1. Adiciona a venda na lista
    setVendasPDV(prev => [vendaCompleta, ...prev]);

    // 2. Deduz estoque local e persiste
    setProdutos(prev => {
      const atualizados = prev.map(p => {
        const itemVendido = vendaCompleta.itens.find(i => i.produtoId === p.id);
        if (itemVendido) {
          const novoEstoque = Math.max(0, p.estoque - itemVendido.quantidade);
          return { ...p, estoque: novoEstoque };
        }
        return p;
      });
      try {
        localStorage.setItem('hubwash_produtos', JSON.stringify(atualizados));
      } catch {}
      return atualizados;
    });

    // 3. Atualiza Caixa Diário automaticamente (Entrada de valor no caixa)
    const movCaixa: MovimentacaoCaixa = {
      id: `pdv_${vendaCompleta.id}`,
      descricao: `Venda PDV • ${vendaCompleta.itens.length} item(s) [${metodo.toUpperCase()}${vendaCompleta.clienteNome ? ` - ${vendaCompleta.clienteNome}` : ''}]`,
      tipo: 'entrada',
      valor: valorVenda,
      data: 'Hoje'
    };
    setMovimentacoesCaixa(prev => [movCaixa, ...prev]);

    mostrarToast(`Venda PDV de R$ ${valorVenda.toFixed(2)} registrada e lançada no Caixa!`, 'sucesso');

    // 4. Salva no servidor REST e Firestore
    try {
      await salvarVendaServidor(vendaCompleta);
      if (db) {
        await setDoc(doc(db, 'vendas', vendaCompleta.id), {
          ...vendaCompleta,
          itens: vendaCompleta.itens,
          total: valorVenda,
          data: dataVenda,
          metodoPagamento: metodo,
          formaPagamento: metodo,
          unidadeId: unidadeLogada,
          createdAt: new Date().toISOString()
        });

        for (const item of vendaCompleta.itens) {
          try {
            const prodAtual = produtos.find(p => p.id === item.produtoId);
            const novoEstoque = Math.max(0, (prodAtual?.estoque || item.quantidade) - item.quantidade);
            await updateDoc(doc(db, 'produtos', item.produtoId), { estoque: novoEstoque });
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Erro ao sincronizar venda PDV:', err);
    }
  };

  const handleAdicionarAoCaixa = (mov: MovimentacaoCaixa) => {
    setMovimentacoesCaixa(prev => [mov, ...prev]);
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

    const bannerId = `ban_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const novo: BannerPromocional = {
      id: bannerId,
      titulo: novoBannerTitulo.trim(),
      status: 'Ativo',
      imagem: novoBannerImg.trim() || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&auto=format&fit=crop&q=60',
      unidadeId: unidadeLogada
    };

    const listaAtualizada = [novo, ...banners.filter(b => b.id !== bannerId)];
    setBanners(listaAtualizada);
    try {
      localStorage.setItem('hubwash_banners', JSON.stringify(listaAtualizada));
      if (unidadeLogada) localStorage.setItem(`hubwash_banners_${unidadeLogada}`, JSON.stringify(listaAtualizada));
      window.dispatchEvent(new CustomEvent('hubwash_banners_atualizados', { detail: listaAtualizada }));
    } catch {}

    setNovoBannerTitulo('');
    setNovoBannerImg('');
    mostrarToast('Novo banner promocional publicado no App Cliente!', 'sucesso');

    try {
      await salvarBannerServidor(novo);
      if (db) {
        await setDoc(doc(db, 'banners', bannerId), {
          ...novo,
          id: bannerId,
          unidadeId: unidadeLogada,
          status: 'Ativo',
          createdAt: new Date().toISOString()
        });
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
                  src={logoLavaJato || "/logo.png"}
                  alt={nomeLavaJato}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== '/logo.png') {
                      target.src = '/logo.png';
                    } else {
                      target.style.display = 'none';
                    }
                  }}
                  className="h-9 w-auto max-w-[95px] object-contain shrink-0 drop-shadow rounded-lg"
                />
                <div className="truncate">
                  <span className="font-bold text-sm tracking-tight text-white block truncate">{nomeLavaJato}</span>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide">Gestão & PWA</span>
                </div>
              </div>
            ) : (
              <img
                src={logoLavaJato || "/logo.png"}
                alt={nomeLavaJato}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== '/logo.png') {
                    target.src = '/logo.png';
                  } else {
                    target.style.display = 'none';
                  }
                }}
                className="w-9 h-9 object-contain mx-auto drop-shadow rounded-lg"
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
              { id: 'pdv', label: 'PDV • Caixa Rápido', icon: Store },
              { id: 'agendamentos', label: 'Agendamentos PWA', icon: Calendar },
              { id: 'servicos', label: 'Serviços & Valores', icon: Tag },
              { id: 'checklist', label: 'Checklist & Fotos', icon: CheckSquare },
              { id: 'relatorio', label: 'Relatório Financeiro', icon: TrendingUp },
              { id: 'caixa', label: 'Caixa Diário', icon: DollarSign },
              { id: 'produtos', label: 'Produtos & Estoque', icon: Package },
              { id: 'clientes', label: 'Clientes & Fidelidade', icon: Users },
              { id: 'funcionarios', label: 'Funcionários / Comissão', icon: Wrench },
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
              {abaAtiva === 'pdv' && 'Frente de Caixa (PDV) • Venda de Produtos'}
              {abaAtiva === 'agendamentos' && 'Agendamentos Online (PWA Clientes)'}
              {abaAtiva === 'servicos' && 'Serviços & Tabela de Preços do Lava Jato'}
              {abaAtiva === 'checklist' && 'Checklist de Entrada & Vistoria Veicular'}
              {abaAtiva === 'relatorio' && 'Relatório Financeiro & Atendimentos Diários'}
              {abaAtiva === 'caixa' && 'Caixa Diário & Movimentações'}
              {abaAtiva === 'produtos' && 'Cadastro de Produtos & Gestão de Estoque'}
              {abaAtiva === 'clientes' && 'Clientes & Programa de Fidelidade'}
              {abaAtiva === 'funcionarios' && 'Funcionários & Comissões Automáticas'}
              {abaAtiva === 'banner' && 'Banners & Campanhas do App'}
              {abaAtiva === 'configuracao' && 'Configurações do Lava Jato'}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* BADGE DE LICENÇA DA UNIDADE */}
            {unidadeInfo?.statusPlano === 'vitalicio' || unidadeInfo?.tipoPlano === 'vitalicio' ? (
              <div 
                onClick={() => setAbaAtiva('configuracao')}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 via-pink-500/10 to-amber-500/20 border border-purple-500/40 text-purple-200 text-xs font-bold shadow-sm cursor-pointer hover:border-purple-400/70 transition"
                title="Sua unidade possui Licença Vitalícia Permanente (Clique para ver detalhes)"
              >
                <Crown size={14} className="text-amber-400 shrink-0" />
                <span>Licença Vitalícia Ativa</span>
              </div>
            ) : (
              <div 
                onClick={() => setAbaAtiva('configuracao')}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition"
                title="Clique para ver detalhes da sua licença"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Plano: {unidadeInfo?.statusPlano === 'teste' ? 'Demonstração' : 'Mensal'}</span>
              </div>
            )}

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
                      String(v?.cliente || '').toLowerCase().includes(buscaFila.toLowerCase()) ||
                      String(v?.veiculo || '').toLowerCase().includes(buscaFila.toLowerCase())
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
                      type="tel"
                      maxLength={15}
                      value={novoAgendTel}
                      onChange={(e) => setNovoAgendTel(formatarCelular(e.target.value))}
                      placeholder="(11) 98888-7777"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
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
                          Horário: <span className="text-slate-300 font-semibold">{ag.data} às {ag.horario}</span> • Tel: <span className="font-mono text-slate-300 font-medium">{ag.telefone ? formatarCelular(ag.telefone) : 'Não informado'}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => puxarAgendamentoParaFila(ag)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Inserir diretamente na Fila de Lavagem (Status: Espera)"
                        >
                          <Play size={13} />
                          <span>Puxar p/ Fila</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAgendamentoSelecionadoParaChecklist(ag);
                            setAbaAtiva('checklist');
                            mostrarToast(`Veículo de ${ag.cliente} reservado no Checklist para fotos!`, 'sucesso');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                          title="Abrir no Checklist e Fotografar o Veículo"
                        >
                          <Camera size={13} className="text-cyan-400" />
                          <span>Vistoriar & Fotos</span>
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
          {/* ABA: FRENTE DE CAIXA (PDV) */}
          {/* ========================================== */}
          {abaAtiva === 'pdv' && (
            <ModuloPDV
              produtos={produtos}
              clientes={clientes}
              veiculosFila={veiculosFila}
              vendasHistorico={vendasPDV}
              unidadeId={unidadeLogada}
              unidadeNome={nomeLavaJato}
              onAtualizarEstoque={(produtoId: string, novoEstoque: number) => {
                setProdutos(prev => {
                  const atualizados = prev.map(p => p.id === produtoId ? { ...p, estoque: novoEstoque } : p);
                  try {
                    localStorage.setItem('hubwash_produtos', JSON.stringify(atualizados));
                  } catch {}
                  return atualizados;
                });
              }}
              onRegistrarVenda={handleRegistrarVenda}
              onAdicionarAoCaixa={(valor: number, descricao: string) => {
                setMovimentacoesCaixa(prev => [
                  {
                    id: `pdv_${Date.now()}`,
                    descricao,
                    tipo: 'entrada',
                    valor,
                    data: 'Hoje'
                  },
                  ...prev
                ]);
              }}
              onIrParaCadastroProdutos={() => setAbaAtiva('produtos')}
              temaClasses={temaClasses}
            />
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
              agendamentosPendentes={agendamentos.filter(a => a.status !== 'Concluido' && a.status !== 'Cancelado')}
              agendamentoPreSelecionado={agendamentoSelecionadoParaChecklist}
              onLimparAgendamentoPreSelecionado={() => setAgendamentoSelecionadoParaChecklist(null)}
              onSalvarChecklist={(novaVistoria, agendamentoIdOrigem) => {
                setChecklists(prev => [novaVistoria, ...prev]);

                // Atualiza o agendamento de origem se vinculado
                if (agendamentoIdOrigem) {
                  setAgendamentos(prev => prev.map(a => a.id === agendamentoIdOrigem ? { ...a, status: 'Vistoriado' } : a));
                  if (db) {
                    try {
                      updateDoc(doc(db, 'agendamentos', agendamentoIdOrigem), { status: 'Vistoriado' }).catch(() => {});
                    } catch {}
                  }
                }

                // Insere automaticamente na fila de lavagem do lava jato
                const veiculoTexto = `${novaVistoria.veiculo}${novaVistoria.placa ? ` (${novaVistoria.placa})` : ''}`;
                const novoItemFila: ItemFila = {
                  id: String(Date.now()),
                  cliente: novaVistoria.cliente || 'Cliente Vistoriado',
                  veiculo: veiculoTexto,
                  servico: 'Lavagem Completa',
                  status: 'Espera',
                  funcionario: funcionarios[0]?.nome || 'Lavador Geral',
                  valor: 65,
                  horaEntrada: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                };
                setVeiculosFila(prev => [novoItemFila, ...prev]);

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
                setAgendamentoSelecionadoParaChecklist(null);
                mostrarToast(`✅ Vistoria de "${novaVistoria.veiculo}" gravada com ${novaVistoria.fotos} fotos e inserida na Fila de Lavagem!`, 'sucesso');
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
                      type="tel"
                      maxLength={15}
                      value={novoCliTel}
                      onChange={(e) => setNovoCliTel(formatarCelular(e.target.value))}
                      placeholder="(11) 98888-9999"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
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
                    .filter(c => String(c?.nome || '').toLowerCase().includes(buscaCliente.toLowerCase()))
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
                              <p className="text-xs text-slate-400"><span className="font-mono text-slate-300">{c.telefone ? formatarCelular(c.telefone) : 'Sem telefone'}</span> • {c.veiculoPrincipal}</p>
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
                        type="tel"
                        maxLength={15}
                        value={novoFuncTel}
                        onChange={(e) => setNovoFuncTel(formatarCelular(e.target.value))}
                        placeholder="(11) 99999-0000"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
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
          {/* ABA: PRODUTOS & GESTÃO DE ESTOQUE */}
          {/* ========================================== */}
          {abaAtiva === 'produtos' && (
            <ModuloProdutos
              produtos={produtos}
              unidadeId={unidadeLogada}
              onSalvarProduto={handleSalvarProduto}
              onExcluirProduto={(id: string, nome: string) => {
                setItemParaExcluir({
                  tipo: 'produto',
                  id,
                  nome: nome || 'Produto'
                });
              }}
              onAjustarEstoque={handleAjustarEstoque}
              onAbrirPDV={() => setAbaAtiva('pdv')}
              temaClasses={temaClasses}
            />
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
                              const novaLista = banners.map(item => item.id === b.id ? atualizado : item);
                              setBanners(novaLista);
                              try {
                                localStorage.setItem('hubwash_banners', JSON.stringify(novaLista));
                                if (unidadeLogada) localStorage.setItem(`hubwash_banners_${unidadeLogada}`, JSON.stringify(novaLista));
                                window.dispatchEvent(new CustomEvent('hubwash_banners_atualizados', { detail: novaLista }));
                                window.dispatchEvent(new Event('hubwash_banners_atualizados'));
                              } catch {}
                              mostrarToast(`Banner marcado como ${novoStatus}!`, 'info');
                              try {
                                await salvarBannerServidor(atualizado);
                              } catch {}
                              if (db) {
                                try {
                                  await setDoc(doc(db, 'banners', b.id), { ...atualizado, updatedAt: new Date().toISOString() }, { merge: true });
                                } catch {
                                  try {
                                    await updateDoc(doc(db, 'banners', b.id), { status: novoStatus });
                                  } catch {}
                                }
                              }
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
            <div className="max-w-2xl space-y-6">
              {/* CARD DE LICENÇA & PLANO DO SISTEMA (COMPRA VITALÍCIA / MENSALIDADE) */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Licença do Aplicativo & Plano</h4>
                      <p className="text-[11px] text-slate-400">Modalidade de assinatura ou aquisição vitalícia desta unidade</p>
                    </div>
                  </div>
                  {unidadeInfo?.statusPlano === 'vitalicio' || unidadeInfo?.tipoPlano === 'vitalicio' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-500/20 to-amber-500/20 border border-purple-500/40 text-purple-300 rounded-full text-xs font-bold">
                      <Sparkles size={12} className="text-amber-400" />
                      Vitalício Definitivo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full text-xs font-semibold">
                      {unidadeInfo?.statusPlano === 'teste' ? 'Período de Testes' : 'Plano Mensal'}
                    </span>
                  )}
                </div>

                {unidadeInfo?.statusPlano === 'vitalicio' || unidadeInfo?.tipoPlano === 'vitalicio' ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-amber-950/30 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <Crown size={16} className="text-amber-400" />
                          <span>Licença Vitalícia Adquirida em Definitivo</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
                          Esta unidade adquiriu o software em definitivo. O acesso é perpétuo, sem mensalidades ou taxas de renovação recorrentes, com todos os módulos e atualizações incluídos.
                        </p>
                      </div>
                      <div className="bg-slate-900/90 border border-purple-500/40 rounded-xl px-4 py-2.5 text-center shrink-0">
                        <span className="text-[10px] text-purple-300 block uppercase font-bold tracking-wider">Valor do Software</span>
                        <span className="text-base font-black text-white">R$ {Number(unidadeInfo?.valorPlano || 2490).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-0.5">
                        <span className="text-slate-400 text-[10px] block">Tipo de Licença</span>
                        <span className="font-bold text-white">Perpétua / Definitiva</span>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-0.5">
                        <span className="text-slate-400 text-[10px] block">Validade da Licença</span>
                        <span className="font-bold text-amber-400 flex items-center gap-1">
                          <Infinity size={13} /> Vitalício
                        </span>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-0.5">
                        <span className="text-slate-400 text-[10px] block">Mensalidade Futura</span>
                        <span className="font-bold text-emerald-400">R$ 0,00 (Isento)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span className="text-slate-400 text-[10px] block">Mensalidade Atual</span>
                        <span className="font-bold text-white text-sm">
                          R$ {Number(unidadeInfo?.valorPlano || 149.9).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês
                        </span>
                        <span className="text-[10px] text-slate-500 block">Renovação recorrente</span>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span className="text-slate-400 text-[10px] block">Data de Expiração</span>
                        <span className="font-bold text-amber-400 text-sm">
                          {unidadeInfo?.dataExpiracao || 'Em 30 dias'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">Ciclo ativo</span>
                      </div>
                    </div>

                    {/* BANNER INFORMATIVO DE COMPRA VITALÍCIA */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-amber-950/30 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                          <Crown size={14} className="text-amber-400" />
                          <span>Deseja adquirir o aplicativo em definitivo?</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed max-w-md">
                          Adquira a <strong>Licença Vitalícia</strong> por um único pagamento e livre-se de mensalidades para sempre, mantendo acesso permanente a todos os recursos.
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">Investimento Único</span>
                        <span className="text-sm font-black text-amber-400">R$ 2.490,00</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD DE PERSONALIZAÇÃO & IDENTIDADE VISUAL */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Settings className="w-5 h-5 text-blue-400" /> Personalização & Identidade Visual
                </h3>

              <div className="space-y-5 text-xs">
                {/* LOGOTIPO PERSONALIZADO DA EMPRESA */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-slate-200 font-bold text-sm flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-cyan-400" /> Logotipo da Empresa
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Faça o upload do logo exclusivo do seu lava jato para personalizar seu painel e o App dos clientes.
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      logoLavaJato 
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {logoLavaJato ? 'Logotipo Personalizado Ativo' : 'Logotipo Padrão (HubWash)'}
                    </span>
                  </div>

                  {/* Input de arquivo invisível */}
                  <input
                    ref={fileInputLogoRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleUploadLogo}
                    className="hidden"
                  />

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80">
                    {/* Preview da Logo */}
                    <div className="w-24 h-24 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700 flex items-center justify-center p-2 overflow-hidden shadow-inner shrink-0 group relative">
                      <img
                        src={logoLavaJato || "/logo.png"}
                        alt="Logo Preview"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== '/logo.png') {
                            target.src = '/logo.png';
                          }
                        }}
                        className="max-h-full max-w-full object-contain rounded drop-shadow"
                      />
                    </div>

                    <div className="space-y-2 flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputLogoRef.current?.click()}
                          className="py-2 px-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md text-xs"
                        >
                          <Upload size={14} />
                          <span>Selecionar Imagem (PNG, JPG, SVG)</span>
                        </button>

                        {logoLavaJato && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoLavaJato('');
                              mostrarToast('Logotipo personalizado removido. Clique em Salvar Alterações para confirmar.', 'info');
                            }}
                            className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-semibold transition flex items-center gap-1.5 border border-rose-500/30 cursor-pointer text-xs"
                          >
                            <Trash2 size={13} />
                            <span>Remover Logo (Usar Padrão)</span>
                          </button>
                        )}
                      </div>

                      {/* URL alternativa */}
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-1">Ou cole a URL direta da imagem do logo:</label>
                        <input
                          type="url"
                          value={logoLavaJato.startsWith('data:') ? '' : logoLavaJato}
                          onChange={(e) => setLogoLavaJato(e.target.value)}
                          placeholder="https://exemplo.com/logo-empresa.png"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500 text-xs placeholder-slate-600 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 flex items-start gap-2">
                    <span className="text-cyan-400 font-bold shrink-0">📌 Nota:</span>
                    <span>
                      Esta alteração é <strong>exclusiva da sua empresa</strong> ({nomeLavaJato}). O logotipo do Administrador Geral do HubWash e das demais empresas cadastradas no sistema não serão afetados.
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Nome do Lava Jato</label>
                  <input
                    type="text"
                    value={nomeLavaJato}
                    onChange={(e) => setNomeLavaJato(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">WhatsApp / Telefone da Unidade</label>
                    <input
                      type="tel"
                      maxLength={15}
                      value={contatoLavaJato}
                      onChange={(e) => setContatoLavaJato(formatarCelular(e.target.value))}
                      placeholder="(11) 98888-7777"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">CEP</label>
                    <input
                      type="text"
                      maxLength={9}
                      value={cepLavaJato}
                      onChange={async (e) => {
                        const fmt = formatarCEP(e.target.value);
                        setCepLavaJato(fmt);
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw.length === 8) {
                          try {
                            const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
                            const data = await res.json();
                            if (!data.erro) {
                              const autoEnd = `${data.logradouro ? data.logradouro + ', ' : ''}${data.bairro ? data.bairro + ', ' : ''}${data.localidade || ''} - ${data.uf || ''}`;
                              if (autoEnd) setEnderecoLavaJato(autoEnd);
                              mostrarToast(`Endereço localizado: ${data.localidade} - ${data.uf}`, 'info');
                            }
                          } catch {}
                        }
                      }}
                      placeholder="00000-000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Endereço da Unidade</label>
                  <input
                    type="text"
                    value={enderecoLavaJato}
                    onChange={(e) => setEnderecoLavaJato(e.target.value)}
                    placeholder="Av. Principal, 100 - Bairro"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
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
                    As alterações são salvas e sincronizadas automaticamente.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const salvos = localStorage.getItem('hubwash_lava_jatos');
                        const slugUnidade = (unidadeNome || 'pitstop').toLowerCase().trim();
                        if (salvos) {
                          const lista = JSON.parse(salvos);
                          const idx = lista.findIndex((x: any) => String(x.id).toLowerCase() === slugUnidade || String(x.nomeFantasia).toLowerCase() === slugUnidade);
                          if (idx !== -1) {
                            lista[idx] = {
                              ...lista[idx],
                              nomeFantasia: nomeLavaJato,
                              contato: contatoLavaJato,
                              endereco: enderecoLavaJato,
                              logoUrl: logoLavaJato
                            };
                            localStorage.setItem('hubwash_lava_jatos', JSON.stringify(lista));
                            localStorage.setItem(`hubwash_logo_${lista[idx].id}`, logoLavaJato);
                            window.dispatchEvent(new CustomEvent('hubwash_logo_alterado', { 
                              detail: { unidadeId: lista[idx].id, logoUrl: logoLavaJato } 
                            }));
                            if (db) {
                              await setDoc(doc(db, 'unidades', lista[idx].id), {
                                nomeFantasia: nomeLavaJato,
                                contato: contatoLavaJato,
                                endereco: enderecoLavaJato,
                                logoUrl: logoLavaJato
                              }, { merge: true }).catch(() => {});
                            }
                          } else {
                            localStorage.setItem(`hubwash_logo_${slugUnidade}`, logoLavaJato);
                          }
                        } else {
                          localStorage.setItem(`hubwash_logo_${slugUnidade}`, logoLavaJato);
                        }
                      } catch {}
                      mostrarToast('Configurações e Logotipo da empresa salvos com sucesso!', 'sucesso');
                    }}
                    className={`px-5 py-2.5 ${temaClasses.bg} text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5`}
                  >
                    <Check size={14} />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        </main>
      </div>
    </div>
  );
}
