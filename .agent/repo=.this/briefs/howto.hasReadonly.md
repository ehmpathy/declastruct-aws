# hasReadonly and assure pattern

## what

`hasReadonly` from `domain-objects` validates that a domain object has all its `readonly` fields populated. Use with `assure` from `type-fns` to get type-safe results.

## why

When reading resources from AWS, cast functions should return `HasReadonly<typeof DomainObject>` to ensure readonly fields (like `state`, `joinedAt`, etc.) are present.

## usage

```typescript
import { hasReadonly, HasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

export const castIntoMyDomainObject = (input: {
  response: AwsResponse;
}): HasReadonly<typeof MyDomainObject> => {
  return assure(
    MyDomainObject.as({
      // ... fields
    }),
    hasReadonly({ of: MyDomainObject }),
  );
};
```

## gotchas

### 1. all readonly fields must be present

The `hasReadonly` check requires ALL fields in `static readonly = [...]` to have values. If your test data is missing a readonly field (e.g., `JoinedTimestamp`), the validation will fail.

**bad** - missing `JoinedTimestamp` means `joinedAt` is undefined:
```typescript
const awsAccount: Account = {
  Id: '123',
  Status: 'ACTIVE',
  JoinedMethod: 'CREATED',
  // JoinedTimestamp missing!
};
```

**good** - all readonly fields populated:
```typescript
const awsAccount: Account = {
  Id: '123',
  Status: 'ACTIVE',
  JoinedMethod: 'CREATED',
  JoinedTimestamp: new Date('2024-01-15T10:30:00Z'),
};
```

### 2. return directly from assure

`assure` returns the validated object with the correct type. Don't assign to intermediate variable then re-wrap.

**bad** - redundant wrapping:
```typescript
const validated = assure(obj, hasReadonly({ of: MyObject }));
return MyObject.as({ ...validated, extraField }) as HasReadonly<typeof MyObject>;
```

**good** - return directly:
```typescript
return assure(
  MyDomainObject.as({ /* all fields including extras */ }),
  hasReadonly({ of: MyDomainObject }),
);
```

### 3. non-readonly fields are allowed

The `hasReadonly` check does NOT reject objects that have extra fields beyond readonly/metadata. You can include user-settable fields like `iamUserAccessToBilling` in the same `assure` call.
