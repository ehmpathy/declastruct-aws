import { type DeclastructDaoWoutRef, genDeclastructDao } from 'declastruct';
import type { Refable, RefByUnique } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';

/**
 * .what = factory for a read-only "report" declastruct DAO
 * .why = every cost/log-group report is a read-only derived entity: it has ONE getOne
 *        composite behind byUnique, no primary key, and no write path. this factory makes
 *        "a read-only report can never grow a write path" STRUCTURAL rather than a
 *        copy-paste convention — findsert throws, upsert/delete are null, byPrimary is null
 * .note = collapses the per-report DAO to a single call; the getOne composite is passed in
 *        its native `{ by: { unique } }` shape and adapted to the DAO byUnique signature here
 */
export const genDeclastructReadonlyReportDao = <
  TResourceClass extends Refable<any, any, any>,
  TContext extends Record<string, any>,
>(config: {
  dobj: TResourceClass;
  label: string;
  getOne: (
    input: { by: { unique: RefByUnique<TResourceClass> } },
    context: TContext,
  ) => Promise<InstanceType<TResourceClass> | null>;
}): DeclastructDaoWoutRef<TResourceClass, TContext> =>
  genDeclastructDao<TResourceClass, TContext>({
    dobj: config.dobj,
    get: {
      one: {
        byPrimary: null,
        byUnique: async (ref, context) =>
          config.getOne({ by: { unique: ref } }, context),
      },
    },
    set: {
      findsert: async (input) => {
        // read-only derived entity — cannot be written
        return BadRequestError.throw(
          `${config.label} is a read-only derived entity — cannot be written`,
          { input },
        );
      },
      upsert: null,
      delete: null,
    },
  });
