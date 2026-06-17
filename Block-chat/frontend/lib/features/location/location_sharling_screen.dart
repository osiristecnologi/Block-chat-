import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/theme/app_theme.dart';

class LocationSharingScreen extends StatefulWidget {
  final String chatId;
  final String contactName;

  const LocationSharingScreen({
    super.key,
    required this.chatId,
    required this.contactName,
  });

  @override
  State<LocationSharingScreen> createState() => _LocationSharingScreenState();
}

class _LocationSharingScreenState extends State<LocationSharingScreen> {
  final MapController _mapController = MapController();
  LatLng _currentPosition = const LatLng(-23.5505, -46.6333); // São Paulo (default)
  Duration _sharingDuration = const Duration(hours: 1);
  bool _isSharing = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Localização em Tempo Real'),
        actions: [
          if (_isSharing)
            TextButton(
              onPressed: _stopSharing,
              child: const Text('Parar', style: TextStyle(color: Colors.red)),
            ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _currentPosition,
              initialZoom: 15.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c'],
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _currentPosition,
                    width: 80,
                    height: 80,
                    child: const Icon(Icons.my_location, color: AppColors.primaryGreen, size: 40),
                  ),
                ],
              ),
            ],
          ),
          
          // Painel inferior de controle
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.darkSurface,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.5),
                    blurRadius: 10,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Compartilhar com ${widget.contactName}',
                    style: const TextStyle(color: AppColors.darkText, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  
                  if (!_isSharing) ...[
                    const Text('Duração:', style: TextStyle(color: AppColors.darkTextSecondary)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildDurationChip('15 min', const Duration(minutes: 15)),
                        const SizedBox(width: 8),
                        _buildDurationChip('1 hora', const Duration(hours: 1)),
                        const SizedBox(width: 8),
                        _buildDurationChip('8 horas', const Duration(hours: 8)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _startSharing,
                        icon: const Icon(Icons.location_on),
                        label: const Text('Compartilhar Localização'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryGreen,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.darkGreen.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.timer, color: AppColors.primaryGreen),
                          const SizedBox(width: 12),
                          Text(
                            'Tempo restante: ${_formatDuration(_sharingDuration)}',
                            style: const TextStyle(color: AppColors.darkText),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {},
                            icon: const Icon(Icons.map),
                            label: const Text('Abrir no Maps'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.primaryGreen,
                              side: const BorderSide(color: AppColors.primaryGreen),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {},
                            icon: const Icon(Icons.navigation),
                            label: const Text('Abrir no Waze'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.primaryGreen,
                              side: const BorderSide(color: AppColors.primaryGreen),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDurationChip(String label, Duration duration) {
    final isSelected = _sharingDuration == duration;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _sharingDuration = duration;
        });
      },
      selectedColor: AppColors.primaryGreen,
      labelStyle: TextStyle(color: isSelected ? Colors.white : AppColors.darkText),
    );
  }

  void _startSharing() {
    setState(() {
      _isSharing = true;
    });
    // SocketService.sendLocationUpdate(widget.chatId, _currentPosition.latitude, _currentPosition.longitude);
    // Iniciar timer para atualizar a cada X segundos
  }

  void _stopSharing() {
    setState(() {
      _isSharing = false;
    });
    // API call para parar o compartilhamento no backend
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padStart(2, '0');
    final hours = twoDigits(duration.inHours);
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    return '$hours:$minutes';
  }
}
