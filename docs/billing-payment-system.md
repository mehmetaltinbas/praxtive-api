# Billing & Payment System

## Overview

The billing system manages subscriptions, credit-based AI billing, plan feature gates, storage limits, and payment processing. Users subscribe to a plan tier that determines their monthly credit allotment, storage caps, and feature access. AI operations consume credits; non-AI operations (evaluation, PDF export) are free.

Payment providers use the **Strategy + Factory + Barrel** pattern — Stripe and Iyzico are interchangeable, with the user choosing at checkout.

---

## Plan Tiers

| Field             | Free           | Plus           | Pro            |
| ----------------- | -------------- | -------------- | -------------- |
| `monthlyPrice`    | 0              | (configurable) | (configurable) |
| `monthlyCredits`  | (configurable) | (configurable) | (configurable) |
| `maximumCredits`  | (configurable) | (configurable) | (configurable) |
| `maxSources`      | 5              | 20             | -1 (unlimited) |
| `maxExerciseSets` | 10             | 40             | -1 (unlimited) |

**Tier rank** (`src/plan/constants/plan-tier-rank.constant.ts`): `FREE=0, PLUS=1, PRO=2`. Used by `PlanService.validateIsHigher/Lower()` and `PlanFeatureGuard` for numeric comparisons instead of hardcoded if/else chains.

**Enum:** `PlanName` — `FREE='free'`, `PLUS='plus'`, `PRO='pro'`

---

## Architecture

### Modules

| Module                      | Responsibility                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| **SubscriptionModule**      | Subscription lifecycle, cron renewals, grace period retries, `getActivePlanForUser()`        |
| **PaymentModule**           | Payment records, provider strategies (Stripe/Iyzico), provider factory, Proration calculations                       |
| **PlanModule**              | Plan definitions, plan hierarchy validation, `PlanFeatureGuard`, `@RequiresPlanFeature`      |
| **CreditTransactionModule** | Credit transaction audit log, `CreditEstimationService`, `CreditGuardService`                                                                |
| **UserModule**              | User entity, `creditBalance`, `incrementCreditBalance()` , `deductCreditBalance()`           |
| **AiModule**                | `TokenCounterService`                                                                        |

### Data Flow — Credit Deduction

```
Controller (with @RequiresPlanFeature if needed)
  → Service.create() / generateX()
      ├── SubscriptionService.getActivePlanForUser() → storage limit check
      ├── CreditEstimationService.estimateX() → calculate credit cost
      │     └── TokenCounterService.countTokens() → Gemini API (free)
      ├── CreditGuardService.assertAndDeduct() (inside MongoDB session)
      │     ├── UserService.deductCreditBalanceAtomically() → atomic $gte + $inc
      │     └── CreditTransactionService.create() → audit log
      └── AiService.generateX() → actual AI call
```

### Data Flow — Subscription Operations

```
User → SubscriptionController → SubscriptionService
                                    ├── PlanService (validate plan hierarchy)
                                    ├── PaymentProviderFactory → resolveStrategy(provider)
                                    ├── PaymentService (record payment attempt, calculate proration)
                                    ├── UserService (update creditBalance)
                                    └── CreditTransactionService (log transaction)
```

---

## Module Scoping

Each DB model is only accessible from its own module's service. Cross-module data access goes through exported services:

| Model             | Owning Service             | Module                  |
| ----------------- | -------------------------- | ----------------------- |
| User              | `UserService`              | UserModule              |
| CreditTransaction | `CreditTransactionService` | CreditTransactionModule |
| Source            | `SourceService`            | SourceModule            |
| ExerciseSet       | `ExerciseSetService`       | ExerciseSetModule       |
| Subscription      | `SubscriptionService`      | SubscriptionModule      |
| Plan              | `PlanService`              | PlanModule              |

**Free subscription on signup:** `AuthService` directly calls `SubscriptionService.createInitialFreeSubscription()` after creating a user. This is possible without circular dependencies because user creation lives in AuthModule, not UserModule.

## Subscription Lifecycle

### Statuses

| Status            | Description                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `active`          | Current running subscription                                                                        |
| `canceled`        | Marked for cancellation at end of billing cycle                                                     |
| `pendingActivate` | New plan waiting to activate at next billing cycle                                                  |
| `expired`         | Terminal state — subscription ended (upgrade replacement, downgrade cycle, or grace period failure) |
| `gracePeriod`     | Payment failed, retrying (up to 3 attempts over 7 days)                                             |

### Constraints

Per user, max 1 each of: `active`, `canceled`, `pendingActivate`.

### Flows

**Registration** → `AuthService` calls `SubscriptionService.createInitialFreeSubscription()` → creates free plan subscription (`active`) → grants initial monthly credits (transaction-logged via `MONTHLY_GRANT`)

**Upgrade** → Old sub → `expired` → New `active` sub → Payment charged → Credits granted (`PLAN_UPGRADE_GRANT`, capped at plan max)

**Downgrade** → Current sub → `canceled` → New `pendingActivate` sub → At next billing cycle: cron expires old, activates new

**Monthly Renewal** (cron, every 12h):

1. Process pending downgrades
2. Process active renewals (charge, grant credits `MONTHLY_GRANT`, bump nextBillingDate)
3. Process grace period retries

**Grace Period**: Retry on day 1, 3, 7. After 3 failures → auto-downgrade to free.

---

## Credit System

### Balance

- Stored on `User.creditBalance` (default: `0`)
- New users get credits through the signup event handler, not the model default
- Each plan has `maximumCredits` — credits are never granted beyond this cap
- Monthly grant formula: `min(plan.monthlyCredits, plan.maximumCredits - currentBalance)`, clamped >= 0

### Atomic Deduction

`UserService.deductCreditBalanceAtomically(userId, amount, session)`:

```
User.findOneAndUpdate(
  { _id: userId, creditBalance: { $gte: amount } },
  { $inc: { creditBalance: -amount } },
  { session }
)
```

If null → `ForbiddenException('Insufficient credits. Required: N, available: M')`. This prevents race conditions — two concurrent requests that would overdraw the balance will have only one succeed.

### Transaction Types

| Type                                 | Direction | When                                |
| ------------------------------------ | --------- | ----------------------------------- |
| `SIGNUP_GRANT`                       | grant     | (reserved for future use)           |
| `MONTHLY_GRANT`                      | grant     | Monthly renewal + initial signup    |
| `PLAN_UPGRADE_GRANT`                 | grant     | On plan upgrade                     |
| `TOP_UP_PURCHASE`                    | grant     | (reserved for future use)           |
| `AUDIO_TRANSCRIPTION`                | deduction | Audio source creation               |
| `EXERCISE_SET_GENERATION`            | deduction | Exercise set creation with AI       |
| `EXERCISE_SET_ADDITIONAL_GENERATION` | deduction | Additional exercises generation     |
| `PAPER_VISION_EXTRACTION`            | deduction | Paper answer extraction from images |
| `LECTURE_NOTES_GENERATION`           | deduction | Lecture notes generation            |

Amount is always stored as positive. The type determines direction (see `CREDIT_TRANSACTION_DIRECTIONS` constant).

---

## Credit Deduction per Operation

| Operation                               | Credits? | Costing Method                                                 |
| --------------------------------------- | -------- | -------------------------------------------------------------- |
| **Audio source creation**               | Yes      | `ceil(durationSeconds * AUDIO_RATE_PER_SECOND)`                |
| **Raw text / document source creation** | No       | No AI involved (uses `plainTextToTipTap` utility)              |
| **Exercise set generation**             | Yes      | Token-based: input tokens + (count \* MAX_OUTPUT per exercise) |
| **Additional exercise generation**      | Yes      | Token-based (includes existing prompts in input)               |
| **Paper vision extraction**             | Yes      | `VISION_TOKENS_PER_IMAGE * imageCount` + text tokens           |
| **Lecture notes generation**            | Yes      | Token-based: prompt tokens + MAX_OUTPUT                        |
| **Answer evaluation**                   | **FREE** | No credit deduction                                            |
| **Save generated notes**                | No       | Creates a RAW_TEXT source (no AI)                              |
| **PDF export**                          | **FREE** | No AI involved                                                 |
| **Clone exercise set**                  | **FREE** | Data copy, no AI                                               |

### Credit Formula

```
Math.ceil(inputTokens * INPUT_TOKEN_RATE + maxOutputTokens * OUTPUT_TOKEN_RATE)
```

All rates are tunable in `src/credit-transaction/constants/credit-rates/`.

---

## Cost Estimation

### Token Counting

`TokenCounterService` (`src/ai/services/token-counter.service.ts`) uses the Gemini `countTokens` API:

- **Free** (no billing from Google)
- **Deterministic** — same text always produces the same count
- **Server-side** — consistent regardless of client

### Prompt Extraction Pattern

AI prompts are extracted into pure functions in `src/ai/prompts/`:

- `buildGenerateExercisesPrompt()`
- `buildEvaluateAnswerPrompt()`
- `buildExtractPaperAnswersPrompt()`
- `buildGenerateLectureNotesPrompt()`

Both `AiService` and `CreditEstimationService` import and call the same prompt builders. This guarantees the estimate matches the actual cost exactly.

### CreditEstimationService Methods

Each returns `{ credits: number, breakdown: Record<string, number> }`:

| Method                                   | Input                                          |
| ---------------------------------------- | ---------------------------------------------- |
| `estimateAudioTranscription()`           | durationSeconds                                |
| `estimateExerciseSetGeneration()`        | text, type, difficulty, count                  |
| `estimateAdditionalExerciseGeneration()` | text, type, difficulty, count, existingPrompts |
| `estimatePaperVisionExtraction()`        | imageCount, exerciseSummary                    |
| `estimateLectureNotesGeneration()`       | exerciseData array                             |

---

## Estimate Endpoints

| Method | Endpoint                                               | Body                                                 | Returns                  |
| ------ | ------------------------------------------------------ | ---------------------------------------------------- | ------------------------ |
| `POST` | `/source/estimate`                                     | `CreateSourceDto` (with `durationSeconds` for audio) | `{ credits, breakdown }` |
| `POST` | `/exercise-set/estimate/:contextId`                    | `CreateExerciseSetDto`                               | `{ credits, breakdown }` |
| `POST` | `/exercise-set/estimate-additional/:exerciseSetId`     | `GenerateAdditionalExercisesDto`                     | `{ credits, breakdown }` |
| `POST` | `/exercise-set/estimate-evaluate-paper-answers/:id`    | `{ imageCount: number }`                             | `{ credits, breakdown }` |
| `POST` | `/exercise-set/estimate-generate-notes/:exerciseSetId` | —                                                    | `{ credits, breakdown }` |

No estimate needed for `evaluateAnswers` (it's free).

---

## Plan Feature Gates

### Features

| Feature                   | Minimum Tier | Gate Type                                               |
| ------------------------- | ------------ | ------------------------------------------------------- |
| Vision paper extraction   | Plus         | `@UseGuards(PlanFeatureGuard)` + `@RequiresPlanFeature` |
| Lecture notes generation  | Plus         | `@UseGuards(PlanFeatureGuard)` + `@RequiresPlanFeature` |
| MIX type or difficulty    | Plus         | Service-level check (depends on DTO values)             |
| Weak point focus practice | Plus         | (reserved for future use)                               |

### How It Works

`PlanFeatureGuard` (`src/plan/guards/plan-feature.guard.ts`):

1. Reads `PlanFeature` metadata from the handler via `Reflector`
2. Calls `subscriptionService.getActivePlanForUser(userId)` to get the user's plan
3. Compares `PLAN_TIER_RANK[plan.name]` against `PLAN_TIER_RANK[PLAN_FEATURE_MINIMUM_TIER[feature]]`
4. Throws `ForbiddenException('This feature requires a plus plan or higher')` if too low

The guard is **provided per consuming module** (not in PlanModule) to avoid circular dependencies with SubscriptionModule.

**MIX gating** is checked in `ExerciseSetService.assertMixFeatureAllowed()` instead of a guard because it depends on DTO values (`dto.type === MIX || dto.difficulty === MIX`), which guards don't have access to.

### Gated Endpoints

| Controller                    | Method                       | Feature                    |
| ----------------------------- | ---------------------------- | -------------------------- |
| `ExerciseSetController`       | `evaluatePaperAnswers`       | `VISION_PAPER_EXTRACT`     |
| `ExerciseSetController`       | `generateLectureNotes`       | `LECTURE_NOTES_GENERATION` |
| `PublicExerciseSetController` | `evaluatePublicPaperAnswers` | `VISION_PAPER_EXTRACT`     |

---

## Storage Limits

Enforced **on creation only** — users keep all existing data after a downgrade. They just can't create new items until they're under the limit or upgrade.

Checked inline in each service's `create()` method:

```
const plan = await this.subscriptionService.getActivePlanForUser(userId);
if (plan.maxSources !== -1) {
    const count = await this.db.Source.countDocuments({ userId });
    if (count >= plan.maxSources) throw new ForbiddenException(...);
}
```

Same pattern for exercise sets with `plan.maxExerciseSets`.

`-1` means unlimited (Pro plan).

---

## Payment Strategy Pattern

### File Structure

```
src/payment/
├── payment.module.ts
├── payment.service.ts
├── enums/
│   ├── payment-status.enum.ts        # pending, succeeded, failed, refunded
│   └── payment-provider-name.enum.ts # stripe, iyzico
├── types/
│   └── payment-document.interface.ts
└── strategies/provider/
    ├── payment-provider-strategy.interface.ts
    ├── payment-provider.factory.ts
    ├── payment-provider-strategies.barrel.ts
    ├── types/
    │   ├── charge-params.interface.ts
    │   ├── charge-result.interface.ts
    │   └── refund-result.interface.ts
    └── implementations/
        ├── stripe-payment-provider.strategy.ts
        └── iyzico-payment-provider.strategy.ts
```

### Adding a New Payment Provider

1. Create `implementations/<name>-payment-provider.strategy.ts`
2. Implement `PaymentProviderStrategy` with `readonly type = PaymentProviderName.<NAME>`
3. Add to barrel array
4. Add enum value to `PaymentProviderName`
5. Add env vars

The factory auto-registers via `OnModuleInit`.

---

## Frontend Integration

### Subscription Endpoints (unchanged)

| Method | Endpoint                                      | Body                                                   |
| ------ | --------------------------------------------- | ------------------------------------------------------ |
| `POST` | `/subscription/upgrade`                       | `{ newPlanName, paymentProvider, paymentMethodToken }` |
| `POST` | `/subscription/downgrade`                     | `{ newPlanName }`                                      |
| `POST` | `/subscription/cancel-downgrade`              | —                                                      |
| `POST` | `/subscription/check-price-to-pay-on-upgrade` | `{ newPlanName }`                                      |

### Credit Estimate Flow

Before any credit-consuming operation, the frontend should:

1. Call the estimate endpoint to get the credit cost
2. Display the cost to the user
3. On confirmation, call the actual create/generate endpoint

### Error Handling

| HTTP            | Meaning                                                        |
| --------------- | -------------------------------------------------------------- |
| `403 Forbidden` | Feature requires a higher plan tier                            |
| `403 Forbidden` | Insufficient credits (message includes required vs. available) |
| `403 Forbidden` | Storage limit reached (message includes current limit)         |

---

## Environment Variables

```env
# Gemini (token counting — free API, no billing)
GEMINI_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Iyzico
IYZICO_API_KEY=sandbox-...
IYZICO_SECRET_KEY=sandbox-...
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

# Existing
PORT=3000
DB_CONNECTION=mongodb://...
DB_NAME=extralyz
JWT_COOKIE_NAME=...
JWT_SECRET=...
JWT_EXPIRES_IN=...
CLIENT_URL=http://localhost:3001
OPENAI_API_KEY=sk-...
```

---

## Database Models

### Payment

| Field                   | Type                                        | Required |
| ----------------------- | ------------------------------------------- | -------- |
| `user`                  | ObjectId (ref: User)                        | Yes      |
| `subscription`          | ObjectId (ref: Subscription)                | Yes      |
| `amount`                | Number                                      | Yes      |
| `currency`              | String                                      | Yes      |
| `provider`              | Enum (stripe, iyzico)                       | Yes      |
| `status`                | Enum (pending, succeeded, failed, refunded) | Yes      |
| `providerTransactionId` | String                                      | No       |
| `failureReason`         | String                                      | No       |

### Plan (updated)

| Field             | Type                   | Description                                 |
| ----------------- | ---------------------- | ------------------------------------------- |
| `name`            | Enum (free, plus, pro) | Unique plan identifier                      |
| `monthlyPrice`    | Number                 | Price per month                             |
| `monthlyCredits`  | Number                 | Credits granted each month                  |
| `maximumCredits`  | Number                 | Credit balance cap                          |
| `maxSources`      | Number                 | Source storage limit (-1 = unlimited)       |
| `maxExerciseSets` | Number                 | Exercise set storage limit (-1 = unlimited) |

### Subscription (updated for grace period)

| Field                | Type                | Description                    |
| -------------------- | ------------------- | ------------------------------ |
| `paymentRetryCount`  | Number (default: 0) | Payment retry attempts         |
| `lastPaymentAttempt` | Date                | Last payment attempt timestamp |
| `gracePeriodEnd`     | Date                | Grace period expiry            |

---

## Key Design Decisions

1. **Token-based costing, not flat-rate** — Different operations have vastly different AI costs. A flat "1 credit per operation" would either overprice simple operations or underprice complex ones.

2. **Gemini countTokens for estimation** — Free, deterministic, server-side. The estimate endpoint and the actual deduction use the same prompt builders, guaranteeing the estimate matches the charge exactly.

3. **Prompt extraction into pure functions** — `src/ai/prompts/*.prompt.ts` are imported by both `AiService` (for AI calls) and `CreditEstimationService` (for token counting). No module dependency needed since they're pure functions.

4. **Atomic credit deduction** — MongoDB `findOneAndUpdate` with `{ creditBalance: { $gte: amount } }` prevents race conditions. Two concurrent requests that would overdraw the balance: only one succeeds.

5. **Storage limits on creation only** — No retroactive archiving on downgrade. Users keep all existing data but can't create new items until they're under the limit or upgrade. Simpler UX and implementation.

6. **Answer evaluation is free** — Core learning loop shouldn't be paywalled. Paper vision extraction costs credits (AI vision call), but the subsequent answer evaluation is free.

7. **MIX gating in service, not guard** — MIX type/difficulty depends on DTO values, which NestJS guards don't have typed access to. Checked via `assertMixFeatureAllowed()` in the service layer instead.

8. **PlanFeatureGuard per consuming module** — Provided in ExerciseSetModule, not PlanModule, to avoid circular dependencies with SubscriptionModule.

9. **Direct call for signup** — `AuthService` calls `SubscriptionService.createInitialFreeSubscription()` directly. No circular dependency since user creation lives in AuthModule, not UserModule.

10. **Credit balance default: 0** — Initial credits are granted through the signup event handler as a proper `MONTHLY_GRANT` transaction, not a magic model default. This ensures every credit is auditable.
