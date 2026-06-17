import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { pool } from './config/database';
import { redisClient } from './config/redis';
import routes from './routes';
import { WebSocketServer } from './websocket/websocket.server';
import { query } from './config/database';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redisClient.connect();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'error', error: error });
  }
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize WebSocket
const wsServer = new WebSocketServer(httpServer);

// Start server
async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();

    // Initialize database
    await initializeDatabase();

    // Start listening
    httpServer.listen(PORT, () => {
      console.log(`🚀 Block Chat Server running on port ${PORT}`);
      console.log(`🔒 Privacidade em cada bloco`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function initializeDatabase() {
  try {
    // Run migrations
    const schema = require('fs').readFileSync(
      path.join(__dirname, 'database/schema.sql'),
      'utf8'
    );
    await pool.query(schema);
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

startServer();

export { app, httpServer, wsServer };
