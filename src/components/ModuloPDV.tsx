import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  DollarSign,
  QrCode,
  CreditCard,
  Banknote,
  Receipt,
  User,
  Car,
  Package,
  AlertTriangle,
  Printer,
  Sparkles,
  ArrowRight,
  X,
  Clock,
  Check,
  Tag,
  Store,
  RefreshCw
} from 'lucide-react';
import { ProdutoEstoque, VendaPDV, ItemVendaPDV, ClienteFidelidade, ItemFila } from '../types';

interface ModuloPDVProps {
  produtos: ProdutoEstoque[];
  onAtualizarEstoque: (produtoId: string, novoEstoque: number) => void;
  onRegistrarVenda: (venda: VendaPDV) => void;
  onAdicionarAoCaixa: (valor: number, descricao: string) => void;
  clientes: ClienteFidelidade[];
  veiculosFila?: ItemFila[];
  vendasHistorico: VendaPDV[];
  unidadeNome: string;
  unidadeId: string;
  temaClasses: {
    bg: string;
    border: string;
    text: string;
  };
  onIrParaCadastroProdutos: () => void;
}

interface ItemCarrinho extends ItemVendaPDV {
  estoqueDisponivel: number;
}

export default function ModuloPDV({
  produtos,
  onAtualizarEstoque,
  onRegistrarVenda,
  onAdicionarAoCaixa,
  clientes,
  veiculosFila = [],
  vendasHistorico = [],
  unidadeNome,
  unidadeId,
  temaClasses,
  onIrParaCadastroProdutos
}: ModuloPDVProps) {
  // Estado de pesquisa e filtros do catálogo
  const [buscaProduto, setBuscaProduto] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('todos');

  // Estado do Carrinho de Compras
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [descontoReais, setDescontoReais] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'pix' | 'debito' | 'credito' | 'fiado'>('pix');
  const [valorRecebido, setValorRecebido] = useState<string>('');
  
  // Vínculo com cliente ou veículo da fila
  const [tipoVinculo, setTipoVinculo] = useState<'avulso' | 'cliente' | 'fila'>('avulso');
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string>('');
  const [veiculoFilaSelecionadoId, setVeiculoFilaSelecionadoId] = useState<string>('');
  const [observacaoVenda, setObservacaoVenda] = useState('');

  // Modal de comprovante de venda finalizada
  const [vendaConcluida, setVendaConcluida] = useState<VendaPDV | null>(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [vendaParaRecibo, setVendaParaRecibo] = useState<VendaPDV | null>(null);

  // Categorias únicas existentes nos produtos
  const categorias = useMemo(() => {
    const setCats = new Set<string>();
    produtos.forEach(p => {
      if (p.categoria && p.categoria.trim()) {
        setCats.add(p.categoria.trim());
      }
    });
    return Array.from(setCats);
  }, [produtos]);

  // Produtos filtrados pelo catálogo de vendas
  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.toLowerCase().trim();
    return produtos.filter(p => {
      if (p.ativo === false) return false;
      const bateCategoria = categoriaSelecionada === 'todos' || p.categoria?.toLowerCase() === categoriaSelecionada.toLowerCase();
      const bateBusca = !termo ||
        p.nome.toLowerCase().includes(termo) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(termo)) ||
        (p.categoria && p.categoria.toLowerCase().includes(termo));
      return bateCategoria && bateBusca;
    });
  }, [produtos, buscaProduto, categoriaSelecionada]);

  // Adicionar produto ao carrinho
  const handleAdicionarAoCarrinho = (produto: ProdutoEstoque) => {
    if (produto.estoque <= 0) return;

    setCarrinho(prev => {
      const index = prev.findIndex(item => item.produtoId === produto.id);
      if (index >= 0) {
        // Já está no carrinho, aumenta quantidade se houver estoque
        const itemAtual = prev[index];
        if (itemAtual.quantidade >= produto.estoque) {
          return prev;
        }
        const novaQtd = itemAtual.quantidade + 1;
        const atualizado: ItemCarrinho = {
          ...itemAtual,
          quantidade: novaQtd,
          subtotal: novaQtd * itemAtual.precoUnitario
        };
        const novoCarrinho = [...prev];
        novoCarrinho[index] = atualizado;
        return novoCarrinho;
      }

      // Adiciona novo item
      const novoItem: ItemCarrinho = {
        produtoId: produto.id,
        nome: produto.nome,
        precoUnitario: produto.precoVenda || 0,
        quantidade: 1,
        subtotal: produto.precoVenda || 0,
        categoria: produto.categoria,
        estoqueDisponivel: produto.estoque
      };
      return [...prev, novoItem];
    });
  };

  // Alterar quantidade no carrinho
  const handleAlterarQuantidade = (produtoId: string, delta: number) => {
    setCarrinho(prev => {
      return prev
        .map(item => {
          if (item.produtoId === produtoId) {
            const novaQtd = item.quantidade + delta;
            if (novaQtd <= 0) return null;
            if (novaQtd > item.estoqueDisponivel) return item;
            return {
              ...item,
              quantidade: novaQtd,
              subtotal: novaQtd * item.precoUnitario
            };
          }
          return item;
        })
        .filter((item): item is ItemCarrinho => item !== null);
    });
  };

  // Remover item do carrinho
  const handleRemoverDoCarrinho = (produtoId: string) => {
    setCarrinho(prev => prev.filter(item => item.produtoId !== produtoId));
  };

  // Cálculos financeiros do carrinho
  const subtotalCarrinho = useMemo(() => {
    return carrinho.reduce((acc, curr) => acc + curr.subtotal, 0);
  }, [carrinho]);

  const totalCarrinho = useMemo(() => {
    const totalComDesconto = Math.max(0, subtotalCarrinho - (Number(descontoReais) || 0));
    return totalComDesconto;
  }, [subtotalCarrinho, descontoReais]);

  const valorRecebidoNum = parseFloat(valorRecebido) || 0;
  const trocoCalculado = formaPagamento === 'dinheiro' && valorRecebidoNum > totalCarrinho
    ? valorRecebidoNum - totalCarrinho
    : 0;

  // Informações do cliente vinculado
  const clienteSelecionado = useMemo(() => {
    if (tipoVinculo === 'cliente' && clienteSelecionadoId) {
      return clientes.find(c => c.id === clienteSelecionadoId) || null;
    }
    return null;
  }, [tipoVinculo, clienteSelecionadoId, clientes]);

  // Informações do veículo da fila vinculado
  const veiculoFilaSelecionado = useMemo(() => {
    if (tipoVinculo === 'fila' && veiculoFilaSelecionadoId) {
      return veiculosFila.find(v => v.id === veiculoFilaSelecionadoId) || null;
    }
    return null;
  }, [tipoVinculo, veiculoFilaSelecionadoId, veiculosFila]);

  // Mensagem de validação de pagamento (sem window.alert)
  const [avisoErro, setAvisoErro] = useState<string | null>(null);

  // Finalizar a Venda no PDV
  const handleFinalizarVenda = () => {
    if (carrinho.length === 0) return;

    if (formaPagamento === 'dinheiro' && valorRecebidoNum > 0 && valorRecebidoNum < totalCarrinho) {
      setAvisoErro(`O valor recebido (R$ ${valorRecebidoNum.toFixed(2)}) é menor que o total da venda (R$ ${totalCarrinho.toFixed(2)})!`);
      setTimeout(() => setAvisoErro(null), 4000);
      return;
    }

    setAvisoErro(null);
    const agora = new Date();
    const idVenda = `venda_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let nomeClienteFinal = 'Cliente Balcão';
    let placaFinal: string | undefined = undefined;

    if (tipoVinculo === 'cliente' && clienteSelecionado) {
      nomeClienteFinal = clienteSelecionado.nome;
      placaFinal = clienteSelecionado.veiculoPrincipal;
    } else if (tipoVinculo === 'fila' && veiculoFilaSelecionado) {
      nomeClienteFinal = veiculoFilaSelecionado.cliente;
      placaFinal = `${veiculoFilaSelecionado.veiculo} (Fila)`;
    }

    const novaVenda: VendaPDV = {
      id: idVenda,
      unidadeId,
      itens: carrinho.map(it => ({
        produtoId: it.produtoId,
        nome: it.nome,
        quantidade: it.quantidade,
        precoUnitario: it.precoUnitario,
        subtotal: it.subtotal,
        categoria: it.categoria
      })),
      subtotal: subtotalCarrinho,
      desconto: Number(descontoReais) || 0,
      total: totalCarrinho,
      formaPagamento,
      metodoPagamento: formaPagamento,
      clienteNome: nomeClienteFinal,
      clienteId: clienteSelecionado?.id,
      veiculoPlaca: placaFinal,
      agendamentoId: veiculoFilaSelecionado?.agendamentoId,
      dataHora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      data: agora.toLocaleDateString('pt-BR'),
      operador: 'Operador PDV',
      valorRecebido: formaPagamento === 'dinheiro' && valorRecebidoNum ? valorRecebidoNum : totalCarrinho,
      troco: trocoCalculado,
      observacoes: observacaoVenda.trim() || undefined
    };

    // 1. Dá baixa automática no estoque de cada produto vendido
    carrinho.forEach(item => {
      const prodOriginal = produtos.find(p => p.id === item.produtoId);
      if (prodOriginal) {
        const novoEstoque = Math.max(0, prodOriginal.estoque - item.quantidade);
        onAtualizarEstoque(item.produtoId, novoEstoque);
      }
    });

    // 2. Registra automaticamente no Caixa Diário do Lava Jato
    const descCaixa = `PDV #${idVenda.slice(-5)}: ${carrinho.map(i => `${i.quantidade}x ${i.nome}`).join(', ')} (${nomeClienteFinal}) [${formaPagamento.toUpperCase()}]`;
    onAdicionarAoCaixa(totalCarrinho, descCaixa);

    // 3. Salva a venda no histórico
    onRegistrarVenda(novaVenda);

    // 4. Abre modal do comprovante / recibo
    setVendaConcluida(novaVenda);

    // 5. Limpa o carrinho
    setCarrinho([]);
    setDescontoReais(0);
    setValorRecebido('');
    setObservacaoVenda('');
    setTipoVinculo('avulso');
    setClienteSelecionadoId('');
    setVeiculoFilaSelecionadoId('');

    // Vibração suave de confirmação (se suportado no mobile)
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch {}
  };

  // Vendas de hoje para resumo
  const vendasHoje = useMemo(() => {
    const hojeStr = new Date().toLocaleDateString('pt-BR');
    return vendasHistorico.filter(v => v.data === hojeStr || v.data === 'Hoje');
  }, [vendasHistorico]);

  const totalVendidoHoje = useMemo(() => {
    return vendasHoje.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  }, [vendasHoje]);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO PDV COM RESUMO RÁPIDO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-tight">PDV • Frente de Caixa</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                AO VIVO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Venda rápida de insumos, ceras, aromatizantes, bebidas e conveniência do {unidadeNome}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-right flex-1 sm:flex-initial">
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Vendido Hoje</span>
            <span className="text-sm font-black text-emerald-400">
              R$ {totalVendidoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMostrarHistorico(!mostrarHistorico)}
            className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              mostrarHistorico
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Receipt size={14} />
            <span>Vendas ({vendasHoje.length})</span>
          </button>

          <button
            type="button"
            onClick={onIrParaCadastroProdutos}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            title="Gerenciar catálogo de produtos e estoque"
          >
            <Package size={14} />
            <span className="hidden sm:inline">Produtos</span>
          </button>
        </div>
      </div>

      {/* PAINEL HISTÓRICO DE VENDAS DO DIA (EXPANSÍVEL) */}
      {mostrarHistorico && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Vendas do PDV Realizadas Hoje ({vendasHoje.length})</h3>
            </div>
            <button
              type="button"
              onClick={() => setMostrarHistorico(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>
          </div>

          {vendasHoje.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenhuma venda de produto registrada hoje ainda. Realize a primeira venda no terminal ao lado!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vendasHoje.map((v) => (
                <div
                  key={v.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 block font-bold">
                        #{v.id.slice(-6).toUpperCase()} • {v.dataHora}
                      </span>
                      <h4 className="text-xs font-bold text-white mt-0.5">{v.clienteNome || 'Cliente Balcão'}</h4>
                      {v.veiculoPlaca && (
                        <span className="text-[10px] text-slate-400 block">{v.veiculoPlaca}</span>
                      )}
                    </div>
                    <span className="text-sm font-black text-emerald-400">
                      R$ {Number(v.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="border-t border-slate-800/80 pt-2 text-[11px] text-slate-300 space-y-1">
                    {v.itens.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-slate-400">
                        <span>{it.quantidade}x {it.nome}</span>
                        <span>R$ {Number(it.subtotal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase">
                      {v.formaPagamento}
                    </span>
                    <button
                      type="button"
                      onClick={() => setVendaParaRecibo(v)}
                      className="text-cyan-400 hover:text-cyan-300 font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={12} />
                      <span>Ver Recibo</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ÁREA PRINCIPAL: CATÁLOGO DE PRODUTOS + CARRINHO / FRENTE DE CAIXA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* COLUNA ESQUERDA (7 colunas): CATÁLOGO DE PRODUTOS */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* BARRA DE PESQUISA E CATEGORIAS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Buscar produto por nome, categoria ou código de barras..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              {buscaProduto && (
                <button
                  type="button"
                  onClick={() => setBuscaProduto('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* ABAS DE CATEGORIAS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setCategoriaSelecionada('todos')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  categoriaSelecionada === 'todos'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Todos ({produtos.filter(p => p.ativo !== false).length})
              </button>

              {categorias.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoriaSelecionada(cat)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                    categoriaSelecionada.toLowerCase() === cat.toLowerCase()
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* GRID DE CARDS DE PRODUTOS */}
          {produtosFiltrados.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Nenhum produto localizado</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Não encontramos produtos correspondentes à sua busca. Deseja cadastrar novos produtos no estoque?
              </p>
              <button
                type="button"
                onClick={onIrParaCadastroProdutos}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 mt-2"
              >
                <Plus size={14} />
                <span>Cadastrar Produto Agora</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {produtosFiltrados.map((p) => {
                const esgotado = p.estoque <= 0;
                const estoqueBaixo = !esgotado && p.estoque <= (p.min || 3);
                const qtdNoCarrinho = carrinho.find(item => item.produtoId === p.id)?.quantidade || 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => !esgotado && handleAdicionarAoCarrinho(p)}
                    className={`bg-slate-900/90 border rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg transition-all duration-200 select-none relative group ${
                      esgotado
                        ? 'opacity-60 border-slate-800 bg-slate-950/80 cursor-not-allowed'
                        : 'border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    {/* Badge de quantidade já presente no carrinho */}
                    {qtdNoCarrinho > 0 && (
                      <span className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-950 z-10 animate-scale-in">
                        {qtdNoCarrinho}
                      </span>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {p.categoria || 'Geral'}
                        </span>
                        {estoqueBaixo && (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            Baixo ({p.estoque})
                          </span>
                        )}
                        {esgotado && (
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.5 rounded">
                            Esgotado
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition leading-snug line-clamp-2">
                        {p.nome}
                      </h4>

                      {p.descricao && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {p.descricao}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Preço</span>
                        <span className="text-base font-black text-emerald-400">
                          R$ {Number(p.precoVenda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={esgotado}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!esgotado) handleAdicionarAoCarrinho(p);
                        }}
                        className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm ${
                          esgotado
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer active:scale-95'
                        }`}
                        title={esgotado ? "Produto esgotado" : "Adicionar produto ao carrinho"}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* COLUNA DIREITA (5 colunas): CARRINHO & FRENTE DE CAIXA */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl sticky top-20">
          
          {/* CABEÇALHO DO CARRINHO */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Carrinho da Venda</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                {carrinho.reduce((acc, curr) => acc + curr.quantidade, 0)} itens
              </span>
            </div>

            {carrinho.length > 0 && (
              <button
                type="button"
                onClick={() => setCarrinho([])}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition cursor-pointer flex items-center gap-1"
                title="Esvaziar carrinho"
              >
                <Trash2 size={13} />
                <span>Limpar</span>
              </button>
            )}
          </div>

          {/* VÍNCULO OPCIONAL: BALCÃO / CLIENTE / VEÍCULO DA FILA */}
          <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Identificação da Venda (Opcional):
            </span>

            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setTipoVinculo('avulso')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition cursor-pointer text-center text-[11px] ${
                  tipoVinculo === 'avulso'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Balcão
              </button>

              <button
                type="button"
                onClick={() => setTipoVinculo('cliente')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition cursor-pointer text-center text-[11px] ${
                  tipoVinculo === 'cliente'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Cliente
              </button>

              <button
                type="button"
                onClick={() => setTipoVinculo('fila')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition cursor-pointer text-center text-[11px] ${
                  tipoVinculo === 'fila'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Carro na Fila
              </button>
            </div>

            {tipoVinculo === 'cliente' && (
              <div className="pt-2">
                <select
                  value={clienteSelecionadoId}
                  onChange={(e) => setClienteSelecionadoId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Selecione um cliente cadastrado...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.veiculoPrincipal ? `(${c.veiculoPrincipal})` : ''} - {c.pontos} pts
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tipoVinculo === 'fila' && (
              <div className="pt-2">
                <select
                  value={veiculoFilaSelecionadoId}
                  onChange={(e) => setVeiculoFilaSelecionadoId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Selecione o veículo sendo lavado...</option>
                  {veiculosFila.filter(v => v.status !== 'Entregue').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.cliente} - {v.veiculo} ({v.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* LISTA DOS ITENS NO CARRINHO */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
            {carrinho.length === 0 ? (
              <div className="py-8 text-center space-y-2 text-slate-500">
                <ShoppingCart className="w-10 h-10 mx-auto text-slate-700" />
                <p className="text-xs">Carrinho vazio.</p>
                <p className="text-[11px] text-slate-600">
                  Clique nos produtos ao lado para adicioná-los à venda.
                </p>
              </div>
            ) : (
              carrinho.map((item) => (
                <div
                  key={item.produtoId}
                  className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-white truncate">{item.nome}</h5>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      R$ {item.precoUnitario.toFixed(2)} un
                    </span>
                  </div>

                  {/* CONTROLE DE QUANTIDADE */}
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleAlterarQuantidade(item.produtoId, -1)}
                      className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center cursor-pointer"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-bold text-white px-1 text-xs">{item.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => handleAlterarQuantidade(item.produtoId, 1)}
                      disabled={item.quantidade >= item.estoqueDisponivel}
                      className={`w-5 h-5 rounded text-xs font-bold transition flex items-center justify-center ${
                        item.quantidade >= item.estoqueDisponivel
                          ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                      }`}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-white text-xs block">
                      R$ {item.subtotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoverDoCarrinho(item.produtoId)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* TOTALIZADORES & DESCONTO */}
          {carrinho.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-white">R$ {subtotalCarrinho.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Desconto (R$):</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={descontoReais || ''}
                  onChange={(e) => setDescontoReais(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-right text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">TOTAL A PAGAR:</span>
                <span className="text-xl font-black text-emerald-400">
                  R$ {totalCarrinho.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* FORMAS DE PAGAMENTO */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Forma de Pagamento:
                </span>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormaPagamento('pix')}
                    className={`py-2 px-1.5 rounded-xl text-center text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                      formaPagamento === 'pix'
                        ? 'bg-teal-600/30 border-teal-400 text-teal-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <QrCode size={15} />
                    <span className="text-[10px]">PIX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPagamento('dinheiro')}
                    className={`py-2 px-1.5 rounded-xl text-center text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                      formaPagamento === 'dinheiro'
                        ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Banknote size={15} />
                    <span className="text-[10px]">Dinheiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPagamento('debito')}
                    className={`py-2 px-1.5 rounded-xl text-center text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                      formaPagamento === 'debito'
                        ? 'bg-blue-600/30 border-blue-400 text-blue-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard size={15} />
                    <span className="text-[10px]">Débito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPagamento('credito')}
                    className={`py-2 px-1.5 rounded-xl text-center text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                      formaPagamento === 'credito'
                        ? 'bg-indigo-600/30 border-indigo-400 text-indigo-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard size={15} />
                    <span className="text-[10px]">Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPagamento('fiado')}
                    className={`py-2 px-1.5 rounded-xl text-center text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                      formaPagamento === 'fiado'
                        ? 'bg-amber-600/30 border-amber-400 text-amber-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Receipt size={15} />
                    <span className="text-[10px]">Fiado</span>
                  </button>
                </div>
              </div>

              {/* CAMPO DE VALOR RECEBIDO E CÁLCULO DE TROCO (EM DINHEIRO) */}
              {formaPagamento === 'dinheiro' && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">Valor Recebido do Cliente:</span>
                    <input
                      type="number"
                      step="1"
                      value={valorRecebido}
                      onChange={(e) => setValorRecebido(e.target.value)}
                      placeholder={totalCarrinho.toFixed(2)}
                      className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-right text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Atalhos rápidos de notas */}
                  <div className="flex items-center gap-1.5 justify-end">
                    {[20, 50, 100].map(valorNota => (
                      <button
                        key={valorNota}
                        type="button"
                        onClick={() => setValorRecebido(String(valorNota))}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 font-mono border border-slate-800 transition cursor-pointer"
                      >
                        R$ {valorNota}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setValorRecebido(totalCarrinho.toFixed(2))}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-emerald-400 font-mono border border-slate-800 transition cursor-pointer"
                    >
                      Exato
                    </button>
                  </div>

                  {trocoCalculado > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                      <span className="font-bold text-amber-300">TROCO DO CLIENTE:</span>
                      <span className="text-base font-black text-amber-400 font-mono">
                        R$ {trocoCalculado.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* AVISO DE ERRO EM DINHEIRO (SEM ALERT NATIVO) */}
              {avisoErro && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                  <span>{avisoErro}</span>
                </div>
              )}

              {/* BOTÃO CONFIRMAR VENDA */}
              <button
                type="button"
                onClick={handleFinalizarVenda}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-[0.99]"
              >
                <CheckCircle2 size={16} />
                <span>Confirmar & Finalizar Venda (R$ {totalCarrinho.toFixed(2)})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: COMPROVANTE NÃO-FISCAL / RECIBO DE VENDA */}
      {/* ======================================================== */}
      {(vendaConcluida || vendaParaRecibo) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setVendaConcluida(null);
            setVendaParaRecibo(null);
          }}
        >
          {(() => {
            const v = vendaConcluida || vendaParaRecibo!;
            return (
              <div
                className="bg-slate-950 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setVendaConcluida(null);
                    setVendaParaRecibo(null);
                  }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-slate-800"
                >
                  <X size={18} />
                </button>

                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Venda Concluída com Sucesso!</span>
                  <h3 className="text-base font-black text-white">{unidadeNome}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Comprovante de Venda #{v.id.slice(-6).toUpperCase()}</p>
                </div>

                {/* CUPOM DE DETALHES */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-left text-xs space-y-2.5 font-mono">
                  <div className="flex justify-between text-slate-400 text-[11px] border-b border-slate-800 pb-1.5">
                    <span>Data: {v.data} {v.dataHora}</span>
                    <span className="capitalize">{v.formaPagamento}</span>
                  </div>

                  {v.clienteNome && (
                    <div className="text-[11px] text-slate-300">
                      <span className="text-slate-500 block">Cliente:</span>
                      <strong className="text-white">{v.clienteNome}</strong> {v.veiculoPlaca && `(${v.veiculoPlaca})`}
                    </div>
                  )}

                  {/* ITENS */}
                  <div className="space-y-1.5 py-1 border-t border-b border-slate-800 text-[11px]">
                    {v.itens.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-200">
                        <span className="truncate pr-2">{it.quantidade}x {it.nome}</span>
                        <span className="shrink-0 text-white font-bold">R$ {it.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* TOTAIS */}
                  <div className="space-y-1 pt-1 text-[11px]">
                    {v.desconto > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Desconto:</span>
                        <span>- R$ {v.desconto.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white font-bold text-sm">
                      <span>TOTAL PAGO:</span>
                      <span className="text-emerald-400 font-black">R$ {v.total.toFixed(2)}</span>
                    </div>
                    {v.troco && v.troco > 0 ? (
                      <div className="flex justify-between text-slate-400 text-[10px]">
                        <span>Troco Devolvido:</span>
                        <span>R$ {v.troco.toFixed(2)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <Printer size={14} />
                    <span>Imprimir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVendaConcluida(null);
                      setVendaParaRecibo(null);
                    }}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30"
                  >
                    <Check size={14} />
                    <span>Nova Venda</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
