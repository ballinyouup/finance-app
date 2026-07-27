typedef JsonMap = Map<String, dynamic>;

String stringValue(Object? value, [String fallback = '']) =>
    value == null ? fallback : value.toString();

int intValue(Object? value, [int fallback = 0]) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

double doubleValue(Object? value, [double fallback = 0]) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}

bool boolValue(Object? value, [bool fallback = false]) {
  if (value is bool) return value;
  return fallback;
}

JsonMap mapValue(Object? value) {
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return <String, dynamic>{};
}

List<JsonMap> mapList(Object? value) {
  if (value is List) {
    return value.map(mapValue).where((item) => item.isNotEmpty).toList();
  }
  return <JsonMap>[];
}

class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.isVerified,
  });

  factory User.fromJson(JsonMap json) => User(
    id: stringValue(json['id'] ?? json['_id']),
    name: stringValue(json['name']),
    email: stringValue(json['email']),
    isVerified: boolValue(json['isVerified']),
  );

  final String id;
  final String name;
  final String email;
  final bool isVerified;
}

class Job {
  const Job({
    required this.id,
    required this.title,
    required this.monthlySalary,
    required this.tier,
    required this.requiresDegree,
    required this.careerTrack,
    required this.requiredSkill,
    required this.requiredSkillLevel,
  });

  factory Job.fromJson(JsonMap json) => Job(
    id: stringValue(json['_id'] ?? json['id']),
    title: stringValue(json['title'], 'Unknown job'),
    monthlySalary: doubleValue(json['monthlySalary']),
    tier: intValue(json['tier'], 1),
    requiresDegree: boolValue(json['requiresDegree']),
    careerTrack: stringValue(json['careerTrack'], 'General'),
    requiredSkill: stringValue(json['requiredSkill'], 'business'),
    requiredSkillLevel: intValue(json['requiredSkillLevel']),
  );

  static Job placeholder(Object? id) => Job(
    id: stringValue(id),
    title: 'Unknown job',
    monthlySalary: 0,
    tier: 1,
    requiresDegree: false,
    careerTrack: 'General',
    requiredSkill: 'business',
    requiredSkillLevel: 0,
  );

  final String id;
  final String title;
  final double monthlySalary;
  final int tier;
  final bool requiresDegree;
  final String careerTrack;
  final String requiredSkill;
  final int requiredSkillLevel;
}

class ExpenseOption {
  const ExpenseOption({
    required this.id,
    required this.category,
    required this.tier,
    required this.label,
    required this.monthlyCost,
  });

  factory ExpenseOption.fromJson(JsonMap json) => ExpenseOption(
    id: stringValue(json['_id'] ?? json['id']),
    category: stringValue(json['category']),
    tier: stringValue(json['tier']),
    label: stringValue(json['label']),
    monthlyCost: doubleValue(json['monthlyCost']),
  );

  final String id;
  final String category;
  final String tier;
  final String label;
  final double monthlyCost;
}

class NeedScores {
  const NeedScores({
    required this.happiness,
    required this.hunger,
    required this.entertainment,
    required this.love,
    required this.energy,
  });

  factory NeedScores.fromJson(JsonMap json) => NeedScores(
    happiness: doubleValue(json['happiness'], 70),
    hunger: doubleValue(json['hunger'], 70),
    entertainment: doubleValue(json['entertainment'], 70),
    love: doubleValue(json['love'], 70),
    energy: doubleValue(json['energy'], 70),
  );

  final double happiness;
  final double hunger;
  final double entertainment;
  final double love;
  final double energy;
}

class MonthlyChoices {
  const MonthlyChoices({
    required this.foodDays,
    required this.entertainmentDays,
    required this.datingDays,
    required this.activity,
    required this.internship,
    required this.debtPayment,
  });

  factory MonthlyChoices.defaults() => const MonthlyChoices(
    foodDays: 20,
    entertainmentDays: 4,
    datingDays: 2,
    activity: 'rest',
    internship: false,
    debtPayment: 0,
  );

  factory MonthlyChoices.fromJson(JsonMap json) {
    final defaults = MonthlyChoices.defaults();
    return MonthlyChoices(
      foodDays: intValue(json['foodDays'], defaults.foodDays),
      entertainmentDays: intValue(
        json['entertainmentDays'],
        defaults.entertainmentDays,
      ),
      datingDays: intValue(json['datingDays'], defaults.datingDays),
      activity: stringValue(json['activity'], defaults.activity),
      internship: boolValue(json['internship'], defaults.internship),
      debtPayment: doubleValue(json['debtPayment'], defaults.debtPayment),
    );
  }

  JsonMap toJson() => {
    'foodDays': foodDays,
    'entertainmentDays': entertainmentDays,
    'datingDays': datingDays,
    'activity': activity,
    'internship': internship,
    'debtPayment': debtPayment.round(),
  };

  MonthlyChoices copyWith({
    int? foodDays,
    int? entertainmentDays,
    int? datingDays,
    String? activity,
    bool? internship,
    double? debtPayment,
  }) => MonthlyChoices(
    foodDays: foodDays ?? this.foodDays,
    entertainmentDays: entertainmentDays ?? this.entertainmentDays,
    datingDays: datingDays ?? this.datingDays,
    activity: activity ?? this.activity,
    internship: internship ?? this.internship,
    debtPayment: debtPayment ?? this.debtPayment,
  );

  final int foodDays;
  final int entertainmentDays;
  final int datingDays;
  final String activity;
  final bool internship;
  final double debtPayment;
}

class VehicleStatus {
  const VehicleStatus({
    required this.type,
    required this.mileage,
    required this.condition,
    required this.broken,
    required this.lastRepairCost,
  });

  factory VehicleStatus.fromJson(JsonMap json) => VehicleStatus(
    type: stringValue(json['type'], 'none'),
    mileage: doubleValue(json['mileage']),
    condition: doubleValue(json['condition'], 100),
    broken: boolValue(json['broken']),
    lastRepairCost: doubleValue(json['lastRepairCost']),
  );

  final String type;
  final double mileage;
  final double condition;
  final bool broken;
  final double lastRepairCost;
}

class OwnedHome {
  const OwnedHome({
    required this.homeId,
    required this.label,
    required this.purchasePrice,
    required this.estimatedValue,
    required this.monthlyUpkeep,
    required this.purchasedMonth,
  });

  factory OwnedHome.fromJson(JsonMap json) => OwnedHome(
    homeId: stringValue(json['homeId']),
    label: stringValue(json['label']),
    purchasePrice: doubleValue(json['purchasePrice']),
    estimatedValue: doubleValue(json['estimatedValue']),
    monthlyUpkeep: doubleValue(json['monthlyUpkeep']),
    purchasedMonth: intValue(json['purchasedMonth']),
  );

  final String homeId;
  final String label;
  final double purchasePrice;
  final double estimatedValue;
  final double monthlyUpkeep;
  final int purchasedMonth;
}

class StockPortfolio {
  const StockPortfolio({required this.invested, required this.value});

  factory StockPortfolio.fromJson(JsonMap json) => StockPortfolio(
    invested: doubleValue(json['invested']),
    value: doubleValue(json['value']),
  );

  final double invested;
  final double value;
}

class AssetHolding {
  const AssetHolding({
    required this.id,
    required this.assetId,
    required this.label,
    required this.category,
    required this.purchasePrice,
    required this.estimatedValue,
    required this.purchasedMonth,
  });

  factory AssetHolding.fromJson(JsonMap json) => AssetHolding(
    id: stringValue(json['_id'] ?? json['id']),
    assetId: stringValue(json['assetId']),
    label: stringValue(json['label']),
    category: stringValue(json['category']),
    purchasePrice: doubleValue(json['purchasePrice']),
    estimatedValue: doubleValue(json['estimatedValue']),
    purchasedMonth: intValue(json['purchasedMonth']),
  );

  final String id;
  final String assetId;
  final String label;
  final String category;
  final double purchasePrice;
  final double estimatedValue;
  final int purchasedMonth;
}

class RoundHistory {
  const RoundHistory({
    required this.month,
    required this.ageMonths,
    required this.path,
    required this.jobTitle,
    required this.income,
    required this.expenses,
    required this.eventTitle,
    required this.eventAmount,
    required this.deathChance,
    required this.died,
    required this.balanceAfter,
    required this.studentDebtAfter,
  });

  factory RoundHistory.fromJson(JsonMap json) => RoundHistory(
    month: intValue(json['month']),
    ageMonths: intValue(json['ageMonths']),
    path: stringValue(json['path']),
    jobTitle: stringValue(json['jobTitle'], 'Unknown job'),
    income: doubleValue(json['income']),
    expenses: doubleValue(json['expenses']),
    eventTitle: stringValue(json['eventTitle']),
    eventAmount: doubleValue(json['eventAmount']),
    deathChance: doubleValue(json['deathChance']),
    died: boolValue(json['died']),
    balanceAfter: doubleValue(json['balanceAfter']),
    studentDebtAfter: doubleValue(json['studentDebtAfter']),
  );

  final int month;
  final int ageMonths;
  final String path;
  final String jobTitle;
  final double income;
  final double expenses;
  final String eventTitle;
  final double eventAmount;
  final double deathChance;
  final bool died;
  final double balanceAfter;
  final double studentDebtAfter;
}

class LastJobApplication {
  const LastJobApplication({
    required this.month,
    required this.jobId,
    required this.jobTitle,
    required this.accepted,
    required this.chance,
    required this.message,
  });

  factory LastJobApplication.fromJson(JsonMap json) => LastJobApplication(
    month: intValue(json['month']),
    jobId: stringValue(json['jobId']),
    jobTitle: stringValue(json['jobTitle']),
    accepted: boolValue(json['accepted']),
    chance: doubleValue(json['chance']),
    message: stringValue(json['message']),
  );

  final int month;
  final String jobId;
  final String jobTitle;
  final bool accepted;
  final double chance;
  final String message;
}

class GameSession {
  const GameSession({
    required this.id,
    required this.status,
    required this.lifePath,
    required this.currentMonth,
    required this.ageMonths,
    required this.balance,
    required this.studentDebt,
    required this.educationMonths,
    required this.major,
    required this.skills,
    required this.careerLevel,
    required this.careerPerformance,
    required this.unemployedMonths,
    required this.completedGoals,
    required this.homeOwned,
    required this.needs,
    required this.monthlyChoices,
    required this.currentJob,
    required this.jobMarket,
    required this.appliedJobIds,
    required this.lastJobApplication,
    required this.expenseSelections,
    required this.housingLeaseMonthsRemaining,
    required this.transportationTermMonthsRemaining,
    required this.vehicleStatus,
    required this.stockPortfolio,
    required this.ownedHome,
    required this.assetHoldings,
    required this.history,
    required this.finalScore,
    required this.deathReason,
    required this.deathRecap,
    required this.completedAt,
  });

  factory GameSession.fromJson(JsonMap json) {
    final jobValue = json['currentJobId'];
    final marketValue = json['jobMarketIds'];
    final expenseJson = mapValue(json['currentExpenseSelections']);

    return GameSession(
      id: stringValue(json['_id'] ?? json['id']),
      status: stringValue(json['status'], 'active'),
      lifePath: stringValue(json['lifePath'], 'work'),
      currentMonth: intValue(json['currentMonth']),
      ageMonths: intValue(json['ageMonths'], 216),
      balance: doubleValue(json['balance']),
      studentDebt: doubleValue(json['studentDebt']),
      educationMonths: intValue(json['educationMonths']),
      major: json['major'] == null ? null : stringValue(json['major']),
      skills: mapValue(
        json['skills'],
      ).map((key, value) => MapEntry(key, intValue(value))),
      careerLevel: intValue(json['careerLevel']),
      careerPerformance: doubleValue(json['careerPerformance']),
      unemployedMonths: intValue(json['unemployedMonths']),
      completedGoals: (json['completedGoals'] as List? ?? const [])
          .map((item) => item.toString())
          .toList(),
      homeOwned: boolValue(json['homeOwned']),
      needs: NeedScores.fromJson(mapValue(json['needs'])),
      monthlyChoices: MonthlyChoices.fromJson(mapValue(json['monthlyChoices'])),
      currentJob: jobValue is Map
          ? Job.fromJson(mapValue(jobValue))
          : Job.placeholder(jobValue),
      jobMarket: marketValue is List
          ? marketValue
                .map(
                  (item) => item is Map ? Job.fromJson(mapValue(item)) : null,
                )
                .whereType<Job>()
                .toList()
          : const <Job>[],
      appliedJobIds: (json['appliedJobIds'] as List? ?? const [])
          .map((item) => item.toString())
          .toList(),
      lastJobApplication: json['lastJobApplication'] == null
          ? null
          : LastJobApplication.fromJson(mapValue(json['lastJobApplication'])),
      expenseSelections: expenseJson.map(
        (key, value) => MapEntry(key, ExpenseOption.fromJson(mapValue(value))),
      ),
      housingLeaseMonthsRemaining: intValue(
        json['housingLeaseMonthsRemaining'],
      ),
      transportationTermMonthsRemaining: intValue(
        json['transportationTermMonthsRemaining'],
      ),
      vehicleStatus: json['vehicleStatus'] == null
          ? null
          : VehicleStatus.fromJson(mapValue(json['vehicleStatus'])),
      stockPortfolio: json['stockPortfolio'] == null
          ? null
          : StockPortfolio.fromJson(mapValue(json['stockPortfolio'])),
      ownedHome: json['ownedHome'] == null
          ? null
          : OwnedHome.fromJson(mapValue(json['ownedHome'])),
      assetHoldings: mapList(
        json['assetHoldings'],
      ).map(AssetHolding.fromJson).toList(),
      history: mapList(json['history']).map(RoundHistory.fromJson).toList(),
      finalScore: json['finalScore'] == null
          ? null
          : doubleValue(json['finalScore']),
      deathReason: json['deathReason'] == null
          ? null
          : stringValue(json['deathReason']),
      deathRecap: json['deathRecap'] == null
          ? null
          : mapValue(json['deathRecap']),
      completedAt: json['completedAt'] == null
          ? null
          : stringValue(json['completedAt']),
    );
  }

  double get fixedExpenses => expenseSelections.values.fold<double>(
    0,
    (total, option) => total + option.monthlyCost,
  );

  double get assetValue {
    final stocks = stockPortfolio?.value ?? 0;
    final home = ownedHome?.estimatedValue ?? 0;
    final assets = assetHoldings.fold<double>(
      0,
      (total, asset) => total + asset.estimatedValue,
    );
    return stocks + home + assets;
  }

  double get netWorth => balance + assetValue - studentDebt;

  int get ageYears => ageMonths ~/ 12;

  int get ageRemainderMonths => ageMonths % 12;

  final String id;
  final String status;
  final String lifePath;
  final int currentMonth;
  final int ageMonths;
  final double balance;
  final double studentDebt;
  final int educationMonths;
  final String? major;
  final Map<String, int> skills;
  final int careerLevel;
  final double careerPerformance;
  final int unemployedMonths;
  final List<String> completedGoals;
  final bool homeOwned;
  final NeedScores needs;
  final MonthlyChoices monthlyChoices;
  final Job currentJob;
  final List<Job> jobMarket;
  final List<String> appliedJobIds;
  final LastJobApplication? lastJobApplication;
  final Map<String, ExpenseOption> expenseSelections;
  final int housingLeaseMonthsRemaining;
  final int transportationTermMonthsRemaining;
  final VehicleStatus? vehicleStatus;
  final StockPortfolio? stockPortfolio;
  final OwnedHome? ownedHome;
  final List<AssetHolding> assetHoldings;
  final List<RoundHistory> history;
  final double? finalScore;
  final String? deathReason;
  final JsonMap? deathRecap;
  final String? completedAt;
}

class LeaderboardEntry {
  const LeaderboardEntry({
    required this.userId,
    required this.name,
    required this.finalScore,
    required this.completedAt,
  });

  factory LeaderboardEntry.fromJson(JsonMap json) => LeaderboardEntry(
    userId: stringValue(json['userId']),
    name: stringValue(json['name'], 'Player'),
    finalScore: doubleValue(json['finalScore']),
    completedAt: stringValue(json['completedAt']),
  );

  final String userId;
  final String name;
  final double finalScore;
  final String completedAt;
}

class HomeOption {
  const HomeOption({
    required this.id,
    required this.label,
    required this.price,
    required this.monthlyUpkeep,
  });

  final String id;
  final String label;
  final double price;
  final double monthlyUpkeep;
}

class AssetOption {
  const AssetOption({
    required this.id,
    required this.label,
    required this.category,
    required this.price,
  });

  final String id;
  final String label;
  final String category;
  final double price;
}

const homeOptions = [
  HomeOption(
    id: 'starter-condo',
    label: 'Starter Condo',
    price: 30000,
    monthlyUpkeep: 180,
  ),
  HomeOption(
    id: 'townhome',
    label: 'Townhome',
    price: 65000,
    monthlyUpkeep: 320,
  ),
  HomeOption(
    id: 'single-family',
    label: 'Single-Family Home',
    price: 120000,
    monthlyUpkeep: 520,
  ),
  HomeOption(id: 'duplex', label: 'Duplex', price: 180000, monthlyUpkeep: 760),
];

const assetOptions = [
  AssetOption(
    id: 'savings-bond',
    label: 'Savings Bond',
    category: 'Conservative',
    price: 1000,
  ),
  AssetOption(
    id: 'collectibles',
    label: 'Collectibles',
    category: 'Speculative',
    price: 2500,
  ),
  AssetOption(
    id: 'classic-car',
    label: 'Classic Car',
    category: 'Collectible',
    price: 8000,
  ),
  AssetOption(
    id: 'crypto',
    label: 'Crypto Basket',
    category: 'Speculative',
    price: 5000,
  ),
  AssetOption(
    id: 'small-business',
    label: 'Small Business Stake',
    category: 'Business',
    price: 15000,
  ),
];
