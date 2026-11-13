/**
 * Utilitários de formatação e máscara para números de Celular e CEP no Brasil
 */

// Formata Celular / Telefone / WhatsApp: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
export const formatarCelular = (valor?: any): string => {
  if (valor === null || valor === undefined) return '';
  const str = String(valor).trim();
  const digits = str.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

// Formata CEP: XXXXX-XXX
export const formatarCEP = (valor?: any): string => {
  if (valor === null || valor === undefined) return '';
  const str = String(valor).trim();
  const digits = str.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
};

// Formata CPF / CNPJ
export const formatarCpfCnpj = (valor?: any): string => {
  if (valor === null || valor === undefined) return '';
  const str = String(valor).trim();
  const digits = str.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 11) {
    const d = digits.slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  } else {
    const d = digits.slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }
};

// Deduplicador inteligente de banners promocionais (evita duplicações por ID ou por Título/Unidade na sincronização)
export const deduplicarBanners = <T extends { id?: string; titulo?: string; unidadeId?: string; imagem?: string }>(lista: T[]): T[] => {
  if (!Array.isArray(lista)) return [];
  const vistosIds = new Set<string>();
  const vistosChaves = new Set<string>();
  const resultado: T[] = [];

  for (const b of lista) {
    if (!b) continue;
    const idLimpo = String(b.id || (b as any).docId || '').trim();
    const titNorm = String(b.titulo || '').toLowerCase().trim();
    const uNorm = String(b.unidadeId || '').toLowerCase().trim();
    const imgAssinatura = b.imagem ? String(b.imagem).substring(0, 150) : '';

    // 1. Evita mesmo ID
    if (idLimpo && vistosIds.has(idLimpo)) {
      continue;
    }

    // 2. Evita mesmo Título na mesma Unidade
    const chaveSemantica = titNorm ? `${titNorm}__${uNorm}` : `${imgAssinatura}__${uNorm}`;
    if (chaveSemantica && vistosChaves.has(chaveSemantica)) {
      continue;
    }

    if (idLimpo) vistosIds.add(idLimpo);
    if (chaveSemantica) vistosChaves.add(chaveSemantica);
    resultado.push(b);
  }

  return resultado;
};

// Remove recursivamente qualquer campo com valor `undefined` para evitar falha fatal no Firestore setDoc/addDoc/updateDoc
export const sanitizarParaFirestore = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  if (!obj || typeof obj !== 'object') return obj;
  const limpo: Record<string, any> = {};
  for (const [chave, valor] of Object.entries(obj)) {
    if (valor === undefined) continue;
    if (Array.isArray(valor)) {
      limpo[chave] = valor.filter(v => v !== undefined);
    } else if (valor !== null && typeof valor === 'object' && !(valor instanceof Date)) {
      limpo[chave] = sanitizarParaFirestore(valor);
    } else {
      limpo[chave] = valor;
    }
  }
  return limpo;
};

// Normaliza slug/nome de unidade para comparação tolerante a acentos, espaços e hífens
export const normalizarAlfaUnidade = (valor?: string | null): string => {
  if (!valor) return '';
  return String(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

export const unidadesSaoEquivalentes = (a?: string | null, b?: string | null): boolean => {
  const alfaA = normalizarAlfaUnidade(a);
  const alfaB = normalizarAlfaUnidade(b);
  if (!alfaA || !alfaB) return false;
  if (alfaA === alfaB) return true;
  if (alfaA.includes(alfaB) || alfaB.includes(alfaA)) {
    const stopwords = new Set(['lavajato', 'lava', 'jato', 'posto', 'car', 'wash', 'auto', 'express']);
    if (!stopwords.has(alfaA) && !stopwords.has(alfaB)) return true;
  }
  const isPitA = alfaA.includes('pitstop');
  const isPitB = alfaB.includes('pitstop');
  return isPitA && isPitB;
};

