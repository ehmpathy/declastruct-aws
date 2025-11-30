import { Runtime } from '@aws-sdk/client-lambda';
import { UniDateTime } from '@ehmpathy/uni-time';
import { DomainEntity, DomainLiteral, RefByUnique } from 'domain-objects';

import { DeclaredAwsIamRole } from './DeclaredAwsIamRole';

/**
 * .what = a declarative structure which represents an Aws Lambda function
 * .note = represents the lambda function itself, not a specific version
 */
export interface DeclaredAwsLambda {
  /**
   * .what = the arn of the lambda
   * .note = is @metadata -> may be undefined
   */
  arn?: string;

  /**
   * .what = the name of the lambda function
   */
  name: string;

  /**
   * .what = the runtime of the lambda
   * .refs
   *   - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
   *   - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html#runtimes-supported
   */
  runtime: Runtime;

  /**
   * .what = reference to the iam role for lambda execution
   */
  role: RefByUnique<typeof DeclaredAwsIamRole>;

  /**
   * handler path
   */
  handler: string;

  /**
   * .what = the seconds available to each invocation before termination
   */
  timeout: number;

  /**
   * The amount of memory available to the function at runtime.
   */
  memory: number;

  /**
   * .what = the size of the lambda's deployment package, in bytes
   * .note = is @metadata -> may be undefined
   */
  codeSize?: number;

  /**
   * .what = when the lambda was last updated at
   * .note = is @metadata -> may be undefined
   */
  updatedAt?: UniDateTime;

  /**
   * .what = the sha256 of the lambda's code
   */
  codeSha256?: string;

  /**
   * .what = the uri to the lambda's code
   * .note
   *   - this is persisted via tags, by this package specifically
   */
  codeZipUri: string;

  /**
   * .what = the environmental variables available at runtime
   */
  envars: Record<string, string>;

  /**
   * .what = optional tags for the lambda
   */
  tags?: Record<string, string>;

  // todo: support the rest of the configs

  // /**
  //  * <p>The function's networking configuration.</p>
  //  * @public
  //  */
  // VpcConfig?: VpcConfigResponse | undefined;
  // /**
  //  * <p>The function's dead letter queue.</p>
  //  * @public
  //  */
  // DeadLetterConfig?: DeadLetterConfig | undefined;
  // /**
  //  * <p>The function's <a href="https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html">environment variables</a>. Omitted from CloudTrail logs.</p>
  //  * @public
  //  */
  // Environment?: EnvironmentResponse | undefined;
  // /**
  //  * <p>The ARN of the Key Management Service (KMS) customer managed key that's used to encrypt the following resources:</p>
  //  *          <ul>
  //  *             <li>
  //  *                <p>The function's <a href="https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-encryption">environment variables</a>.</p>
  //  *             </li>
  //  *             <li>
  //  *                <p>The function's <a href="https://docs.aws.amazon.com/lambda/latest/dg/snapstart-security.html">Lambda SnapStart</a> snapshots.</p>
  //  *             </li>
  //  *             <li>
  //  *                <p>When used with <code>SourceKMSKeyArn</code>, the unzipped version of the .zip deployment package that's used for function invocations. For more information, see <a href="https://docs.aws.amazon.com/lambda/latest/dg/encrypt-zip-package.html#enable-zip-custom-encryption">
  //  *           Specifying a customer managed key for Lambda</a>.</p>
  //  *             </li>
  //  *             <li>
  //  *                <p>The optimized version of the container image that's used for function invocations. Note that this is not the same key that's used to protect your container image in the Amazon Elastic Container Registry (Amazon ECR). For more information, see <a href="https://docs.aws.amazon.com/lambda/latest/dg/images-create.html#images-lifecycle">Function lifecycle</a>.</p>
  //  *             </li>
  //  *          </ul>
  //  *          <p>If you don't provide a customer managed key, Lambda uses an <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-owned-cmk">Amazon Web Services owned key</a> or an <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk">Amazon Web Services managed key</a>.</p>
  //  * @public
  //  */
  // KMSKeyArn?: string | undefined;
  // /**
  //  * <p>The function's X-Ray tracing configuration.</p>
  //  * @public
  //  */
  // TracingConfig?: TracingConfigResponse | undefined;
  // /**
  //  * <p>For Lambda@Edge functions, the ARN of the main function.</p>
  //  * @public
  //  */
  // MasterArn?: string | undefined;
  // /**
  //  * <p>The latest updated revision of the function or alias.</p>
  //  * @public
  //  */
  // RevisionId?: string | undefined;
  // /**
  //  * <p>The function's <a href="https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html">layers</a>.</p>
  //  * @public
  //  */
  // Layers?: Layer[] | undefined;
  // /**
  //  * <p>The current state of the function. When the state is <code>Inactive</code>, you can reactivate the function by
  //  *       invoking it.</p>
  //  * @public
  //  */
  // State?: State | undefined;
  // /**
  //  * <p>The reason for the function's current state.</p>
  //  * @public
  //  */
  // StateReason?: string | undefined;
  // /**
  //  * <p>The reason code for the function's current state. When the code is <code>Creating</code>, you can't invoke or
  //  *       modify the function.</p>
  //  * @public
  //  */
  // StateReasonCode?: StateReasonCode | undefined;
  // /**
  //  * <p>The status of the last update that was performed on the function. This is first set to <code>Successful</code>
  //  *       after function creation completes.</p>
  //  * @public
  //  */
  // LastUpdateStatus?: LastUpdateStatus | undefined;
  // /**
  //  * <p>The reason for the last update that was performed on the function.</p>
  //  * @public
  //  */
  // LastUpdateStatusReason?: string | undefined;
  // /**
  //  * <p>The reason code for the last update that was performed on the function.</p>
  //  * @public
  //  */
  // LastUpdateStatusReasonCode?: LastUpdateStatusReasonCode | undefined;
  // /**
  //  * <p>Connection settings for an <a href="https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem.html">Amazon EFS file system</a>.</p>
  //  * @public
  //  */
  // FileSystemConfigs?: FileSystemConfig[] | undefined;
  // /**
  //  * <p>The type of deployment package. Set to <code>Image</code> for container image and set <code>Zip</code> for .zip file archive.</p>
  //  * @public
  //  */
  // PackageType?: PackageType | undefined;
  // /**
  //  * <p>The function's image configuration values.</p>
  //  * @public
  //  */
  // ImageConfigResponse?: ImageConfigResponse | undefined;
  // /**
  //  * <p>The ARN of the signing profile version.</p>
  //  * @public
  //  */
  // SigningProfileVersionArn?: string | undefined;
  // /**
  //  * <p>The ARN of the signing job.</p>
  //  * @public
  //  */
  // SigningJobArn?: string | undefined;
  // /**
  //  * <p>The instruction set architecture that the function supports. Architecture is a string array with one of the
  //  *       valid values. The default architecture value is <code>x86_64</code>.</p>
  //  * @public
  //  */
  // Architectures?: Architecture[] | undefined;
  // /**
  //  * <p>The size of the function's <code>/tmp</code> directory in MB. The default value is 512, but can be any whole
  //  *   number between 512 and 10,240 MB. For more information, see <a href="https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html#configuration-ephemeral-storage">Configuring ephemeral storage (console)</a>.</p>
  //  * @public
  //  */
  // EphemeralStorage?: EphemeralStorage | undefined;
  // /**
  //  * <p>Set <code>ApplyOn</code> to <code>PublishedVersions</code> to create a snapshot of the initialized execution
  //  *       environment when you publish a function version. For more information, see <a href="https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html">Improving startup performance with Lambda SnapStart</a>.</p>
  //  * @public
  //  */
  // SnapStart?: SnapStartResponse | undefined;
  // /**
  //  * <p>The ARN of the runtime and any errors that occured.</p>
  //  * @public
  //  */
  // RuntimeVersionConfig?: RuntimeVersionConfig | undefined;
  // /**
  //  * <p>The function's Amazon CloudWatch Logs configuration settings.</p>
  //  * @public
  //  */
  // LoggingConfig?: LoggingConfig | undefined;
}

export class DeclaredAwsLambda
  extends DomainEntity<DeclaredAwsLambda>
  implements DeclaredAwsLambda
{
  public static primary = ['arn'] as const;
  public static unique = ['name'] as const;

  /**
   * .what = identity attributes assigned by the persistence layer
   * .note = describes the entity for persistence purposes, not intrinsic attributes
   */
  public static metadata = ['arn', 'updatedAt'] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   * .note = these are real attributes of the resource, but derived from the source of truth
   */
  public static readonly = ['codeSize', 'codeSha256'] as const;

  /**
   * .what = nested domain object definitions
   * .note
   *   - role is RefByUnique ref, not full domain object
   *   - envars and tags are Record<string, string>, marked as DomainLiteral for safe manipulation
   */
  public static nested = {
    role: RefByUnique<typeof DeclaredAwsIamRole>,
    envars: DomainLiteral,
    tags: DomainLiteral,
  };
}
