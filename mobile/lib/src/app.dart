import 'package:flutter/material.dart';

import 'api_client.dart';
import 'formatters.dart';
import 'models.dart';

class MoneySimMobileApp extends StatefulWidget {
  const MoneySimMobileApp({super.key});

  @override
  State<MoneySimMobileApp> createState() => _MoneySimMobileAppState();
}

class _MoneySimMobileAppState extends State<MoneySimMobileApp> {
  final _store = TokenStore();
  late ApiClient _api;
  String? _token;
  User? _user;
  bool _loading = true;
  String? _authError;

  @override
  void initState() {
    super.initState();
    _api = ApiClient(baseUrl: defaultApiBaseUrl);
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    await _store.clearLegacyApiBaseUrl();
    final token = await _store.loadToken();

    if (token == null) {
      setState(() => _loading = false);
      return;
    }

    try {
      final user = await _api.me(token);
      if (!mounted) return;
      setState(() {
        _token = token;
        _user = user;
        _loading = false;
      });
    } on ApiException catch (error) {
      await _store.clearToken();
      if (!mounted) return;
      setState(() {
        _authError = error.message;
        _loading = false;
      });
    }
  }

  Future<void> _handleLogin(String token, User user) async {
    await _store.saveToken(token);
    setState(() {
      _token = token;
      _user = user;
      _authError = null;
    });
  }

  Future<void> _handleLogout() async {
    await _store.clearToken();
    setState(() {
      _token = null;
      _user = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: const Color(0xff059669),
      brightness: Brightness.light,
    );

    return MaterialApp(
      title: 'MoneySim',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        scaffoldBackgroundColor: const Color(0xfff7faf9),
        cardTheme: const CardThemeData(
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
            side: BorderSide(color: Color(0x14000000)),
          ),
        ),
      ),
      home: _loading
          ? const LoadingPage()
          : _token == null || _user == null
          ? AuthPage(api: _api, initialError: _authError, onLogin: _handleLogin)
          : MainShell(
              api: _api,
              token: _token!,
              user: _user!,
              onLogout: _handleLogout,
            ),
    );
  }
}

class LoadingPage extends StatelessWidget {
  const LoadingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

class MainShell extends StatefulWidget {
  const MainShell({
    super.key,
    required this.api,
    required this.token,
    required this.user,
    required this.onLogout,
  });

  final ApiClient api;
  final String token;
  final User user;
  final VoidCallback onLogout;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardPage(api: widget.api, token: widget.token),
      LeaderboardPage(api: widget.api),
      SettingsPage(user: widget.user, onLogout: widget.onLogout),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.paid_outlined),
            SizedBox(width: 8),
            Text('MoneySim'),
          ],
        ),
      ),
      body: SafeArea(child: pages[_index]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.emoji_events_outlined),
            selectedIcon: Icon(Icons.emoji_events),
            label: 'Scores',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}

class AuthPage extends StatefulWidget {
  const AuthPage({
    super.key,
    required this.api,
    required this.onLogin,
    this.initialError,
  });

  final ApiClient api;
  final String? initialError;
  final Future<void> Function(String token, User user) onLogin;

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final _loginEmail = TextEditingController();
  final _loginPassword = TextEditingController();
  final _signupName = TextEditingController();
  final _signupEmail = TextEditingController();
  final _signupPassword = TextEditingController();
  bool _busy = false;
  String? _message;
  String? _error;

  @override
  void initState() {
    super.initState();
    _error = widget.initialError;
  }

  @override
  void dispose() {
    _loginEmail.dispose();
    _loginPassword.dispose();
    _signupName.dispose();
    _signupEmail.dispose();
    _signupPassword.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _message = null;
      _error = null;
    });
    try {
      await action();
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _login() => _run(() async {
    final data = await widget.api.login(_loginEmail.text, _loginPassword.text);
    await widget.onLogin(data.token, data.user);
  });

  Future<void> _signup() => _run(() async {
    await widget.api.signup(
      _signupName.text,
      _signupEmail.text,
      _signupPassword.text,
    );
    setState(() {
      _message = 'Account created. Verify your email before signing in.';
      _loginEmail.text = _signupEmail.text;
    });
  });

  Future<void> _resendVerification() => _run(() async {
    final message = await widget.api.resendVerification(_loginEmail.text);
    setState(() => _message = message);
  });

  Future<void> _forgotPassword() => _run(() async {
    final email = _loginEmail.text.isNotEmpty
        ? _loginEmail.text
        : _signupEmail.text;
    final message = await widget.api.forgotPassword(email);
    setState(() => _message = message);
  });

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const SizedBox(height: 12),
              const Icon(Icons.account_balance_wallet, size: 54),
              const SizedBox(height: 12),
              Text(
                'Start with a job. Survive 12 months. See how much you can save.',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Manage work, college, expenses, needs, assets, debt, and monthly life events from your phone.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 20),
              const TabBar(
                tabs: [
                  Tab(text: 'Sign In'),
                  Tab(text: 'Sign Up'),
                ],
              ),
              SizedBox(
                height: 390,
                child: TabBarView(
                  children: [
                    _AuthCard(
                      children: [
                        TextField(
                          controller: _loginEmail,
                          decoration: const InputDecoration(labelText: 'Email'),
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                        ),
                        TextField(
                          controller: _loginPassword,
                          decoration: const InputDecoration(
                            labelText: 'Password',
                          ),
                          obscureText: true,
                          onSubmitted: (_) => _login(),
                        ),
                        FilledButton.icon(
                          onPressed: _busy ? null : _login,
                          icon: const Icon(Icons.login),
                          label: Text(_busy ? 'Signing in...' : 'Sign In'),
                        ),
                        TextButton(
                          onPressed: _busy ? null : _resendVerification,
                          child: const Text('Resend verification'),
                        ),
                        TextButton(
                          onPressed: _busy ? null : _forgotPassword,
                          child: const Text('Forgot password?'),
                        ),
                      ],
                    ),
                    _AuthCard(
                      children: [
                        TextField(
                          controller: _signupName,
                          decoration: const InputDecoration(labelText: 'Name'),
                          textInputAction: TextInputAction.next,
                        ),
                        TextField(
                          controller: _signupEmail,
                          decoration: const InputDecoration(labelText: 'Email'),
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                        ),
                        TextField(
                          controller: _signupPassword,
                          decoration: const InputDecoration(
                            labelText: 'Password',
                            helperText:
                                '10+ chars with upper, lower, number, symbol.',
                          ),
                          obscureText: true,
                          onSubmitted: (_) => _signup(),
                        ),
                        FilledButton.icon(
                          onPressed: _busy ? null : _signup,
                          icon: const Icon(Icons.person_add_alt),
                          label: Text(_busy ? 'Creating...' : 'Create Account'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (_message != null) InfoBanner(message: _message!),
              if (_error != null) ErrorBanner(message: _error!),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuthCard extends StatelessWidget {
  const _AuthCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final child in children) ...[
              child,
              const SizedBox(height: 12),
            ],
          ],
        ),
      ),
    );
  }
}

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key, required this.api, required this.token});

  final ApiClient api;
  final String token;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  List<Job> _jobs = const [];
  List<ExpenseOption> _options = const [];
  GameSession? _session;
  GameSession? _endedSession;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  Map<String, List<ExpenseOption>> get _optionsByCategory {
    final grouped = <String, List<ExpenseOption>>{};
    for (final option in _options) {
      grouped.putIfAbsent(option.category, () => []).add(option);
    }
    return grouped;
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        widget.api.jobs(widget.token),
        widget.api.expenseOptions(widget.token),
        widget.api.currentSession(widget.token),
      ]);
      if (!mounted) return;
      setState(() {
        _jobs = results[0] as List<Job>;
        _options = results[1] as List<ExpenseOption>;
        _session = results[2] as GameSession?;
      });
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _mutate(Future<GameSession> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = await action();
      if (!mounted) return;
      setState(() {
        if (session.status == 'dead') {
          _endedSession = session;
          _session = null;
        } else {
          _session = session;
          _endedSession = null;
        }
      });
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _start(
    String lifePath,
    String jobId,
    Map<String, String> selections,
    String? major,
  ) => _mutate(
    () => widget.api.startSession(
      widget.token,
      lifePath: lifePath,
      jobId: jobId,
      expenseSelections: selections,
      major: major,
    ),
  );

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    final missingCatalog =
        _jobs.isEmpty ||
        (_optionsByCategory['Housing']?.isEmpty ?? true) ||
        (_optionsByCategory['Transportation']?.isEmpty ?? true);

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Dashboard',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              StatusChip(
                label: _session != null
                    ? 'Alive'
                    : _endedSession != null
                    ? 'Ended'
                    : 'Ready',
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text('Adjust life choices, expenses, jobs, assets, and debt.'),
          const SizedBox(height: 14),
          if (_error != null) ...[
            ErrorBanner(message: _error!),
            const SizedBox(height: 12),
          ],
          if (missingCatalog) ...[
            const ErrorBanner(
              message:
                  'Catalog data is missing. Start the backend and run npm run seed in backend.',
            ),
            const SizedBox(height: 12),
          ],
          if (_endedSession != null)
            ResultsView(
              session: _endedSession!,
              busy: _busy,
              jobs: _jobs,
              optionsByCategory: _optionsByCategory,
              onPlayAgain: _start,
            )
          else if (_session != null)
            ActiveSessionView(
              session: _session!,
              jobs: _jobs,
              optionsByCategory: _optionsByCategory,
              busy: _busy,
              onAdvance: (months, choices) => _mutate(
                () => widget.api.advanceMonths(widget.token, months, choices),
              ),
              onEndRun: () => _mutate(() => widget.api.endRun(widget.token)),
              onApplyForJob: (jobId) =>
                  _mutate(() => widget.api.applyForJob(widget.token, jobId)),
              onChangeExpense: (category, optionId) => _mutate(
                () => widget.api.changeExpense(
                  widget.token,
                  category: category,
                  optionId: optionId,
                ),
              ),
              onPayOffDebt: () =>
                  _mutate(() => widget.api.payOffDebt(widget.token)),
              onInvestStocks: (amount) =>
                  _mutate(() => widget.api.investStocks(widget.token, amount)),
              onSellStocks: () =>
                  _mutate(() => widget.api.sellStocks(widget.token)),
              onBuyHome: (homeId) =>
                  _mutate(() => widget.api.buyHome(widget.token, homeId)),
              onSellHome: () =>
                  _mutate(() => widget.api.sellHome(widget.token)),
              onBuyAsset: (assetId) =>
                  _mutate(() => widget.api.buyAsset(widget.token, assetId)),
              onSellAsset: (holdingId) =>
                  _mutate(() => widget.api.sellAsset(widget.token, holdingId)),
              onSellCar: () => _mutate(() => widget.api.sellCar(widget.token)),
              onEnrollCollege: (major) =>
                  _mutate(() => widget.api.enrollCollege(widget.token, major)),
            )
          else
            StartRunView(
              jobs: _jobs,
              optionsByCategory: _optionsByCategory,
              disabled: missingCatalog || _busy,
              busy: _busy,
              onStart: _start,
            ),
        ],
      ),
    );
  }
}

class StartRunView extends StatefulWidget {
  const StartRunView({
    super.key,
    required this.jobs,
    required this.optionsByCategory,
    required this.disabled,
    required this.busy,
    required this.onStart,
  });

  final List<Job> jobs;
  final Map<String, List<ExpenseOption>> optionsByCategory;
  final bool disabled;
  final bool busy;
  final void Function(
    String lifePath,
    String jobId,
    Map<String, String> selections,
    String? major,
  )
  onStart;

  @override
  State<StartRunView> createState() => _StartRunViewState();
}

class _StartRunViewState extends State<StartRunView> {
  String _lifePath = 'work';
  String _major = 'business';
  String? _jobId;
  final _selections = <String, String>{};

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncDefaults();
  }

  @override
  void didUpdateWidget(covariant StartRunView oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncDefaults();
  }

  void _syncDefaults() {
    final jobs = _availableJobs;
    if (_jobId == null || !jobs.any((job) => job.id == _jobId)) {
      _jobId = jobs.isEmpty ? null : jobs.first.id;
    }
    for (final category in const ['Housing', 'Transportation']) {
      _selections.putIfAbsent(
        category,
        () => widget.optionsByCategory[category]?.firstOrNull?.id ?? '',
      );
    }
  }

  List<Job> get _availableJobs =>
      widget.jobs.where((job) => !job.requiresDegree && job.tier <= 1).toList();

  @override
  Widget build(BuildContext context) {
    final canStart =
        !widget.disabled &&
        _jobId != null &&
        _selections.values.every((value) => value.isNotEmpty);

    return SectionCard(
      title: 'Start New Run',
      subtitle: 'Start at 18. Choose work now or college with loans.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: _lifePath,
            decoration: const InputDecoration(labelText: 'Path'),
            items: const [
              DropdownMenuItem(value: 'work', child: Text('Work full-time')),
              DropdownMenuItem(
                value: 'college',
                child: Text('College with student loans'),
              ),
            ],
            onChanged: (value) => setState(() {
              _lifePath = value ?? 'work';
              _jobId = null;
              _syncDefaults();
            }),
          ),
          if (_lifePath == 'college')
            DropdownButtonFormField<String>(
              isExpanded: true,
              initialValue: _major,
              decoration: const InputDecoration(labelText: 'College major'),
              items: const [
                DropdownMenuItem(
                  value: 'computer-science',
                  child: Text('Computer Science'),
                ),
                DropdownMenuItem(value: 'business', child: Text('Business')),
                DropdownMenuItem(
                  value: 'communications',
                  child: Text('Communications'),
                ),
              ],
              onChanged: (value) =>
                  setState(() => _major = value ?? 'business'),
            ),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: _jobId,
            decoration: InputDecoration(
              labelText: _lifePath == 'college'
                  ? 'Part-time job'
                  : 'Starting job',
            ),
            items: _availableJobs
                .map(
                  (job) => DropdownMenuItem(
                    value: job.id,
                    child: DropdownText(
                      '${job.title} · ${money(job.monthlySalary)}/mo',
                    ),
                  ),
                )
                .toList(),
            onChanged: (value) => setState(() => _jobId = value),
          ),
          const SizedBox(height: 8),
          ExpenseSelectionFields(
            optionsByCategory: widget.optionsByCategory,
            selections: _selections,
            onChanged: (category, optionId) =>
                setState(() => _selections[category] = optionId),
          ),
          const Text(
            'Higher-paying roles unlock through monthly job applications.',
            style: TextStyle(fontSize: 12),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: canStart
                ? () => widget.onStart(
                    _lifePath,
                    _jobId!,
                    Map.of(_selections),
                    _lifePath == 'college' ? _major : null,
                  )
                : null,
            icon: const Icon(Icons.play_arrow),
            label: Text(widget.busy ? 'Starting...' : 'Start Simulation'),
          ),
        ],
      ),
    );
  }
}

class ActiveSessionView extends StatelessWidget {
  const ActiveSessionView({
    super.key,
    required this.session,
    required this.jobs,
    required this.optionsByCategory,
    required this.busy,
    required this.onAdvance,
    required this.onEndRun,
    required this.onApplyForJob,
    required this.onChangeExpense,
    required this.onPayOffDebt,
    required this.onInvestStocks,
    required this.onSellStocks,
    required this.onBuyHome,
    required this.onSellHome,
    required this.onBuyAsset,
    required this.onSellAsset,
    required this.onSellCar,
    required this.onEnrollCollege,
  });

  final GameSession session;
  final List<Job> jobs;
  final Map<String, List<ExpenseOption>> optionsByCategory;
  final bool busy;
  final void Function(int months, MonthlyChoices choices) onAdvance;
  final VoidCallback onEndRun;
  final ValueChanged<String> onApplyForJob;
  final void Function(String category, String optionId) onChangeExpense;
  final VoidCallback onPayOffDebt;
  final ValueChanged<int> onInvestStocks;
  final VoidCallback onSellStocks;
  final ValueChanged<String> onBuyHome;
  final VoidCallback onSellHome;
  final ValueChanged<String> onBuyAsset;
  final ValueChanged<String> onSellAsset;
  final VoidCallback onSellCar;
  final ValueChanged<String> onEnrollCollege;

  @override
  Widget build(BuildContext context) {
    final last = session.history.lastOrNull;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LifeStatusCard(session: session),
        const SizedBox(height: 12),
        if (last?.eventTitle.isNotEmpty ?? false) ...[
          InfoBanner(
            message:
                'Last event: ${last!.eventTitle}${last.eventAmount == 0 ? '' : ' (${signedMoney(last.eventAmount)})'}',
          ),
          const SizedBox(height: 12),
        ],
        MonthlyPlanView(
          key: ValueKey('${session.id}-${session.currentMonth}'),
          session: session,
          busy: busy,
          onAdvance: onAdvance,
        ),
        const SizedBox(height: 12),
        NeedsView(session: session),
        const SizedBox(height: 12),
        CareerView(
          session: session,
          optionsByCategory: optionsByCategory,
          busy: busy,
          onApplyForJob: onApplyForJob,
          onChangeExpense: onChangeExpense,
        ),
        const SizedBox(height: 12),
        AssetsView(
          session: session,
          busy: busy,
          onPayOffDebt: onPayOffDebt,
          onInvestStocks: onInvestStocks,
          onSellStocks: onSellStocks,
          onBuyHome: onBuyHome,
          onSellHome: onSellHome,
          onBuyAsset: onBuyAsset,
          onSellAsset: onSellAsset,
          onSellCar: onSellCar,
        ),
        const SizedBox(height: 12),
        EducationView(
          session: session,
          busy: busy,
          onEnrollCollege: onEnrollCollege,
        ),
        const SizedBox(height: 12),
        HistoryView(session: session),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: busy ? null : onEndRun,
          icon: const Icon(Icons.flag_outlined),
          label: const Text('End Run'),
        ),
      ],
    );
  }
}

class LifeStatusCard extends StatelessWidget {
  const LifeStatusCard({super.key, required this.session});

  final GameSession session;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(
        context,
      ).colorScheme.primaryContainer.withValues(alpha: 0.45),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Theme.of(context).colorScheme.onPrimary,
                  child: Text('${session.ageYears}'),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Month ${session.currentMonth}',
                        style: Theme.of(context).textTheme.labelMedium,
                      ),
                      Text(
                        'Age ${session.ageYears}y ${session.ageRemainderMonths}m',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(session.currentJob.title),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                MetricTile(label: 'Balance', value: money(session.balance)),
                MetricTile(label: 'Debt', value: money(session.studentDebt)),
                MetricTile(
                  label: 'Fixed Costs',
                  value: money(session.fixedExpenses),
                ),
                MetricTile(label: 'Net Worth', value: money(session.netWorth)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class MonthlyPlanView extends StatefulWidget {
  const MonthlyPlanView({
    super.key,
    required this.session,
    required this.busy,
    required this.onAdvance,
  });

  final GameSession session;
  final bool busy;
  final void Function(int months, MonthlyChoices choices) onAdvance;

  @override
  State<MonthlyPlanView> createState() => _MonthlyPlanViewState();
}

class _MonthlyPlanViewState extends State<MonthlyPlanView> {
  late MonthlyChoices _choices;

  @override
  void initState() {
    super.initState();
    _choices = widget.session.monthlyChoices;
  }

  double get _variableExpenses =>
      _choices.foodDays * 13 +
      _choices.entertainmentDays * 18 +
      _choices.datingDays * 38;

  double get _income {
    final session = widget.session;
    final enrolled =
        session.lifePath == 'college' && session.educationMonths < 48;
    final graduated =
        session.lifePath == 'college' && session.educationMonths >= 48;
    if (session.unemployedMonths > 0) return 0;
    final careerMultiplier = 1 + session.careerLevel * 0.12;
    final pathMultiplier = enrolled
        ? 0.35
        : graduated
        ? 1.55
        : 1;
    return session.currentJob.monthlySalary * careerMultiplier * pathMultiplier;
  }

  @override
  Widget build(BuildContext context) {
    final expenses =
        widget.session.fixedExpenses + _variableExpenses + _choices.debtPayment;
    final change = _income - expenses;

    return SectionCard(
      title: 'Monthly Plan',
      subtitle: 'Set this month, then advance when ready.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              MetricTile(label: 'Income', value: money(_income)),
              MetricTile(label: 'Spending', value: money(expenses)),
              MetricTile(label: 'Change', value: signedMoney(change)),
              MetricTile(
                label: 'After',
                value: money(widget.session.balance + change),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'study', label: Text('Study')),
              ButtonSegment(value: 'exercise', label: Text('Exercise')),
              ButtonSegment(value: 'recreation', label: Text('Fun')),
              ButtonSegment(value: 'rest', label: Text('Rest')),
            ],
            selected: {_choices.activity},
            onSelectionChanged: widget.busy
                ? null
                : (values) => setState(
                    () => _choices = _choices.copyWith(activity: values.first),
                  ),
          ),
          if (widget.session.lifePath == 'college' &&
              widget.session.educationMonths < 48)
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Take internship this month'),
              value: _choices.internship,
              onChanged: widget.busy
                  ? null
                  : (value) => setState(
                      () => _choices = _choices.copyWith(internship: value),
                    ),
            ),
          ChoiceStepper(
            label: 'Food days',
            value: _choices.foodDays,
            cost: _choices.foodDays * 13,
            min: 0,
            max: 31,
            onChanged: (value) =>
                setState(() => _choices = _choices.copyWith(foodDays: value)),
          ),
          ChoiceStepper(
            label: 'Fun days',
            value: _choices.entertainmentDays,
            cost: _choices.entertainmentDays * 18,
            min: 0,
            max: 31,
            onChanged: (value) => setState(
              () => _choices = _choices.copyWith(entertainmentDays: value),
            ),
          ),
          ChoiceStepper(
            label: 'Dating days',
            value: _choices.datingDays,
            cost: _choices.datingDays * 38,
            min: 0,
            max: 31,
            onChanged: (value) =>
                setState(() => _choices = _choices.copyWith(datingDays: value)),
          ),
          if (widget.session.studentDebt > 0)
            SliderInput(
              label: 'Loan payment',
              value: _choices.debtPayment,
              min: 0,
              max: 2000,
              divisions: 40,
              onChanged: (value) => setState(
                () => _choices = _choices.copyWith(debtPayment: value),
              ),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: widget.busy
                      ? null
                      : () => widget.onAdvance(1, _choices),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Advance Month'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: widget.busy
                      ? null
                      : () => widget.onAdvance(12, _choices),
                  icon: const Icon(Icons.calendar_month),
                  label: const Text('Advance Year'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class NeedsView extends StatelessWidget {
  const NeedsView({super.key, required this.session});

  final GameSession session;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      title: 'Needs',
      child: Column(
        children: [
          NeedBar(label: 'Happiness', value: session.needs.happiness),
          NeedBar(label: 'Hunger', value: session.needs.hunger),
          NeedBar(label: 'Entertainment', value: session.needs.entertainment),
          NeedBar(label: 'Love', value: session.needs.love),
          NeedBar(label: 'Energy', value: session.needs.energy),
        ],
      ),
    );
  }
}

class CareerView extends StatelessWidget {
  const CareerView({
    super.key,
    required this.session,
    required this.optionsByCategory,
    required this.busy,
    required this.onApplyForJob,
    required this.onChangeExpense,
  });

  final GameSession session;
  final Map<String, List<ExpenseOption>> optionsByCategory;
  final bool busy;
  final ValueChanged<String> onApplyForJob;
  final void Function(String category, String optionId) onChangeExpense;

  @override
  Widget build(BuildContext context) {
    final applicationUsed = session.appliedJobIds.isNotEmpty;

    return SectionCard(
      title: 'Career and Commitments',
      subtitle:
          '${session.currentJob.careerTrack} · Level ${session.careerLevel} · ${money(session.fixedExpenses)} fixed',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              MetricTile(label: 'Job', value: session.currentJob.title),
              MetricTile(
                label: 'Performance',
                value: session.unemployedMonths > 0
                    ? 'Between jobs'
                    : '${session.careerPerformance.round()}/100',
              ),
              MetricTile(
                label: 'Housing',
                value: '${session.housingLeaseMonthsRemaining} mo',
              ),
              MetricTile(
                label: 'Transport',
                value: '${session.transportationTermMonthsRemaining} mo',
              ),
            ],
          ),
          const SizedBox(height: 12),
          ExpenseSelectionFields(
            optionsByCategory: optionsByCategory,
            selections: session.expenseSelections.map(
              (category, option) => MapEntry(category, option.id),
            ),
            onChanged: onChangeExpense,
            enabled: !busy,
          ),
          const Divider(height: 28),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'This month’s openings',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              StatusChip(label: applicationUsed ? 'Used' : 'Available'),
            ],
          ),
          if (session.lastJobApplication != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: InfoBanner(message: session.lastJobApplication!.message),
            ),
          const SizedBox(height: 8),
          for (final job in session.jobMarket)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                tileColor: Theme.of(context).colorScheme.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Color(0x14000000)),
                ),
                title: Text(job.title),
                subtitle: Text(
                  '${money(job.monthlySalary)}/mo · ${job.careerTrack} · ${job.requiredSkill} ${job.requiredSkillLevel}',
                ),
                trailing: FilledButton(
                  onPressed: busy || applicationUsed
                      ? null
                      : () => onApplyForJob(job.id),
                  child: const Text('Apply'),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class AssetsView extends StatefulWidget {
  const AssetsView({
    super.key,
    required this.session,
    required this.busy,
    required this.onPayOffDebt,
    required this.onInvestStocks,
    required this.onSellStocks,
    required this.onBuyHome,
    required this.onSellHome,
    required this.onBuyAsset,
    required this.onSellAsset,
    required this.onSellCar,
  });

  final GameSession session;
  final bool busy;
  final VoidCallback onPayOffDebt;
  final ValueChanged<int> onInvestStocks;
  final VoidCallback onSellStocks;
  final ValueChanged<String> onBuyHome;
  final VoidCallback onSellHome;
  final ValueChanged<String> onBuyAsset;
  final ValueChanged<String> onSellAsset;
  final VoidCallback onSellCar;

  @override
  State<AssetsView> createState() => _AssetsViewState();
}

class _AssetsViewState extends State<AssetsView> {
  double _stockAmount = 500;
  String _homeId = homeOptions.first.id;
  String _assetId = assetOptions.first.id;

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final selectedHome = homeOptions.firstWhere((home) => home.id == _homeId);
    final selectedAsset = assetOptions.firstWhere(
      (asset) => asset.id == _assetId,
    );
    final stockValue = session.stockPortfolio?.value ?? 0;
    final stockInvested = session.stockPortfolio?.invested ?? 0;
    final canSellCar = session.vehicleStatus?.type == 'used-car';

    return SectionCard(
      title: 'Assets and Debt',
      subtitle:
          'Assets ${money(session.assetValue)} · Debt ${money(session.studentDebt)}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              MetricTile(label: 'Cash', value: money(session.balance)),
              MetricTile(label: 'Assets', value: money(session.assetValue)),
              MetricTile(label: 'Debt', value: money(session.studentDebt)),
            ],
          ),
          const Divider(height: 28),
          FilledButton.icon(
            onPressed:
                widget.busy ||
                    session.studentDebt <= 0 ||
                    session.balance < session.studentDebt
                ? null
                : widget.onPayOffDebt,
            icon: const Icon(Icons.done_all),
            label: const Text('Pay Off Student Debt'),
          ),
          const SizedBox(height: 14),
          Text(
            'Stocks: invested ${money(stockInvested)} · value ${money(stockValue)}',
          ),
          SliderInput(
            label: 'Investment amount',
            value: _stockAmount,
            min: 1,
            max: session.balance.clamp(1, 10000),
            divisions: 40,
            onChanged: (value) => setState(() => _stockAmount = value),
          ),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: widget.busy || _stockAmount > session.balance
                      ? null
                      : () => widget.onInvestStocks(_stockAmount.round()),
                  child: const Text('Invest'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: widget.busy || stockValue <= 0
                      ? null
                      : widget.onSellStocks,
                  child: const Text('Sell Stocks'),
                ),
              ),
            ],
          ),
          const Divider(height: 28),
          Text(
            session.ownedHome == null
                ? 'Buy a home outright. Values move each month.'
                : '${session.ownedHome!.label} · value ${money(session.ownedHome!.estimatedValue)} · upkeep ${money(session.ownedHome!.monthlyUpkeep)}/mo',
          ),
          if (session.ownedHome == null) ...[
            DropdownButtonFormField<String>(
              initialValue: _homeId,
              decoration: const InputDecoration(labelText: 'Home'),
              items: homeOptions
                  .map(
                    (home) => DropdownMenuItem(
                      value: home.id,
                      child: Text('${home.label} · ${money(home.price)}'),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => _homeId = value ?? _homeId),
            ),
            FilledButton(
              onPressed: widget.busy || selectedHome.price > session.balance
                  ? null
                  : () => widget.onBuyHome(_homeId),
              child: const Text('Buy Home'),
            ),
          ] else
            OutlinedButton(
              onPressed: widget.busy ? null : widget.onSellHome,
              child: const Text('Sell Home'),
            ),
          const Divider(height: 28),
          Text(_carLabel(session.vehicleStatus)),
          OutlinedButton(
            onPressed: widget.busy || !canSellCar ? null : widget.onSellCar,
            child: const Text('Sell Used Car'),
          ),
          const Divider(height: 28),
          DropdownButtonFormField<String>(
            initialValue: _assetId,
            decoration: const InputDecoration(labelText: 'Other asset'),
            items: assetOptions
                .map(
                  (asset) => DropdownMenuItem(
                    value: asset.id,
                    child: Text('${asset.label} · ${money(asset.price)}'),
                  ),
                )
                .toList(),
            onChanged: (value) => setState(() => _assetId = value ?? _assetId),
          ),
          FilledButton(
            onPressed: widget.busy || selectedAsset.price > session.balance
                ? null
                : () => widget.onBuyAsset(_assetId),
            child: const Text('Buy Asset'),
          ),
          for (final asset in session.assetHoldings)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(asset.label),
              subtitle: Text(
                '${asset.category} · value ${money(asset.estimatedValue)} · bought ${money(asset.purchasePrice)}',
              ),
              trailing: OutlinedButton(
                onPressed: widget.busy
                    ? null
                    : () => widget.onSellAsset(asset.id),
                child: const Text('Sell'),
              ),
            ),
        ],
      ),
    );
  }

  String _carLabel(VehicleStatus? status) {
    if (status == null || status.type == 'none') return 'No car owned.';
    if (status.type == 'new-car') {
      return 'New car lease. Leased cars cannot be sold.';
    }
    return 'Used car · condition ${status.condition.round()}% · ${status.mileage.round()} miles';
  }
}

class EducationView extends StatefulWidget {
  const EducationView({
    super.key,
    required this.session,
    required this.busy,
    required this.onEnrollCollege,
  });

  final GameSession session;
  final bool busy;
  final ValueChanged<String> onEnrollCollege;

  @override
  State<EducationView> createState() => _EducationViewState();
}

class _EducationViewState extends State<EducationView> {
  String _major = 'business';

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final enrolled = session.lifePath == 'college';

    return SectionCard(
      title: 'Education and Goals',
      subtitle: enrolled
          ? '${session.educationMonths}/48 college months'
          : 'Not enrolled',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            enrolled
                ? '${session.major ?? 'College'} · ${session.educationMonths >= 48 ? 'Graduated' : '${48 - session.educationMonths} months to graduation'}'
                : 'Enroll to build skills and unlock degree-required careers.',
          ),
          if (!enrolled) ...[
            DropdownButtonFormField<String>(
              initialValue: _major,
              decoration: const InputDecoration(labelText: 'Major'),
              items: const [
                DropdownMenuItem(
                  value: 'computer-science',
                  child: Text('Computer Science'),
                ),
                DropdownMenuItem(value: 'business', child: Text('Business')),
                DropdownMenuItem(
                  value: 'communications',
                  child: Text('Communications'),
                ),
              ],
              onChanged: (value) => setState(() => _major = value ?? _major),
            ),
            FilledButton(
              onPressed: widget.busy
                  ? null
                  : () => widget.onEnrollCollege(_major),
              child: const Text('Enroll in College'),
            ),
          ],
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final goal in const [
                'Save \$10,000',
                'Graduate debt-free',
                'Reach age 40',
                'Buy a home',
              ])
                StatusChip(
                  label: session.completedGoals.contains(goal)
                      ? 'Done: $goal'
                      : goal,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class HistoryView extends StatelessWidget {
  const HistoryView({super.key, required this.session});

  final GameSession session;

  @override
  Widget build(BuildContext context) {
    final recent = session.history.reversed.take(8).toList();
    return SectionCard(
      title: 'History',
      subtitle: '${session.history.length} months recorded',
      child: recent.isEmpty
          ? const Text('Advance a month to start the history.')
          : Column(
              children: [
                for (final item in recent)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Month ${item.month} · ${item.jobTitle}'),
                    subtitle: Text(
                      'Income ${money(item.income)} · Expenses ${money(item.expenses)} · Balance ${money(item.balanceAfter)}',
                    ),
                  ),
              ],
            ),
    );
  }
}

class ResultsView extends StatelessWidget {
  const ResultsView({
    super.key,
    required this.session,
    required this.busy,
    required this.jobs,
    required this.optionsByCategory,
    required this.onPlayAgain,
  });

  final GameSession session;
  final bool busy;
  final List<Job> jobs;
  final Map<String, List<ExpenseOption>> optionsByCategory;
  final void Function(
    String lifePath,
    String jobId,
    Map<String, String> selections,
    String? major,
  )
  onPlayAgain;

  @override
  Widget build(BuildContext context) {
    final defaults = defaultSelections(optionsByCategory);
    return SectionCard(
      title: session.deathRecap?['eventTitle'] == 'Run ended by player'
          ? 'Run Recap'
          : 'Death Recap',
      subtitle:
          'Age ${session.ageYears}y ${session.ageRemainderMonths}m · ${session.deathReason ?? 'Your run ended.'}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              MetricTile(
                label: 'Final Score',
                value: money(session.finalScore ?? session.balance),
              ),
              MetricTile(label: 'Net Worth', value: money(session.netWorth)),
              MetricTile(label: 'Cash', value: money(session.balance)),
              MetricTile(label: 'Assets', value: money(session.assetValue)),
              MetricTile(label: 'Debt', value: money(session.studentDebt)),
            ],
          ),
          const SizedBox(height: 12),
          if (session.history.lastOrNull case final last?)
            Text(
              'Last month: income ${money(last.income)}, expenses ${money(last.expenses)}, balance ${money(last.balanceAfter)}.',
            ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: busy || jobs.isEmpty || defaults.length < 2
                ? null
                : () => onPlayAgain('work', jobs.first.id, defaults, null),
            icon: const Icon(Icons.replay),
            label: const Text('Play Again'),
          ),
        ],
      ),
    );
  }
}

class LeaderboardPage extends StatefulWidget {
  const LeaderboardPage({super.key, required this.api});

  final ApiClient api;

  @override
  State<LeaderboardPage> createState() => _LeaderboardPageState();
}

class _LeaderboardPageState extends State<LeaderboardPage> {
  bool _loading = true;
  String? _error;
  List<LeaderboardEntry> _entries = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final entries = await widget.api.leaderboard();
      if (mounted) setState(() => _entries = entries);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Leaderboard',
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            ErrorBanner(message: _error!)
          else if (_entries.isEmpty)
            const Text('No completed runs yet.')
          else
            for (var index = 0; index < _entries.length; index++)
              Card(
                child: ListTile(
                  leading: CircleAvatar(child: Text('${index + 1}')),
                  title: Text(_entries[index].name),
                  subtitle: Text(dateLabel(_entries[index].completedAt)),
                  trailing: Text(
                    money(_entries[index].finalScore),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key, required this.user, required this.onLogout});

  final User user;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SectionCard(
          title: 'Account',
          subtitle: user.email,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.person),
                title: Text(user.name),
                subtitle: Text(user.isVerified ? 'Verified' : 'Unverified'),
              ),
              OutlinedButton.icon(
                onPressed: onLogout,
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class ExpenseSelectionFields extends StatelessWidget {
  const ExpenseSelectionFields({
    super.key,
    required this.optionsByCategory,
    required this.selections,
    required this.onChanged,
    this.enabled = true,
  });

  final Map<String, List<ExpenseOption>> optionsByCategory;
  final Map<String, String> selections;
  final void Function(String category, String optionId) onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final category in const ['Housing', 'Transportation'])
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: DropdownButtonFormField<String>(
              isExpanded: true,
              initialValue: selections[category]?.isEmpty ?? true
                  ? null
                  : selections[category],
              decoration: InputDecoration(labelText: category),
              items: (optionsByCategory[category] ?? const [])
                  .map(
                    (option) => DropdownMenuItem(
                      value: option.id,
                      child: DropdownText(
                        '${option.label} · ${option.tier} · ${money(option.monthlyCost)}/mo',
                      ),
                    ),
                  )
                  .toList(),
              onChanged: enabled
                  ? (value) {
                      if (value != null) onChanged(category, value);
                    }
                  : null,
            ),
          ),
      ],
    );
  }
}

class DropdownText extends StatelessWidget {
  const DropdownText(this.value, {super.key});

  final String value;

  @override
  Widget build(BuildContext context) {
    return Text(value, maxLines: 1, overflow: TextOverflow.ellipsis);
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.title,
    this.subtitle,
    required this.child,
  });

  final String title;
  final String? subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class MetricTile extends StatelessWidget {
  const MetricTile({super.key, required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 126),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0x14000000)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class NeedBar extends StatelessWidget {
  const NeedBar({super.key, required this.label, required this.value});

  final String label;
  final double value;

  @override
  Widget build(BuildContext context) {
    final normalized = value.clamp(0, 100) / 100;
    final color = value < 25
        ? Colors.red
        : value < 50
        ? Colors.amber.shade700
        : Colors.green.shade700;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          SizedBox(width: 108, child: Text(label)),
          Expanded(
            child: LinearProgressIndicator(
              value: normalized,
              color: color,
              minHeight: 8,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          SizedBox(
            width: 44,
            child: Text(
              value.round().toString(),
              textAlign: TextAlign.end,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class ChoiceStepper extends StatelessWidget {
  const ChoiceStepper({
    super.key,
    required this.label,
    required this.value,
    required this.cost,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  final String label;
  final int value;
  final int cost;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      subtitle: Text(money(cost)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            onPressed: value <= min ? null : () => onChanged(value - 1),
            icon: const Icon(Icons.remove_circle_outline),
          ),
          SizedBox(
            width: 34,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          IconButton(
            onPressed: value >= max ? null : () => onChanged(value + 1),
            icon: const Icon(Icons.add_circle_outline),
          ),
        ],
      ),
    );
  }
}

class SliderInput extends StatelessWidget {
  const SliderInput({
    super.key,
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
    this.divisions,
  });

  final String label;
  final double value;
  final double min;
  final double max;
  final int? divisions;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final effectiveMax = max <= min ? min + 1 : max;
    final effectiveValue = value.clamp(min, effectiveMax).toDouble();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(label)),
            Text(money(effectiveValue)),
          ],
        ),
        Slider(
          value: effectiveValue,
          min: min,
          max: effectiveMax,
          divisions: divisions,
          label: money(effectiveValue),
          onChanged: onChanged,
        ),
      ],
    );
  }
}

class InfoBanner extends StatelessWidget {
  const InfoBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return BannerBox(
      icon: Icons.info_outline,
      message: message,
      color: Theme.of(context).colorScheme.primaryContainer,
    );
  }
}

class ErrorBanner extends StatelessWidget {
  const ErrorBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return BannerBox(
      icon: Icons.error_outline,
      message: message,
      color: Theme.of(context).colorScheme.errorContainer,
    );
  }
}

class BannerBox extends StatelessWidget {
  const BannerBox({
    super.key,
    required this.icon,
    required this.message,
    required this.color,
  });

  final IconData icon;
  final String message;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon),
          const SizedBox(width: 10),
          Expanded(child: Text(message)),
        ],
      ),
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(label),
      visualDensity: VisualDensity.compact,
      side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
    );
  }
}

Map<String, String> defaultSelections(
  Map<String, List<ExpenseOption>> optionsByCategory,
) {
  return {
    for (final category in const ['Housing', 'Transportation'])
      if (optionsByCategory[category]?.firstOrNull case final option?)
        category: option.id,
  };
}
