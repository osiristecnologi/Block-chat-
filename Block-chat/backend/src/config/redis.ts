import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export class RedisClient {
  private client: RedisClientType;
  private static instance: RedisClient;

  private constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        tls: isProduction && process.env.REDIS_URL?.startsWith('rediss://'),
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis: Muitas tentativas de reconexão');
            return new Error('Redis retry exhausted');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.client.on('error', (err) => console.error('❌ Redis Error:', err.message));
    this.client.on('connect', () => console.log('✅ Redis conectado'));
    this.client.on('ready', () => console.log('✅ Redis pronto'));
    this.client.on('reconnecting', () => console.log('🔄 Redis reconectando...'));
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  public async quit(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  public async ping(): Promise<string> {
    return this.client.ping();
  }

  // Expiração padrão: 24 horas (86400 segundos)
  public async setWithExpiry(key: string, value: string, expirySeconds: number = 86400): Promise<void> {
    await this.client.setEx(key, expirySeconds, value);
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async del(key: string): Promise<number> {
    return this.client.del(key);
  }
}

export const redisClient = RedisClient.getInstance();
