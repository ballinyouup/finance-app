import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:moneysim_mobile/src/app.dart';

void main() {
  testWidgets('MoneySim app renders auth screen', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const MoneySimMobileApp());
    await tester.pumpAndSettle();

    expect(find.text('Sign In'), findsWidgets);
    expect(find.text('API URL'), findsNothing);
  });
}
