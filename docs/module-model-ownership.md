# Module-Model Ownership

## Rule

A Mongoose model is **owned by exactly one module** — the module whose domain the collection represents. Only that owner's service may read or write it. No other service may pull the foreign model out of `'DB_MODELS'` and query it directly.

| Model           | Owner module          | Owner service          |
| --------------- | --------------------- | ---------------------- |
| `User`          | `UserModule`          | `UserService`          |
| `Subscription`  | `SubscriptionModule`  | `SubscriptionService`  |
| `PaymentMethod` | `PaymentMethodModule` | `PaymentMethodService` |
| `Payment`       | `PaymentModule`       | `PaymentService`       |
| `Plan`          | `PlanModule`          | `PlanService`          |
| ...             | ...                   | ...                    |

## Why

- **Invariants stay in one place.** If `User.stripeCustomerId` ever needs validation, logging, or a side effect, the owner service is the single chokepoint. Scattered `db.User.updateOne(...)` calls across the codebase would bypass it.
- **Schema changes stay safe.** Renaming a field or changing its type means updating one service, not grep-hunting every module that happens to touch the collection.
- **Cross-module calls become explicit.** When `PaymentMethodService` needs the user's email, the dependency shows up as `UserService` in the constructor — not as a hidden foreign-model query buried inside a private helper.
- **Testability.** Mocking `UserService` stubs an intent (`readById`); mocking `db.User.findById` stubs an implementation detail.

## How to apply

### 1. Each service injects only its own model(s)

```typescript
// ✅ PaymentMethodService
constructor(
    @Inject('DB_MODELS') private db: { PaymentMethod: mongoose.Model<PaymentMethodDocument> },
    ...
) {}
```

```typescript
// ❌ Wrong — reaches into foreign collections
constructor(
    @Inject('DB_MODELS') private db: {
        PaymentMethod: mongoose.Model<PaymentMethodDocument>,
        User: mongoose.Model<UserDocument>,         // foreign
        Subscription: mongoose.Model<SubscriptionDocument>, // foreign
    },
) {}
```

### 2. Need data from another collection? Import its service

```typescript
// ✅ Go through the owner
const { user } = await this.userService.readById(userId);
if (user.stripeCustomerId) { ... }
```

```typescript
// ❌ Wrong
const user = await this.db.User.findById(userId);
```

### 3. Missing a method on the owner service? Add one there

If `PaymentMethodService` needs to know "does this user have an active paid subscription?", add `hasActivePaidSubscription(userId): Promise<boolean>` to `SubscriptionService` and call it. Do **not** reach into `db.Subscription` from a non-subscription service.

The owner service's job is to expose the questions other modules need answered — not to hide the model.

### 4. Mutating a foreign model's field? Add an intent-named setter

When `PaymentMethodService` needs to persist `stripeCustomerId` onto a user, the correct shape is:

```typescript
// UserService
async setStripeCustomerId(id: string, stripeCustomerId: string): Promise<ResponseBase> { ... }

// PaymentMethodService
await this.userService.setStripeCustomerId(userId, customerId);
```

Not a generic `userService.update(id, { stripeCustomerId })` — that leaks the field name upward and lets any caller mutate arbitrary user fields. Name the intent.

### 5. Circular module dependencies — use `forwardRef`

Owner-service calls sometimes cycle: `SubscriptionService` needs `PaymentMethodService` (upgrade flow), and `PaymentMethodService` needs `SubscriptionService` (delete-blocking check). Break the cycle with `forwardRef` in both the module imports and the constructor injection:

```typescript
// payment-method.module.ts
@Module({
    imports: [PaymentModule, UserModule, forwardRef(() => SubscriptionModule)],
    ...
})
export class PaymentMethodModule {}

// subscription.module.ts
@Module({
    imports: [..., forwardRef(() => PaymentMethodModule)],
    ...
})
export class SubscriptionModule {}

// payment-method.service.ts
constructor(
    ...,
    @Inject(forwardRef(() => SubscriptionService)) private subscriptionService: SubscriptionService,
) {}
```

A cycle is a signal the two modules are tightly coupled — that's fine when both genuinely need something from each other, but it's worth asking whether a query can move to a shared-read service before reaching for `forwardRef`.

## Exception: Mongoose `.populate()`

Populating a ref (`.populate('user')`) technically pulls foreign data, but it's a read-through on a document you already own, driven by a ref declared on your schema. This is allowed — it's how Mongoose models relationships. The rule targets writes and ad-hoc cross-collection queries, not populate chains.

## Exception: `cleanDb` and migration scripts

Test helpers (`cleanDb` in `db-models.provider.ts`) and one-off migration scripts under `scripts/` legitimately touch every collection. They are infra, not domain code, and are exempt.
