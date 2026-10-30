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
