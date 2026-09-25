import 'dotenv/config';

function list(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  /** Comma-separated list of allowed browser origins, or "*" for any. */
  clientOrigins: list(process.env.CLIENT_ORIGIN, ['*']),
  /** Optional path to a built client (client/dist) for single-container deploys. */
  serveClientDir: process.env.SERVE_CLIENT_DIR ?? '',
  logLevel: (process.env.LOG_LEVEL ?? 'info') as 'debug' | 'info' | 'warn' | 'error',
};
