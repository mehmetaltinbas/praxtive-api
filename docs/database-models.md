# Database models — design conventions

## Foreign key naming

Two names per FK, by layer:

- **Schema field + service code + document interface**: `<model>`. Mongoose-idiomatic; `.populate('<model>')` works naturally.
- **Wire (response JSON, request DTOs, URL params)**: `<model>Id`. Accurately describes a string id.

The wire never sees `<model>` keys for FKs.

## Schema definition

Always declare `ref` so populate is available:

```ts
<model>: { type: mongoose.Schema.Types.ObjectId, ref: '<Model>', required: true }
```

## Document interface typing

Type FKs as `string`. The runtime value may be `ObjectId` (unpopulated) or a Mongoose document (populated), but treat them as string ids and let Mongoose's auto-stringification handle it. Keep it simple:

```ts
export interface <Some>Document extends MongooseDocument {
    _id: string;
    <model>: string;
    ...
}
```

## toJSON transform — required on every schema with FKs

Each schema sets a `toJSON` transform that does two things on output:

1. **Collapse populated subdocs to ids** — even if a service called `.populate('<model>')` for internal use, the response only carries the string id. Frontend never sees a populated document.
2. **Rename the key from `<model>` to `<model>Id`** — the wire convention.

Pattern:

```ts
schema.set('toJSON', {
    transform: (_doc, ret: Record<string, unknown>) => {
        const v = ret.<model>;
        if (v !== undefined) {
            ret.<model>Id = v && typeof v === 'object' && '_id' in v ? String((v as { _id: unknown })._id) : v;
            delete ret.<model>;
        }
        return ret;
    },
});
```

Repeat per FK on the schema.

## DTOs and URL route params

Always `<model>Id`. They're part of the external API surface, named to match what clients receive in responses.

```ts
export class <Some>Dto {
    readonly <model>Id!: string;
}

@Get('<route>/:<model>Id')
async <handler>(@Param('<model>Id') <model>Id: string) { ... }
```

## Internal service code

Inside services, queries and writes use the schema field name (`<model>`):

```ts
await this.db.<Some>.findOne({ <model>: <model>Id });
await this.db.<Some>.create({ <model>: <model>Id, ... });
await this.db.<Some>.find({ <model>: <model>Id });
```

Local variable / parameter names that happen to hold an id (e.g. `<model>Id: string` from JWT or a controller param) keep the `Id` suffix — the rule is about Mongoose-facing field references, not every string identifier.

## Polymorphic FKs are exempt

When a FK can refer to one of several models depending on a discriminator field, the target model isn't a single fixed name, so neither the `<model>` schema convention nor populate ergonomics apply cleanly. Such fields keep their original `Id`-suffixed name everywhere — schema, service, DTO, response.

## Adding a new model with FKs — checklist

1. Schema: name FK fields `<model>`, declare `ref: '<Model>'`.
2. Indexes: reference the new key (`{ <model>: 1, ... }`).
3. `toJSON` transform: collapse populated → id, rename `<model>` → `<model>Id`.
4. Document interface: `<model>: string`.
5. DTOs and controller `@Param`s: `<model>Id`.
6. Service queries: `{ <model>: ... }`.
7. If you query/write to other collections by the FK (cascade hooks, cross-service reads), match the schema field name (`<model>`).
