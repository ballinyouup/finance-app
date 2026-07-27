import 'package:intl/intl.dart';

final _currencyFormatter = NumberFormat.currency(
  locale: 'en_US',
  symbol: r'$',
  decimalDigits: 0,
);

final _dateFormatter = DateFormat.yMMMd('en_US');

String money(num value) => _currencyFormatter.format(value);

String signedMoney(num value) => '${value >= 0 ? '+' : ''}${money(value)}';

String dateLabel(String? value) {
  if (value == null || value.isEmpty) {
    return 'Unknown';
  }

  final parsed = DateTime.tryParse(value);
  if (parsed == null) {
    return value;
  }

  return _dateFormatter.format(parsed.toLocal());
}
