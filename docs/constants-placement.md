# Constants Placement

## Rule

Never define constants as class properties (`private readonly`) inside service classes. Constants must live in a dedicated `constants/` directory within the relevant module.

## Structure

```
src/<module>/
  constants/
    <topic>.constants.ts
  <module>.service.ts
  <module>.module.ts
```

Example: `src/subscription/constants/payment-retry.constants.ts`

## Why

- Constants defined inline in a class body are hidden among business logic and hard to discover.
- A dedicated `constants/` directory makes them easy to find, reuse across files, and update in one place.
- Exported top-level constants are simpler than class properties — no `this.` prefix, importable by other modules if needed.
