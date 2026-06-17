import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';
import { EncryptionService } from '../services/encryption.service';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export class AuthController {
  // Register with phone
  static async register(req: AuthRequest, res: Response) {
    try {
      const { phone, name, publicKey } = req.body;

      // Check if user exists
      const existing = await query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Telefone já cadastrado' });
      }

      // Generate encryption keys
      const keys = EncryptionService.generateKeyPair();

      // Create user
      const result = await query(
        `INSERT INTO users (phone, name, public_key, private_key_encrypted, expires_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '24 hours')
         RETURNING id, phone, name, created_at`,
        [phone, name, publicKey || keys.publicKey, keys.privateKey]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, phone: user.phone },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      // Generate refresh token
      const refreshToken = uuidv4();
      await query(
        `INSERT INTO devices (user_id, device_token, expires_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
        [user.id, refreshToken]
      );

      res.status(201).json({
        user,
        token,
        refreshToken,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
  }

  // Login
  static async login(req: AuthRequest, res: Response) {
    try {
      const { phone, password } = req.body;

      const result = await query(
        'SELECT * FROM users WHERE phone = $1',
        [phone]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const user = result.rows[0];

      // Verify password if exists (OTP users don't have password)
      if (user.password_hash) {
        const valid = await EncryptionService.comparePassword(password, user.password_hash);
        if (!valid) {
          return res.status(401).json({ error: 'Credenciais inválidas' });
        }
      }

      // Generate tokens
      const token = jwt.sign(
        { userId: user.id, phone: user.phone },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      const refreshToken = uuidv4();
      await query(
        `INSERT INTO devices (user_id, device_token, expires_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
        [user.id, refreshToken]
      );

      res.json({
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          avatar_url: user.avatar_url,
          status: user.status,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }

  // Refresh token
  static async refreshToken(req: AuthRequest, res: Response) {
    try {
      const { refreshToken } = req.body;

      const result = await query(
        'SELECT user_id FROM devices WHERE device_token = $1 AND expires_at > NOW()',
        [refreshToken]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
      }

      const userId = result.rows[0].user_id;

      // Get user data
      const userResult = await query(
        'SELECT id, phone, name FROM users WHERE id = $1',
        [userId]
      );

      const user = userResult.rows[0];

      const newToken = jwt.sign(
        { userId: user.id, phone: user.phone },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.json({ token: newToken });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao renovar token' });
    }
  }

  // Get profile
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const result = await query(
        `SELECT id, phone, username, name, avatar_url, status, public_key, is_online, last_seen
         FROM users 
         WHERE id = $1`,
        [req.user!.id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  }

  // Update profile
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, avatarUrl, status } = req.body;

      const result = await query(
        `UPDATE users 
         SET name = COALESCE($1, name),
             avatar_url = COALESCE($2, avatar_url),
             status = COALESCE($3, status),
             updated_at = CURRENT_TIMESTAMP,
             expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
         WHERE id = $4
         RETURNING id, phone, name, avatar_url, status`,
        [name, avatarUrl, status, req.user!.id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  }
}
