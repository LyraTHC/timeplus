
export function validateCPF(cpf: string): boolean {
  if (typeof cpf !== 'string') return false;
  cpf = cpf.replace(/[^\d]+/g, '');

  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

  const cpfDigits = cpf.split('').map(el => +el);

  const calculateVerifier = (digits: number[]): number => {
    const sum = digits.reduce(
      (acc, digit, index) => acc + digit * (digits.length + 1 - index),
      0
    );
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const verifier1 = calculateVerifier(cpfDigits.slice(0, 9));
  if (verifier1 !== cpfDigits[9]) return false;

  const verifier2 = calculateVerifier(cpfDigits.slice(0, 10));
  if (verifier2 !== cpfDigits[10]) return false;

  return true;
}

    