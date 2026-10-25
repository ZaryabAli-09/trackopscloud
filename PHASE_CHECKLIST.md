# TrackOpsCloud implementation checklist

- [x] Phase 0: installable, buildable, clean. `npm ci`, typecheck, lint, build and test passed.
- [x] Phase 1: shadcn foundation and server guarded layouts. Typecheck, lint, build and test passed.
- [ ] Phase 2: route authorization, ledger integrity, tokens, rate limits, uploads and email. Run all phase checks.
- [ ] Phase 3: real company and platform admin pages. Run all phase checks.
- [ ] Phase 4: transaction and security tests and final verification.

## Phase 0 progress

- [x] Split public and lazy server configuration; cache MongoDB connection on `globalThis`.
- [x] Remove duplicate scripts, default landing page and unused public SVGs.
- [x] Update Nodemailer peer version and Node typings; document production NextAuth v4 secrets and URL.
- [x] Finish clean install, lint, typecheck, build and test gate.

## Phase 1 notes

- [x] Generated neutral theme and UI files with shadcn CLI; removed old primitives and toast dependency.
- [x] Shared Sidebar shell, mobile Sheet, NavUser, server DB guards, auth Field forms and root Sonner toaster.
- [x] Current shadcn `form` registry item contains no file; generated `field` is used with React Hook Form.
