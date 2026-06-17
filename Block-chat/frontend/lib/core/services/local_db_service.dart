import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

/// Armazenamento local (SQLite) para cache de mensagens e mídia.
/// Expira dados locais após 24 horas para economizar memória.
class LocalDbService {
  static Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDatabase();
    return _db!;
  }

  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), 'blockchat.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content_encrypted TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        status TEXT DEFAULT 'sending',
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE locations (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        expires_at INTEGER NOT NULL
      )
    ''');
  }

  // Salvar mensagem localmente
  Future<void> saveMessage(Map<String, dynamic> message) async {
    final db = await database;
    await db.insert(
      'messages',
      message,
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  // Buscar mensagens de um chat (limpando expiradas)
  Future<List<Map<String, dynamic>>> getMessages(String chatId) async {
    final db = await database;
    final now = DateTime.now().millisecondsSinceEpoch;
    
    // Deleta mensagens expiradas (> 24h)
    await db.delete('messages', where: 'expires_at < ?', whereArgs: [now]);

    return await db.query(
      'messages',
      where: 'chat_id = ?',
      whereArgs: [chatId],
      orderBy: 'created_at ASC',
    );
  }

  // Atualizar status da mensagem (ticks)
  Future<void> updateMessageStatus(String messageId, String status) async {
    final db = await database;
    await db.update(
      'messages',
      {'status': status},
      where: 'id = ?',
      whereArgs: [messageId],
    );
  }
}
