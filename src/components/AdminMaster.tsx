import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  FileText, 
  MapPin, 
  Phone, 
  Lock, 
  Calendar, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  QrCode, 
  ExternalLink, 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  Copy, 
  Check, 
  ArrowLeft, 
  Download, 
  X, 
  UserPlus,
  Crown,
  Sparkles,
  Infinity
} from 'lucide-react';
import { LavaJato } from '../types';
import { URL_BASE_NETLIFY } from '../App';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from '../firebase';
import {
  buscarUnidadesServidor,
  salvarUnidadeServidor,
  atualizarStatusUnidadeServidor,
  excluirUnidadeServidor
} from '../services/apiSync';
import { formatarCelular, formatarCEP, formatarCpfCnpj } from '../utils/formatters';

interface AdminMasterProps {
  onLogout?: () => void;
  onIrParaLavaJato?: (nome?: string) => void;
  onIrParaCliente?: (nome?: string, tela?: 'cadastro' | 'login' | 'home') => void;
}

export default function AdminMaster({ onLogout, onIrParaLavaJato, onIrParaCliente }: AdminMasterProps) {
  const [lavaJatos, setLavaJatos] = useState<LavaJato[]>(() => {
    const saved = localStorage.getItem('hubwash_lava_jatos');
    if (saved) {
      try {
        const parsed: LavaJato[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(u => ({
            ...u,
            statusPlano: u.statusPlano === 'bloqueado' ? 'ativo' : (u.statusPlano || 'ativo')
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'teste' | 'ativo' | 'vitalicio' | 'bloqueado'>('todos');
  const [mostrarSenha, setMostrarSenha] = useState<{ [key: string]: boolean }>({});
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [copiadoLinkModal, setCopiadoLinkModal] = useState(false);
  const [itemParaExcluir, setItemParaExcluir] = useState<LavaJato | null>(null);
  const [modalLimparBanco, setModalLimparBanco] = useState(false);
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' | 'info' } | null>(null);

  // ESTADO PARA EXIBIR O QR CODE GERADO NA TELA (MODAL)
  const [qrCodeModal, setQrCodeModal] = useState<{ visivel: boolean; link: string; nome: string }>({
    visivel: false,
    link: '',
    nome: ''
  });

  // ESTADOS DO FORMULÁRIO DE CADASTRO
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [nomeProprietario, setNomeProprietario] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [contato, setContato] = useState('');
  const [senhaProvisoria, setSenhaProvisoria] = useState('');
  const [modalidadePlano, setModalidadePlano] = useState<'mensal' | 'vitalicio'>('mensal');
  const [valorPlano, setValorPlano] = useState('149.90');

  // SINCRONIZAÇÃO AUTOMÁTICA EM SEGUNDO PLANO COM O CLOUD FIRESTORE
  useEffect(() => {
    if (!db || !Array.isArray(lavaJatos) || lavaJatos.length === 0) return;

    // Envio automático contínuo de todas as empresas para o Banco de Dados (Firestore)
    const timerSync = setTimeout(() => {
      lavaJatos.forEach(async (u) => {
        try {
          await setDoc(doc(db, 'unidades', u.id), u, { merge: true });
        } catch (err) {
          console.warn(`[Auto-Sync Firestore] Erro ao gravar unidade ${u.id}:`, err);
        }
      });
    }, 500);

    return () => clearTimeout(timerSync);
  }, [lavaJatos]);

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const salvarLavaJatosLocal = (novos: LavaJato[]) => {
    setLavaJatos(novos);
    try {
      localStorage.setItem('hubwash_lava_jatos', JSON.stringify(novos));
    } catch (e) {
      console.warn('Erro ao salvar no localStorage:', e);
    }
  };

  // SINCRONIZAÇÃO EM TEMPO REAL (SERVIDOR + FIRESTORE + LOCALSTORAGE)
  useEffect(() => {
    let cancelado = false;

    const carregarDadosIniciais = async () => {
      try {
        const unidadesServidor = await buscarUnidadesServidor();
        if (!cancelado && Array.isArray(unidadesServidor) && unidadesServidor.length > 0) {
          const formatadas = unidadesServidor.map(u => ({
            ...u,
            statusPlano: u.statusPlano === 'bloqueado' ? 'ativo' : (u.statusPlano || 'ativo')
          }));
          salvarLavaJatosLocal(formatadas);
          return;
        }
      } catch (err) {
        console.warn('Erro ao carregar unidades da API:', err);
      }

      // Se não há dados no servidor nem no localStorage, cria a unidade padrão ATIVA
      const dadosSalvos = localStorage.getItem('hubwash_lava_jatos');
      if (!dadosSalvos || dadosSalvos === '[]') {
        const hoje = new Date();
        const expiracao = new Date();
        expiracao.setDate(hoje.getDate() + 365);

        const unidadePadrao: LavaJato = {
          id: 'pitstop',
          nomeFantasia: 'Pit Stop Lava Jato',
          nomeProprietario: 'Carlos Silva',
          razaoSocial: 'C. Silva Lavagens LTDA',
          cnpj: '12.345.678/0001-99',
          endereco: 'Av. Central, 1500 - Centro',
          contato: '(11) 99999-8888',
          senhaProvisoria: 'pit123',
          valorPlano: 149.90,
          dataCriacao: hoje.toLocaleDateString('pt-BR'),
          dataExpiracao: expiracao.toLocaleDateString('pt-BR'),
          statusPlano: 'ativo'
        };

        salvarLavaJatosLocal([unidadePadrao]);
        salvarUnidadeServidor(unidadePadrao).catch(() => {});
        if (db) {
          setDoc(doc(db, 'unidades', unidadePadrao.id), unidadePadrao).catch(() => {});
        }
      }
    };

    carregarDadosIniciais();

    // 1. OUVINTE EM TEMPO REAL DO FIRESTORE (se configurado)
    let unsubscribeFirestore: (() => void) | null = null;
    if (db) {
      try {
        unsubscribeFirestore = onSnapshot(collection(db, 'unidades'), (snapshot) => {
          if (!snapshot.empty) {
            const doFirestore: LavaJato[] = [];
            snapshot.forEach((docItem) => {
              const d = docItem.data() as LavaJato;
              doFirestore.push({
                ...d,
                id: d.id || docItem.id,
                statusPlano: d.statusPlano || 'ativo'
              });
            });
            if (!cancelado && doFirestore.length > 0) {
              salvarLavaJatosLocal(doFirestore);
            }
          }
        }, (err) => {
          console.warn('Ouvinte Firestore unidades:', err);
        });
      } catch (e) {
        console.warn('Erro ao inicializar onSnapshot de unidades:', e);
      }
    }

    // 2. POLLING CONTÍNUO COM O SERVIDOR (a cada 3.5 segundos)
    const intervalId = setInterval(async () => {
      try {
        const doServidor = await buscarUnidadesServidor();
        if (!cancelado && Array.isArray(doServidor) && doServidor.length > 0) {
          setLavaJatos(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(doServidor)) {
              try {
                localStorage.setItem('hubwash_lava_jatos', JSON.stringify(doServidor));
              } catch {}
              return doServidor;
            }
            return prev;
          });
        }
      } catch {}
    }, 3500);

    return () => {
      cancelado = true;
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(intervalId);
    };
  }, []);

  const gerarSlug = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  };

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeFantasia.trim() || !nomeProprietario.trim() || !cnpj.trim() || !senhaProvisoria.trim()) {
      mostrarToast('Por favor, preencha os campos obrigatórios (*)', 'erro');
      return;
    }

    const slug = gerarSlug(nomeFantasia);

    if (lavaJatos.some(lj => lj.id === slug)) {
      mostrarToast('Já existe um lava-jato cadastrado com esse mesmo Nome Fantasia!', 'erro');
      return;
    }

    const hoje = new Date();
    const dataExpiracao = new Date();
    dataExpiracao.setDate(hoje.getDate() + 30); // 30 dias de teste/ativação garantida

    const enderecoFormatado = cep ? `CEP: ${cep} - ${endereco.trim()}` : endereco.trim();
    const isVitalicio = modalidadePlano === 'vitalicio';
    const statusInicial: 'ativo' | 'vitalicio' = isVitalicio ? 'vitalicio' : 'ativo';
    const expiracaoTexto = isVitalicio ? 'Vitalício (Sem expiração)' : dataExpiracao.toLocaleDateString('pt-BR');

    const novoLavaJato: LavaJato = {
      id: slug,
      nomeFantasia: nomeFantasia.trim(),
      nomeProprietario: nomeProprietario.trim(),
      razaoSocial: razaoSocial.trim() || nomeFantasia.trim(),
      cnpj: cnpj.trim(),
      endereco: enderecoFormatado || 'Não informado',
      contato: contato.trim() || 'Não informado',
      senhaProvisoria: senhaProvisoria.trim(),
      valorPlano: parseFloat(valorPlano) || 0,
      dataCriacao: hoje.toLocaleDateString('pt-BR'),
      dataExpiracao: expiracaoTexto,
      statusPlano: statusInicial,
      tipoPlano: isVitalicio ? 'vitalicio' : 'mensal'
    };

    const atualizados = [novoLavaJato, ...lavaJatos];
    salvarLavaJatosLocal(atualizados);

    // Persistência robusta no servidor backend
    try {
      await salvarUnidadeServidor(novoLavaJato);
    } catch (err) {
      console.warn('Erro ao salvar unidade no servidor:', err);
    }

    // Persistência automática no Cloud Firestore
    try {
      if (db) {
        await setDoc(doc(db, 'unidades', slug), novoLavaJato, { merge: true });
      }
    } catch (err: any) {
      console.warn('Erro ao salvar unidade automaticamente no Firestore:', err);
    }
    
    // CONFIGURA O QR CODE PARA APARECER LOGO APÓS O CADASTRO
    const urlOrigem = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1') 
      ? window.location.origin 
      : URL_BASE_NETLIFY;
    const linkCliente = `${urlOrigem}/?unidade=${slug}&rota=cadastro`;
    setQrCodeModal({
      visivel: true,
      link: linkCliente,
      nome: nomeFantasia.trim()
    });

    setNomeFantasia('');
    setNomeProprietario('');
    setRazaoSocial('');
    setCnpj('');
    setCep('');
    setEndereco('');
    setContato('');
    setSenhaProvisoria('');
    setModalidadePlano('mensal');
    setValorPlano('149.90');

    mostrarToast(
      isVitalicio 
        ? `Lava-jato "${novoLavaJato.nomeFantasia}" cadastrado com Licença Vitalícia (R$ ${novoLavaJato.valorPlano.toFixed(2)})!` 
        : `Lava-jato "${novoLavaJato.nomeFantasia}" cadastrado e ativado com sucesso!`, 
      'sucesso'
    );
  };

  // FUNÇÃO PARA GERAR O QR CODE VISUAL VIA API GRATUITA
  const abrirQrCodeUnidade = (id: string, nome: string) => {
    const urlOrigem = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1') 
      ? window.location.origin 
      : URL_BASE_NETLIFY;
    const linkCompleto = `${urlOrigem}/?unidade=${id}&rota=cadastro`;
    setQrCodeModal({
      visivel: true,
      link: linkCompleto,
      nome: nome
    });
  };

  const confirmarExclusao = async () => {
    if (!itemParaExcluir) return;
    const filtrados = lavaJatos.filter(lj => lj.id !== itemParaExcluir.id);
    salvarLavaJatosLocal(filtrados);

    try {
      await excluirUnidadeServidor(itemParaExcluir.id);
      if (db) {
        await deleteDoc(doc(db, 'unidades', itemParaExcluir.id));
      }
    } catch (err) {
      console.warn('Erro ao excluir unidade remotamente:', err);
    }

    mostrarToast(`Lava-jato "${itemParaExcluir.nomeFantasia}" excluído do sistema SaaS!`, 'info');
    setItemParaExcluir(null);
  };

  const alternarStatusPlano = async (id: string, novoStatus: 'teste' | 'ativo' | 'vitalicio' | 'bloqueado') => {
    const atualizados = lavaJatos.map(lj => {
      if (lj.id === id) {
        return {
          ...lj,
          statusPlano: novoStatus,
          tipoPlano: novoStatus === 'vitalicio' ? ('vitalicio' as const) : (lj.tipoPlano || 'mensal'),
          dataExpiracao: novoStatus === 'vitalicio' ? 'Vitalício (Sem expiração)' : lj.dataExpiracao
        };
      }
      return lj;
    });
    salvarLavaJatosLocal(atualizados);

    try {
      await atualizarStatusUnidadeServidor(id, novoStatus);
      if (db) {
        await setDoc(doc(db, 'unidades', id), { 
          statusPlano: novoStatus,
          tipoPlano: novoStatus === 'vitalicio' ? 'vitalicio' : 'mensal',
          dataExpiracao: novoStatus === 'vitalicio' ? 'Vitalício (Sem expiração)' : undefined
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Erro ao atualizar status da unidade:', err);
    }

    const mensagemStatus = novoStatus === 'vitalicio'
      ? 'Plano atualizado para VITALÍCIO (Licença Perpétua do App)!'
      : `Status do plano atualizado para "${novoStatus.toUpperCase()}"!`;
    mostrarToast(mensagemStatus, 'sucesso');
  };

  const toggleSenha = (id: string) => {
    setMostrarSenha(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copiarLinkAcesso = (slug: string) => {
    const urlOrigem = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1') 
      ? window.location.origin 
      : URL_BASE_NETLIFY;
    const url = `${urlOrigem}/?unidade=${slug}&rota=cadastro`;
    navigator.clipboard.writeText(url);
    setCopiadoId(slug);
    mostrarToast('Link do App Cliente copiado com sucesso!', 'sucesso');
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const copiarLinkModal = () => {
    if (qrCodeModal.link) {
      navigator.clipboard.writeText(qrCodeModal.link);
      setCopiadoLinkModal(true);
      mostrarToast('Link copiado para a área de transferência!', 'sucesso');
      setTimeout(() => setCopiadoLinkModal(false), 2000);
    }
  };

  const listaFiltrada = lavaJatos.filter(lj => {
    const matchBusca = 
      lj.nomeFantasia.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      lj.nomeProprietario.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      lj.cnpj.includes(filtroBusca) ||
      lj.id.includes(filtroBusca.toLowerCase());

    const matchStatus = filtroStatus === 'todos' || lj.statusPlano === filtroStatus;
    return matchBusca && matchStatus;
  });

  const totalUnidades = lavaJatos.length;
  const unidadesAtivas = lavaJatos.filter(u => u.statusPlano === 'ativo').length;
  const unidadesVitalicias = lavaJatos.filter(u => u.statusPlano === 'vitalicio').length;
  const unidadesEmTeste = lavaJatos.filter(u => u.statusPlano === 'teste').length;
  const unidadesBloqueadas = lavaJatos.filter(u => u.statusPlano === 'bloqueado').length;
  const receitaMensal = lavaJatos
    .filter(u => u.statusPlano === 'ativo')
    .reduce((acc, curr) => acc + (curr.valorPlano || 0), 0);
  const receitaVitaliciaTotal = lavaJatos
    .filter(u => u.statusPlano === 'vitalicio')
    .reduce((acc, curr) => acc + (curr.valorPlano || 0), 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 antialiased font-sans flex flex-col justify-between relative">
      
      {/* TOAST DE NOTIFICAÇÃO */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-semibold ${
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

      {/* MODAL DE QR CODE VISUAL (GERADO VIA API GRATUITA) */}
      {qrCodeModal.visivel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center relative">
            <button 
              type="button" 
              onClick={() => setQrCodeModal({ visivel: false, link: '', nome: '' })}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-slate-800"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
              <QrCode size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">QR Code do App Cliente</h3>
              <p className="text-xs text-blue-300 font-semibold">{qrCodeModal.nome}</p>
              <p className="text-[11px] text-slate-400">
                Ao ler este QR Code, o cliente é direcionado diretamente para o <strong className="text-blue-300">Cadastro</strong> no {qrCodeModal.nome}.
              </p>
            </div>

            {/* IMAGEM DO QR CODE */}
            <div className="bg-white p-4 rounded-xl shadow-inner inline-block mx-auto border border-slate-700">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCodeModal.link)}&margin=10`} 
                alt={`QR Code ${qrCodeModal.nome}`}
                className="w-48 h-48 mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* LINK DO CLIENTE E BOTÕES */}
            <div className="space-y-2.5">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 break-all select-all text-left">
                {qrCodeModal.link}
              </div>

              {onIrParaCliente && (
                <button
                  type="button"
                  onClick={() => {
                    setQrCodeModal({ visivel: false, link: '', nome: '' });
                    onIrParaCliente(qrCodeModal.nome, 'cadastro');
                  }}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30"
                >
                  <UserPlus size={14} />
                  <span>Abrir Tela de Cadastro Desta Unidade</span>
                </button>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copiarLinkModal}
                  className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30"
                >
                  {copiadoLinkModal ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                  <span>{copiadoLinkModal ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>

                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrCodeModal.link)}&margin=10`}
                  target="_blank"
                  rel="noreferrer"
                  download={`qrcode-${qrCodeModal.nome}.png`}
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

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO INTERNO (SEM WINDOW.CONFIRM) */}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Confirmar Exclusão de Inquilino</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tem certeza que deseja excluir permanentemente o lava-jato <strong className="text-white">"{itemParaExcluir.nomeFantasia}"</strong> ({itemParaExcluir.cnpj}) do sistema SaaS?
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

      {/* HEADER */}
      <header className="bg-slate-800 border-b border-slate-700 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="HubWash Logo"
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
              className="h-10 w-auto max-w-[130px] object-contain drop-shadow-md shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">HubWash Admin</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 border border-blue-500/30 text-blue-400">
                  MASTER
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Painel do Super Administrador SaaS</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium">SaaS Operacional</span>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                title="Retornar à tela de autenticação OTP"
              >
                <ArrowLeft size={14} />
                <span>Voltar ao Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 flex-1 w-full">
        {/* CARDS DE RESUMO MASTER */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Unidades</p>
            <p className="text-2xl font-black text-white mt-1">{totalUnidades}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Ativas / Mensal</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{unidadesAtivas}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-950/40 via-slate-800/90 to-amber-950/30 border border-purple-500/40 rounded-2xl p-4 shadow-lg shadow-purple-950/30">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Crown size={12} className="text-amber-400" /> Vitalícias
              </p>
              <Sparkles size={12} className="text-purple-300" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{unidadesVitalicias}</p>
            <p className="text-[10px] text-purple-300 font-mono mt-0.5">
              R$ {receitaVitaliciaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Em Teste (20d)</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{unidadesEmTeste}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Bloqueados</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{unidadesBloqueadas}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 lg:col-span-1 bg-gradient-to-br from-blue-950/40 to-slate-800/90 border border-blue-700/40 rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">MRR Mensal</p>
            <p className="text-2xl font-black text-white mt-1">
              R$ {receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* FORMULÁRIO DE CADASTRO */}
          <section className="lg:col-span-1 bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-4 sticky top-24">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2.5">
              <Plus className="w-5 h-5 text-blue-500" /> Cadastrar Novo Inquilino
            </h2>

            <form onSubmit={handleCadastrar} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-slate-300 mb-1">Nome Fantasia *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    value={nomeFantasia} 
                    onChange={(e) => setNomeFantasia(e.target.value)} 
                    placeholder="Ex: Pit Stop Lava Jato" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" 
                  />
                </div>
                {nomeFantasia && (
                  <p className="text-[10px] text-cyan-400 font-mono mt-1 pl-1">
                    Slug gerado: <span className="font-semibold">?unidade={gerarSlug(nomeFantasia)}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Nome do Proprietário *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    value={nomeProprietario} 
                    onChange={(e) => setNomeProprietario(e.target.value)} 
                    placeholder="Ex: Carlos Silva" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Razão Social</label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    value={razaoSocial} 
                    onChange={(e) => setRazaoSocial(e.target.value)} 
                    placeholder="Ex: C. Silva Lavagens LTDA" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">CNPJ / CPF *</label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    value={cnpj} 
                    maxLength={18}
                    onChange={(e) => setCnpj(formatarCpfCnpj(e.target.value))} 
                    placeholder="00.000.000/0001-00" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-1">
                  <label className="block text-slate-300 mb-1">CEP</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      value={cep} 
                      maxLength={9}
                      onChange={async (e) => {
                        const fmt = formatarCEP(e.target.value);
                        setCep(fmt);
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw.length === 8) {
                          try {
                            const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
                            const data = await res.json();
                            if (!data.erro) {
                              const autoEnd = `${data.logradouro ? data.logradouro + ', ' : ''}${data.bairro ? data.bairro + ', ' : ''}${data.localidade || ''} - ${data.uf || ''}`;
                              if (autoEnd) setEndereco(autoEnd);
                              mostrarToast(`Endereço localizado: ${data.localidade} - ${data.uf}`, 'info');
                            }
                          } catch {}
                        }
                      }} 
                      placeholder="00000-000" 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs" 
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1">Endereço Completo</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      value={endereco} 
                      onChange={(e) => setEndereco(e.target.value)} 
                      placeholder="Av. Central, 1500 - Centro" 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Contato / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input 
                    type="tel" 
                    value={contato} 
                    maxLength={15}
                    onChange={(e) => setContato(formatarCelular(e.target.value))} 
                    placeholder="(11) 99999-8888" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs" 
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-slate-300">Modalidade de Licenciamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalidadePlano('mensal');
                      if (valorPlano === '2490.00' || valorPlano === '1990.00') {
                        setValorPlano('149.90');
                      }
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalidadePlano === 'mensal'
                        ? 'bg-blue-600/25 border-blue-500 text-blue-300 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock size={13} />
                    <span>Mensalidade</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalidadePlano('vitalicio');
                      if (valorPlano === '149.90') {
                        setValorPlano('2490.00');
                      }
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalidadePlano === 'vitalicio'
                        ? 'bg-gradient-to-r from-purple-600/30 via-slate-800 to-amber-600/30 border-purple-400 text-amber-300 shadow-md shadow-purple-950/50'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-amber-300'
                    }`}
                  >
                    <Crown size={13} className="text-amber-400" />
                    <span>Compra Vitalícia</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 mb-1">Senha Provisória *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      value={senhaProvisoria} 
                      onChange={(e) => setSenhaProvisoria(e.target.value)} 
                      placeholder="Senha de acesso" 
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">
                    {modalidadePlano === 'vitalicio' ? 'Valor Compra Vitalícia (R$)' : 'Valor do Plano (R$)'}
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input 
                      type="number" 
                      step="0.01" 
                      value={valorPlano} 
                      onChange={(e) => setValorPlano(e.target.value)} 
                      placeholder={modalidadePlano === 'vitalicio' ? '2490.00' : '149.90'} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-semibold" 
                    />
                  </div>
                </div>
              </div>

              {modalidadePlano === 'vitalicio' ? (
                <div className="p-3 bg-gradient-to-r from-purple-950/70 via-slate-900 to-amber-950/50 border border-purple-500/40 rounded-xl text-[11px] text-purple-200 flex items-start gap-2.5 shadow-md">
                  <Crown className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div className="space-y-0.5">
                    <strong className="text-amber-300 block font-bold">Compra Vitalícia do Aplicativo</strong>
                    <span className="text-slate-300">
                      O cliente adquire a posse definitiva do sistema. Acesso permanente sem mensalidades futuras e sem prazo de expiração.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-blue-950/40 border border-blue-800/50 rounded-xl text-[11px] text-blue-300 flex items-start gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                  <span>O inquilino começará com <strong>20 dias de teste grátis</strong> a partir de hoje.</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all uppercase tracking-wide mt-2 shadow-lg shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span>Criar Unidade & Gerar QR Code</span>
              </button>
            </form>
          </section>

          {/* LISTAGEM DE UNIDADES */}
          <section className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-500" /> Unidades Inquilinas ({listaFiltrada.length})
              </h2>

              {/* BARRA DE BUSCA E FILTRO */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input 
                    type="text"
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    placeholder="Buscar unidade..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="teste">Em Teste</option>
                  <option value="ativo">Ativo (Mensal)</option>
                  <option value="vitalicio">👑 Vitalício (Definitivo)</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
            </div>

            {/* TABELA RESPONSIVA */}
            {listaFiltrada.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-700/80 rounded-2xl p-12 text-center space-y-3">
                <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-semibold text-white">Nenhum lava-jato encontrado</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Não encontramos nenhum inquilino cadastrado com os filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/30">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-700">
                      <th className="p-3.5">Unidade / Link</th>
                      <th className="p-3.5">Proprietário / CNPJ / Plano</th>
                      <th className="p-3.5">Senha</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-center">QR Code</th>
                      <th className="p-3.5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {listaFiltrada.map((lj) => {
                      const statusBadge: Record<string, string> = {
                        ativo: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                        vitalicio: 'bg-gradient-to-r from-purple-500/20 to-amber-500/20 border-purple-500/40 text-purple-300 font-bold shadow-sm',
                        teste: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                        bloqueado: 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      };

                      return (
                        <tr key={lj.id} className="hover:bg-slate-800/40 transition">
                          {/* UNIDADE / LINK */}
                          <td className="p-3.5 space-y-1">
                            <div className="font-bold text-white text-sm">{lj.nomeFantasia}</div>
                            <div className="text-[10px] text-slate-400 font-mono select-all bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 inline-block">
                              ?unidade={lj.id}
                            </div>
                          </td>

                          {/* PROPRIETÁRIO / CNPJ */}
                          <td className="p-3.5 space-y-0.5">
                            <div className="text-slate-200 font-medium">{lj.nomeProprietario}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{formatarCpfCnpj(lj.cnpj)}</div>
                            {lj.contato && lj.contato !== 'Não informado' && (
                              <div className="text-[10px] text-emerald-400 font-mono">{formatarCelular(lj.contato)}</div>
                            )}
                            {lj.statusPlano === 'vitalicio' || lj.tipoPlano === 'vitalicio' ? (
                              <div className="inline-flex items-center gap-1 text-[10px] text-purple-300 font-bold bg-purple-950/60 border border-purple-800/80 px-2 py-0.5 rounded-md mt-1 shadow-sm">
                                <Crown size={11} className="text-amber-400 shrink-0" />
                                <span>Vitalício: R$ {Number(lj.valorPlano || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 font-medium mt-1">
                                Mensal: R$ {Number(lj.valorPlano || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                              </div>
                            )}
                          </td>

                          {/* SENHA PROVISÓRIA COM TOGGLE */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-200 text-xs">
                                {mostrarSenha[lj.id] ? lj.senhaProvisoria : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleSenha(lj.id)}
                                className="text-slate-400 hover:text-slate-200 transition cursor-pointer p-1"
                                title={mostrarSenha[lj.id] ? "Ocultar senha" : "Ver senha"}
                              >
                                {mostrarSenha[lj.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                          </td>

                          {/* STATUS DO PLANO */}
                          <td className="p-3.5">
                            <select
                              value={lj.statusPlano}
                              onChange={(e) => alternarStatusPlano(lj.id, e.target.value as any)}
                              className={`bg-slate-950 border rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer ${statusBadge[lj.statusPlano] || ''}`}
                            >
                              <option value="teste">Teste (20d)</option>
                              <option value="ativo">Ativo / Mensal</option>
                              <option value="vitalicio">👑 Vitalício (Definitivo)</option>
                              <option value="bloqueado">Bloqueado</option>
                            </select>
                          </td>

                          {/* BOTÃO QR CODE MODAL */}
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => abrirQrCodeUnidade(lj.id, lj.nomeFantasia)}
                              className="px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1"
                              title="Ver QR Code do App Cliente"
                            >
                              <QrCode size={13} />
                              <span>QR Code</span>
                            </button>
                          </td>

                          {/* AÇÕES */}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onIrParaCliente && (
                                <button
                                  type="button"
                                  onClick={() => onIrParaCliente(lj.nomeFantasia, 'cadastro')}
                                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 transition cursor-pointer"
                                  title="Abrir Tela de Cadastro de Cliente deste lava-jato"
                                >
                                  <UserPlus size={13} />
                                </button>
                              )}

                              {onIrParaLavaJato && (
                                <button
                                  type="button"
                                  onClick={() => onIrParaLavaJato(lj.nomeFantasia)}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition cursor-pointer"
                                  title="Acessar painel operacional deste lava-jato"
                                >
                                  <ExternalLink size={13} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => copiarLinkAcesso(lj.id)}
                                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700 transition cursor-pointer"
                                title="Copiar Link de Cadastro do Cliente"
                              >
                                {copiadoId === lj.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                              </button>

                              <button
                                type="button"
                                onClick={() => setItemParaExcluir(lj)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                                title="Excluir Unidade"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </main>

    </div>
  );
}

