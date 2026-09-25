import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import { config } from './config.js';
import { RoomManager } from './room/RoomManager.js';
import type { IO } from './room/types.js';
import { registerHandlers } from './socket/registerHandlers.js';
import { log } from './utils/logger.js';
import { WORD_PAIRS } from './game/wordBank.js';

const app = express();
app.disable('x-powered-by');

const httpServer = createServer(app);
const io: IO = new Server(httpServer, {
  cors: { origin: config.clientOrigins.includes('*') ? true : config.clientOrigins },
  // Stroke batches are tiny; this caps abusive payloads well before zod runs.
  maxHttpBufferSize: 256 * 1024,
  pingInterval: 10_000,
  pingTimeout: 8_000,
});

const manager = new RoomManager(io);
manager.startCleanup();

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: manager.size, uptimeSec: Math.round(process.uptime()) });
});

const clientDir = config.serveClientDir ? path.resolve(config.serveClientDir) : '';
if (clientDir && existsSync(path.join(clientDir, 'index.html'))) {
  app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
  log.info('serving client build', { clientDir });
} else {
  app.get('/', (_req, res) => {
    res.type('text/plain').send('Bluff Sketch server is running. Open the client app to play.');
  });
}

io.on('connection', (socket) => registerHandlers(socket, manager));

httpServer.listen(config.port, config.host, () => {
  log.info(`Bluff Sketch server listening on http://${config.host}:${config.port}`, {
    wordPairs: WORD_PAIRS.length,
    origins: config.clientOrigins,
  });
});

function shutdown(signal: string): void {
  log.info(`received ${signal}, shutting down`);
  manager.stopCleanup();
  io.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
