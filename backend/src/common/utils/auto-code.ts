const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function nowBase36(): string {
  return Date.now().toString(36).toUpperCase();
}

function randomBase36(length: number): string {
  return Math.random()
    .toString(36)
    .slice(2)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, length);
}

function clamp(value: string, maxLength: number): string {
  return value.slice(0, Math.max(1, maxLength));
}

export function generateAutoCode(prefix = 'AUTO', maxLength = 40): string {
  const normalizedPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '') || 'AUTO';
  const value = `${normalizedPrefix}_${nowBase36()}${randomBase36(4)}`;
  return clamp(value, maxLength);
}

export function generateCurrencyCode(): string {
  const seed = nowBase36();
  const pick = (index: number) => {
    const charCode = seed.charCodeAt(index % seed.length);
    return ALPHABET[charCode % ALPHABET.length];
  };

  return `${pick(0)}${pick(1)}${pick(2)}`;
}
