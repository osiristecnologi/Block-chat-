import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { pool } from './config/database';
import { redisClient } from './config/redis';
import routes from './routes';
import { WebSocketServer } from './websocket/websocket.server';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Cria pasta uploads se não existir
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api', routes);

// Health check - sem reconectar Redis
app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    await redisClient.ping();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error: any) {
    res.status(503).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize WebSocket
const wsServer = new WebSocketServer(httpServer);

// Start server
async function startServer() {
  try {
    // Connect to Redis - só 1x
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('✅ Redis connected');
    }

    // Testa conexão com DB
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');

    // Start listening - 0.0.0.0 obrigatório no Render
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Block Chat Server running on port ${PORT}`);
      console.log(`🔒 Privacidade em cada bloco`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await redisClient.quit();
  await pool.end();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await redisClient.quit();
  await pool.end();
  process.exit(0);
});

startServer();

export { app, httpServer, wsServer };
