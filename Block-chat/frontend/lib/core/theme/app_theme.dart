import 'package:flutter/material.dart';

class AppColors {
  // Baseado no Logo do Block Chat
  static const Color primaryGreen = Color(0xFF00A884); // Verde WhatsApp/Logo
  static const Color darkGreen = Color(0xFF075E54);
  static const Color lightGreen = Color(0xFF25D366);
  
  // Dark Mode (Padrão)
  static const Color darkBackground = Color(0xFF111B21);
  static const Color darkSurface = Color(0xFF202C33);
  static const Color darkChatBg = Color(0xFF0B141A);
  static const Color darkText = Color(0xFFE9EDEF);
  static const Color darkTextSecondary = Color(0xFF8696A0);
  
  // Light Mode
  static const Color lightBackground = Color(0xFFFFFFFF);
  static const Color lightSurface = Color(0xFFF0F2F5);
  static const Color lightChatBg = Color(0xFFEFEAE2);
  static const Color lightText = Color(0xFF111B21);
  static const Color lightTextSecondary = Color(0xFF667781);
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: AppColors.primaryGreen,
      scaffoldBackgroundColor: AppColors.darkBackground,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primaryGreen,
        secondary: AppColors.lightGreen,
        surface: AppColors.darkSurface,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.darkSurface,
        elevation: 0,
        titleTextStyle: TextStyle(
          color: AppColors.darkText,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
        iconTheme: IconThemeData(color: AppColors.darkTextSecondary),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.darkSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        hintStyle: const TextStyle(color: AppColors.darkTextSecondary),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppColors.primaryGreen,
        foregroundColor: Colors.white,
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: AppColors.primaryGreen,
      scaffoldBackgroundColor: AppColors.lightBackground,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primaryGreen,
        secondary: AppColors.darkGreen,
        surface: AppColors.lightSurface,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.lightSurface,
        elevation: 0,
        titleTextStyle: TextStyle(
          color: AppColors.lightText,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
