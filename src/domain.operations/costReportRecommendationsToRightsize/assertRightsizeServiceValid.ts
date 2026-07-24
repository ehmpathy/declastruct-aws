import { BadRequestError } from 'helpful-errors';

/**
 * .what = the services GetRightsizingRecommendation supports today
 * .why = AWS accepts only 'AmazonEC2' for the rightsize `Service` param; any other
 *        value is a guaranteed AWS 400
 */
const RIGHTSIZE_SUPPORTED_SERVICES = ['AmazonEC2'];

/**
 * .what = asserts a rightsize `service` is one AWS supports
 * .why = the vision's edgecase table prescribes a fail-loud (no silent wrong-service
 *        read) with a clear message BEFORE the billed request, rather than an opaque
 *        AWS 400 the caller pays $0.01 to discover
 */
export const assertRightsizeServiceValid = (input: {
  service: string;
}): void => {
  if (!RIGHTSIZE_SUPPORTED_SERVICES.includes(input.service))
    BadRequestError.throw(
      'rightsize service is invalid: GetRightsizingRecommendation supports only AmazonEC2 today',
      { service: input.service, supported: RIGHTSIZE_SUPPORTED_SERVICES },
    );
};
