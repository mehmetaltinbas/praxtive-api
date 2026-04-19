if an enum value is used for a model: give that enum value in .model.ts file with Object.values(<enum-name>), don't use hardcoded strings

every util.ts file has only 1 utility function; every constant.ts file has only 1 constant in it; highly-related multiple utils/constants can be grouped under a sub-folder without barrel export

## Service Method Return Types

All public service methods that perform an operation (create, read, update, delete, etc.) must return a response type that extends `ResponseBase` (`src/shared/types/response-base.interface.ts`). This ensures every response carries `isSuccess` and `message` fields.

### How to apply

- Define a response interface in `<module>/types/response/` that extends `ResponseBase` and adds domain-specific fields
- The service method returns that response type, not the raw document
- Callers destructure the response to access domain data (e.g. `const { createdPayment } = await paymentService.create(...)`)

```typescript
// types/response/create-payment.response.ts
export interface CreatePaymentResponse extends ResponseBase {
    createdPayment: PaymentDocument;
}

// payment.service.ts
async create(...): Promise<CreatePaymentResponse> {
    const [payment] = await this.db.Payment.create([...]);
    return { isSuccess: true, message: 'Payment created.', createdPayment: payment };
}

// caller
const { createdPayment } = await this.paymentService.create(...);
await this.paymentService.markSucceeded(createdPayment._id, ...);
```

### Methods without domain data

When a method has no meaningful data to return beyond success/failure, return `ResponseBase` directly:

```typescript
async reorder(id: string, order: number, session: ClientSession): Promise<ResponseBase> {
    await this.db.Exercise.findOneAndUpdate({ _id: id }, { $set: { order } }, { session });
    return { isSuccess: true, message: 'Exercise reordered.' };
}
```

### Exception: strategy resolver methods

`resolveStrategy` methods (e.g. `resolveExerciseTypeStrategy`, `resolvePaymentProviderStrategy`) return a strategy interface, not a `ResponseBase`. These are internal plumbing for strategy resolution, not operation results.
