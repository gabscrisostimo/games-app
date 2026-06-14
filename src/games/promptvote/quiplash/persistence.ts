import type { SessionState } from './types';

const KEY = 'games-app:quiplash:current';

export function saveSession(state: SessionState): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignora */ }
}

export function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch { return null; }
}

export function clearSession(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignora */ }
}
