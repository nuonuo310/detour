# Preview spike local run

1. Install Node 22+ and run `npm install`.
2. Run `npx playwright install chromium` once.
3. Keep authenticated Meituan H5 session data local. Never paste cookies into the repository or Actions.
4. Export the local environment variables shown in `.env.meituan.example`.
5. Run `npm run meituan:preview:probe`.

The probe only calls the preview endpoint and prints a redacted summary. It does not submit an order or initiate payment.
