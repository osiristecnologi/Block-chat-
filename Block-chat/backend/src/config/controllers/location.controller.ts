import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

export class LocationController {
  // Share location
  static async shareLocation(req: AuthRequest, res: Response) {
    try {
      const { chatId, latitude, longitude, duration = 24 } = req.body;

      // Verify user is participant
      const participant = await query(
        'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
        [chatId, req.user!.id]
      );

      if (participant.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Calculate expiration (max 24 hours)
      const expiresAt = new Date(Date.now() + Math.min(duration, 24) * 60 * 60 * 1000);

      const result = await query(
        `INSERT INTO locations (user_id, chat_id, latitude, longitude, expires_at, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (user_id, chat_id) 
         DO UPDATE SET 
           latitude = $3, 
           longitude = $4, 
           expires_at = $5,
           is_active = true
         RETURNING *`,
        [req.user!.id, chatId, latitude, longitude, expiresAt]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error sharing location:', error);
      res.status(500).json({ error: 'Erro ao compartilhar localização' });
    }
  }

  // Stop sharing location
  static async stopSharing(req: AuthRequest, res: Response) {
    try {
      const { chatId } = req.params;

      await query(
        `UPDATE locations 
         SET is_active = false, expires_at = NOW()
         WHERE user_id = $1 AND chat_id = $2`,
        [req.user!.id, chatId]
      );

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao parar compartilhamento' });
    }
  }

  // Get active locations in chat
  static async getActiveLocations(req: AuthRequest, res: Response) {
    try {
      const { chatId } = req.params;

      const result = await query(
        `SELECT l.*, u.name, u.avatar_url
         FROM locations l
         JOIN users u ON l.user_id = u.id
         WHERE l.chat_id = $1 
           AND l.is_active = true 
           AND l.expires_at > NOW()
         ORDER BY l.created_at DESC`,
        [chatId]
      );

      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar localizações' });
    }
  }
}
