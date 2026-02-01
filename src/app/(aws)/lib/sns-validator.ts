import { rootLogger } from "@/lib/logging";
import MessageValidator from "sns-validator";

const logger = rootLogger.child({ module: "aws-marketplace-sns-validator" });

/**
 * SNS message validator instance
 */
const validator = new MessageValidator();

/**
 * Supported SNS message types
 */
export type SNSMessageType =
  | "SubscriptionConfirmation"
  | "Notification"
  | "UnsubscribeConfirmation";

/**
 * Validated SNS message interface
 */
export interface ValidatedSNSMessage {
  Type: SNSMessageType;
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  SubscribeURL?: string;
  Token?: string;
  [key: string]: any;
}

/**
 * Verify SNS message signature and authenticity
 *
 * This function verifies that the incoming SNS message is authentic by:
 * 1. Checking the signature version
 * 2. Validating the signature using the certificate from SigningCertURL
 * 3. Ensuring the certificate URL is from the AWS SNS domain
 *
 * @param rawBody - The raw request body as a string
 * @returns Promise that resolves to the validated message
 * @throws Error if validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const message = await verifySNSMessage(rawBody);
 *   // Process the validated message
 * } catch (error) {
 *   // Handle invalid message
 * }
 * ```
 */
export async function verifySNSMessage(
  rawBody: string
): Promise<ValidatedSNSMessage> {
  return new Promise((resolve, reject) => {
    try {
      // Parse the raw body
      let message: any;
      try {
        message = JSON.parse(rawBody);
      } catch (parseError) {
        logger.error({ msg: "Failed to parse SNS message body", error: parseError });
        reject(new Error("Invalid JSON in request body"));
        return;
      }

      // Basic validation: check required fields
      if (!message.Type) {
        logger.error({ msg: "SNS message missing Type field" });
        reject(new Error("SNS message missing Type field"));
        return;
      }

      if (!message.SignatureVersion) {
        logger.error({ msg: "SNS message missing SignatureVersion" });
        reject(new Error("SNS message missing SignatureVersion"));
        return;
      }

      if (!message.Signature) {
        logger.error({ msg: "SNS message missing Signature" });
        reject(new Error("SNS message missing Signature"));
        return;
      }

      if (!message.SigningCertURL) {
        logger.error({ msg: "SNS message missing SigningCertURL" });
        reject(new Error("SNS message missing SigningCertURL"));
        return;
      }

      // Validate the signing certificate URL
      try {
        const certURL = new URL(message.SigningCertURL);
        const isValidAWSHost =
          certURL.hostname.endsWith(".amazonaws.com") &&
          (certURL.hostname.startsWith("sns.") ||
            certURL.hostname.includes("sns"));

        if (!isValidAWSHost) {
          logger.error({
            msg: "Invalid SNS certificate URL",
            hostname: certURL.hostname,
          });
          reject(new Error("Invalid SNS certificate URL"));
          return;
      }
      } catch (urlError) {
        logger.error({ msg: "Invalid SigningCertURL format", error: urlError });
        reject(new Error("Invalid SigningCertURL format"));
        return;
      }

      // Use the AWS SNS message validator to verify the signature
      validator.validate(message, (err: Error | null, validatedMessage: any) => {
        if (err) {
          logger.error({
            msg: "SNS message signature validation failed",
            error: err.message,
            messageType: message.Type,
          });
          reject(new Error(`SNS message signature validation failed: ${err.message}`));
          return;
        }

        logger.info({
          msg: "SNS message validated successfully",
          messageType: validatedMessage.Type,
          messageId: validatedMessage.MessageId,
        });

        resolve(validatedMessage as ValidatedSNSMessage);
      });
    } catch (error) {
      logger.error({
        msg: "Unexpected error during SNS message validation",
        error: error instanceof Error ? error.message : String(error),
      });
      reject(error);
    }
  });
}

/**
 * Parse and validate raw request body
 *
 * Helper function that combines JSON parsing with signature verification
 *
 * @param rawBody - The raw request body as a string
 * @returns Promise that resolves to the validated message
 */
export async function parseAndVerifySNSBody(
  rawBody: string
): Promise<ValidatedSNSMessage> {
  if (!rawBody || typeof rawBody !== "string") {
    throw new Error("Request body is empty or invalid");
  }

  return verifySNSMessage(rawBody);
}
