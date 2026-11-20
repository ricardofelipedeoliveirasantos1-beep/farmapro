/**
 * Utilitários para formatação e higienização de documentos brasileiros.
 */

export function formatarCpf(documento: string | undefined | null): string {
  if (!documento) return '-';
  const digitos = documento.replace(/\D/g, '');
  if (digitos.length !== 11) return documento;
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatarCnpj(documento: string | undefined | null): string {
  if (!documento) return '-';
  const digitos = documento.replace(/\D/g, '');
  if (digitos.length !== 14) return documento;
  return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatarTelefone(telefone: string | undefined | null): string {
  if (!telefone) return '-';
  const digitos = telefone.replace(/\D/g, '');
  if (digitos.length === 11) {
    return digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digitos.length === 10) {
    return digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return telefone;
}

export function validarCpf(cpf: string | undefined | null): boolean {
  if (!cpf) return false;
  const digitos = cpf.replace(/\D/g, '');
  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(digitos.charAt(i), 10) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  const digito1 = resto >= 10 ? 0 : resto;
  if (digito1 !== parseInt(digitos.charAt(9), 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(digitos.charAt(i), 10) * (11 - i);
  }
  resto = 11 - (soma % 11);
  const digito2 = resto >= 10 ? 0 : resto;
  return digito2 === parseInt(digitos.charAt(10), 10);
}
