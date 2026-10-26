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

export interface ItemChecklist {
  id: string;
  unidadeId?: string;
  veiculo: string;
  placa?: string;
  cliente?: string;
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
