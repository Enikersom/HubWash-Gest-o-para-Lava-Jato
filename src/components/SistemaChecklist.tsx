import React, { useState, useRef } from 'react';
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
  FileText,
  Printer,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { ItemChecklist } from '../types';

interface SistemaChecklistProps {
  checklists: ItemChecklist[];
  onSalvarChecklist: (checklist: ItemChecklist) => void;
  onExcluirChecklist: (id: string, nome: string) => void;
  unidadeNome: string;
  temaClasses: {
    bg: string;
    border: string;
    text: string;
  };
}

// Itens padrão de inspeção física do veículo
const ITENS_VISTORIA = [
  { id: 'lataria', label: 'Lataria & Pintura' },
  { id: 'vidros', label: 'Vidros & Pára-brisa' },
  { id: 'pneus', label: 'Pneus & Rodas' },
  { id: 'estofamento', label: 'Bancos & Estofamento' },
  { id: 'estepe', label: 'Estepe & Ferramentas' },
  { id: 'antena', label: 'Antena & Retrovisores' },
  { id: 'tapetes', label: 'Tapetes Internos' },
  { id: 'luzesFarois', label: 'Faróis & Lanternas' }
] as const;

export default function SistemaChecklist({
  checklists,
  onSalvarChecklist,
  onExcluirChecklist,
  unidadeNome,
  temaClasses
}: SistemaChecklistProps) {
  // Estados do formulário de novo checklist
  const [veiculo, setVeiculo] = useState('');
  const [placa, setPlaca] = useState('');
  const [cliente, setCliente] = useState('');
  const [avarias, setAvarias] = useState('');
  const [nivelCombustivel, setNivelCombustivel] = useState<'Reserva' | '1/4' | '1/2' | '3/4' | 'Cheio'>('1/2');
  const [pertences, setPertences] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [responsavel, setResponsavel] = useState('Operador de Pátio');

  // Estado dos itens de vistoria (OK, Avaria, N/A)
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
          // Redimensiona mantendo a proporção para economizar memória (máx 900px)
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 900;

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
            const base64Comprimido = canvas.toDataURL('image/jpeg', 0.75);
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
      avarias: avarias.trim() || 'Nenhuma avaria aparente relatada.',
      fotos: fotosUrls.length,
      fotosUrls: [...fotosUrls],
      itensVerificados: { ...itensStatus },
      nivelCombustivel,
      pertences: pertences.trim() || 'Nenhum pertence deixado no veículo',
      observacoes: observacoes.trim(),
      responsavel: responsavel.trim() || 'Operador',
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    onSalvarChecklist(novaVistoria);

    // Limpa o formulário para o próximo veículo
    setVeiculo('');
    setPlaca('');
    setCliente('');
    setAvarias('');
    setPertences('');
    setObservacoes('');
    setFotosUrls([]);
    setErroFoto(null);
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

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4.5 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-cyan-400" />
            <span>Sistema de Vistoria de Entrada & Checklist Veicular</span>
          </h2>
          <p className="text-xs text-slate-400">
            Inspecione o estado do veículo no momento da chegada e guarde até 10 fotos para garantia e segurança do cliente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {checklists.length} Vistoria(s) Registrada(s)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ======================================================== */}
        {/* FORMULÁRIO DE NOVA VISTORIA (COL 12 -> 5 no desktop) */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Nova Inspeção de Entrada</span>
          </h3>

          <form onSubmit={handleSubmeterVistoria} className="space-y-4 text-xs font-semibold">
            {/* DADOS BÁSICOS */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Veículo / Modelo *</label>
                <input
                  type="text"
                  required
                  value={veiculo}
                  onChange={(e) => setVeiculo(e.target.value)}
                  placeholder="Ex: Honda Civic"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Placa *</label>
                <input
                  type="text"
                  required
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  placeholder="BRA2E19"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Cliente (Opcional)</label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Responsável Vistoria</label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Operador"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* ITENS DE VISTORIA DO ESTADO DO VEÍCULO */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Inspeção do Estado Físico
                </span>
                <span className="text-[10px] text-slate-500">Toque para alterar</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {ITENS_VISTORIA.map((item) => {
                  const statusAtual = itensStatus[item.id] || 'ok';
                  return (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-1"
                    >
                      <span className="text-[11px] text-slate-300 truncate">{item.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setItensStatus(prev => ({ ...prev, [item.id]: 'ok' }))}
                          title="Sem avarias (OK)"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            statusAtual === 'ok' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => setItensStatus(prev => ({ ...prev, [item.id]: 'avaria' }))}
                          title="Com avaria ou risco"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            statusAtual === 'avaria' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Avaria
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NÍVEL DE COMBUSTÍVEL */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-slate-400 font-medium flex items-center gap-1.5">
                <Fuel size={13} className="text-amber-400" />
                <span>Nível de Combustível</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['Reserva', '1/4', '1/2', '3/4', 'Cheio'] as const).map((nivel) => (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() => setNivelCombustivel(nivel)}
                    className={`py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                      nivelCombustivel === nivel
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {nivel}
                  </button>
                ))}
              </div>
            </div>

            {/* AVARIAS & PERTENCES */}
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Avarias & Riscos Pré-existentes</label>
                <textarea
                  value={avarias}
                  onChange={(e) => setAvarias(e.target.value)}
                  placeholder="Ex: Risco na porta traseira direita, pequeno amassado no capô..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500 resize-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Pertences de Valor / Objetos no Veículo</label>
                <input
                  type="text"
                  value={pertences}
                  onChange={(e) => setPertences(e.target.value)}
                  placeholder="Ex: Óculos no painel, jaqueta no banco traseiro..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* ======================================================== */}
            {/* SEÇÃO DE ARMAZENAMENTO DE FOTOS (MÁXIMO 10 FOTOS) */}
            {/* ======================================================== */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera size={14} /> Fotos da Vistoria (Máx 10)
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  fotosUrls.length === 10 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'
                }`}>
                  {fotosUrls.length}/10 fotos
                </span>
              </div>

              {/* Botões de Ação de Captura */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  disabled={fotosUrls.length >= 10}
                  onChange={(e) => {
                    handleProcessarFotos(e.target.files);
                    if (e.target) e.target.value = '';
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={fotosUrls.length >= 10}
                  onClick={() => cameraInputRef.current?.click()}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                    fotosUrls.length >= 10
                      ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300 cursor-pointer'
                  }`}
                >
                  <Camera size={14} />
                  <span>Tirar Foto</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={fotosUrls.length >= 10}
                  onChange={(e) => {
                    handleProcessarFotos(e.target.files);
                    if (e.target) e.target.value = '';
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={fotosUrls.length >= 10}
                  onClick={() => fileInputRef.current?.click()}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                    fotosUrls.length >= 10
                      ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/30 text-blue-300 cursor-pointer'
                  }`}
                >
                  <Upload size={14} />
                  <span>Galeria / Arquivo</span>
                </button>
              </div>

              {erroFoto && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{erroFoto}</span>
                </div>
              )}

              {/* Grade de Miniaturas das Fotos Selecionadas */}
              {fotosUrls.length > 0 && (
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {fotosUrls.map((url, idx) => (
                    <div
                      key={`preview-${idx}`}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group"
                    >
                      <img
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFotoEmZoom(url)}
                          className="p-1 rounded-full bg-cyan-600 text-white cursor-pointer"
                          title="Ampliar foto"
                        >
                          <Eye size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removerFoto(idx)}
                          className="p-1 rounded-full bg-rose-600 text-white cursor-pointer"
                          title="Remover foto"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-white/80 bg-black/60 px-1 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`w-full py-3 px-4 ${temaClasses.bg} text-white font-bold rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider text-xs`}
            >
              <CheckCircle2 size={16} />
              <span>Salvar Vistoria & Arquivar Fotos</span>
            </button>
          </form>
        </div>

        {/* ======================================================== */}
        {/* HISTÓRICO DAS VISTORIAS ARQUIVADAS (COL 12 -> 7 no desktop) */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Histórico de Vistorias e Fotos</span>
            </h3>
            <span className="text-xs text-slate-400">
              {checklists.length === 0 ? 'Nenhum registro ainda' : `${checklists.length} veículo(s) inspecionado(s)`}
            </span>
          </div>

          {checklists.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/20">
                <Car size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Nenhum veículo vistoriado ainda</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Preencha o formulário ao lado para realizar a vistoria de entrada e anexar fotos do veículo antes de iniciar o serviço.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {checklists.map((chk) => (
                <div
                  key={chk.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4.5 space-y-3 shadow-lg transition"
                >
                  {/* Cabeçalho da Vistoria */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white">{chk.veiculo}</h4>
                        {chk.placa && (
                          <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-bold">
                            {chk.placa}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {chk.data} {chk.hora ? `às ${chk.hora}` : ''}
                        </span>
                        {chk.cliente && (
                          <span>• Cliente: <strong className="text-slate-300">{chk.cliente}</strong></span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setVistoriaEmDetalhe(chk)}
                        className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Ver Ficha Completa da Vistoria"
                      >
                        <Eye size={13} />
                        <span>Detalhes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onExcluirChecklist(chk.id, `Vistoria de ${chk.veiculo} (${chk.placa || ''})`)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                        title="Excluir Vistoria"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Resumo Rápido da Vistoria */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Avarias Observadas</span>
                      <p className="text-amber-300 font-medium line-clamp-1">{chk.avarias}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Nível Tanque</span>
                      <p className="text-slate-300">{chk.nivelCombustivel || '1/2 tanque'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Pertences</span>
                      <p className="text-slate-300 line-clamp-1">{chk.pertences || 'Nenhum'}</p>
                    </div>
                  </div>

                  {/* Miniaturas das Fotos Arquivadas da Vistoria */}
                  {chk.fotosUrls && chk.fotosUrls.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Camera size={13} className="text-cyan-400" />
                          <span>Fotos do Veículo ({chk.fotosUrls.length}/10):</span>
                        </span>
                        <span className="text-[10px] text-slate-500">Clique para ampliar</span>
                      </div>

                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        {chk.fotosUrls.map((foto, fIdx) => (
                          <button
                            key={`chk-foto-${chk.id}-${fIdx}`}
                            type="button"
                            onClick={() => setFotoEmZoom(foto)}
                            className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-950 hover:border-cyan-400 transition cursor-pointer group"
                          >
                            <img
                              src={foto}
                              alt={`Foto ${fIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Maximize2 size={14} className="text-white" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 italic">
                      <Camera size={12} />
                      <span>Nenhuma foto anexada a esta vistoria</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
            className="relative max-w-3xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
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

            <div className="flex-1 flex items-center justify-center p-2 bg-slate-950 overflow-auto">
              <img
                src={fotoEmZoom}
                alt="Foto Ampliada"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: FICHA COMPLETA DA VISTORIA PARA IMPRESSÃO/CONSULTA */}
      {/* ======================================================== */}
      {vistoriaEmDetalhe && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setVistoriaEmDetalhe(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="text-cyan-400 w-4 h-4" />
                  <span>Comprovante de Vistoria de Entrada</span>
                </h3>
                <p className="text-[11px] text-slate-400">{unidadeNome}</p>
              </div>
              <button
                type="button"
                onClick={() => setVistoriaEmDetalhe(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Cartão de Resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Veículo</span>
                  <span className="text-white font-bold">{vistoriaEmDetalhe.veiculo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Placa</span>
                  <span className="text-cyan-400 font-mono font-bold">{vistoriaEmDetalhe.placa || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Data & Hora</span>
                  <span className="text-slate-300">{vistoriaEmDetalhe.data} {vistoriaEmDetalhe.hora}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Tanque</span>
                  <span className="text-amber-400 font-bold">{vistoriaEmDetalhe.nivelCombustivel || '1/2'}</span>
                </div>
              </div>

              {/* Tabela de Itens Físicos Checados */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white block">Estado dos Componentes:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ITENS_VISTORIA.map((it) => {
                    const st = vistoriaEmDetalhe.itensVerificados?.[it.id as keyof typeof vistoriaEmDetalhe.itensVerificados] || 'ok';
                    return (
                      <div
                        key={`det-${it.id}`}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                      >
                        <span className="text-[11px] text-slate-300 truncate">{it.label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          st === 'ok' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {st === 'ok' ? 'OK' : 'AVARIA'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Avarias & Pertences */}
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Avarias & Riscos Relatados</span>
                  <p className="text-amber-300 font-medium mt-0.5">{vistoriaEmDetalhe.avarias}</p>
                </div>
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Pertences no Veículo</span>
                  <p className="text-slate-300 mt-0.5">{vistoriaEmDetalhe.pertences}</p>
                </div>
              </div>

              {/* Fotos Arquivadas */}
              {vistoriaEmDetalhe.fotosUrls && vistoriaEmDetalhe.fotosUrls.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white block">
                    Fotos Arquivadas ({vistoriaEmDetalhe.fotosUrls.length}/10):
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {vistoriaEmDetalhe.fotosUrls.map((ft, idx) => (
                      <button
                        key={`det-ft-${idx}`}
                        type="button"
                        onClick={() => setFotoEmZoom(ft)}
                        className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950 hover:border-cyan-400 transition cursor-pointer"
                      >
                        <img src={ft} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer size={13} />
                <span>Imprimir Vistoria</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
