import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';
import { redisClient } from '../config/redis';

export class MessageController {
  // Get messages for a chat
  static async getMessages(req: AuthRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const { limit = 50, before } = req.query;

      // Verify user is participant of the chat
      const participant = await query(
        'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
        [chatId, req.user!.id]
      );

      if (participant.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Try cache first
      const cached = await redisClient.get(`chat:${chatId}:messages`);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      let queryText = `
        SELECT m.*, 
               u.name as sender_name,
               u.avatar_url as sender_avatar,
               ms.status as read_status
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        LEFT JOIN message_status ms ON m.id = ms.message_id AND ms.user_id = $2
        WHERE m.chat_id = $1
      `;

      const params: any[] = [chatId, req.user!.id];

      if (before) {
        queryText += ' AND m.created_at < $3';
        params.push(before);
      }

      queryText += ' ORDER BY m.created_at DESC LIMIT $' + (params.length + 1);
      params.push(limit);

      const result = await query(queryText, params);

      // Cache for 1 hour (shorter than 24h for freshness)
      await redisClient.setWithExpiry(
        `chat:${chatId}:messages`,
        JSON.stringify(result.rows),
        3600
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
  }

  // Delete message
  static async deleteMessage(req: AuthRequest, res: Response) {
    try {
      const { messageId } = req.params;

      const result = await query(
        `UPDATE messages 
         SET is_deleted = true, 
             content_encrypted = '[Mensagem apagada]',
             expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
         WHERE id = $1 AND sender_id = $2
         RETURNING *`,
        [messageId, req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Mensagem não encontrada' });
      }

      // Delete from cache
      await redisClient.del(`message:${messageId}`);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao apagar mensagem' });
    }
  }

  // Mark message as read
  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { messageIds } = req.body;

      await query(
        `UPDATE message_status 
         SET status = 'read', 
             read_at = CURRENT_TIMESTAMP,
             expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
         WHERE message_id = ANY($1) AND user_id = $2`,
        [messageIds, req.user!.id]
      );

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao marcar como lido' });
    }
  }
}
