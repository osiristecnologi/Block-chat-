import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { query } from '../config/database';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp3|mp4|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  },
});

export class FileService {
  // Compress image
  static async compressImage(inputPath: string, outputPath: string): Promise<void> {
    await sharp(inputPath)
      .resize({ width: 1920, height: 1920, fit: 'inside' })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
  }

  // Delete file after 24 hours
  static async scheduleFileDeletion(filePath: string, messageId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await query(
      `UPDATE messages 
       SET file_expires_at = $1, expires_at = $1 
       WHERE id = $2`,
      [expiresAt, messageId]
    );

    // Schedule physical deletion
    setTimeout(async () => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`File deleted: ${filePath}`);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  // Get file URL (temporary, expires in 24h)
  static getFileUrl(filename: string): string {
    return `${process.env.API_URL || 'http://localhost:3000'}/uploads/${filename}`;
  }
}
