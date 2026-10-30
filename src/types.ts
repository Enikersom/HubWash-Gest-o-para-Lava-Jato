export interface LavaJato {
  id: string; // Slug da URL (ex: pitstop)
  nomeProprietario: string;
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  contato: string;
  nomeFantasia: string;
  senhaProvisoria: string;
  valorPlano: number;
  dataCriacao: string;
  dataExpiracao: string;
  statusPlano: 'teste' | 'ativo' | 'vitalicio' | 'bloqueado';
  tipoPlano?: 'mensal' | 'anual' | 'vitalicio';
  logoUrl?: string;
}

export interface ItemFila {
  id: string;
  cliente: string;
  veiculo: string;
  servico: string;
  status: 'Espera' | 'Lavando' | 'Pronto' | 'Entregue';
  funcionario: string;
  valor: number;
  horaEntrada?: string;
  agendamentoId?: string;
  unidadeId?: string;
}

export interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  comissaoPorcentagem: number;
  totalComissaoAcumulada: number;
  telefone?: string;
}

export interface MovimentacaoCaixa {
  id: string;
  descricao: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data: string;
  categoria?: string;
}

export type TipoVeiculoVistoria = 
  | 'passeio' 
  | 'suv' 
  | 'caminhonete' 
  | 'caminhao_cacamba' 
  | 'caminhao' 
  | 'moto' 
  | 'van_onibus';

export interface PontoAvaria {
  id: string;
  x: number; // Porcentagem de 0 a 100
  y: number; // Porcentagem de 0 a 100
  vista: 'lateral_esquerda' | 'frente' | 'traseira' | 'lateral_direita';
  descricao?: string;
  tipo?: 'risco' | 'amassado' | 'quebrado' | 'trinca' | 'outro';
}

export interface ItemChecklist {
  id: string;
  unidadeId?: string;
  veiculo: string;
  placa?: string;
  cliente?: string;
  tipoVeiculo?: TipoVeiculoVistoria;
  pontosAvarias?: PontoAvaria[];
  avarias: string;
  fotos: number;
  fotosUrls?: string[]; // Lista com até 10 fotos (base64 ou URLs)
  itensVerificados?: {
    lataria?: 'ok' | 'avaria' | 'nao_se_aplica';
    vidros?: 'ok' | 'avaria' | 'nao_se_aplica';
    pneus?: 'ok' | 'avaria' | 'nao_se_aplica';
    estofamento?: 'ok' | 'avaria' | 'nao_se_aplica';
    estepe?: 'ok' | 'avaria' | 'nao_se_aplica';
    antena?: 'ok' | 'avaria' | 'nao_se_aplica';
    tapetes?: 'ok' | 'avaria' | 'nao_se_aplica';
    luzesFarois?: 'ok' | 'avaria' | 'nao_se_aplica';
  };
  estadoLimpeza?: {
    limpezaExterna?: 'bom' | 'medio' | 'ruim';
    limpezaInterna?: 'bom' | 'medio' | 'ruim';
    pneus?: 'bom' | 'medio' | 'ruim';
    estepe?: 'bom' | 'medio' | 'ruim';
  };
  luzesChecagem?: {
    farolAlto?: 'sim' | 'nao' | 'na';
    farolBaixo?: 'sim' | 'nao' | 'na';
    luzFreio?: 'sim' | 'nao' | 'na';
    luzRe?: 'sim' | 'nao' | 'na';
    setas?: 'sim' | 'nao' | 'na';
    luzPlaca?: 'sim' | 'nao' | 'na';
    neblina?: 'sim' | 'nao' | 'na';
  };
  nivelCombustivel?: string;
  pertences?: string;
  observacoes?: string;
  responsavel?: string;
  agendamentoId?: string;
  data: string;
  hora?: string;
}

export interface ProdutoEstoque {
  id: string;
  nome: string;
  preco?: number;
  precoVenda: number;
  precoCusto?: number;
  estoque: number;
  min: number;
  categoria?: string;
  codigoBarras?: string;
  unidadeId?: string;
  ativo?: boolean;
  descricao?: string;
  fotoUrl?: string;
  updatedAt?: string;
}

export interface ItemVendaPDV {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  categoria?: string;
}

export interface VendaPDV {
  id: string;
  unidadeId?: string;
  itens: ItemVendaPDV[];
  subtotal: number;
  valorSubtotal?: number;
  desconto: number;
  total: number;
  valorFinal?: number;
  formaPagamento: 'dinheiro' | 'pix' | 'debito' | 'credito' | 'fiado';
  metodoPagamento?: 'dinheiro' | 'pix' | 'debito' | 'credito' | 'fiado';
  clienteNome?: string;
  clienteId?: string;
  veiculoPlaca?: string;
  agendamentoId?: string;
  dataHora: string;
  data: string;
  operador?: string;
  atendenteNome?: string;
  valorRecebido?: number;
  valorPago?: number;
  troco?: number;
  observacoes?: string;
}

export interface ClienteFidelidade {
  id: string;
  nome: string;
  email?: string;
  telefone: string;
  pontos: number;
  veiculoPrincipal?: string;
  totalGasto?: number;
  fcmToken?: string;
  notificacoesAtivas?: boolean;
}

export interface BannerPromocional {
  id: string;
  titulo: string;
  status: 'Ativo' | 'Inativo';
  imagem: string;
  link?: string;
  unidadeId?: string;
  descricao?: string;
  desconto?: string;
}

export interface AgendamentoPWA {
  id: string;
  cliente: string;
  telefone: string;
  veiculo: string;
  servico: string;
  data: string;
  horario: string;
  status: 'Pendente' | 'Confirmado' | 'Concluido' | 'Cancelado' | 'Em Atendimento' | 'Vistoriado' | 'Espera' | 'Lavando' | 'Pronto';
  unidadeId?: string;
  unidadeVinculadaId?: string;
  email?: string;
  valor?: number | string;
  statusLavagem?: string;
}

export interface ServicoLavaJato {
  id: string;
  nome: string;
  valor: number;
  tempoMedioMinutos?: number;
  descricao?: string;
  categoria?: 'Lavagem' | 'Estética' | 'Higienização' | 'Adicional';
  ativo: boolean;
  unidadeId?: string;
}
