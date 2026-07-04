# rule.require.dao-and-acceptance-per-declared-resource

## .what

every declared resource — every `DeclaredAwsX` domain object that a user can
get & set — MUST ship with BOTH:

1. a declastruct DAO (`DeclaredAwsXDao` via `genDeclastructDao`), registered in
   the provider
2. acceptance test coverage that drives it through the declastruct CLI
   plan/apply/idempotency workflow

no exceptions.

## .why

this repo IS a declarative provision tool. a `DeclaredAwsX` without a DAO is a
promise we do not keep — the user can hold the domain object but cannot drive it
via `declastruct plan/apply`. a DAO without acceptance coverage is an unproven
promise — no test verifies the plan/apply/idempotency contract actually works.

a real incident: `DeclaredAwsSsmSshTunnel` and `DeclaredAwsEc2SshKeyAuthorized`
shipped as first-class domain objects with get/set operations but NO DAO and NO
acceptance coverage. they read as declarative resources, yet could not be driven
through plan/apply like their `DeclaredAwsSsmVpcTunnel` sibling. the gap stayed
invisible until someone asked "why was no DAO created for this resource?". the
vision had prescribed we MUST be able to get & set them — the DAO is what makes
that true.

### the three layers, and why all three are required

| layer | question it answers | absent -> |
|-------|--------------------|-----------|
| domain object | what is the shape? | user cannot declare it |
| DAO | how do we get & set it? | user cannot plan/apply it |
| acceptance | does plan/apply/idempotency work? | the promise is unproven |

skip any layer and the resource is not truly declarative.

## .the rule

for every `DeclaredAwsX` a user can get & set:

1. **DAO** — `src/access/daos/DeclaredAwsXDao.ts` via `genDeclastructDao`, wired
   to the resource's get/set operations
2. **provider registration** — add to both:
   - the `DeclastructAwsProvider` type map (`src/domain.objects/DeclastructAwsProvider.ts`)
   - the `daos` map in `getDeclastructAwsProvider` (`src/domain.operations/provider/getDeclastructAwsProvider.ts`)
3. **sdk export** — export the DAO from `src/contract/sdks/index.ts`
4. **acceptance coverage** — declare the resource in
   `src/contract/sdks/.test/assets/resources.acceptance.ts` (in the returned
   set) and assert plan-inclusion + post-apply `KEEP` in
   `src/contract/sdks/declastruct.acceptance.test.ts`

## .idempotency note

a DAO's `findsert` must be cheap on repeat: it should find the extant resource
via a get and return it WITHOUT re-doing expensive or side-effectful work. this
is what makes a second apply fast and a re-plan converge to `KEEP` (no drift).

example: `DeclaredAwsEc2SshKeyAuthorizedDao.findsert` first looks up the
authorization from the SSM Parameter Store track layer; only if absent does it
push through EC2 Instance Connect. the second apply is a cheap param lookup.

## .when a resource has a hard runtime prerequisite

some resources cannot be applied against the default acceptance fixture (e.g.
EC2 Instance Connect cannot authorize a key on a stopped instance). that is NOT
a license to skip the DAO or the acceptance coverage — it is a fixture problem.
close the gap by giving the acceptance fixture what the resource needs (an active
instance for the window it is exercised), not by dropping the resource. if the
cost of that fixture is contentious, raise it — do not silently exempt.

## .enforcement

- a `DeclaredAwsX` (get/set-able) without a DAO = blocker
- a DAO not registered in the provider (type + factory) = blocker
- a DAO not exported from `src/contract/sdks/index.ts` = blocker
- a declared resource without acceptance plan/apply/KEEP coverage = blocker

## .see also

- `rule.require.acceptance-tests-for-resources` — the acceptance-coverage half
- `rule.require.declarative-test-infra` — declare test infra the same way a user would
- `rule.prefer.declastruct.[demo]` (ehmpathy/mechanic) — the get/set/cast pattern a DAO wraps
