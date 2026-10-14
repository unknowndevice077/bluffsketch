import type { BugReportContext, BugReportInput } from '@bluffsketch/shared';
import { useGame } from '../store/gameStore';
import { recentErrors } from './errorLog';

const SERVER_URL = (import.meta.env.VITE_SERVER_URL?.trim() ?? '').replace(/\/+$/, '');

/** Everything sent along with the player's own words. The form shows this before sending. */
export function collectContext(): BugReportContext {
  const room = useGame.getState().room;
  return {
    path: window.location.pathname,
    userAgent: navigator.userAgent.slice(0, 400),
    viewport: `${window.innerWidth}x${window.innerHeight}@${Math.round(window.devicePixelRatio * 100) / 100}`,
    language: navigator.language,
    roomCode: room?.code,
    phase: room?.phase,
    players: room?.players.length,
    errors: recentErrors(),
  };
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendBugReport(report: BugReportInput): Promise<SendResult> {
  try {
    const res = await fetch(`${SERVER_URL}/api/bug-report`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };
    if (res.ok && data.ok && data.id) return { ok: true, id: data.id };
    return { ok: false, error: data.error ?? `The server answered ${res.status}. Please try again.` };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again." };
  }
}
