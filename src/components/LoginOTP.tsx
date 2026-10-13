import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, LogIn } from 'lucide-react';
import { buscarUnidadesServidor } from '../services/apiSync';
import { db, collection, getDocs } from '../firebase';

interface LoginOTPProps {
  onSuccess: (role?: 'master' | 'lavajato' | 'cliente', unidadeNome?: string, telaCliente?: 'login' | 'cadastro' | 'home') => void;
  defaultRole?: 'master' | 'lavajato' | 'cliente';
}

export default function LoginOTP({ onSuccess, defaultRole = 'master' }: LoginOTPProps) {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'info' | 'success' | '' }>({
    text: '',
    type: '',
  });
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const SENHA_MASTER = '124020';

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Carrega lista atualizada de unidades do Firestore e do servidor ao montar tela de login
  useEffect(() => {
    const carregarUnidades = async () => {
      let unidadesEncontradas: any[] = [];

      // 1. Tenta buscar do Cloud Firestore
      if (db) {
        try {
          const snap = await getDocs(collection(db, 'unidades'));
          snap.forEach(docSnap => {
            unidadesEncontradas.push({ id: docSnap.id, ...docSnap.data() });
          });
        } catch (err) {
          console.warn('Erro ao ler unidades do Firestore no login:', err);
        }
      }

      // 2. Tenta buscar do servidor backend se Firestore não trouxe
      if (unidadesEncontradas.length === 0) {
        try {
          const doServidor = await buscarUnidadesServidor();
          if (Array.isArray(doServidor) && doServidor.length > 0) {
            unidadesEncontradas = doServidor;
          }
        } catch {}
      }

      // 3. Salva no cache local do dispositivo
      if (unidadesEncontradas.length > 0) {
        try {
          localStorage.setItem('hubwash_lava_jatos', JSON.stringify(unidadesEncontradas));
        } catch {}
      }
    };

    carregarUnidades();
  }, []);

  // Focus first input on mount
  useEffect(() => {
    if (!isSuccess && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [isSuccess]);

  const handleChange = (index: number, value: string) => {
    // Permite caracteres alfanuméricos (letras e números)
    const char = value.slice(-1);

    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);
    setMessage({ text: '', type: '' });

    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputsRef.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    setOtp(newOtp);
    setMessage({ text: '', type: '' });

    const nextIndex = Math.min(pastedData.length, 5);
    inputsRef.current[nextIndex]?.focus();
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('').trim();

    if (fullOtp.length < 6) {
      setMessage({ text: 'Por favor, preencha os 6 dígitos/caracteres da senha.', type: 'error' });
      return;
    }

    setIsVerifying(true);
    setMessage({ text: 'Validando credenciais...', type: 'info' });

    // 1. Verificação instantânea da Senha Master: 124020
    if (fullOtp === SENHA_MASTER) {
      setIsVerifying(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess('master');
      }, 150);
      return;
    }

    const fullOtpLower = fullOtp.toLowerCase();
    let unidadeEncontrada: any = null;

    // 2. Verificação INSTANTÂNEA no cache local (0ms de espera)
    try {
      const salvos = localStorage.getItem('hubwash_lava_jatos');
      if (salvos) {
        const lista = JSON.parse(salvos);
        if (Array.isArray(lista)) {
          unidadeEncontrada = lista.find((u: any) => {
            const senhaSalva = String(u.senhaProvisoria || '').trim();
            return senhaSalva === fullOtp || senhaSalva.toLowerCase() === fullOtpLower;
          });
        }
      }
    } catch {}

    // 3. Senha padrão de teste do Pit Stop caso não haja banco carregado
    if (!unidadeEncontrada && fullOtpLower === 'pit123') {
      unidadeEncontrada = {
        id: 'pitstop',
        nomeFantasia: 'Pit Stop Lava Jato',
        statusPlano: 'ativo'
      };
    }

    // Se encontrou no cache ou padrão, entra IMEDIATAMENTE sem esperar rede
    if (unidadeEncontrada) {
      if (unidadeEncontrada.statusPlano === 'bloqueado') {
        setIsVerifying(false);
        setMessage({
          text: `Acesso bloqueado para "${unidadeEncontrada.nomeFantasia}". Entre em contato com o suporte SaaS.`,
          type: 'error'
        });
        setOtp(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
        return;
      }

      setIsVerifying(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess('lavajato', unidadeEncontrada.nomeFantasia);
      }, 150);
      return;
    }

    // 4. Se não achou localmente, busca no Firestore / Servidor com timeout rápido
    try {
      if (db) {
        try {
          const snap = await Promise.race([
            getDocs(collection(db, 'unidades')),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
          ]);
          if (snap && 'forEach' in snap) {
            snap.forEach((docSnap: any) => {
              const data = docSnap.data();
              const senhaSalva = String(data.senhaProvisoria || '').trim();
              if (senhaSalva && (senhaSalva === fullOtp || senhaSalva.toLowerCase() === fullOtpLower)) {
                unidadeEncontrada = { id: docSnap.id, ...data };
              }
            });
          }
        } catch {}
      }

      if (!unidadeEncontrada) {
        try {
          const doServidor = await Promise.race([
            buscarUnidadesServidor(),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ]);
          if (Array.isArray(doServidor) && doServidor.length > 0) {
            unidadeEncontrada = doServidor.find((u: any) => {
              const senhaSalva = String(u.senhaProvisoria || '').trim();
              return senhaSalva === fullOtp || senhaSalva.toLowerCase() === fullOtpLower;
            });
          }
        } catch {}
      }
    } catch (e) {
      console.error(e);
    }

    if (unidadeEncontrada) {
      if (unidadeEncontrada.statusPlano === 'bloqueado') {
        setIsVerifying(false);
        setMessage({
          text: `Acesso bloqueado para "${unidadeEncontrada.nomeFantasia}". Entre em contato com o suporte SaaS.`,
          type: 'error'
        });
        setOtp(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
        return;
      }

      setIsVerifying(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess('lavajato', unidadeEncontrada.nomeFantasia);
      }, 150);
    } else {
      setIsVerifying(false);
      setMessage({
        text: 'Senha incorreta ou inexistente! Verifique os dígitos e tente novamente.',
        type: 'error'
      });
      setOtp(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    }
  };

  const preencherSenha = (senha: string) => {
    const chars = senha.split('').slice(0, 6);
    setOtp(chars);
    setMessage({ text: '', type: '' });
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
        {!isSuccess ? (
          <div id="otpForm">
            <div className="flex justify-center mb-3">
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
                className="h-16 w-auto max-w-[220px] object-contain drop-shadow-md"
              />
            </div>
            <h1>Terminal de Acesso</h1>
            <p className="description">
              Por favor, autentique para continuar
            </p>

            <div className="otp-inputs" id="otpInputs">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  className={`otp-input ${digit ? 'filled' : ''}`}
                  type="password"
                  inputMode="text"
                  maxLength={1}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={isVerifying}
                />
              ))}
            </div>

            <button
              className="verify-btn"
              id="verifyBtn"
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || otp.join('').length < 6}
            >
              {isVerifying ? 'Verificando...' : 'Acessar Sistema'}
            </button>

            {message.text && (
              <div
                className={`message ${message.type === 'error' ? 'error' : message.type === 'info' ? 'info' : ''}`}
                id="message"
              >
                {message.text}
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-800 space-y-2.5 text-center">
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
          <div className="success-screen" id="successScreen">
            <div className="success-icon">✓</div>
            <h2>Acesso Autorizado</h2>
            <p>
              Credencial verificada com sucesso!
              <br />
              Redirecionando...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
