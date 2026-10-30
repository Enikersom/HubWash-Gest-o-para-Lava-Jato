import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Edit3,
  Search,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Tag,
  Barcode,
  X,
  ShoppingCart,
  Minus,
  Check,
  PackagePlus,
  Layers
} from 'lucide-react';
import { ProdutoEstoque } from '../types';

interface ModuloProdutosProps {
  produtos: ProdutoEstoque[];
  onSalvarProduto: (produto: ProdutoEstoque) => void;
  onExcluirProduto: (id: string, nome: string) => void;
  onAjustarEstoque: (id: string, delta: number) => void;
  unidadeId: string;
  temaClasses: {
    bg: string;
    border: string;
    text: string;
  };
  onAbrirPDV: () => void;
}

export default function ModuloProdutos({
  produtos,
  onSalvarProduto,
  onExcluirProduto,
  onAjustarEstoque,
  unidadeId,
  temaClasses,
  onAbrirPDV
}: ModuloProdutosProps) {
  // Filtros de busca e categoria
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'com_estoque' | 'baixo' | 'esgotado'>('todos');

  // Modal de Cadastro / Edição de Produto
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<ProdutoEstoque | null>(null);

  // Campos do formulário
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Estética Automotiva');
  const [precoVenda, setPrecoVenda] = useState('20.00');
  const [precoCusto, setPrecoCusto] = useState('9.00');
  const [estoque, setEstoque] = useState('15');
  const [min, setMin] = useState('3');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);

  // Modal de Exclusão interno (sem window.confirm)
  const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string; nome: string } | null>(null);

  // Categorias sugeridas rápidas para lava-jato
  const categoriasSugeridas = [
    'Estética Automotiva',
    'Aromatizantes',
    'Acessórios',
    'Conveniência',
    'Químicos & Limpeza',
    'Lubrificantes & Fluidos',
    'Geral'
  ];

  // Cálculo da Margem de Lucro do formulário em tempo real
  const precoVendaNum = parseFloat(precoVenda) || 0;
  const precoCustoNum = parseFloat(precoCusto) || 0;
  const lucroReais = precoVendaNum - precoCustoNum;
  const margemPorcentagem = precoCustoNum > 0 ? (lucroReais / precoCustoNum) * 100 : 0;

  // Abrir modal para novo produto
  const handleAbrirNovo = () => {
    setProdutoEditando(null);
    setNome('');
    setCategoria('Estética Automotiva');
    setPrecoVenda('20.00');
    setPrecoCusto('9.00');
    setEstoque('15');
    setMin('3');
    setCodigoBarras('');
    setDescricao('');
    setAtivo(true);
    setModalAberto(true);
  };

  // Abrir modal para editar produto existente
  const handleAbrirEditar = (prod: ProdutoEstoque) => {
    setProdutoEditando(prod);
    setNome(prod.nome);
    setCategoria(prod.categoria || 'Geral');
    setPrecoVenda(String(prod.precoVenda || '0.00'));
    setPrecoCusto(String(prod.precoCusto || '0.00'));
    setEstoque(String(prod.estoque || '0'));
    setMin(String(prod.min || '3'));
    setCodigoBarras(prod.codigoBarras || '');
    setDescricao(prod.descricao || '');
    setAtivo(prod.ativo !== false);
    setModalAberto(true);
  };

  // Salvar produto (criar ou atualizar)
  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const id = produtoEditando?.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const novoProduto: ProdutoEstoque = {
      id,
      nome: nome.trim(),
      categoria: categoria.trim() || 'Geral',
      precoVenda: parseFloat(precoVenda) || 0,
      precoCusto: parseFloat(precoCusto) || 0,
      estoque: parseInt(estoque, 10) || 0,
      min: parseInt(min, 10) || 2,
      codigoBarras: codigoBarras.trim() || undefined,
      descricao: descricao.trim() || undefined,
      ativo,
      unidadeId,
      updatedAt: new Date().toISOString()
    };

    onSalvarProduto(novoProduto);
    setModalAberto(false);
  };

  // Métricas do Estoque
  const totalProdutos = produtos.length;
  const produtosComEstoqueBaixo = produtos.filter(p => p.estoque > 0 && p.estoque <= (p.min || 3)).length;
  const produtosEsgotados = produtos.filter(p => p.estoque <= 0).length;
  const valorTotalVendaEstoque = produtos.reduce((acc, curr) => acc + (Number(curr.precoVenda || 0) * (Number(curr.estoque) || 0)), 0);
  const custoTotalEstoque = produtos.reduce((acc, curr) => acc + (Number(curr.precoCusto || 0) * (Number(curr.estoque) || 0)), 0);

  // Lista de produtos filtrada
  const produtosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return produtos.filter(p => {
      const bateBusca = !termo ||
        p.nome.toLowerCase().includes(termo) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termo)) ||
        (p.categoria && p.categoria.toLowerCase().includes(termo));

      const bateCategoria = filtroCategoria === 'todas' || p.categoria?.toLowerCase() === filtroCategoria.toLowerCase();

      let bateStatus = true;
      if (filtroStatus === 'com_estoque') bateStatus = p.estoque > (p.min || 3);
      if (filtroStatus === 'baixo') bateStatus = p.estoque > 0 && p.estoque <= (p.min || 3);
      if (filtroStatus === 'esgotado') bateStatus = p.estoque <= 0;

      return bateBusca && bateCategoria && bateStatus;
    });
  }, [produtos, busca, filtroCategoria, filtroStatus]);

  return (
    <div className="space-y-6">
      
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO INTERNO (COMPATÍVEL COM RULE[AGENTS_md]) */}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Excluir Produto do Estoque</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tem certeza que deseja remover o produto <strong className="text-white">"{itemParaExcluir.nome}"</strong>? Esta ação não pode ser desfeita.
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
                onClick={() => {
                  onExcluirProduto(itemParaExcluir.id, itemParaExcluir.nome);
                  setItemParaExcluir(null);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                Excluir Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD DE MÉTRICAS DO ESTOQUE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total de Produtos</span>
          <p className="text-2xl font-black text-white mt-1">{totalProdutos}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Valor em Estoque</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            R$ {valorTotalVendaEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Custo Investido</span>
          <p className="text-2xl font-black text-blue-300 mt-1">
            R$ {custoTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Alertas de Estoque</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-amber-400">{produtosComEstoqueBaixo}</span>
            <span className="text-xs text-slate-500">baixos</span>
            {produtosEsgotados > 0 && (
              <span className="text-xs text-rose-400 font-bold">({produtosEsgotados} esgotados)</span>
            )}
          </div>
        </div>
      </div>

      {/* BARRA DE AÇÕES: CADASTRO NOVO + ABRIR PDV + BUSCA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleAbrirNovo}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-600/30"
          >
            <Plus size={16} />
            <span>Cadastrar Produto</span>
          </button>

          <button
            type="button"
            onClick={onAbrirPDV}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-600/30"
          >
            <ShoppingCart size={16} />
            <span>Abrir PDV / Vender</span>
          </button>
        </div>

        {/* BUSCA E FILTROS */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, código ou categoria..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="todos">Todos</option>
            <option value="com_estoque">Estoque OK</option>
            <option value="baixo">Estoque Baixo</option>
            <option value="esgotado">Esgotado</option>
          </select>
        </div>
      </div>

      {/* TABELA / LISTA DE PRODUTOS */}
      {produtosFiltrados.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum produto cadastrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Comece cadastrando aromatizantes, ceras, silicones, microfibras e bebidas para venda no seu lava jato.
          </p>
          <button
            type="button"
            onClick={handleAbrirNovo}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-emerald-600/30 mt-2"
          >
            <Plus size={15} />
            <span>Cadastrar Primeiro Produto</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="p-3.5">Produto & Categoria</th>
                  <th className="p-3.5">Código / Ref</th>
                  <th className="p-3.5">Preço Custo</th>
                  <th className="p-3.5">Preço Venda (PDV)</th>
                  <th className="p-3.5">Margem Lucro</th>
                  <th className="p-3.5 text-center">Saldo em Estoque</th>
                  <th className="p-3.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {produtosFiltrados.map((p) => {
                  const esgotado = p.estoque <= 0;
                  const estoqueBaixo = !esgotado && p.estoque <= (p.min || 3);
                  const lucro = (p.precoVenda || 0) - (p.precoCusto || 0);
                  const margem = (p.precoCusto || 0) > 0 ? (lucro / (p.precoCusto || 1)) * 100 : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      {/* NOME & CATEGORIA */}
                      <td className="p-3.5 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{p.nome}</span>
                          {estoqueBaixo && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Estoque Baixo
                            </span>
                          )}
                          {esgotado && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Esgotado
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block">
                          {p.categoria || 'Geral'}
                        </span>
                      </td>

                      {/* CÓDIGO DE BARRAS */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">
                        {p.codigoBarras ? (
                          <span className="flex items-center gap-1">
                            <Barcode size={13} className="text-slate-500" />
                            <span>{p.codigoBarras}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* PREÇO DE CUSTO */}
                      <td className="p-3.5 font-mono text-slate-300">
                        R$ {Number(p.precoCusto || 0).toFixed(2)}
                      </td>

                      {/* PREÇO DE VENDA */}
                      <td className="p-3.5 font-mono font-bold text-emerald-400 text-sm">
                        R$ {Number(p.precoVenda || 0).toFixed(2)}
                      </td>

                      {/* MARGEM DE LUCRO */}
                      <td className="p-3.5 font-mono">
                        <div className="text-[11px] font-bold text-teal-300">
                          +R$ {lucro.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {margem > 0 ? `${margem.toFixed(0)}% de margem` : '0%'}
                        </div>
                      </td>

                      {/* ESTOQUE COM CONTROLE RÁPIDO (+ / -) */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAjustarEstoque(p.id, -1)}
                            className="w-6 h-6 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-bold transition flex items-center justify-center border border-slate-800 cursor-pointer"
                            title="Reduzir 1 unidade"
                          >
                            <Minus size={12} />
                          </button>

                          <span className={`font-black text-sm px-2 min-w-[2.5rem] text-center ${
                            esgotado ? 'text-rose-400' : estoqueBaixo ? 'text-amber-400' : 'text-white'
                          }`}>
                            {p.estoque}
                          </span>

                          <button
                            type="button"
                            onClick={() => onAjustarEstoque(p.id, 1)}
                            className="w-6 h-6 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-bold transition flex items-center justify-center border border-slate-800 cursor-pointer"
                            title="Adicionar 1 unidade"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="text-[9px] text-slate-500 block text-center mt-0.5">
                          mínimo: {p.min || 2} un
                        </span>
                      </td>

                      {/* AÇÕES */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAbrirEditar(p)}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition cursor-pointer"
                            title="Editar Produto"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setItemParaExcluir({ id: p.id, nome: p.nome })}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                            title="Excluir Produto"
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
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE PRODUTO */}
      {/* ======================================================== */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <PackagePlus size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {produtoEditando ? 'Editar Produto do Estoque' : 'Cadastrar Novo Produto para Venda'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Defina preço de venda no PDV, custo e controle de quantidade.
                </p>
              </div>
            </div>

            <form onSubmit={handleSalvar} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Aromatizante Folha Little Trees Vanilla"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Categoria *</label>
                  <input
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Ex: Estética Automotiva"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {/* Sugestões rápidas de categoria */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {categoriasSugeridas.slice(0, 4).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoria(cat)}
                        className="text-[9px] bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white px-1.5 py-0.5 rounded border border-slate-800 transition cursor-pointer"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Código de Barras / Ref</label>
                  <div className="relative">
                    <Barcode className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                      placeholder="Ex: 78912345678"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* PREÇOS & MARGEM DE LUCRO */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Preço de Venda (R$) *</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-emerald-400 absolute left-2.5 top-2.5" />
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={precoVenda}
                      onChange={(e) => setPrecoVenda(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-2 text-white font-bold font-mono focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Preço de Custo (R$)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={precoCusto}
                      onChange={(e) => setPrecoCusto(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-2 text-slate-300 font-mono focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                {/* Banner de Margem em tempo real */}
                <div className="col-span-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Lucro Bruto por unidade:</span>
                  <span className="font-bold text-emerald-400">
                    R$ {lucroReais.toFixed(2)} ({margemPorcentagem.toFixed(0)}% de margem)
                  </span>
                </div>
              </div>

              {/* QUANTIDADES DE ESTOQUE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estoque Atual *</label>
                  <input
                    type="number"
                    min="0"
                    value={estoque}
                    onChange={(e) => setEstoque(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    min="0"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Descrição / Detalhes (Opcional)</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={2}
                  placeholder="Informações adicionais para a equipe de vendas..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30"
                >
                  <Check size={15} />
                  <span>{produtoEditando ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
