/**
 * .what = context interface for AWS API operations
 * .why = provides AWS configuration and cache paths to operations
 * .note = cache paths are required; defaults should be set in getDeclastructAwsProvider factory
 */
export interface ContextAwsApi {
  aws: {
    credentials: {
      account: string;
      region: string;
    };
    cache: {
      DeclaredAwsVpcTunnel: {
        processes: {
          dir: string;
        };
      };
    };
  };
}
