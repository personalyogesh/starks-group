This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Firebase environment variables

This project expects Firebase client config in `.env.local`:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (must match Firebase Console; can be `*.appspot.com` or `*.firebasestorage.app`)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

If you see Firebase Storage upload failures that look like a “CORS” error, double-check
`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` matches the `storageBucket` value shown in Firebase Console → Project settings → Your apps → `firebaseConfig`.

## Firebase Security Rules (Launch Required)

This repo now includes version-controlled rules:

- `firestore.rules`
- `storage.rules`

The root `firebase.json` is configured to deploy them.

### Deploy rules

From the repo root (after you’ve set your Firebase project via `firebase use`):

```bash
firebase deploy --only firestore:rules,storage
```

### Deploy functions (admin claims helpers)

```bash
cd functions
npm install
npm run deploy
```

### Quick verification (recommended before launch)

- **Guest** can browse:
  - `/` (landing)
  - `/dashboard` (public feed)
  - `/partners`
  - `/events`
- **New user** can register/login but is **pending**:
  - Can browse, but can’t create posts / comment / like / RSVP / create partners
- **Admin** can:
  - approve users (`/admin`)
  - manage partners (`/admin/partners`)
  - manage carousel (landing page admin modal)

## Deploying to Vercel (Next.js + Firebase)

- **No `vercel.json` needed** for this Next.js app.
- **Set environment variables** in Vercel → Project → Settings → Environment Variables:
  - Add the same `NEXT_PUBLIC_FIREBASE_*` values you use locally.

### Firebase Authorized Domains (Google sign-in)

In Firebase Console → Authentication → Settings → Authorized domains, add:
- `localhost`
- your Vercel domain (e.g. `starks-group-work.vercel.app`)
- your custom domain (e.g. `www.starksgroup.org` and `starksgroup.org`)

Note: Firebase does **not** support wildcard authorized domains for Vercel preview URLs.

## Maintenance mode (kill switch)

This repo includes a global maintenance mode you can toggle via an env var.

- **Enable**: set `MAINTENANCE_MODE=1` in Vercel env vars (and redeploy)
- **Disable**: remove it or set `MAINTENANCE_MODE=0`

When enabled, all routes are routed to:
- `/maintenance`

## Brute-force / abuse mitigation (recommended)

Client-side protections help UX, but real protection should be layered:

- **Firebase Auth**:
  - Firebase enforces rate limits and returns `auth/too-many-requests` when abused.
- **Vercel / Edge / WAF** (recommended):
  - Use Vercel Firewall / WAF / rate limiting if available on your plan.
- **Firebase App Check** (recommended for production):
  - Enable App Check to reduce unauthorized usage of Firebase resources from non-app clients.

This app also includes a small client-side login cooldown after repeated failed attempts to reduce accidental hammering.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
