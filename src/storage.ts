// localStorage kan kasta i privat läge eller när webbplatsdata är blockerad.
// Då ska appen fungera ändå, den minns bara inte. Det är väntat och rapporteras inte till Sentry.

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Se ovan.
    return null;
  }
}

export function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Se ovan.
  }
}
