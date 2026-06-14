# tldr

## severity: blocker

all new resource types must be included in acceptance tests via declarative resources.acceptance.ts pattern

resources must be:
1. declared in `src/contract/sdks/.test/assets/resources.acceptance.ts` via `getResources()`
2. verified via plan/apply workflow in `src/contract/sdks/declastruct.acceptance.test.ts`

---
---
---

# deets

## .what

every new resource type added to declastruct-aws must have acceptance test coverage through the declarative pattern:

1. **resource declaration** — add resource to `getResources()` in `resources.acceptance.ts`
2. **plan verification** — test that declastruct CLI generates valid plan
3. **apply verification** — test that apply creates resource in AWS
4. **idempotency verification** — test that second apply produces no changes

## .why

acceptance tests via declastruct CLI verify the complete workflow:
- domain object serialization
- provider integration
- plan generation
- apply execution
- idempotency guarantees

integration tests verify individual operations but not the declastruct CLI workflow. acceptance tests catch:
- serialization issues between domain object and declastruct
- provider configuration gaps
- plan/apply edge cases

## severity: blocker

absent acceptance test coverage means:
- declastruct CLI may fail on the resource type
- no regression protection for the plan/apply workflow
- users discover defects at runtime

## .where

- `src/contract/sdks/.test/assets/resources.acceptance.ts` — resource declarations
- `src/contract/sdks/declastruct.acceptance.test.ts` — acceptance test cases

## .how

### add a new resource type

1. import the domain object in `resources.acceptance.ts`:
   ```typescript
   import { DeclaredAwsNewResource } from '../../../../../dist/contract/sdks';
   ```

2. declare the resource in `getResources()`:
   ```typescript
   const newResource = DeclaredAwsNewResource.as({
     name: 'declastruct-acceptance-new-resource',
     // ... other required fields
     tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
   });

   return [
     // ... extant resources
     newResource,
   ];
   ```

3. add test cases in `declastruct.acceptance.test.ts`:
   ```typescript
   then('plan includes new resource', () => {
     expect(planJson.resources).toContainEqual(
       expect.objectContaining({ name: 'declastruct-acceptance-new-resource' })
     );
   });
   ```

### run acceptance tests

```sh
npm run build && npm run test:acceptance
```

## .note

- keyrack credentials are auto-unlocked by the test harness
- tests use `dist/` output, so `npm run build` must run first
- resources should use `managedBy: 'declastruct', purpose: 'acceptance-test'` tags for identification

## .examples

### positive — resource with acceptance coverage

```typescript
// resources.acceptance.ts
const scp = DeclaredAwsOrganizationServiceControlPolicy.as({
  name: 'declastruct-acceptance-scp',
  description: 'acceptance test SCP',
  content: new DeclaredAwsIamPolicyDocument({ statements: [...] }),
  tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
});

return [..., scp];
```

### negative — resource without acceptance coverage

resource added to SDK exports but not declared in `resources.acceptance.ts` = blocker

