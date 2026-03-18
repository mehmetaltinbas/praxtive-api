# Public Access Pattern

## Design Decision

Public-facing logic lives in the **existing services** (`ExerciseSetService`, `ExerciseService`) rather than separate public service classes. This eliminates code duplication while keeping route separation via dedicated public controllers (`PublicExerciseSetController`, `PublicExerciseController`).

## The `userId?: string` Pattern

Methods that serve both authenticated and public contexts accept `userId: string | undefined`:

- **`userId` provided** — filters by ownership (`{ userId }`)
- **`userId` undefined** — filters by visibility (`{ visibility: PUBLIC }`)

This cascades naturally: `ExerciseService.readById(undefined, id)` calls `ExerciseSetService.readById(undefined, exerciseSetId)`, which enforces `visibility: PUBLIC` on the parent set.

### Affected methods:
- `ExerciseSetService.readById(userId?, id)`
- `ExerciseService.readById(userId?, id)`
- `ExerciseService.readAllByExerciseSetId(userId?, exerciseSetId)`

## The `isPublicAccess` Flag Pattern

For evaluate methods, `userId` is always **required** (the authenticated caller pays credits), but ownership of exercises should be skipped. An `isPublicAccess` flag controls this:

```typescript
evaluateAnswers(userId: string, dto, isPublicAccess = false)
evaluatePaperAnswers(userId: string, exerciseSetId, files, isPublicAccess = false)
```

- **Authenticated controller** calls: `evaluateAnswers(user.sub, dto)` — default `false`
- **Public controller** calls: `evaluateAnswers(user.sub, dto, true)` — exercises read via visibility filter

## `PUBLIC_USER_FIELDS` Constant

Defines which user fields are exposed publicly. To add a new public field:

1. Add the field to `PublicUserDocument` interface
2. Add the field name to `PUBLIC_USER_FIELDS`

The constant is typed as `(keyof Omit<PublicUserDocument, keyof MongooseDocument>)[]`, so TypeScript will flag if the array contains a field not in the interface.

## Adding a New Public-Facing Method

1. Add the method to the existing service with `userId: string | undefined` parameter
2. When `userId` is undefined, filter by `visibility: PUBLIC` instead of ownership
3. Add a route in the public controller that calls the service with `undefined` for userId
4. If the method needs auth (e.g., credit deduction), use the `isPublicAccess` flag pattern
