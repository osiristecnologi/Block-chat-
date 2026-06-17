import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String chatId;
  final String contactName;
  final String? contactAvatar;

  const ChatScreen({
    super.key,
    required this.chatId,
    required this.contactName,
    this.contactAvatar,
  });

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _setupSocketListeners();
  }

  void _loadMessages() {
    // Carregar do SQLite local
    // _localDb.getMessages(widget.chatId).then((msgs) { ... });
  }

  void _setupSocketListeners() {
    // SocketService.onMessageReceived((data) {
    //   setState(() { _messages.add(data); });
    //   _scrollToBottom();
    // });
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;

    final message = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'chatId': widget.chatId,
      'content': _messageController.text, // Aqui passaria o texto criptografado
      'type': 'text',
      'status': 'sending', // ⏳
      'isMe': true,
      'createdAt': DateTime.now(),
    };

    setState(() {
      _messages.add(message);
      _messageController.clear();
    });

    // SocketService.sendMessage(widget.chatId, encryptedText, 'text');
    _scrollToBottom();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            CircleAvatar(
              backgroundImage: widget.contactAvatar != null 
                ? NetworkImage(widget.contactAvatar!) 
                : null,
              child: widget.contactAvatar == null 
                ? Text(widget.contactName[0]) 
                : null,
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.contactName, style: const TextStyle(fontSize: 16)),
                const Text('online', style: TextStyle(fontSize: 12, color: AppColors.primaryGreen)),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.videocam), onPressed: () {}),
          IconButton(icon: const Icon(Icons.call), onPressed: () {}),
          IconButton(icon: const Icon(Icons.more_vert), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Container(
              color: AppColors.darkChatBg,
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  return _buildMessageBubble(msg);
                },
              ),
            ),
          ),
          _buildMessageInput(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> msg) {
    final isMe = msg['isMe'] as bool;
    final time = DateFormat('HH:mm').format(msg['createdAt'] as DateTime);
    final status = msg['status'] as String;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isMe ? const Color(0xFF005C4B) : AppColors.darkSurface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(12),
            topRight: const Radius.circular(12),
            bottomLeft: Radius.circular(isMe ? 12 : 0),
            bottomRight: Radius.circular(isMe ? 0 : 12),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              msg['content'] as String,
              style: const TextStyle(color: Colors.white, fontSize: 15),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(time, style: const TextStyle(color: Colors.white70, fontSize: 11)),
                if (isMe) ...[
                  const SizedBox(width: 4),
                  _buildStatusIcon(status),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusIcon(String status) {
    switch (status) {
      case 'sending':
        return const Icon(Icons.access_time, size: 14, color: Colors.white70); // ⏳
      case 'sent':
        return const Icon(Icons.check, size: 14, color: Colors.white70); // ✓
      case 'delivered':
        return const Icon(Icons.done_all, size: 14, color: Colors.white70); // ✓✓
      case 'read':
        return const Icon(Icons.done_all, size: 14, color: Color(0xFF53BDEB)); // ✓✓ Azul
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildMessageInput() {
    return Container(
      color: AppColors.darkSurface,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.emoji_emotions_outlined, color: AppColors.darkTextSecondary),
            onPressed: () {},
          ),
          Expanded(
            child: TextField(
              controller: _messageController,
              style: const TextStyle(color: AppColors.darkText),
              decoration: const InputDecoration(
                hintText: 'Mensagem',
                border: InputBorder.none,
                hintStyle: TextStyle(color: AppColors.darkTextSecondary),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.attach_file, color: AppColors.darkTextSecondary),
            onPressed: () => _showAttachmentOptions(),
          ),
          Container(
            decoration: const BoxDecoration(
              color: AppColors.primaryGreen,
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.send, color: Colors.white, size: 20),
              onPressed: _sendMessage,
            ),
          ),
        ],
      ),
    );
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.darkSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildAttachmentOption(Icons.image, 'Foto', AppColors.lightGreen),
              _buildAttachmentOption(Icons.audio_file, 'Áudio', Colors.purple),
              _buildAttachmentOption(Icons.location_on, 'Localização', Colors.red),
              _buildAttachmentOption(Icons.person, 'Contato', Colors.blue),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAttachmentOption(IconData icon, String label, Color color) {
    return GestureDetector(
      onTap: () {
        Navigator.pop(context);
        if (label == 'Localização') {
          // Navegar para tela de compartilhamento de localização
        }
      },
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: color,
            child: Icon(icon, color: Colors.white, size: 28),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: AppColors.darkText, fontSize: 12)),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}
