# No Hardcoded Values

## Rule

Never hardcode locale-specific, environment-specific, or configurable values anywhere in the application. This includes but is not limited to:

- **Currency codes** (e.g. `'USD'`, `'TRY'`, `'EUR'`)
- **Locale identifiers** (e.g. `'en'`, `'tr'`)
- **Country codes, cities, addresses**
- **Pricing values**
- **API URLs** (use `ConfigService` / environment variables)

## How to Handle

- If a value is **per-entity** (e.g. currency per plan), store it as a required field on that entity's schema with no default. The caller must always provide it explicitly.
- If a value is **app-wide** (e.g. a global default locale), use an environment variable accessed via `ConfigService`.
- Never set a `default` on a schema field for values that could change between deployments, regions, or business decisions. Making the field required with no default forces the caller to be explicit, preventing silent assumptions.

## Why

Hardcoded values create hidden assumptions that are easy to miss during code review and painful to find later when requirements change (e.g. expanding to a new market with a different currency). Keeping these values explicit at the point of entry ensures the system stays flexible and the source of truth is always clear.
