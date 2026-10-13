import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  duracaoSegundos?: number;
}

export default function SplashScreen({ onFinish, duracaoSegundos = 5 }: SplashScreenProps) {
  const [segundosRestantes, setSegundosRestantes] = useState(duracaoSegundos);
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    const totalMs = duracaoSegundos * 1000;
    const intervaloMs = 50;
    const incremento = (intervaloMs / totalMs) * 100;

    const timerProgresso = setInterval(() => {
      setProgresso((prev) => {
        const prox = prev + incremento;
        if (prox >= 100) {
          clearInterval(timerProgresso);
          return 100;
        }
        return prox;
      });
    }, intervaloMs);

    const timerContagem = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          clearInterval(timerContagem);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timerFinal = setTimeout(() => {
      onFinish();
    }, totalMs);

    return () => {
      clearInterval(timerProgresso);
      clearInterval(timerContagem);
      clearTimeout(timerFinal);
    };
  }, [duracaoSegundos, onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-between p-6 select-none font-sans text-white h-[100dvh] overflow-hidden">
      {/* Botão sutil de pular no canto superior */}
      <div className="w-full max-w-sm flex justify-end pt-2">
        <button
          type="button"
          onClick={onFinish}
          className="text-[11px] font-semibold text-slate-400 hover:text-white px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition cursor-pointer flex items-center gap-1.5 backdrop-blur-sm shadow-md"
          title="Pular Splash Screen"
        >
          <span>Pular</span>
          <ArrowRight size={12} />
        </button>
      </div>

      {/* Conteúdo Central Responsivo para Celular Padrão - Única Logo */}
      <div className="w-full max-w-sm flex flex-col items-center justify-center my-auto text-center px-4 space-y-4">
        {/* ÚNICA LOGO OFICIAL HUBWASH (sem conflito nem competição de espaço) */}
        <div className="relative w-full max-w-[320px] aspect-[3/2] flex items-center justify-center">
          {/* Efeito Glow / Halo luminoso suave atrás da logo */}
          <div className="absolute inset-0 bg-blue-500/25 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute inset-4 bg-cyan-400/20 rounded-full blur-2xl"></div>

          {/* Imagem Oficial do Usuário */}
          <img
            src="/logo.png"
            alt="HubWash - Gestão para Lava-Jato"
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_15px_35px_rgba(0,0,0,0.85)] select-none"
          />
        </div>

        {/* Badge sutil de apresentação */}
        <div className="pt-1">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-cyan-300 text-xs font-semibold backdrop-blur-sm shadow-inner">
            <Sparkles size={13} className="text-cyan-400" />
            <span>Sistema Operacional de Lava-Jato</span>
          </div>
        </div>
      </div>

      {/* Rodapé com Barra de Progresso e Contagem dos 5 Segundos */}
      <div className="w-full max-w-sm space-y-3 pb-6">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Iniciando aplicativo...</span>
          </span>
          <span className="font-mono text-cyan-300 font-bold">{segundosRestantes}s</span>
        </div>

        {/* Barra de Progresso Fluida */}
        <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/50 p-0.5">
          <div
            className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-75 ease-linear shadow-sm shadow-cyan-400/50"
            style={{ width: `${Math.min(progresso, 100)}%` }}
          />
        </div>

        <p className="text-[10px] text-slate-500 text-center tracking-wide">
          PWA Multi-Dispositivo &bull; Celular & Notebook
        </p>
      </div>
    </div>
  );
}
