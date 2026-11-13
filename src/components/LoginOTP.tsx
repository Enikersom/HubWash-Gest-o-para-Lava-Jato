import React, { useState, useEffect } from 'react';
import {
  LogIn,
  Mail,
  Lock,
  UserPlus,
  ShieldCheck,
  Building2,
  KeyRound,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  User as UserIcon
} from 'lucide-react';
import { buscarUnidadesServidor } from '../services/apiSync';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  deleteDoc,
  query,
  where,
  arrayUnion,
  handleFirestoreError,
  OperationType,
  type FirebaseUser
} from '../firebase';
import { UsuarioSistema } from '../types';
import { sanitizarParaFirestore } from '../utils/formatters';

interface LoginOTPProps {
  onSuccess: (
    role?: 'master' | 'lavajato' | 'cliente',
    unidadeNome?: string,
    telaCliente?: 'login' | 'cadastro' | 'home',
    usuario?: UsuarioSistema
  ) => void;
  defaultRole?: 'master' | 'lavajato' | 'cliente';
}

const BOOTSTRAP_MASTER_EMAIL = 'enikersom2020@gmail.com';

function traduzirErroFirebaseAuth(error: any): string {
  const code = String(error?.code || '');
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.';
    case 'auth/invalid-email':
      return 'O formato do e-mail informado é inválido.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já possui uma conta cadastrada. Faça login na aba "Entrar".';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Login com Google cancelado antes da conclusão.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou o pop-up de login. Permita pop-ups para este site ou use E-mail e Senha.';
    case 'auth/operation-not-allowed':
      return 'Provedor E-mail/Senha ainda não habilitado no Console do Firebase (Authentication > Sign-in method). Use "Entrar com Google" ou habilite o provedor.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.';
    case 'auth/network-request-failed':
      return 'Falha de conexão com a internet. Verifique sua rede e tente novamente.';
    default:
      return error?.message || 'Não foi possível concluir a autenticação. Tente novamente.';
  }
}

export default function LoginOTP({ onSuccess }: LoginOTPProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [perfilUsuario, setPerfilUsuario] = useState<UsuarioSistema | null>(null);
  const [carregandoAuth, setCarregandoAuth] = useState<boolean>(true);
  const [resolvendoPerfil, setResolvendoPerfil] = useState<boolean>(false);

  // Abas do formulário Firebase Auth (Entrar / Criar Conta)
  const [modoAuth, setModoAuth] = useState<'entrar' | 'cadastrar'>('entrar');
  const [nomeCadastro, setNomeCadastro] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [enviandoAuth, setEnviandoAuth] = useState(false);

  // Vinculação inicial de UID à Unidade
  const [unidadeSelecionadaId, setUnidadeSelecionadaId] = useState('pitstop');
  const [codigoUnidadeInput, setCodigoUnidadeInput] = useState('');
  const [vinculandoUnidade, setVinculandoUnidade] = useState(false);
  const [uidCopiado, setUidCopiado] = useState(false);

  // Feedback visual
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'info' | 'success' | '' }>({
    text: '',
    type: ''
  });

  // Cache de unidades cadastradas
  const [unidadesCadastradas, setUnidadesCadastradas] = useState<any[]>(() => {
    try {
      const salvos = localStorage.getItem('hubwash_lava_jatos');
      if (salvos) {
        const lista = JSON.parse(salvos);
        if (Array.isArray(lista) && lista.length > 0) {
          const limpos = lista.filter(
            (u: any) => u && u.id !== 'alef-jato' && !String(u.nomeFantasia || '').toLowerCase().includes('alef')
          );
          try {
            localStorage.setItem('hubwash_lava_jatos', JSON.stringify(limpos));
          } catch {}
          return limpos;
        }
      }
    } catch {}
    return [
      {
        id: 'pitstop',
        nomeFantasia: 'Pit Stop Lava Jato',
        senhaProvisoria: 'pit123',
        statusPlano: 'ativo'
      }
    ];
  });

  // Escuta unidades em tempo real do Firestore respeitando permissões do UID autenticado
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    if (db) {
      try {
        const ehNaoMasterComPerfil = Boolean(
          firebaseUser &&
          perfilUsuario &&
          perfilUsuario.role !== 'master' &&
          !(perfilUsuario.unidadesPermitidas || []).includes('*')
        );

        const permitidasLista = (perfilUsuario?.unidadesPermitidas || [perfilUsuario?.unidadeId || 'pitstop'])
          .filter((u): u is string => Boolean(u) && u !== '*' && u !== 'master')
          .slice(0, 10);

        const refUnidades = ehNaoMasterComPerfil && permitidasLista.length > 0
          ? query(
              collection(db, 'unidades'),
              permitidasLista.length === 1
                ? where('id', '==', permitidasLista[0])
                : where('id', 'in', permitidasLista)
            )
          : collection(db, 'unidades');

        unsubscribe = onSnapshot(
          refUnidades,
          (snap: any) => {
            if (!snap.empty) {
              const doFirestore: any[] = [];
              snap.forEach((docSnap: any) => {
                const dados = docSnap.data();
                if (docSnap.id === 'alef-jato' || String(dados?.nomeFantasia || '').toLowerCase().includes('alef')) {
                  return;
                }
                doFirestore.push({ id: docSnap.id, ...dados });
              });
              if (doFirestore.length > 0) {
                setUnidadesCadastradas(doFirestore);
                setUnidadeSelecionadaId((atual) =>
                  doFirestore.some((u) => u.id === atual) ? atual : doFirestore[0].id
                );
                try {
                  localStorage.setItem('hubwash_lava_jatos', JSON.stringify(doFirestore));
                } catch {}
              }
            }
          },
          (err: any) => {
            console.warn('Listener Firestore unidades (Login):', err);
          }
        );
      } catch (e) {
        console.warn('Erro ao configurar onSnapshot no login:', e);
      }
    } else {
      buscarUnidadesServidor()
        .then((doServidor) => {
          if (Array.isArray(doServidor) && doServidor.length > 0) {
            setUnidadesCadastradas(doServidor);
          }
        })
        .catch(() => {});
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseUser?.uid, perfilUsuario?.role, perfilUsuario?.unidadesPermitidas?.join(',')]);

  const concluirAcessoComPerfil = (
    perfil: UsuarioSistema,
    roleAlvo: 'master' | 'lavajato',
    unidadeIdAlvo?: string,
    unidadeNomeAlvo?: string
  ) => {
    const uIdFinal = unidadeIdAlvo || perfil.unidadeId || 'pitstop';
    const uNomeFinal = unidadeNomeAlvo || perfil.unidadeNome || 'Pit Stop Lava Jato';

    try {
      localStorage.setItem(
        'hubwash_operador_sessao',
        JSON.stringify({
          uid: perfil.uid,
          email: perfil.email,
          nome: perfil.nome,
          role: roleAlvo,
          unidadeId: roleAlvo === 'master' ? 'master' : uIdFinal,
          unidadeNome: roleAlvo === 'master' ? 'HubWash Master' : uNomeFinal,
          unidadesPermitidas: perfil.unidadesPermitidas,
          timestamp: Date.now()
        })
      );
    } catch {}

    setIsSuccess(true);
    setTimeout(() => {
      onSuccess(roleAlvo, roleAlvo === 'master' ? 'HubWash Master' : uNomeFinal, undefined, perfil);
    }, 150);
  };

  // Observa estado do Firebase Authentication e resolve permissões por UID no Firestore
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setCarregandoAuth(false);

      if (!user) {
        setPerfilUsuario(null);
        setResolvendoPerfil(false);
        return;
      }

      setResolvendoPerfil(true);
      setMessage({ text: '', type: '' });

      try {
        const userDocRef = doc(db, 'usuarios', user.uid);
        let snap;
        try {
          snap = await getDoc(userDocRef);
        } catch (err: any) {
          if (String(err?.code || '').includes('permission-denied')) {
            handleFirestoreError(err, OperationType.GET, `usuarios/${user.uid}`);
          }
          throw err;
        }

        if (snap.exists()) {
          const dados = snap.data() as UsuarioSistema;
          const perfil: UsuarioSistema = {
            ...dados,
            uid: user.uid,
            email: dados.email || user.email || '',
            nome: dados.nome || user.displayName || user.email?.split('@')[0] || 'Operador',
            unidadesPermitidas: Array.isArray(dados.unidadesPermitidas) && dados.unidadesPermitidas.length > 0
              ? dados.unidadesPermitidas
              : [dados.unidadeId || 'pitstop'],
            ativo: dados.ativo !== false
          };
          setPerfilUsuario(perfil);

          if (!perfil.ativo) {
            setMessage({
              text: 'Seu acesso está desativado pelo administrador. Entre em contato com o suporte.',
              type: 'error'
            });
            setResolvendoPerfil(false);
            return;
          }

          if (perfil.role === 'master') {
            concluirAcessoComPerfil(perfil, 'master');
            return;
          }

          // Verifica permissões por unidade para operadores de lava-jato usando leitura direta das unidades permitidas
          const permitidas = perfil.unidadesPermitidas.filter((id) => Boolean(id) && id !== 'master' && id !== '*');
          let listaUnidades = unidadesCadastradas;
          if (permitidas.length > 0) {
            try {
              const snapsPermitidas = await Promise.all(
                permitidas.slice(0, 10).map((uId) => getDoc(doc(db, 'unidades', uId)).catch(() => null))
              );
              const carregadas = snapsPermitidas
                .filter((s): s is any => Boolean(s && s.exists()))
                .map((s) => ({ id: s.id, ...s.data() }));
              if (carregadas.length > 0) listaUnidades = carregadas;
            } catch {}
          }
          if (permitidas.length === 1) {
            const unidadeInfo = listaUnidades.find((u) => u.id === permitidas[0]);
            if (unidadeInfo?.statusPlano === 'bloqueado') {
              setMessage({
                text: `Acesso bloqueado para a unidade "${unidadeInfo.nomeFantasia}". Entre em contato com o suporte SaaS.`,
                type: 'error'
              });
              setResolvendoPerfil(false);
              return;
            }
            concluirAcessoComPerfil(
              perfil,
              'lavajato',
              permitidas[0],
              unidadeInfo?.nomeFantasia || perfil.unidadeNome
            );
            return;
          }

          setResolvendoPerfil(false);
          return;
        }

        // Primeiro acesso deste UID: bootstrap automático para o e-mail Master verificado
        if (user.email?.toLowerCase() === BOOTSTRAP_MASTER_EMAIL && user.emailVerified) {
          const novoMaster: UsuarioSistema = {
            uid: user.uid,
            email: user.email,
            nome: user.displayName || 'Super Admin',
            ...(user.photoURL ? { fotoUrl: user.photoURL } : {}),
            role: 'master',
            unidadeId: 'master',
            unidadeNome: 'HubWash Master',
            unidadesPermitidas: ['*'],
            ativo: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          try {
            await setDoc(userDocRef, sanitizarParaFirestore(novoMaster));
          } catch (err: any) {
            if (String(err?.code || '').includes('permission-denied')) {
              handleFirestoreError(err, OperationType.CREATE, `usuarios/${user.uid}`);
            }
            throw err;
          }
          setPerfilUsuario(novoMaster);
          concluirAcessoComPerfil(novoMaster, 'master');
          return;
        }

        // Novo usuário: aguarda vinculação à unidade
        setPerfilUsuario(null);
        setResolvendoPerfil(false);
      } catch (err: any) {
        console.error('Erro ao resolver perfil Firebase Auth:', err);
        setMessage({
          text: err?.message || 'Erro ao carregar permissões da conta.',
          type: 'error'
        });
        setResolvendoPerfil(false);
      }
    });

    return () => unsubAuth();
  }, []);

  const handleLoginGoogle = async () => {
    setEnviandoAuth(true);
    setMessage({ text: '', type: '' });
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setMessage({ text: traduzirErroFirebaseAuth(err), type: 'error' });
    } finally {
      setEnviandoAuth(false);
    }
  };

  const handleAuthEmailSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailLimpo = emailInput.trim();
    const senhaLimpa = senhaInput.trim();

    if (!emailLimpo || !senhaLimpa) {
      setMessage({ text: 'Preencha o e-mail e a senha para continuar.', type: 'error' });
      return;
    }

    if (modoAuth === 'cadastrar' && senhaLimpa.length < 6) {
      setMessage({ text: 'A senha deve conter no mínimo 6 caracteres.', type: 'error' });
      return;
    }

    setEnviandoAuth(true);
    setMessage({ text: '', type: '' });

    try {
      if (modoAuth === 'cadastrar') {
        const cred = await createUserWithEmailAndPassword(auth, emailLimpo, senhaLimpa);
        if (nomeCadastro.trim()) {
          await updateProfile(cred.user, { displayName: nomeCadastro.trim() }).catch(() => {});
        }
      } else {
        await signInWithEmailAndPassword(auth, emailLimpo, senhaLimpa);
      }
    } catch (err: any) {
      setMessage({ text: traduzirErroFirebaseAuth(err), type: 'error' });
    } finally {
      setEnviandoAuth(false);
    }
  };

  const handleRecuperarSenha = async () => {
    const emailLimpo = emailInput.trim();
    if (!emailLimpo) {
      setMessage({ text: 'Digite seu e-mail acima para receber o link de redefinição de senha.', type: 'info' });
      return;
    }
    setEnviandoAuth(true);
    try {
      await sendPasswordResetEmail(auth, emailLimpo);
      setMessage({ text: `E-mail de redefinição enviado para ${emailLimpo}. Verifique sua caixa de entrada.`, type: 'success' });
    } catch (err: any) {
      setMessage({ text: traduzirErroFirebaseAuth(err), type: 'error' });
    } finally {
      setEnviandoAuth(false);
    }
  };

  const handleVincularUnidade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || vinculandoUnidade) return;

    const codigoDigitado = codigoUnidadeInput.trim();
    if (!codigoDigitado) {
      setMessage({ text: 'Informe o código de acesso da unidade fornecido pelo administrador.', type: 'error' });
      return;
    }

    setVinculandoUnidade(true);
    setMessage({ text: '', type: '' });

    try {
      // Busca lista atualizada do Firestore para validar o código da unidade
      let unidadeAlvo = unidadesCadastradas.find((u) => u.id === unidadeSelecionadaId);
      try {
        const snapUnidade = await getDoc(doc(db, 'unidades', unidadeSelecionadaId));
        if (snapUnidade.exists()) {
          unidadeAlvo = { id: snapUnidade.id, ...snapUnidade.data() };
        }
      } catch {}

      if (!unidadeAlvo) {
        setMessage({ text: 'Unidade selecionada não encontrada.', type: 'error' });
        setVinculandoUnidade(false);
        return;
      }

      if (unidadeAlvo.statusPlano === 'bloqueado') {
        setMessage({
          text: `A unidade "${unidadeAlvo.nomeFantasia}" está bloqueada no momento. Contate o suporte.`,
          type: 'error'
        });
        setVinculandoUnidade(false);
        return;
      }

      const senhaEsperada = String(unidadeAlvo.senhaProvisoria || '').trim();
      if (!senhaEsperada || codigoDigitado.toLowerCase() !== senhaEsperada.toLowerCase()) {
        setMessage({
          text: 'Código de vinculação da unidade incorreto. Confira com o responsável pelo lava-jato.',
          type: 'error'
        });
        setVinculandoUnidade(false);
        return;
      }

      const novoPerfil: UsuarioSistema = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || emailInput.trim() || `${firebaseUser.uid}@hubwash.app`,
        nome: firebaseUser.displayName || nomeCadastro.trim() || firebaseUser.email?.split('@')[0] || 'Operador',
        ...(firebaseUser.photoURL ? { fotoUrl: firebaseUser.photoURL } : {}),
        role: 'lavajato',
        unidadeId: unidadeAlvo.id,
        unidadeNome: unidadeAlvo.nomeFantasia,
        unidadesPermitidas: [unidadeAlvo.id],
        ativo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'usuarios', firebaseUser.uid), sanitizarParaFirestore(novoPerfil));
      } catch (err: any) {
        if (String(err?.code || '').includes('permission-denied')) {
          handleFirestoreError(err, OperationType.CREATE, `usuarios/${firebaseUser.uid}`);
        }
        throw err;
      }

      // Vincula UID na unidade correspondente (best-effort)
      try {
        await updateDoc(doc(db, 'unidades', unidadeAlvo.id), {
          usuariosAutorizados: arrayUnion(firebaseUser.uid)
        });
      } catch {}

      setPerfilUsuario(novoPerfil);
      concluirAcessoComPerfil(novoPerfil, 'lavajato', unidadeAlvo.id, unidadeAlvo.nomeFantasia);
    } catch (err: any) {
      setMessage({ text: err?.message || 'Não foi possível vincular sua conta à unidade.', type: 'error' });
    } finally {
      setVinculandoUnidade(false);
    }
  };

  const handleTrocarConta = async () => {
    try {
      localStorage.removeItem('hubwash_operador_sessao');
    } catch {}
    setMessage({ text: '', type: '' });
    setCodigoUnidadeInput('');
    await signOut(auth);
  };

  const handleCopiarUid = () => {
    if (!firebaseUser?.uid) return;
    try {
      navigator.clipboard.writeText(firebaseUser.uid);
      setUidCopiado(true);
      setTimeout(() => setUidCopiado(false), 2000);
    } catch {}
  };

  const getPrimeiraUnidade = () => {
    try {
      const salvos = localStorage.getItem('hubwash_lava_jatos');
      if (salvos) {
        const lista = JSON.parse(salvos);
        if (Array.isArray(lista) && lista.length > 0) {
          return lista[0].nomeFantasia || 'Pit Stop Lava Jato';
        }
      }
    } catch {}
    return 'Pit Stop Lava Jato';
  };

  return (
    <div className="otp-wrapper">
      <div className="otp-card">
        {isSuccess ? (
          <div className="success-screen" id="successScreen">
            <div className="success-icon">✓</div>
            <h2>Acesso Autorizado</h2>
            <p>
              Identidade validada com sucesso!
              <br />
              Redirecionando para sua unidade...
            </p>
          </div>
        ) : carregandoAuth || resolvendoPerfil ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-3 text-center">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm font-bold text-white">Autenticando acesso...</p>
            <p className="text-xs text-slate-400">Verificando permissões por unidade</p>
          </div>
        ) : !firebaseUser ? (
          <div id="otpForm" className="space-y-4">
            <div className="flex justify-center mb-2">
              <img
                src="/logo.png"
                alt="Logo HubWash"
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
                className="h-14 w-auto max-w-[200px] object-contain drop-shadow-md"
              />
            </div>

            <div>
              <h1>Terminal de Acesso</h1>
              <p className="description flex items-center justify-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Autenticação segura</span>
              </p>
            </div>

            {/* Botão Principal: Entrar com Google */}
            <button
              type="button"
              onClick={handleLoginGoogle}
              disabled={enviandoAuth}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-bold text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
              </svg>
              <span>{enviandoAuth ? 'Conectando...' : 'Entrar com Google'}</span>
            </button>

            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
              <div className="flex-1 h-px bg-slate-800" />
              <span>ou use e-mail e senha</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Alternador Entrar / Cadastrar */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setModoAuth('entrar');
                  setMessage({ text: '', type: '' });
                }}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  modoAuth === 'entrar' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setModoAuth('cadastrar');
                  setMessage({ text: '', type: '' });
                }}
                className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                  modoAuth === 'cadastrar' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus size={12} />
                <span>Criar Conta</span>
              </button>
            </div>

            <form onSubmit={handleAuthEmailSenha} className="space-y-2.5 text-left text-xs">
              {modoAuth === 'cadastrar' && (
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={nomeCadastro}
                    onChange={(e) => setNomeCadastro(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={senhaInput}
                  onChange={(e) => setSenhaInput(e.target.value)}
                  placeholder="Senha (mín. 6 caracteres)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {modoAuth === 'entrar' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleRecuperarSenha}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button
                className="verify-btn"
                id="verifyBtn"
                type="submit"
                disabled={enviandoAuth}
              >
                {enviandoAuth
                  ? 'Autenticando...'
                  : modoAuth === 'cadastrar'
                  ? 'Criar Conta'
                  : 'Acessar Sistema'}
              </button>
            </form>

            {message.text && (
              <div
                className={`message ${
                  message.type === 'error'
                    ? 'error'
                    : message.type === 'info'
                    ? 'info'
                    : 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-xs'
                }`}
                id="message"
              >
                {message.text}
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 space-y-2 text-center">
              <button
                type="button"
                onClick={() => onSuccess('cliente', getPrimeiraUnidade(), 'login')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn size={16} />
                <span>Sou Cliente! Acessar</span>
              </button>
            </div>
          </div>
        ) : (
          /* USUÁRIO AUTENTICADO COM FIREBASE UID -> SELEÇÃO OU VINCULAÇÃO À UNIDADE */
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                  {(firebaseUser.displayName || firebaseUser.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {firebaseUser.displayName || firebaseUser.email}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopiarUid}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    title="Clique para copiar seu UID exclusivo do Firebase"
                  >
                    <span>UID: {firebaseUser.uid.slice(0, 12)}...</span>
                    {uidCopiado ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTrocarConta}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                title="Sair e trocar de conta"
              >
                <LogOut size={12} />
                <span>Sair</span>
              </button>
            </div>

            {perfilUsuario && !perfilUsuario.ativo ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-xs font-bold text-white">Acesso Suspenso</p>
                <p className="text-[11px] text-slate-300">
                  O acesso para o UID <span className="font-mono text-rose-300">{firebaseUser.uid}</span> foi desativado pelo administrador.
                </p>
              </div>
            ) : perfilUsuario && perfilUsuario.unidadesPermitidas.length > 1 ? (
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Building2 size={15} className="text-blue-400" />
                    <span>Selecione sua Unidade Autorizada</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Seu UID possui permissão para acessar múltiplas unidades:
                  </p>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {perfilUsuario.unidadesPermitidas.map((uId) => {
                    const info = unidadesCadastradas.find((u) => u.id === uId);
                    const nome = info?.nomeFantasia || uId;
                    const bloqueado = info?.statusPlano === 'bloqueado';

                    return (
                      <button
                        key={uId}
                        type="button"
                        disabled={bloqueado}
                        onClick={() => concluirAcessoComPerfil(perfilUsuario, 'lavajato', uId, nome)}
                        className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800/90 disabled:opacity-50 border border-slate-800 hover:border-blue-500/50 flex items-center justify-between transition cursor-pointer"
                      >
                        <div className="text-left">
                          <p className="text-xs font-bold text-white">{nome}</p>
                          <p className="text-[10px] font-mono text-slate-400">Unidade: {uId}</p>
                        </div>
                        {bloqueado ? (
                          <span className="text-[10px] font-bold text-rose-400">Bloqueado</span>
                        ) : (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <form onSubmit={handleVincularUnidade} className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-1">
                  <p className="font-bold text-blue-300 flex items-center gap-1.5">
                    <KeyRound size={14} />
                    <span>Vincular Permissão por Unidade</span>
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Primeiro acesso detectado! Selecione o seu lava-jato e informe o código de acesso da unidade para vincular este UID permanentemente.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Unidade / Lava-Jato</label>
                  <select
                    value={unidadeSelecionadaId}
                    onChange={(e) => setUnidadeSelecionadaId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2.5 text-white focus:outline-none cursor-pointer"
                  >
                    {unidadesCadastradas.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nomeFantasia} ({u.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Código de Acesso da Unidade</label>
                  <input
                    type="password"
                    required
                    value={codigoUnidadeInput}
                    onChange={(e) => setCodigoUnidadeInput(e.target.value)}
                    placeholder="Código cadastrado na unidade (ex: pit123)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={vinculandoUnidade}
                  className="verify-btn"
                >
                  {vinculandoUnidade ? 'Vinculando UID...' : 'Vincular e Acessar Unidade'}
                </button>
              </form>
            )}

            {message.text && (
              <div
                className={`message ${
                  message.type === 'error'
                    ? 'error'
                    : message.type === 'info'
                    ? 'info'
                    : 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-xs'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
