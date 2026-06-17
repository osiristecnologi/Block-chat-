import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SocketService {
  static IO.Socket? _socket;
  static final _storage = const FlutterSecureStorage();

  static Future<void> connect() async {
    final token = await _storage.read(key: 'auth_token');
    
    _socket = IO.io('http://localhost:3000', IO.OptionBuilder()
      .setTransports(['websocket'])
      .setAuth({'token': token})
      .build());

    _socket?.onConnect((_) {
      print('✅ Socket conectado');
    });

    _socket?.onDisconnect((_) {
      print(' Socket desconectado');
    });
  }

  static void sendMessage(String chatId, String encryptedContent, String type) {
    _socket?.emit('message:send', {
      'chatId': chatId,
      'content': encryptedContent,
      'type': type,
    });
  }

  static void sendLocationUpdate(String chatId, double lat, double lng) {
    _socket?.emit('location:update', {
      'chatId': chatId,
      'latitude': lat,
      'longitude': lng,
    });
  }

  static void onMessageReceived(Function(dynamic) callback) {
    _socket?.on('message:new', callback);
  }

  static void onLocationShared(Function(dynamic) callback) {
    _socket?.on('location:shared', callback);
  }

  static void disconnect() {
    _socket?.disconnect();
  }
}
