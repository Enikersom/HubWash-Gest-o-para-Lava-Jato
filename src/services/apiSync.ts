/**
 * SERVIÇO DE SINCRONIZAÇÃO EM TEMPO REAL (NUVEM / MOBILE <-> NOTEBOOK)
 * Garante que dados cadastrados no celular (mobile) apareçam instantaneamente
 * no computador/notebook do administrador no escritório e vice-versa.
 */

import { LavaJato } from '../types';

export interface ClienteSync {
  id?: string;
  nome: string;
  email: string;
  senhaAcesso?: string;
  unidadeVinculadaId?: string;
  unidadeId?: string;
  unidadeNome?: string;
  unidadeSlug?: string;
  contato?: string;
  telefone?: string;
  cep?: string;
  cidade?: string;
  bairro?: string;
  estado?: string;
  tipoVeiculo?: string;
  marca?: string;
  modelo?: string;
  ano?: string;
  placa?: string;
  cor?: string;
  pontosFidelidade: number;
  pontos?: number;
  veiculoPrincipal?: string;
  totalGasto?: number;
  createdAt?: string;
}

export interface AgendamentoSync {
  id: string;
  unidadeId: string;
  unidadeVinculadaId?: string;
  cliente: string;
  telefone: string;
  email?: string;
  data: string;
  horario: string;
  veiculo: string;
  servico: string;
  status: 'Pendente' | 'Confirmado' | 'Em Andamento' | 'Concluído' | 'Concluido' | 'Cancelado';
  createdAt?: string;
}

// Flag de disponibilidade da API local (se estiver no Netlify ou host estático sem backend Node, desativa fetch inútil)
let apiServidorDisponivel: boolean | null = (() => {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname.toLowerCase();
  if (
    host.includes('netlify') ||
    host.includes('.web.app') ||
    host.includes('.firebaseapp.com') ||
    host.includes('vercel.app') ||
    host.includes('github.io') ||
    localStorage.getItem('hubwash_host_sem_api') === '1'
  ) {
    return false;
  }
  return null;
})();

export function isApiServidorDisponivel(): boolean {
  return apiServidorDisponivel !== false;
}

// Helper seguro para chamadas à API com timeout curto e validação de JSON (previne travamento no Netlify)
async function fetchApiSegura(url: string, options: RequestInit = {}): Promise<Response | null> {
  // Se já sabemos que a API de servidor Node.js não existe neste host (ex: Netlify estático), sai em 0ms
  if (apiServidorDisponivel === false) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 400);

    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      apiServidorDisponivel = true;
      return res;
    } else {
      // Se retornou HTML ou erro de rota (comum no Netlify), marca como indisponível para não travar próximas chamadas
      if (contentType.includes('text/html') || res.status === 404) {
        apiServidorDisponivel = false;
        try { localStorage.setItem('hubwash_host_sem_api', '1'); } catch {}
      }
    }
  } catch {
    // Se deu timeout ou erro de rede, desativa para não travar a fila do navegador
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      apiServidorDisponivel = false;
      try { localStorage.setItem('hubwash_host_sem_api', '1'); } catch {}
    }
  }
  return null;
}

// 1. Obter dados completos sincronizados da unidade
export async function buscarDadosSincronizados(unidadeId?: string) {
  try {
    const url = unidadeId ? `/api/sync?unidadeId=${encodeURIComponent(unidadeId)}` : '/api/sync';
    const res = await fetchApiSegura(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (res) {
      return await res.json();
    }
  } catch (err) {
    // Modo offline ou fallback silencioso
  }
  return null;
}

// --- GESTÃO DE UNIDADES (SaaS) ---
export async function buscarUnidadesServidor(): Promise<LavaJato[]> {
  try {
    const res = await fetchApiSegura('/api/unidades', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (res) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Fallback buscar unidades:', err);
  }
  return [];
}

export async function salvarUnidadeServidor(unidade: LavaJato): Promise<LavaJato | null> {
  try {
    const res = await fetchApiSegura('/api/unidades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unidade)
    });
    if (res) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Erro ao persistir unidade no servidor:', err);
  }
  return null;
}

export async function atualizarStatusUnidadeServidor(id: string, statusPlano: 'ativo' | 'teste' | 'bloqueado'): Promise<boolean> {
  try {
    const res = await fetchApiSegura(`/api/unidades/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusPlano })
    });
    return Boolean(res);
  } catch (err) {
    console.warn('Erro ao atualizar status da unidade no servidor:', err);
    return false;
  }
}

export async function excluirUnidadeServidor(id: string): Promise<boolean> {
  try {
    const res = await fetchApiSegura(`/api/unidades/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return Boolean(res);
  } catch (err) {
    console.warn('Erro ao excluir unidade no servidor:', err);
    return false;
  }
}

// 2. Salvar/Registrar novo cliente
export async function registrarClienteServidor(cliente: ClienteSync): Promise<ClienteSync | null> {
  try {
    const res = await fetchApiSegura('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliente)
    });
    if (res) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Fallback de envio de cliente:', err);
  }
  return null;
}

// 3. Atualizar Pontos de Fidelidade do Cliente (Apenas Administrador)
export async function atualizarPontosClienteServidor(idOuEmail: string, pontos: number): Promise<boolean> {
  try {
    const res = await fetchApiSegura(`/api/clientes/${encodeURIComponent(idOuEmail)}/pontos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pontos })
    });
    return Boolean(res);
  } catch (err) {
    console.warn('Erro ao atualizar pontos no servidor:', err);
    return false;
  }
}

// 4. Salvar Agendamento
export async function salvarAgendamentoServidor(agendamento: AgendamentoSync): Promise<AgendamentoSync | null> {
  try {
    const res = await fetchApiSegura('/api/agendamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agendamento)
    });
    if (res) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Fallback de envio de agendamento:', err);
  }
  return null;
}

// 5. Atualizar Status do Agendamento
export async function atualizarStatusAgendamentoServidor(id: string, status: string): Promise<boolean> {
  try {
    const res = await fetchApiSegura(`/api/agendamentos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return Boolean(res);
  } catch (err) {
    return false;
  }
}

// 6. Excluir/Cancelar Agendamento
export async function excluirAgendamentoServidor(id: string): Promise<boolean> {
  try {
    const res = await fetchApiSegura(`/api/agendamentos/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return Boolean(res);
  } catch (err) {
    return false;
  }
}

// 7. Excluir Cliente
export async function excluirClienteServidor(idOuEmail: string): Promise<boolean> {
  try {
    const res = await fetchApiSegura(`/api/clientes/${encodeURIComponent(idOuEmail)}`, {
      method: 'DELETE'
    });
    return Boolean(res);
  } catch (err) {
    return false;
  }
}

// 8. Banners Promocionais
export async function buscarBannersServidor(unidadeId?: string): Promise<any[]> {
  try {
    const url = unidadeId ? `/api/banners?unidadeId=${encodeURIComponent(unidadeId)}` : '/api/banners';
    const res = await fetchApiSegura(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (res) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Fallback buscar banners:', err);
  }
  return [];
}

export async function salvarBannerServidor(banner: any): Promise<any | null> {
  try {
    const res = await fetchApiSegura('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banner)
    });
    if (res) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Erro ao salvar banner no servidor:', err);
  }
  return null;
}

export async function excluirBannerServidor(id: string): Promise<boolean> {
  try {
    const res = await fetchApiSegura(`/api/banners/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return Boolean(res);
  } catch (err) {
    return false;
  }
}

// --- SERVIÇOS & VALORES DO LAVA-JATO ---
export async function buscarServicosServidor(unidadeId?: string): Promise<any[]> {
  try {
    const url = unidadeId ? `/api/servicos?unidadeId=${encodeURIComponent(unidadeId)}` : '/api/servicos';
    const res = await fetchApiSegura(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (res) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Fallback buscar servicos:', err);
  }
  return [];
}

export async function salvarServicoServidor(servico: any): Promise<any | null> {
  try {
    const res = await fetchApiSegura('/api/servicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(servico)
    });
    if (res) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Erro ao salvar servico no servidor:', err);
  }
  return null;
}

export async function atualizarServicoServidor(id: string, dados: any): Promise<any | null> {
  try {
    const res = await fetchApiSegura(`/api/servicos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (res) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Erro ao atualizar servico no servidor:', err);
  }
  return null;
}

export async function excluirServicoServidor(id: string): Promise<boolean> {
  try {
    const res = await fetchApiSegura(`/api/servicos/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return Boolean(res);
  } catch (err) {
    return false;
  }
}

