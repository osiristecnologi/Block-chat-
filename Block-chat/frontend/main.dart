import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'features/chat/chat_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar serviços (DB, SecureStorage, etc)
  // await LocalDbService().database;
  
  runApp(
    const ProviderScope(
      child: BlockChatApp(),
    ),
  );
}

class BlockChatApp extends StatelessWidget {
  const BlockChatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Block Chat',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark, // Padrão escuro como o logo
      home: const SplashScreen(),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigateToHome();
  }

  Future<void> _navigateToHome() async {
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    
    // Verificar se está logado e navegar para a tela correta
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => const ChatScreen(
          chatId: 'demo-chat-123',
          contactName: 'João Silva',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Aqui entraria a imagem do logo do Block Chat
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: AppColors.darkSurface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.primaryGreen, width: 3),
              ),
              child: const Icon(Icons.lock_outline, color: AppColors.primaryGreen, size: 60),
            ),
            const SizedBox(height: 24),
            const Text(
              'BLOCK CHAT',
              style: TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Privacidade em cada bloco.',
              style: TextStyle(
                color: AppColors.darkTextSecondary,
                fontSize: 14,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
