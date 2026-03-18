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

## Usage Pattern in Services

```typescript
// Inject the factory
constructor(private factory: SomeTypeFactory) {}

// Resolve the strategy for the given type and delegate
async someMethod(dto: SomeDto) {
    const strategy = this.factory.resolveStrategy(dto.type);
    strategy.validate(dto);
    const data = strategy.extractData(dto);

    // Service continues with DB write, transaction, etc.
    await this.db.Model.create({ ...commonFields, ...data });
}
```
