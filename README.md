# TrackOpsCloud

Multi-tenant inventory and sales ledger built with Next.js App Router, MongoDB, Mongoose and NextAuth v4.

## Local setup

1. Install Node.js 20 or newer and a MongoDB replica set (transactions require one). MongoDB Atlas is suitable.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` and fill in the values. Keep `.env` private.
4. Run `npm run seed:platform-admin` once to create the initial platform administrator. The seed script skips an existing administrator and never changes its password.
5. Run `npm run dev` and open the URL in `NEXTAUTH_URL`.

## Environment

`MONGODB_URI` must point to a MongoDB replica set. `MONGODB_DB_NAME` optionally overrides the database in the URI.

NextAuth v4 uses `NEXTAUTH_URL` as its canonical public URL in production. Set `NEXTAUTH_SECRET` to a stable random value of at least 32 characters. `AUTH_SECRET` is accepted as an alias by this app; keep the two equal if both are present. Changing the secret invalidates existing JWTs. The session lifetime is 60 days, but the API rechecks user status, company status and session version for each request.

`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL` and `NEXT_PUBLIC_PLATFORM_SUPPORT_EMAIL` contain public values used by browser components. Configure them in production; they are not secrets. `GMAIL_SMTP_EMAIL` and `GMAIL_SMTP_APP_PASSWORD` configure Gmail SMTP with an app password. Set `SMTP_FROM` to a real sender address accepted by the Gmail account. Cloudinary requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` for uploads.

## Checks

Run `npx tsc --noEmit`, `npm run lint`, `npm run build` and `npm test`. See `PHASE_CHECKLIST.md` for implementation progress.
