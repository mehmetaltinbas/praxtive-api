# Strategy Pattern

## Overview

The app uses **Strategy + Factory + Barrel** to eliminate switch/if-else branching on enum types. Each "strategy family" consists of 4 parts:

1. **Interface** — defines a `readonly type` property matching the enum, plus method signatures for type-specific operations
2. **Implementations** — `@Injectable()` classes, one per enum value, each implementing the interface
3. **Barrel** — a `Type<Interface>[]` array that lists all implementations in a single export
4. **Factory** — an `@Injectable()` class that implements `OnModuleInit`, uses `ModuleRef.get()` to resolve each barrel entry at startup, and populates a `Map<Enum, Strategy>`. Exposes a `resolveStrategy(type)` method that returns the matching strategy or throws `BadRequestException`

## What Strategies Can Do

- Type-specific **data extraction** — pull the right fields from a DTO for a given type
- Type-specific **validation** — enforce constraints that only apply to certain types
- Type-specific **formatting / rendering** — produce different output per type
- Type-specific **processing** — run type-dependent logic and return results
- **Inject services** — strategies are NestJS providers, so they can inject any service they need via constructor DI

## What Strategies Cannot Do

- **DB writes** — the service creates, updates, and deletes documents
- **Transactions** — the service manages MongoDB sessions and commit/abort
- **Orchestration** — the service coordinates the overall flow, calling strategy methods at the right points

Strategies return data or perform isolated operations. They don't own the request lifecycle.

## Adding a New Implementation to an Existing Family

1. Create a file in `strategies/<category>/implementations/<name>.strategy.ts`
2. Decorate the class with `@Injectable()` and implement the family's interface
3. Set `readonly type = TheEnumValue`
4. Implement all interface methods
5. Add the class to the barrel array

The factory auto-registers it via `OnModuleInit`, and the barrel spread in the module's `providers` array registers it as a NestJS provider.

## Adding a New Strategy Family

1. Create the interface with `readonly type` + methods in `strategies/<category>/`
2. Create the factory — copy any existing factory and change the generic types
3. Create the barrel array
4. Create implementation classes in `implementations/`
5. Add `Factory, ...Barrel` to the module's `providers` array
6. Inject the factory into the service and call `resolveStrategy()`

## File Naming Conventions

```
strategies/<category>/
├── <domain>-<category>-strategy.interface.ts
├── <domain>-<category>.factory.ts
├── <domain>-<category>-strategies.barrel.ts
└── implementations/
    └── <name>-<domain>-<category>.strategy.ts
```

## Usage Patterns

### Internal Usage (Default)

When the factory is only used within its own service, call it directly inline. No resolver method needed.

```typescript
// source.service.ts — factory used only within SourceService
constructor(private sourceTypeFactory: SourceTypeFactory) {}

async create(dto: CreateSourceDto, file?: Express.Multer.File) {
    const strategy = this.sourceTypeFactory.resolveStrategy(dto.type);
    const { text, title } = await strategy.extract(dto, file);

    // Service continues with DB write, transaction, etc.
    await this.db.Source.create({ title, rawText: text });
}
```

### External Usage (Resolver Method)

When external modules need strategy access, expose a single `resolveStrategy` method that returns the strategy interface. The caller resolves the strategy and calls methods on it directly.

```typescript
// exercise.service.ts — exposes resolver for ExerciseSetService and AiService
resolveExerciseTypeStrategy(exerciseType: ExerciseType): ExerciseTypeStrategy {
    return this.exerciseTypeFactory.resolveStrategy(exerciseType);
}

// exercise-set.service.ts — caller resolves and uses the strategy
const strategy = this.exerciseService.resolveExerciseTypeStrategy(exercise.type);
strategy.evaluateAnswer(exercise, answer);
strategy.drawExerciseToPdf(exercise, index, document, usableWidth);
```

### When NOT to Write Wrappers

Do not create service methods that simply resolve a strategy and delegate to it:

```typescript
// BAD — pure pass-through wrapper, no added logic
evaluateAnswer(exercise: ExerciseDocument, answer: string) {
    const strategy = this.factory.resolveStrategy(exercise.type);
    return strategy.evaluateAnswer(exercise, answer);
}
```

These wrappers duplicate the strategy interface in the service class and scale O(N) with the number of interface methods. Use a single resolver method instead.

### Exception: Real Service Methods

If a method uses the factory AND adds logic beyond resolving and delegating — validation, DB writes, transactions, transformation — it is a real service method, not a wrapper. Keep it.

```typescript
// GOOD — resolves strategy but also manages transactions, DB writes, orchestration
async create(userId: string, exerciseSetId: string, dto: CreateExerciseDto) {
    const strategy = this.exerciseTypeFactory.resolveStrategy(dto.type);
    strategy.validateFields(dto);
    const data = strategy.getCreateExerciseData(dto);

    await this.db.Exercise.create([{ ...commonFields, ...data }], { session });
    await this.exerciseSetService.registerExercise(userId, exerciseSetId, ...);
}
```

## Factory Export Rule

Never export a factory from a module. Only export the service. The factory is an implementation detail of how strategies are resolved.

```typescript
// GOOD
@Module({
    providers: [PaymentService, PaymentProviderFactory, ...PaymentProviderStrategiesBarrel],
    exports: [PaymentService],
})

// BAD
exports: [PaymentService, PaymentProviderFactory],
```
