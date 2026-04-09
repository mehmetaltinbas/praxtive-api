# Valid Route Prefixes

The `VALID_ROUTE_PREFIXES` constant in `src/shared/constants/valid-route-prefixes.constant.ts` lists all known API route prefixes.

It is used by `AllExceptionsFilter` to distinguish real 404 errors from scanner/bot noise. Requests to paths outside these prefixes that return 404 are silently dropped from logs.

When adding a new controller, add its route prefix to this array so that 404 errors on that route are still logged.
