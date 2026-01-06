/**
 * AWS Marketplace Configuration
 *
 * This module contains all configuration constants and validation for AWS Marketplace integration.
 */

// Required environment variables
const AWS_ENV_VARS = {
  ACCESS_KEY_ID: "AWS_ACCESS_KEY_ID",
  SECRET_ACCESS_KEY: "AWS_SECRET_ACCESS_KEY",
  PRODUCT_CODE: "AWS_MARKETPLACE_PRODUCT_CODE",
} as const;

// AWS Marketplace fixed configuration
export const AWS_MARKETPLACE_CONFIG = {
  // Region is fixed by AWS Marketplace - cannot be changed
  // See: https://docs.aws.amazon.com/marketplace/latest/userguide/saas-integrate-saas.html
  REGION: "us-east-1",

  // Default subscription settings (can be overridden by AWS Entitlement Service)
  DEFAULT_DIMENSION: "team_plan",
  DEFAULT_QUANTITY: 3, // Default seats for team plan

  // Client configuration
  REQUEST_TIMEOUT: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 2,

  // Cookie configuration for registration flow
  COOKIE_NAME: "aws-marketplace-customer",
  COOKIE_MAX_AGE: 300, // 5 minutes
} as const;

/**
 * Validate required AWS environment variables
 *
 * @throws Error if any required environment variable is missing
 */
export function validateAwsEnvVars(): void {
  const missingVars: string[] = [];

  for (const key of Object.values(AWS_ENV_VARS)) {
    if (!process.env[key]) {
      missingVars.push(key);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required AWS environment variables: ${missingVars.join(", ")}`
    );
  }
}

/**
 * Get AWS credentials from environment variables
 *
 * @returns AWS credentials object
 * @throws Error if credentials are not configured
 */
export function getAwsCredentials() {
  validateAwsEnvVars();

  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  };
}

/**
 * Get AWS Marketplace Product Code from environment variables
 *
 * @returns Product code
 * @throws Error if product code is not configured
 */
export function getProductCode(): string {
  const productCode = process.env.AWS_MARKETPLACE_PRODUCT_CODE;

  if (!productCode) {
    throw new Error("AWS_MARKETPLACE_PRODUCT_CODE is not configured");
  }

  return productCode;
}
