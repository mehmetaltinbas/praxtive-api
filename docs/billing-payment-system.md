# Billing & Payment System

## Overview

The billing system manages subscriptions, payment processing, credit allocation, and plan management. It uses the **Strategy + Factory + Barrel** pattern (see `strategy-pattern.md`) for payment providers, allowing Stripe and Iyzico to be used interchangeably — with the user choosing their provider at checkout.

---

## Architecture

### Modules

| Module | Responsibility |
|---|---|
| **SubscriptionModule** | Subscription lifecycle (create, upgrade, downgrade, renew, expire), cron-based renewals, grace period retries |
| **PaymentModule** | Payment record tracking, payment provider strategies (Stripe/Iyzico), provider factory |
| **BillingModule** | Proration calculations |
| **PlanModule** | Plan definitions (free/pro/business), plan hierarchy validation |
| **CreditTransactionModule** | Credit transaction audit log |
| **UserModule** | User entity including `creditBalance` field |

### Data Flow

```
User → SubscriptionController → SubscriptionService
                                    ├── PlanService (validate plan hierarchy)
                                    ├── BillingService (calculate proration)
                                    ├── PaymentProviderFactory → resolveStrategy(provider)
                                    │                              ├── StripePaymentProviderStrategy
                                    │                              └── IyzicoPaymentProviderStrategy
                                    ├── PaymentService (record payment attempt)
                                    ├── UserService (update creditBalance)
                                    └── CreditTransactionService (log transaction)
```

---

## Subscription Lifecycle

### Statuses

| Status | Description |
|---|---|
| `active` | Current running subscription |
| `canceled` | Marked for cancellation at end of billing cycle (downgrade pending) |
| `pendingActivate` | New plan waiting to activate at next billing cycle |
| `expired` | Previous subscription that has ended |
| `upgradedFrom` | Previous subscription replaced by an upgrade |
| `gracePeriod` | Payment failed, retrying (up to 3 attempts over 7 days) |

### Constraints

Per user, the database enforces (via partial unique indexes):
- Max **1** `active` subscription
- Max **1** `canceled` subscription
- Max **1** `pendingActivate` subscription

All other subscriptions must have terminal statuses (`expired`, `upgradedFrom`).

### Flows

**Registration** → Auto-creates a `free` plan subscription (`active` status)

**Upgrade** → Old subscription becomes `upgradedFrom` → New `active` subscription created → Payment charged via selected provider → Credits granted (capped at plan max)

**Downgrade** → Current subscription becomes `canceled` → New `pendingActivate` subscription created → At next billing cycle: cron expires old, activates new

**Monthly Renewal** (cron, every 12h):
1. Process pending downgrades (canceled → expired, pendingActivate → active)
2. Process active renewals (charge payment for paid plans, grant credits, bump nextBillingDate)
3. Process grace period retries (retry failed payments on schedule)

**Grace Period** (failed payment):
- Retry schedule: day 1, day 3, day 7
- After 3 failures → auto-downgrade to free plan

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

### Interface

```typescript
interface PaymentProviderStrategy {
    readonly type: PaymentProviderName;
    charge(params: ChargeParams): Promise<ChargeResult>;
    refund(providerTransactionId: string, amount: number): Promise<RefundResult>;
}
```

### Adding a New Payment Provider

1. Create `src/payment/strategies/provider/implementations/<name>-payment-provider.strategy.ts`
2. Implement `PaymentProviderStrategy` with `readonly type = PaymentProviderName.<NAME>`
3. Add the class to the barrel array
4. Add the enum value to `PaymentProviderName`
5. Add env vars to `.env` files

The factory auto-registers it via `OnModuleInit`.

---

## Frontend Integration Points

### 1. Subscription Endpoints

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/subscription/upgrade` | `{ newPlanName, paymentProvider, paymentMethodToken }` | Upgrade to higher plan |
| `POST` | `/subscription/downgrade` | `{ newPlanName }` | Schedule downgrade (no payment needed) |
| `POST` | `/subscription/cancel-downgrade` | — | Cancel a pending downgrade |
| `POST` | `/subscription/check-price-to-pay-on-upgrade` | `{ newPlanName }` | Preview prorated price before upgrading |

### 2. Payment Flow (Frontend Responsibility)

The frontend must:

1. **Tokenize payment method client-side** using the provider's SDK:
   - **Stripe**: Use `Stripe.js` / `@stripe/stripe-js` to create a `PaymentMethod` or `Token`
   - **Iyzico**: Use Iyzico's checkout form JS SDK to get the payment token

2. **Send the token to the backend** in the upgrade request:
   ```json
   {
     "newPlanName": "pro",
     "paymentProvider": "stripe",
     "paymentMethodToken": "pm_1234567890..."
   }
   ```

3. **Display plan options** fetched from `GET /plan/read-by-name/:planName`

4. **Let user choose payment provider** (stripe or iyzico) at checkout

5. **Handle subscription states** in the UI:
   - Show current plan and next billing date
   - Show "downgrade pending" badge if a `pendingActivate` sub exists
   - Show "payment issue" banner if subscription is in `gracePeriod`

### 3. Client-Side SDK Setup

**Stripe:**
```
npm install @stripe/stripe-js
```
Initialize with `STRIPE_PUBLISHABLE_KEY` (exposed to frontend).

**Iyzico:**
Load Iyzico's checkout form script from their CDN. Initialize with your Iyzico public key.

---

## Environment Variables

### Payment Providers

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...          # Backend only — used for charging
STRIPE_PUBLISHABLE_KEY=pk_test_...     # Shared with frontend — used for tokenization

# Iyzico
IYZICO_API_KEY=sandbox-...             # Backend only
IYZICO_SECRET_KEY=sandbox-...          # Backend only
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com  # Use sandbox for dev, production URL for prod
```

### Existing Vars (Already in .env)

```env
PORT=3000
DB_CONNECTION=mongodb://...
DB_NAME=extralyz
JWT_COOKIE_NAME=...
JWT_SECRET=...
JWT_EXPIRES_IN=...
CLIENT_URL=http://localhost:3001
LOCAL_MOBILE_CLIENT_URL=http://...
BCRYPT_SALT_OR_ROUNDS=10
OPENAI_API_KEY=sk-...
```

---

## Database Models

### Payment (new)

| Field | Type | Required | Description |
|---|---|---|---|
| `user` | ObjectId (ref: User) | Yes | Who made the payment |
| `subscription` | ObjectId (ref: Subscription) | Yes | Which subscription this payment is for |
| `amount` | Number | Yes | Payment amount |
| `currency` | String | Yes (default: 'TRY') | Currency code |
| `provider` | Enum (stripe, iyzico) | Yes | Which payment provider was used |
| `status` | Enum (pending, succeeded, failed, refunded) | Yes | Payment status |
| `providerTransactionId` | String | No | Provider's transaction ID for reconciliation |
| `failureReason` | String | No | Why the payment failed (if applicable) |

### Subscription (updated)

New fields added for grace period tracking:

| Field | Type | Description |
|---|---|---|
| `paymentRetryCount` | Number (default: 0) | How many payment retries have been attempted |
| `lastPaymentAttempt` | Date | When the last payment attempt was made |
| `gracePeriodEnd` | Date | When grace period expires (7 days after first failure) |

---

## Credit System

- **Balance**: Stored on `User.creditBalance` (default: 50 for new users)
- **Cap**: Each plan has `maximumCredits` — credits are never granted beyond this cap
- **Monthly grant**: `min(plan.monthlyCredits, plan.maximumCredits - currentBalance)`, clamped to >= 0
- **Transactions**: Every credit change is logged in `CreditTransaction` with a type (monthly, planUpgrade, oneTime, sourceProcess, exerciseSetGeneration)
- **Deductions**: Use `UserService.updateCreditBalance(id, -amount, session)` with a negative number
