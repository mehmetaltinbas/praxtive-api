All phases complete with clean compilation. Here's a summary of everything that was done:

---

Phase 0 — Bug Fixes:

- Replaced console.log/error with NestJS Logger in SubscriptionService
- Fixed missing .session(session) on reads in cancelDowngradeWithSession
- Fixed negative credit grant with Math.max(0, ...)
- Moved pendingActivateSub check inside transaction to prevent race conditions
- Stored proration result (was discarded)
- Removed unused injections from BillingService, eliminated circular dependency

Phase 1 — Subscription Uniqueness:

- Added 3 partial unique indexes (active, canceled, pendingActivate) on subscription.model.ts
- Added app-level validation in create() with ConflictException
- Created scripts/fix-duplicate-subscriptions.script.ts for data cleanup

Phase 2 — Payment Model:

- Created PaymentStatus and PaymentProviderName enums
- Created payment.model.ts with all fields + indexes
- Created PaymentService with CRUD methods
- Registered in DB_MODELS, DbModels interface, and AppModule

Phase 3 — Payment Strategy Pattern:

- Created PaymentProviderStrategy interface following project conventions
- Implemented StripePaymentProviderStrategy and IyzicoPaymentProviderStrategy
- Created factory + barrel matching SourceTypeFactory pattern
- Installed stripe and iyzipay packages

Phase 4 — Payment Integration:

- Added paymentProvider and paymentMethodToken to UpgradeSubscriptionDto
- Wired payment processing into upgrade() — creates Payment record, charges via strategy, marks success/failure
- Saves payment info on subscription for future renewals
- Skips payment for free plans

Phase 5 — Grace Period & Retry:

- Added GRACE_PERIOD status, paymentRetryCount, lastPaymentAttempt, gracePeriodEnd fields
- Cron now tracks success/failure/downgraded counts for retries
- 3 retries over 7 days, then auto-downgrade to free plan

Phase 6 — Auto-create Free Subscription:

- Installed @nestjs/event-emitter, registered EventEmitterModule
- UserService.create() now emits user.created event
- SubscriptionService handles it with @OnEvent('user.created') to create free subscription
- Created scripts/seed-plans.script.ts for idempotent plan seeding

Phase 7 — BillingService: Already cleaned up in Phase 0.

Docs: Created docs/billing-payment-system.md with full architecture, frontend integration guide, and env vars.
