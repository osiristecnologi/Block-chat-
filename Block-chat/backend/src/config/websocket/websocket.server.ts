import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { redisClient } from '../config/redis';

export class WebSocketServer {
  private io: SocketIOServer;
  private onlineUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEvents();
  }

  private setupMiddleware() {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.data.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupEvents() {
    this.io.on('connection', async (socket: Socket) => {
      const userId = socket.data.userId;
      console.log(`User connected: ${userId}`);

      // Store online user
      this.onlineUsers.set(userId, socket.id);
      await this.updateUserStatus(userId, true);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Handle new message
      socket.on('message:send', async (data: { chatId: string; content: string; type: string }) => {
        await this.handleMessage(socket, userId, data);
      });

      // Handle typing indicator
      socket.on('typing:start', (data: { chatId: string }) => {
        socket.to(`chat:${data.chatId}`).emit('typing:update', {
          userId,
          isTyping: true,
        });
      });

      socket.on('typing:stop', (data: { chatId: string }) => {
        socket.to(`chat:${data.chatId}`).emit('typing:update', {
          userId,
          isTyping: false,
        });
      });

      // Handle call signaling
      socket.on('call:offer', (data) => {
        socket.to(`user:${data.receiverId}`).emit('call:incoming', {
          callerId: userId,
          offer: data.offer,
          chatId: data.chatId,
        });
      });

      socket.on('call:answer', (data) => {
        socket.to(`user:${data.callerId}`).emit('call:answered', {
          answer: data.answer,
        });
      });

      socket.on('call:ice-candidate', (data) => {
        socket.to(`user:${data.targetId}`).emit('call:ice-candidate', {
          candidate: data.candidate,
        });
      });

      // Handle location sharing
      socket.on('location:update', async (data: { chatId: string; latitude: number; longitude: number }) => {
        await this.handleLocationUpdate(socket, userId, data);
      });

      // Disconnect
      socket.on('disconnect', async () => {
        console.log(`User disconnected: ${userId}`);
        this.onlineUsers.delete(userId);
        await this.updateUserStatus(userId, false);
      });
    });
  }

  private async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    await query(
      `UPDATE users 
       SET is_online = $1, last_seen = $2, expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
       WHERE id = $3`,
      [isOnline, new Date(), userId]
    );

    // Broadcast status change
    this.io.emit('user:status', { userId, isOnline });
  }

  private async handleMessage(socket: Socket, userId: string, data: any): Promise<void> {
    try {
      // Save message to database (encrypted)
      const result = await query(
        `INSERT INTO messages (chat_id, sender_id, content_encrypted, message_type, expires_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '24 hours')
         RETURNING *`,
        [data.chatId, userId, data.content, data.type || 'text']
      );

      const message = result.rows[0];

      // Create message status
      await query(
        `INSERT INTO message_status (message_id, user_id, status, expires_at)
         VALUES ($1, $2, 'sent', CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
        [message.id, userId]
      );

      // Emit to chat room
      socket.to(`chat:${data.chatId}`).emit('message:new', {
        ...message,
        status: 'sent',
      });

      // Send to Redis for caching (24h expiry)
      await redisClient.setWithExpiry(
        `message:${message.id}`,
        JSON.stringify(message),
        86400
      );

      // Acknowledge to sender
      socket.emit('message:ack', { messageId: message.id, status: 'sent' });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleLocationUpdate(socket: Socket, userId: string, data: any): Promise<void> {
    try {
      // Save location
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await query(
        `INSERT INTO locations (user_id, chat_id, latitude, longitude, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, chat_id) 
         DO UPDATE SET latitude = $3, longitude = $4, expires_at = $5`,
        [userId, data.chatId, data.latitude, data.longitude, expiresAt]
      );

      // Broadcast to chat room
      socket.to(`chat:${data.chatId}`).emit('location:shared', {
        userId,
        latitude: data.latitude,
        longitude: data.longitude,
        expiresAt,
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  // Public method to emit to specific user
  public emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Public method to emit to chat room
  public emitToChat(chatId: string, event: string, data: any): void {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }

  // Check if user is online
  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
