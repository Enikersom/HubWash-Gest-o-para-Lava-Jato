import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Camera,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Plus,
  Car,
  Fuel,
  ShieldCheck,
  X,
  Upload,
  Calendar,
  Clock,
  User,
  Printer,
  Maximize2,
  BookmarkCheck,
  Sparkles,
  Check,
  Wrench,
  Search,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { ItemChecklist, AgendamentoPWA } from '../types';

interface SistemaChecklistProps {
  checklists: ItemChecklist[];
  onSalvarChecklist: (checklist: ItemChecklist, agendamentoIdOrigem?: string) => void;
  onExcluirChecklist: (id: string, nome: string) => void;
  unidadeNome: string;
  temaClasses: {
    bg: string;
    border: string;
    text: string;
  };
  agendamentosPendentes?: AgendamentoPWA[];
  agendamentoPreSelecionado?: AgendamentoPWA | null;
  onLimparAgendamentoPreSelecionado?: () => void;
}

// Itens padrão de inspeção física do veículo
const ITENS_VISTORIA = [
  { id: 'lataria', label: 'Lataria & Pintura', desc: 'Arranhões, amassados ou riscos' },
  { id: 'vidros', label: 'Vidros & Pára-brisa', desc: 'Trincas, palhetas ou insulfilm' },
  { id: 'pneus', label: 'Pneus & Rodas', desc: 'Calotas, riscos em liga-leve ou calibragem' },
  { id: 'estofamento', label: 'Bancos & Estofamento', desc: 'Manchas, rasgos ou sujeira pesada' },
  { id: 'estepe', label: 'Estepe & Ferramentas', desc: 'Presença do estepe, macaco e chave' },
  { id: 'antena', label: 'Antena & Retrovisores', desc: 'Retrovisores elétricos e espelhos' },
  { id: 'tapetes', label: 'Tapetes & Carpete', desc: 'Jogo completo de tapetes' },
  { id: 'luzesFarois', label: 'Faróis & Lanternas', desc: 'Lentes trincadas ou lâmpadas queimadas' }
] as const;

export default function SistemaChecklist({
  checklists,
  onSalvarChecklist,
  onExcluirChecklist,
  unidadeNome,
  temaClasses,
  agendamentosPendentes = [],
  agendamentoPreSelecionado,
  onLimparAgendamentoPreSelecionado
}: SistemaChecklistProps) {
  // Agendamento vinculado à vistoria atual
  const [agendamentoVinculado, setAgendamentoVinculado] = useState<AgendamentoPWA | null>(agendamentoPreSelecionado || null);

  // Estados do formulário de novo checklist
  const [veiculo, setVeiculo] = useState('');
  const [placa, setPlaca] = useState('');
  const [cliente, setCliente] = useState('');
  const [avarias, setAvarias] = useState('');
  const [nivelCombustivel, setNivelCombustivel] = useState<'Reserva' | '1/4' | '1/2' | '3/4' | 'Cheio'>('1/2');
  const [pertences, setPertences] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [responsavel, setResponsavel] = useState('Operador de Pátio');

  // Estado dos itens de vistoria rápida (OK, Avaria, N/A)
  const [itensStatus, setItensStatus] = useState<Record<string, 'ok' | 'avaria' | 'nao_se_aplica'>>({
    lataria: 'ok',
    vidros: 'ok',
    pneus: 'ok',
    estofamento: 'ok',
    estepe: 'ok',
    antena: 'ok',
    tapetes: 'ok',
    luzesFarois: 'ok'
  });

  // Lista de fotos arquivadas da vistoria (Máximo 10)
  const [fotosUrls, setFotosUrls] = useState<string[]>([]);
  const [fotoEmZoom, setFotoEmZoom] = useState<string | null>(null);
  const [vistoriaEmDetalhe, setVistoriaEmDetalhe] = useState<ItemChecklist | null>(null);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [buscaVistoria, setBuscaVistoria] = useState('');

  // Modal de exclusão personalizado (Sem window.confirm nativo)
  const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string; nome: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Manipulador de upload e compressão de imagens (limite rigoroso de 10 fotos)
  const handleProcessarFotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErroFoto(null);

    const disponivel = 10 - fotosUrls.length;
    if (disponivel <= 0) {
      setErroFoto('Limite máximo de 10 fotos já foi atingido para este veículo.');
      return;
    }

    const arquivosArray = Array.from(files).slice(0, disponivel);
    if (files.length > disponivel) {
      setErroFoto(`Apenas ${disponivel} foto(s) foram adicionadas para não ultrapassar o limite de 10 fotos.`);
    }

    arquivosArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1000;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const base64Comprimido = canvas.toDataURL('image/jpeg', 0.8);
            setFotosUrls((prev) => {
              if (prev.length >= 10) return prev;
              return [...prev, base64Comprimido];
            });
          }
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const removerFoto = (index: number) => {
    setFotosUrls((prev) => prev.filter((_, idx) => idx !== index));
    setErroFoto(null);
  };

  const extrairPlaca = (str: string) => {
    const m = str.match(/\((?:Placa:\s*)?([A-Z0-9-]{7,8})\)/i) || str.match(/([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i);
    return m ? m[1].toUpperCase() : '';
  };

  const extrairModelo = (str: string) => {
    return str.replace(/\s*\([^)]*\)/g, '').trim();
  };

  const selecionarAgendamentoParaVistoria = (ag: AgendamentoPWA) => {
    setAgendamentoVinculado(ag);
    const mod = extrairModelo(ag.veiculo) || ag.veiculo;
    setVeiculo(mod);
    setPlaca(extrairPlaca(ag.veiculo) || '');
    setCliente(ag.cliente || '');
    setObservacoes(`Agendamento: ${ag.data} às ${ag.horario} • Serviço: ${ag.servico} • Tel: ${ag.telefone}`);
    setErroFoto(null);
  };

  // Sincroniza quando a prop agendamentoPreSelecionado mudar ou se houver agendamento pendente
  useEffect(() => {
    if (agendamentoPreSelecionado) {
      selecionarAgendamentoParaVistoria(agendamentoPreSelecionado);
    } else if (!agendamentoVinculado && agendamentosPendentes.length > 0) {
      selecionarAgendamentoParaVistoria(agendamentosPendentes[0]);
    }
  }, [agendamentoPreSelecionado, agendamentosPendentes.length]);

  const handleSubmeterVistoria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!veiculo.trim() || !placa.trim()) {
      setErroFoto('Informe o modelo do veículo e a placa.');
      return;
    }

    const novaVistoria: ItemChecklist = {
      id: `chk_${Date.now()}`,
      veiculo: veiculo.trim(),
      placa: placa.trim().toUpperCase(),
      cliente: cliente.trim() || 'Cliente Balcão',
      avarias: avarias.trim() || 'Nenhuma avaria aparente relatada na entrada.',
      fotos: fotosUrls.length,
      fotosUrls: [...fotosUrls],
      itensVerificados: { ...itensStatus },
      nivelCombustivel,
      pertences: pertences.trim() || 'Nenhum pertence deixado no veículo',
      observacoes: observacoes.trim(),
      responsavel: responsavel.trim() || 'Operador',
      agendamentoId: agendamentoVinculado?.id,
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    onSalvarChecklist(novaVistoria, agendamentoVinculado?.id);

    // Limpa o formulário e a reserva
    setVeiculo('');
    setPlaca('');
    setCliente('');
    setAvarias('');
    setPertences('');
    setObservacoes('');
    setFotosUrls([]);
    setErroFoto(null);
    setAgendamentoVinculado(null);
    onLimparAgendamentoPreSelecionado?.();
    setItensStatus({
      lataria: 'ok',
      vidros: 'ok',
      pneus: 'ok',
      estofamento: 'ok',
      estepe: 'ok',
      antena: 'ok',
      tapetes: 'ok',
      luzesFarois: 'ok'
    });
  };

  // Vistorias filtradas pela busca
  const vistoriasFiltradas = useMemo(() => {
    if (!buscaVistoria.trim()) return checklists;
    const b = buscaVistoria.toLowerCase().trim();
    return checklists.filter(c =>
      c.veiculo?.toLowerCase().includes(b) ||
      c.placa?.toLowerCase().includes(b) ||
      c.cliente?.toLowerCase().includes(b) ||
      c.data?.toLowerCase().includes(b)
    );
  }, [checklists, buscaVistoria]);

  // Total de avarias detectadas no formulário atual
  const totalAvariasDetectadas = useMemo(() => {
    return Object.values(itensStatus).filter(st => st === 'avaria').length;
  }, [itensStatus]);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-cyan-400" />
            <span>Checklist & Vistoria Fotográfica do Veículo</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tire fotos reais diretamente pela câmera ou galeria (até 10 fotos) e faça o registro de entrada com conferência física completa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1.5">
            <Camera size={14} />
            <span>{checklists.length} Vistoria(s) Registrada(s)</span>
          </span>
        </div>
      </div>

      {/* SEÇÃO: VEÍCULOS AGENDADOS AGUARDANDO VISTORIA DE CHEGADA */}
      {agendamentosPendentes.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Veículos Agendados / Aguardando Vistoria de Chegada</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {agendamentosPendentes.length} {agendamentosPendentes.length === 1 ? 'veículo' : 'veículos'}
              </span>
            </h3>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Clique em um veículo para carregar seus dados no checklist
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agendamentosPendentes.map((ag) => {
              const isReservado = agendamentoVinculado?.id === ag.id;
              return (
                <div
                  key={ag.id}
                  className={`border rounded-xl p-3.5 space-y-2 transition flex flex-col justify-between ${
                    isReservado
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="text-xs font-bold text-white truncate">{ag.cliente}</h4>
                      {isReservado ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500 text-slate-950">
                          Selecionado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {ag.status}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-cyan-300 font-semibold">{ag.veiculo}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={11} className="text-slate-500" />
                      <span>{ag.data} às {ag.horario} • {ag.servico}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => selecionarAgendamentoParaVistoria(ag)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isReservado
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <CheckSquare size={13} />
                    <span>{isReservado ? '✓ Veículo Selecionado' : 'Carregar para Vistoria'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FORMULÁRIO DE NOVA VISTORIA & FOTOS REAIS DO VEÍCULO */}
      {/* ======================================================== */}
      <form onSubmit={handleSubmeterVistoria} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Nova Vistoria de Entrada
            </h3>
          </div>
          {agendamentoVinculado && (
            <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
              <BookmarkCheck size={14} />
              <span>Vinculado ao agendamento de {agendamentoVinculado.cliente}</span>
            </span>
          )}
        </div>

        {erroFoto && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{erroFoto}</span>
            </span>
            <button type="button" onClick={() => setErroFoto(null)} className="text-amber-400 hover:text-white cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* DADOS DE IDENTIFICAÇÃO DO VEÍCULO E CLIENTE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Veículo / Modelo *</label>
            <input
              type="text"
              value={veiculo}
              onChange={(e) => setVeiculo(e.target.value)}
              placeholder="Ex: Toyota Corolla, Onix, Hilux..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Placa *</label>
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="Ex: BRA2E19 ou ABC-1234"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-cyan-500 uppercase transition"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Nome do Cliente</label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Ex: João da Silva (ou Balcão)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Vistoriador / Operador</label>
            <input
              type="text"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Nome do operador que fez a vistoria"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* SEÇÃO PRINCIPAL: FOTOS REAIS DO VEÍCULO (CÂMERA E GALERIA) */}
        {/* ======================================================== */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4.5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Registro Fotográfico do Veículo</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Tire fotos da lataria, rodas, painel e avarias existentes para proteção contra reclamações.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                fotosUrls.length >= 10
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : fotosUrls.length > 0
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {fotosUrls.length} de 10 fotos anexadas
              </span>
            </div>
          </div>

          {/* BOTÕES DE CAPTURA COM CÂMERA E UPLOAD */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Input Câmera Nativa */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleProcessarFotos(e.target.files)}
              className="hidden"
            />

            {/* Input Galeria / Múltiplos Arquivos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleProcessarFotos(e.target.files)}
              className="hidden"
            />

            <button
              type="button"
              disabled={fotosUrls.length >= 10}
              onClick={() => cameraInputRef.current?.click()}
              className="py-2.5 px-4 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2 shadow-lg shadow-cyan-950/40 cursor-pointer"
            >
              <Camera size={16} />
              <span>Tirar Foto com a Câmera</span>
            </button>

            <button
              type="button"
              disabled={fotosUrls.length >= 10}
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2 cursor-pointer"
            >
              <Upload size={15} />
              <span>Carregar da Galeria</span>
            </button>

            {fotosUrls.length > 0 && (
              <button
                type="button"
                onClick={() => setFotosUrls([])}
                className="py-2 px-3 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <Trash2 size={13} />
                <span>Limpar Todas as Fotos</span>
              </button>
            )}
          </div>

          {/* GRADE DE FOTOS ANEXADAS */}
          {fotosUrls.length === 0 ? (
            <div
              onClick={() => cameraInputRef.current?.click()}
              className="py-8 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl flex flex-col items-center justify-center text-center p-4 transition cursor-pointer bg-slate-950/40 group"
            >
              <div className="w-12 h-12 rounded-full bg-slate-900 group-hover:bg-cyan-500/20 text-slate-400 group-hover:text-cyan-400 flex items-center justify-center transition mb-2">
                <Camera size={22} />
              </div>
              <p className="text-xs font-bold text-slate-300 group-hover:text-cyan-300">
                Toque aqui para abrir a câmera e fotografar o veículo
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Você pode registrar até 10 fotos (frente, laterais, traseira, rodas, teto e detalhes com arranhões).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {fotosUrls.map((url, idx) => (
                <div
                  key={`foto-${idx}`}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-md"
                >
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Número da Foto */}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white font-mono text-[10px] font-bold backdrop-blur-sm">
                    #{idx + 1}
                  </span>

                  {/* Botões de Ação na Imagem */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFotoEmZoom(url)}
                      className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition cursor-pointer shadow-md"
                      title="Ampliar foto em alta resolução"
                    >
                      <Maximize2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removerFoto(idx)}
                      className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer shadow-md"
                      title="Excluir esta foto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* CHECKLIST FÍSICO DOS ITENS DO VEÍCULO (OK / AVARIA / N/A) */}
        {/* ======================================================== */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Inspeção Física Rápida dos Componentes</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Selecione a situação de cada parte do veículo para registro formal de entrada.
              </p>
            </div>

            {totalAvariasDetectadas > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <AlertTriangle size={13} />
                <span>{totalAvariasDetectadas} com Avaria</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ITENS_VISTORIA.map((item) => {
              const statusAtual = itensStatus[item.id] || 'ok';
              return (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{item.label}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{item.desc}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setItensStatus(prev => ({ ...prev, [item.id]: 'ok' }))}
                      className={`py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        statusAtual === 'ok'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Check size={11} strokeWidth={3} />
                      <span>OK</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setItensStatus(prev => ({ ...prev, [item.id]: 'avaria' }))}
                      className={`py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        statusAtual === 'avaria'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <AlertTriangle size={11} />
                      <span>Avaria</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setItensStatus(prev => ({ ...prev, [item.id]: 'nao_se_aplica' }))}
                      className={`py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center cursor-pointer ${
                        statusAtual === 'nao_se_aplica'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span>N/A</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* NÍVEL DE COMBUSTÍVEL */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Fuel size={15} className="text-amber-400" />
            <span>Nível do Marcador de Combustível na Entrada:</span>
          </label>
          <div className="grid grid-cols-5 gap-2 max-w-xl">
            {(['Reserva', '1/4', '1/2', '3/4', 'Cheio'] as const).map((nv) => (
              <button
                key={nv}
                type="button"
                onClick={() => setNivelCombustivel(nv)}
                className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  nivelCombustivel === nv
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {nv}
              </button>
            ))}
          </div>
        </div>

        {/* PERTENCES E OBSERVAÇÕES DE AVARIAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-bold">
              Pertences e Objetos Pessoais Deixados no Carro
            </label>
            <input
              type="text"
              value={pertences}
              onChange={(e) => setPertences(e.target.value)}
              placeholder="Ex: Óculos de sol no porta-luvas, carteira com documentos, cadeirinha de bebê..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-slate-300 font-bold">
              Descrição de Avarias / Riscos Pré-existentes
            </label>
            <input
              type="text"
              value={avarias}
              onChange={(e) => setAvarias(e.target.value)}
              placeholder="Ex: Risco na porta do motorista, pequeno amassado no pára-choque dianteiro..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* BOTÃO FINALIZAR E SALVAR */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {fotosUrls.length > 0 ? (
              <span className="text-cyan-400 font-semibold">
                ✓ {fotosUrls.length} foto(s) anexada(s) pronta(s) para arquivamento
              </span>
            ) : (
              <span className="text-slate-500">Nenhuma foto tirada (opcional, recomendado fotografar avarias)</span>
            )}
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40"
          >
            <CheckCircle2 size={16} />
            <span>Salvar e Concluir Vistoria</span>
          </button>
        </div>
      </form>

      {/* ======================================================== */}
      {/* HISTÓRICO DE VISTORIAS CONCLUÍDAS */}
      {/* ======================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Vistorias Realizadas no Lava Jato ({checklists.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulte os registros anteriores, visualize as fotos anexadas e imprima o comprovante de entrada.
            </p>
          </div>

          <div className="w-full sm:w-64 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={buscaVistoria}
              onChange={(e) => setBuscaVistoria(e.target.value)}
              placeholder="Buscar por placa, modelo ou cliente..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {vistoriasFiltradas.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <CheckSquare size={36} className="mx-auto text-slate-600 opacity-60" />
            <p>Nenhuma vistoria encontrada. Preencha o formulário acima para registrar uma vistoria!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vistoriasFiltradas.map((chk) => {
              const temFotos = chk.fotosUrls && chk.fotosUrls.length > 0;
              const avariasItens = Object.values(chk.itensVerificados || {}).filter(st => st === 'avaria').length;

              return (
                <div
                  key={chk.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{chk.veiculo}</h4>
                        <span className="text-xs font-mono text-cyan-400 font-bold block mt-0.5">
                          {chk.placa || 'SEM PLACA'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">{chk.data}</span>
                        {chk.hora && <span className="text-[10px] text-slate-500 block">{chk.hora}</span>}
                      </div>
                    </div>

                    {/* Preview da Primeira Foto (se houver) */}
                    {temFotos && (
                      <div
                        onClick={() => setVistoriaEmDetalhe(chk)}
                        className="relative h-28 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group cursor-pointer"
                      >
                        <img
                          src={chk.fotosUrls![0]}
                          alt={chk.veiculo}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm">
                          <Camera size={11} />
                          <span>{chk.fotosUrls!.length} {chk.fotosUrls!.length === 1 ? 'foto' : 'fotos'}</span>
                        </div>
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Cliente:</span>
                        <span className="font-bold text-white truncate max-w-[150px]">{chk.cliente || 'Balcão'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Combustível:</span>
                        <span className="font-bold text-amber-300">{chk.nivelCombustivel || '1/2'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Status das Avarias:</span>
                        <span className={`font-bold ${avariasItens > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {avariasItens > 0 ? `⚠️ ${avariasItens} componente(s) c/ avaria` : '✓ Sem avarias'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setVistoriaEmDetalhe(chk)}
                      className="flex-1 py-2 px-3 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-bold rounded-lg border border-cyan-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Ver Ficha & Fotos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setItemParaExcluir({ id: chk.id, nome: `${chk.veiculo} (${chk.placa || 'Sem Placa'})` })}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition cursor-pointer"
                      title="Excluir vistoria"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ZOOM DA FOTO EM ALTA RESOLUÇÃO */}
      {/* ======================================================== */}
      {fotoEmZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFotoEmZoom(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 bg-slate-950 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Camera size={15} className="text-cyan-400" />
                <span>Foto da Vistoria do Veículo</span>
              </span>
              <button
                type="button"
                onClick={() => setFotoEmZoom(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-3 bg-slate-950 overflow-auto">
              <img
                src={fotoEmZoom}
                alt="Foto Ampliada"
                className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: FICHA COMPLETA DE VISTORIA COM FOTOS & IMPRESSÃO */}
      {/* ======================================================== */}
      {vistoriaEmDetalhe && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setVistoriaEmDetalhe(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra Superior do Modal */}
            <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 print:hidden">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="text-cyan-400 w-4 h-4" />
                  <span>Comprovante de Vistoria de Entrada</span>
                </h3>
                <p className="text-[11px] text-slate-400">{unidadeNome}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <Printer size={13} />
                  <span>Imprimir Ficha</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVistoriaEmDetalhe(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Conteúdo Imprimível */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="text-center pb-2 border-b border-slate-800 space-y-0.5">
                <h2 className="text-base font-black text-white uppercase tracking-wider">{unidadeNome}</h2>
                <p className="text-xs text-cyan-400 font-bold">Comprovante de Vistoria e Inspeção de Entrada</p>
                <p className="text-[10px] text-slate-400">Registro fotográfico e conferência de componentes</p>
              </div>

              {/* Dados Cadastrais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Veículo / Modelo</span>
                  <span className="text-white font-bold text-xs">{vistoriaEmDetalhe.veiculo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Placa</span>
                  <span className="text-cyan-400 font-mono font-bold text-xs">{vistoriaEmDetalhe.placa || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Cliente</span>
                  <span className="text-white font-bold text-xs">{vistoriaEmDetalhe.cliente || 'Balcão'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Data & Hora</span>
                  <span className="text-slate-300 font-medium">{vistoriaEmDetalhe.data} às {vistoriaEmDetalhe.hora || '12:00'}</span>
                </div>
              </div>

              {/* Tabela de Itens Verificados */}
              <div className="space-y-1.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-white block mb-2">Conferência dos Componentes:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ITENS_VISTORIA.map(item => {
                    const st = vistoriaEmDetalhe.itensVerificados?.[item.id] || 'ok';
                    return (
                      <div key={item.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">{item.label}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          st === 'ok' ? 'bg-emerald-500/20 text-emerald-400' :
                          st === 'avaria' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {st === 'ok' ? 'OK' : st === 'avaria' ? 'Avaria' : 'N/A'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Informações Complementares */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Combustível</span>
                  <p className="text-amber-300 font-bold mt-0.5">{vistoriaEmDetalhe.nivelCombustivel || '1/2'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Pertences Deixados</span>
                  <p className="text-slate-300 mt-0.5">{vistoriaEmDetalhe.pertences || 'Nenhum'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Relatório de Avarias</span>
                  <p className="text-rose-300 font-medium mt-0.5">{vistoriaEmDetalhe.avarias || 'Nenhuma avaria relatada'}</p>
                </div>
              </div>

              {/* GALERIA DE FOTOS REGISTRADAS */}
              {vistoriaEmDetalhe.fotosUrls && vistoriaEmDetalhe.fotosUrls.length > 0 && (
                <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Camera size={14} className="text-cyan-400" />
                      <span>Galeria de Fotos da Vistoria ({vistoriaEmDetalhe.fotosUrls.length}):</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Toque na imagem para ampliar</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {vistoriaEmDetalhe.fotosUrls.map((ft, idx) => (
                      <div
                        key={`det-ft-${idx}`}
                        onClick={() => setFotoEmZoom(ft)}
                        className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900 hover:border-cyan-400 transition cursor-pointer group"
                      >
                        <img src={ft} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-mono">
                          Foto #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assinatura / Validação para impressão */}
              <div className="pt-8 grid grid-cols-2 gap-6 text-center text-xs text-slate-400">
                <div className="border-t border-slate-700 pt-1.5">
                  <span className="font-medium text-slate-300">Assinatura do Cliente / Proprietário</span>
                </div>
                <div className="border-t border-slate-700 pt-1.5">
                  <span className="font-medium text-slate-300">Responsável Técnico ({vistoriaEmDetalhe.responsavel || 'Operador'})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO (SEM WINDOW.CONFIRM) */}
      {/* ======================================================== */}
      {itemParaExcluir && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setItemParaExcluir(null)}
        >
          <div
            className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Confirmar Exclusão</h4>
                <p className="text-xs text-slate-400">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
              Deseja realmente remover o registro de vistoria do veículo <strong>{itemParaExcluir.nome}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className="py-2 px-4 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onExcluirChecklist(itemParaExcluir.id, itemParaExcluir.nome);
                  setItemParaExcluir(null);
                }}
                className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition cursor-pointer shadow-lg shadow-rose-950/40"
              >
                Excluir Vistoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
