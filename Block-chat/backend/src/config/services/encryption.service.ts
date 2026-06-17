import CryptoJS from 'crypto-js';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

export class EncryptionService {
  // AES-256 encryption for message content
  static encryptMessage(message: string, key: string): string {
    const encrypted = CryptoJS.AES.encrypt(message, key);
    return encrypted.toString();
  }

  static decryptMessage(encryptedMessage: string, key: string): string {
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key);
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  // Curve25519 for key exchange (ECDH)
  static generateKeyPair() {
    const keyPair = nacl.box.keyPair();
    return {
      publicKey: naclUtil.encodeBase64(keyPair.publicKey),
      privateKey: naclUtil.encodeBase64(keyPair.secretKey),
    };
  }

  static deriveSharedKey(privateKey: string, publicKey: string): string {
    const privKey = naclUtil.decodeBase64(privateKey);
    const pubKey = naclUtil.decodeBase64(publicKey);
    
    const sharedKey = nacl.box.before(pubKey, privKey);
    return naclUtil.encodeBase64(sharedKey);
  }

  // Hash password with bcrypt
  static hashPassword(password: string): Promise<string> {
    return require('bcrypt').hash(password, 12);
  }

  static comparePassword(password: string, hash: string): Promise<boolean> {
    return require('bcrypt').compare(password, hash);
  }
}
