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
  Database, 
  RefreshCw,
  UserPlus
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
  onSnapshot,
  getFirebaseStatus 
} from '../firebase';
import {
  buscarUnidadesServidor,
  salvarUnidadeServidor,
  atualizarStatusUnidadeServidor,
  excluirUnidadeServidor
} from '../services/apiSync';

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
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'teste' | 'ativo' | 'bloqueado'>('todos');
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
  const [endereco, setEndereco] = useState('');
  const [contato, setContato] = useState('');
  const [senhaProvisoria, setSenhaProvisoria] = useState('');
  const [valorPlano, setValorPlano] = useState('149.90');

  // ESTADO DO FIREBASE E DIAGNÓSTICO DE PERMISSÕES
  const firebaseStatus = getFirebaseStatus();
  const [erroPermissaoFirebase, setErroPermissaoFirebase] = useState(false);
  const [testandoFirebase, setTestandoFirebase] = useState(false);
  const [resultadoTesteFirebase, setResultadoTesteFirebase] = useState<{ sucesso: boolean; mensagem: string } | null>(null);

  const testarConexaoFirebase = async () => {
    if (!db) {
      setResultadoTesteFirebase({ sucesso: false, mensagem: 'Firebase não está inicializado.' });
      return;
    }
    setTestandoFirebase(true);
    setResultadoTesteFirebase(null);
    try {
      await setDoc(doc(db, 'teste_conexao', 'ping'), {
        data: new Date().toISOString(),
        teste: 'Conexao OK'
      });
      setErroPermissaoFirebase(false);
      setResultadoTesteFirebase({
        sucesso: true,
        mensagem: '✅ Sucesso! O Firestore aceitou a gravação. O banco de dados está online e liberado!'
      });
      mostrarToast('✅ Firebase conectado e gravando perfeitamente!', 'sucesso');
    } catch (e: any) {
      const msg = String(e?.message || e?.code || '');
      if (msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')) {
        setErroPermissaoFirebase(true);
        setResultadoTesteFirebase({
          sucesso: false,
          mensagem: '❌ PERMISSION_DENIED: O Firebase recusou a gravação. No Firebase Console > Firestore Database > Regras, altere a linha 3 de "match /bancodb/..." para "match /databases/{database}/documents" e clique em PUBLICAR.'
        });
        mostrarToast('❌ O Firebase rejeitou a gravação (PERMISSION_DENIED nas regras).', 'erro');
      } else {
        setResultadoTesteFirebase({ sucesso: false, mensagem: `Erro ao testar: ${e?.message || 'Falha de conexão'}` });
      }
    } finally {
      setTestandoFirebase(false);
    }
  };

  const sincronizarTodasUnidadesFirestore = async () => {
    if (!db) {
      mostrarToast('Firebase não inicializado.', 'erro');
      return;
    }
    setTestandoFirebase(true);
    try {
      let enviados = 0;
      for (const u of lavaJatos) {
        await setDoc(doc(db, 'unidades', u.id), u);
        enviados++;
      }
      setErroPermissaoFirebase(false);
      setResultadoTesteFirebase({ sucesso: true, mensagem: `✅ ${enviados} empresa(s) sincronizada(s) com sucesso no Firebase!` });
      mostrarToast(`✅ ${enviados} empresa(s) sincronizada(s) com sucesso no Firebase!`, 'sucesso');
    } catch (e: any) {
      const msg = String(e?.message || e?.code || '');
      if (msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')) {
        setErroPermissaoFirebase(true);
        setResultadoTesteFirebase({
          sucesso: false,
          mensagem: '❌ PERMISSION_DENIED: O Firebase recusou o envio. Altere a linha 3 das regras no Firebase Console para: match /databases/{database}/documents e clique em Publicar.'
        });
        mostrarToast('❌ Permissão negada pelo Firebase.', 'erro');
      } else {
        setResultadoTesteFirebase({ sucesso: false, mensagem: `Erro: ${e?.message || 'Falha de conexão'}` });
      }
    } finally {
      setTestandoFirebase(false);
    }
  };

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

    const novoLavaJato: LavaJato = {
      id: slug,
      nomeFantasia: nomeFantasia.trim(),
      nomeProprietario: nomeProprietario.trim(),
      razaoSocial: razaoSocial.trim() || nomeFantasia.trim(),
      cnpj: cnpj.trim(),
      endereco: endereco.trim() || 'Não informado',
      contato: contato.trim() || 'Não informado',
      senhaProvisoria: senhaProvisoria.trim(),
      valorPlano: parseFloat(valorPlano) || 0,
      dataCriacao: hoje.toLocaleDateString('pt-BR'),
      dataExpiracao: dataExpiracao.toLocaleDateString('pt-BR'),
      statusPlano: 'ativo' // Começa sempre ativo e desbloqueado
    };

    const atualizados = [novoLavaJato, ...lavaJatos];
    salvarLavaJatosLocal(atualizados);

    // Persistência robusta no servidor backend
    try {
      await salvarUnidadeServidor(novoLavaJato);
    } catch (err) {
      console.warn('Erro ao salvar unidade no servidor:', err);
    }

    // Persistência no Cloud Firestore
    try {
      if (db) {
        await setDoc(doc(db, 'unidades', slug), novoLavaJato);
        setErroPermissaoFirebase(false);
      }
    } catch (err: any) {
      console.error('Erro ao salvar unidade no Firestore:', err);
      const msg = String(err?.message || err?.code || '');
      if (msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')) {
        setErroPermissaoFirebase(true);
        mostrarToast('⚠️ Empresa salva localmente, mas o Firebase recusou a gravação por Regra de Segurança (PERMISSION_DENIED). Altere a linha 3 para "match /databases/{database}/documents".', 'erro');
      }
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
    setEndereco('');
    setContato('');
    setSenhaProvisoria('');
    setValorPlano('149.90');

    mostrarToast(`Lava-jato "${novoLavaJato.nomeFantasia}" cadastrado e ativado com sucesso!`, 'sucesso');
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

  const alternarStatusPlano = async (id: string, novoStatus: 'teste' | 'ativo' | 'bloqueado') => {
    const atualizados = lavaJatos.map(lj => lj.id === id ? { ...lj, statusPlano: novoStatus } : lj);
    salvarLavaJatosLocal(atualizados);

    try {
      await atualizarStatusUnidadeServidor(id, novoStatus);
      if (db) {
        await updateDoc(doc(db, 'unidades', id), { statusPlano: novoStatus });
      }
    } catch (err) {
      console.warn('Erro ao atualizar status da unidade:', err);
    }

    mostrarToast(`Status do plano atualizado para "${novoStatus.toUpperCase()}"!`, 'sucesso');
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
  const unidadesEmTeste = lavaJatos.filter(u => u.statusPlano === 'teste').length;
  const unidadesBloqueadas = lavaJatos.filter(u => u.statusPlano === 'bloqueado').length;
  const receitaMensal = lavaJatos
    .filter(u => u.statusPlano === 'ativo')
    .reduce((acc, curr) => acc + curr.valorPlano, 0);

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
        
        {/* PAINEL DE DIAGNÓSTICO E SINCRONIZAÇÃO DO FIREBASE */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Database size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Sincronização Cloud Firestore</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    erroPermissaoFirebase 
                      ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400' 
                      : firebaseStatus.configurado 
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' 
                      : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                  }`}>
                    {erroPermissaoFirebase ? '● Permissão Negada (Regras)' : firebaseStatus.configurado ? '● Conectado' : '● Modo Local'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Projeto Firebase: <span className="font-mono text-cyan-300 font-bold">{firebaseStatus.projectId || 'Não configurado'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={testandoFirebase}
                onClick={testarConexaoFirebase}
                className="py-1.5 px-3 bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-600/20 disabled:opacity-50"
              >
                <RefreshCw size={13} className={testandoFirebase ? 'animate-spin' : ''} />
                <span>Testar Gravação no BD</span>
              </button>

              <button
                type="button"
                disabled={testandoFirebase}
                onClick={sincronizarTodasUnidadesFirestore}
                className="py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Envia todas as empresas salvas no navegador diretamente para o Cloud Firestore"
              >
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Enviar Empresas ao BD</span>
              </button>
            </div>
          </div>

          {resultadoTesteFirebase && (
            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
              resultadoTesteFirebase.sucesso 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}>
              <p className="font-semibold">{resultadoTesteFirebase.mensagem}</p>
            </div>
          )}

          {erroPermissaoFirebase && (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                <span>Por que seus clientes ou empresas não estão aparecendo no Banco de Dados (Firestore)?</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                O Firebase recusou a gravação com o erro <strong className="text-rose-300">PERMISSION_DENIED</strong>. Isso ocorre porque na linha 3 das Regras do Firestore foi digitado <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">match /bancodb/...</code> em vez da palavra obrigatória <code className="text-emerald-300 bg-black/40 px-1 py-0.5 rounded">match /databases/...</code>.
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[10px] text-emerald-300 space-y-0.5 overflow-x-auto">
                <p className="text-slate-500">// Cole exatamente assim no Firebase Console &gt; Firestore &gt; Regras:</p>
                <p>rules_version = '2';</p>
                <p>service cloud.firestore &#123;</p>
                <p className="font-bold text-amber-300">&nbsp;&nbsp;match /databases/&#123;database&#125;/documents &#123;</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;match /unidades/&#123;id&#125; &#123; allow read, write: if true; &#125;</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;match /clientes/&#123;id&#125; &#123; allow read, write: if true; &#125;</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;match /agendamentos/&#123;id&#125; &#123; allow read, write: if true; &#125;</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;match /teste_conexao/&#123;id&#125; &#123; allow read, write: if true; &#125;</p>
                <p className="text-rose-400">&nbsp;&nbsp;&nbsp;&nbsp;match /&#123;document=**&#125; &#123; allow read, write: if false; &#125;</p>
                <p>&nbsp;&nbsp;&#125;</p>
                <p>&#125;</p>
              </div>
              <p className="text-[11px] text-slate-400">
                Após colar e clicar em <strong>Publicar</strong> no Firebase Console, clique no botão <strong>"Enviar Empresas ao BD"</strong> acima para gravar todas as empresas e clientes imediatamente no Firestore.
              </p>
            </div>
          )}
        </div>

        {/* CARDS DE RESUMO MASTER */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Unidades</p>
            <p className="text-2xl font-black text-white mt-1">{totalUnidades}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Ativas / Pagas</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{unidadesAtivas}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Período de Teste</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{unidadesEmTeste}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Bloqueados</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{unidadesBloqueadas}</p>
          </div>
          <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-950/40 to-slate-800/90 border border-blue-700/40 rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">MRR Estimado</p>
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
                    onChange={(e) => setCnpj(e.target.value)} 
                    placeholder="00.000.000/0001-00" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Endereço Completo</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    value={endereco} 
                    onChange={(e) => setEndereco(e.target.value)} 
                    placeholder="Av. Central, 1500 - Centro" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Contato / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    value={contato} 
                    onChange={(e) => setContato(e.target.value)} 
                    placeholder="(11) 99999-8888" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" 
                  />
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
                  <label className="block text-slate-300 mb-1">Valor do Plano (R$)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input 
                      type="number" 
                      step="0.01" 
                      value={valorPlano} 
                      onChange={(e) => setValorPlano(e.target.value)} 
                      placeholder="149.90" 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-blue-950/40 border border-blue-800/50 rounded-xl text-[11px] text-blue-300 flex items-start gap-2">
                <Clock className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <span>O inquilino começará com <strong>20 dias de teste grátis</strong> a partir de hoje.</span>
              </div>

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
                  <option value="todos">Todos</option>
                  <option value="teste">Teste</option>
                  <option value="ativo">Ativo</option>
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
                      <th className="p-3.5">Proprietário / CNPJ</th>
                      <th className="p-3.5">Senha</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-center">QR Code</th>
                      <th className="p-3.5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {listaFiltrada.map((lj) => {
                      const statusBadge = {
                        ativo: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
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
                            <div className="text-[10px] text-slate-400 font-mono">{lj.cnpj}</div>
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
                              className={`bg-slate-950 border rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer ${statusBadge[lj.statusPlano]}`}
                            >
                              <option value="teste">Teste (20d)</option>
                              <option value="ativo">Ativo / Pago</option>
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

