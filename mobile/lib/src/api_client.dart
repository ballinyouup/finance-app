import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

const defaultApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://moneysim.app/api',
);

class ApiException implements Exception {
  const ApiException({
    required this.status,
    required this.code,
    required this.message,
  });

  final int status;
  final String code;
  final String message;

  @override
  String toString() => message;
}

class TokenStore {
  static const _tokenKey = 'finance_access_token';

  Future<String?> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  Future<void> clearLegacyApiBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('finance_api_base_url');
  }
}

class ApiClient {
  ApiClient({required String baseUrl, http.Client? client})
    : _baseUrl = _normalizeBaseUrl(baseUrl),
      _client = client ?? http.Client();

  final http.Client _client;
  String _baseUrl;

  String get baseUrl => _baseUrl;

  set baseUrl(String value) {
    _baseUrl = _normalizeBaseUrl(value);
  }

  static String _normalizeBaseUrl(String value) =>
      value.trim().replaceAll(RegExp(r'/+$'), '');

  Future<JsonMap> _request(
    String path, {
    String method = 'GET',
    String? token,
    JsonMap? body,
  }) async {
    final uri = Uri.parse('$_baseUrl$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    http.Response response;
    try {
      response = await _client
          .send(
            http.Request(method, uri)
              ..headers.addAll(headers)
              ..body = body == null ? '' : jsonEncode(body),
          )
          .timeout(const Duration(seconds: 30))
          .then(http.Response.fromStream);
    } on TimeoutException {
      throw const ApiException(
        status: 0,
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out after 30 seconds.',
      );
    } catch (_) {
      throw const ApiException(
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Could not reach the API server.',
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map) {
      throw ApiException(
        status: response.statusCode,
        code: 'INVALID_RESPONSE',
        message: 'The API returned a response the app could not read.',
      );
    }

    final envelope = decoded.map(
      (key, value) => MapEntry(key.toString(), value),
    );
    final success = envelope['success'] == true;
    if (!response.statusCode.toString().startsWith('2') || !success) {
      final error = mapValue(envelope['error']);
      throw ApiException(
        status: response.statusCode,
        code: stringValue(error['code'], 'REQUEST_FAILED'),
        message: stringValue(error['message'], 'Request failed.'),
      );
    }

    return mapValue(envelope['data']);
  }

  Future<({String token, User user})> login(
    String email,
    String password,
  ) async {
    final data = await _request(
      '/auth/login',
      method: 'POST',
      body: {'email': email, 'password': password},
    );
    return (
      token: stringValue(data['token']),
      user: User.fromJson(mapValue(data['user'])),
    );
  }

  Future<User> signup(String name, String email, String password) async {
    final data = await _request(
      '/auth/signup',
      method: 'POST',
      body: {'name': name, 'email': email, 'password': password},
    );
    return User.fromJson(mapValue(data['user']));
  }

  Future<String> resendVerification(String email) async {
    final data = await _request(
      '/auth/resend-verification',
      method: 'POST',
      body: {'email': email},
    );
    return stringValue(data['message'], 'Verification email sent.');
  }

  Future<String> forgotPassword(String email) async {
    final data = await _request(
      '/auth/forgot-password',
      method: 'POST',
      body: {'email': email},
    );
    return stringValue(data['message'], 'Password reset email sent.');
  }

  Future<User> me(String token) async {
    final data = await _request('/auth/me', token: token);
    return User.fromJson(mapValue(data['user']));
  }

  Future<List<Job>> jobs(String token) async {
    final data = await _request('/jobs', token: token);
    return mapList(data['jobs']).map(Job.fromJson).toList();
  }

  Future<List<ExpenseOption>> expenseOptions(String token) async {
    final data = await _request('/expense-options', token: token);
    return mapList(data['options']).map(ExpenseOption.fromJson).toList();
  }

  Future<GameSession?> currentSession(String token) async {
    final data = await _request('/game/current', token: token);
    final session = data['session'];
    return session == null ? null : GameSession.fromJson(mapValue(session));
  }

  Future<GameSession> startSession(
    String token, {
    required String lifePath,
    required String jobId,
    required Map<String, String> expenseSelections,
    String? major,
  }) async {
    final body = <String, dynamic>{
      'lifePath': lifePath,
      'jobId': jobId,
      'expenseSelections': expenseSelections,
    };
    if (major != null) {
      body['major'] = major;
    }

    final data = await _request(
      '/game/start',
      method: 'POST',
      token: token,
      body: body,
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> applyForJob(String token, String jobId) async {
    final data = await _request(
      '/game/job-applications',
      method: 'POST',
      token: token,
      body: {'jobId': jobId},
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> changeExpense(
    String token, {
    required String category,
    required String optionId,
  }) async {
    final data = await _request(
      '/game/expenses',
      method: 'PUT',
      token: token,
      body: {'category': category, 'optionId': optionId},
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> enrollCollege(String token, String major) async {
    final data = await _request(
      '/game/enroll-college',
      method: 'POST',
      token: token,
      body: {'major': major},
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> advanceMonths(
    String token,
    int months,
    MonthlyChoices choices,
  ) async {
    final data = await _request(
      '/game/advance',
      method: 'POST',
      token: token,
      body: {'months': months, 'choices': choices.toJson()},
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> endRun(String token) async {
    final data = await _request('/game/end-run', method: 'POST', token: token);
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> payOffDebt(String token) async {
    final data = await _request(
      '/game/pay-off-debt',
      method: 'POST',
      token: token,
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> investStocks(String token, int amount) async {
    final data = await _request(
      '/game/stocks/invest',
      method: 'POST',
      token: token,
      body: {'amount': amount},
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> sellStocks(String token) async {
    final data = await _request(
      '/game/stocks/sell',
      method: 'POST',
      token: token,
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> buyHome(String token, String homeId) async {
    final data = await _request(
      '/game/home/buy',
      method: 'POST',
      token: token,
      body: {'homeId': homeId},
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> sellHome(String token) async {
    final data = await _request(
      '/game/home/sell',
      method: 'POST',
      token: token,
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> buyAsset(String token, String assetId) async {
    final data = await _request(
      '/game/assets/buy',
      method: 'POST',
      token: token,
      body: {'assetId': assetId},
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> sellAsset(String token, String holdingId) async {
    final data = await _request(
      '/game/assets/sell',
      method: 'POST',
      token: token,
      body: {'holdingId': holdingId},
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> sellCar(String token) async {
    final data = await _request(
      '/game/transportation/sell',
      method: 'POST',
      token: token,
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<GameSession> repairCar(String token) async {
    final data = await _request(
      '/game/transportation/repair',
      method: 'POST',
      token: token,
    );
    return GameSession.fromJson(mapValue(data['session']));
  }

  Future<List<LeaderboardEntry>> leaderboard([
    int limit = 20,
    String search = '',
  ]) async {
    final params = {'limit': '$limit'};
    if (search.trim().isNotEmpty) {
      params['search'] = search.trim();
    }
    final data = await _request(
      '/leaderboard?${Uri(queryParameters: params).query}',
    );
    return mapList(data['entries']).map(LeaderboardEntry.fromJson).toList();
  }
}
