# Payment Setup & Local Demo

This project includes an offline-first payment integration so you can run locally and test checkout flows without providing live API keys.

How it works

- By default the app uses a mock payment provider (`VITE_PAYMENT_PROVIDER=mock`).
- The mock provider creates local checkout "sessions" and redirects to a local success URL so you can test the UX end-to-end.
- You can switch to real providers (Stripe/Razorpay/PayU) by setting `VITE_PAYMENT_PROVIDER` and adding credentials to your deployment environment. This repo does not store any secrets.

Local run (demo mode)

```bash
# install deps
npm install

# start dev server (mock payments enabled by default)
npm run dev
```

Config

- `VITE_PAYMENT_PROVIDER` defaults to `mock`. Set to `stripe` to keep the existing Stripe flow (requires server-side functions and keys).
- Real provider keys should be provided as environment variables in your hosting platform (Vercel/Netlify/etc.)

Notes

- As requested, this implementation does not require API keys to run locally — mock gateway will be used.
- For production, you should provide real keys (never commit them to the repository). The codebase supports plugging in provider SDK wrappers under `src/services/paymentProviders/`.
