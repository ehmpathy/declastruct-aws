# howto: nested union fields on domain-objects

## .what

how to model a field that can be `bare | { include, exclude }` on a `DomainObject`,
with automatic nested hydration and zero constructor overrides.

worked example lives in `DeclaredAwsIamPolicyStatement` + its two scope wrappers.

## .why

iam statements express AWS's "deny all except X" idiom. a `resource`/`action`/`principal`
must accept either a bare positive value or a scoped `{ include, exclude }` object. we
wanted this to hydrate through `.as()`/`.build()` without any hand-written constructor.

## the two hazards domain-objects had

### 1. bare scalars inside arrays under a nested key

when a field is declared in `static nested`, domain-objects would try to `new Class(value)`
for every element. a bare `['a', 'b']` under a nested-declared key blew up because it tried
to hydrate the bare strings.

fix landed upstream (domain-objects@0.32.2): element-level bare-value skip — bare
scalars/null inside arrays are left as-is, exactly like bare scalars outside arrays.

### 2. multi-option nested disambiguation without `_dobj`

a field like `principal: [DeclaredAwsIamPrincipal, DeclaredAwsIamPrincipalScope]` is a
multi-option nested. previously domain-objects required a `_dobj` discriminator key on the
raw value to pick the class. our wire/author shapes have no `_dobj`.

fix landed upstream (domain-objects@0.32.2): structural multi-option disambiguation — it
tries each option and picks the one whose strict schema fits.

## the strict-schema requirement (do not skip)

structural disambiguation only works when each candidate class declares a **strict (closed)**
zod schema. domain-objects probes the schema with a sentinel key
(`__domainObjectStrictProbeKey__`); a non-strict schema accepts the probe and the fit is
ambiguous.

so every class that participates in a multi-option nested MUST declare:

```ts
public static schema = z.object({ ... }).strict();
```

- inline the union at each key; do not extract a shared `const` for `z.union([z.string(), z.array(z.string())])`
- keep the zod version tree-deduped (we pin `zod@4.3.4`; 4.4.x caused static-side type skew)

## the pattern (copy this shape)

```ts
// scope wrapper — single-option nested, no schema needed (never disambiguated)
export class DeclaredAwsIamPrincipalScope
  extends DomainLiteral<DeclaredAwsIamPrincipalScope>
  implements DeclaredAwsIamPrincipalScope
{
  public static nested = {
    include: DeclaredAwsIamPrincipal,
    exclude: DeclaredAwsIamPrincipal,
  };
  public static schema = z
    .object({
      include: DeclaredAwsIamPrincipal.schema.optional(),
      exclude: DeclaredAwsIamPrincipal.schema.optional(),
    })
    .strict();
}

// the statement — multi-option nested on principal
public static nested = {
  resource: DeclaredAwsIamStatementScope,
  action: DeclaredAwsIamStatementScope,
  principal: [DeclaredAwsIamPrincipal, DeclaredAwsIamPrincipalScope],
  condition: DeclaredAwsIamPolicyCondition,
};
```

## gotcha: absent nested keys materialize as `undefined`

as of 0.32.2, nested hydration materializes ALL declared nested keys, even absent ones, as
explicit `undefined`. harmless because `serialize` / `JSON.stringify` drop `undefined`, but
it can surprise a `toMatchSnapshot` (add/remove `principal: undefined` lines). re-snap when
it is the only diff.

## the rule that made this hard

zero constructor overrides. when a nested field would not hydrate cleanly, the fix is
upstream in domain-objects, never a per-class constructor. that is why both hazards above
became domain-objects releases rather than local hacks.
