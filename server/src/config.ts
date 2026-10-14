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
  /** Behind a reverse proxy (Render): read the client IP from X-Forwarded-For. */
  trustProxy: process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1',
  bugReports: {
    /** "owner/repo" to file reports as GitHub issues (a private repo is best: players may leave contact details). */
    githubRepo: process.env.BUG_REPORT_GITHUB_REPO?.trim() || undefined,
    /** Fine-grained token with Issues: read and write on that repo only. */
    githubToken: process.env.BUG_REPORT_GITHUB_TOKEN?.trim() || undefined,
    /** Discord channel webhook URL. */
    discordWebhook: process.env.BUG_REPORT_DISCORD_WEBHOOK?.trim() || undefined,
  },
};
