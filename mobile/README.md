# MoneySim Mobile

Flutter mobile client for the MoneySim finance simulation API in this repo.

## Run Locally

Start the backend first:

```bash
cd ../backend
npm run seed
npm run dev
```

Then run the mobile app. The app uses the production API at
`https://moneysim.app/api` by default:

```bash
flutter run
```

For development against a local backend, override the API at build/run time.
For Android emulator, use:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5050/api
```

## Verify

```bash
flutter analyze
flutter test
flutter build apk --debug
```

## Current Coverage

- Sign in, sign up, resend verification, and forgot password requests
- Persisted access token
- Dashboard catalog loading and active-run resume
- Start work or college runs
- Monthly planning and month/year advancement
- Needs, career, job applications, expenses, education, history
- Student debt, stock, home, car, and other asset actions
- End-run recap and leaderboard
