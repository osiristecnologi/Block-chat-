import 'package:cryptography/cryptography.dart';
import 'dart:convert';

/// Serviço de Criptografia Ponta a Ponta (E2EE)
/// O servidor NUNCA tem acesso às chaves privadas.
class EncryptionService {
  static final AES _aes = AES256GCM();

  // Gera um par de chaves para o usuário (Curve25519 via cryptography)
  static Future<KeyPair> generateKeyPair() async {
    final algorithm = X25519();
    return await algorithm.newKeyPair();
  }

  // Criptografa a mensagem antes de enviar ao servidor
  static Future<EncryptedMessage> encryptMessage(
    String plainText, 
    List<int> secretKey
  ) async {
    final secretBox = await _aes.encrypt(
      utf8.encode(plainText),
      secretKey: SecretKey(secretKey),
    );

    return EncryptedMessage(
      encrypted: base64Encode(secretBox.cipherText),
      nonce: base64Encode(secretBox.nonce),
      mac: base64Encode(secretBox.mac.bytes),
    );
  }

  // Descriptografa a mensagem recebida (apenas no dispositivo local)
  static Future<String> decryptMessage(
    EncryptedMessage encryptedMsg, 
    List<int> secretKey
  ) async {
    final secretBox = SecretBox(
      base64Decode(encryptedMsg.encrypted),
      nonce: base64Decode(encryptedMsg.nonce),
      mac: Mac(base64Decode(encryptedMsg.mac)),
    );

    final decrypted = await _aes.decrypt(
      secretBox,
      secretKey: SecretKey(secretKey),
    );

    return utf8.decode(decrypted);
  }
}

class EncryptedMessage {
  final String encrypted;
  final String nonce;
  final String mac;

  EncryptedMessage({
    required this.encrypted,
    required this.nonce,
    required this.mac,
  });

  Map<String, dynamic> toJson() => {
    'encrypted': encrypted,
    'nonce': nonce,
    'mac': mac,
  };
}
