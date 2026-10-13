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
  statusPlano: 'teste' | 'ativo' | 'bloqueado';
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

export interface ItemChecklist {
  id: string;
  veiculo: string;
  avarias: string;
  fotos: number;
  data: string;
  nivelCombustivel?: string;
  pertences?: string;
}

export interface ProdutoEstoque {
  id: string;
  nome: string;
  estoque: number;
  min: number;
  categoria?: string;
  precoCusto?: number;
}

export interface ClienteFidelidade {
  id: string;
  nome: string;
  email?: string;
  telefone: string;
  pontos: number;
  veiculoPrincipal?: string;
  totalGasto?: number;
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
  status: 'Pendente' | 'Confirmado' | 'Concluido' | 'Cancelado';
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
