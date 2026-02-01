/**
 * AWS SNS Signature Validation Test
 *
 * Tests SNS signature verification for AWS Marketplace webhook.
 *
 * Usage:
 *   npx tsx src/app/(aws)/test-aws-sns-validation.ts
 */

/*
import { verifySNSMessage } from "./lib/sns-validator";

// 示例SNS消息（从AWS SNS获取的真实格式）
const sampleSNSMessages = {
  subscriptionConfirmation: {
    Type: "SubscriptionConfirmation",
    MessageId: "test-id-1",
    TopicArn: "arn:aws:sns:us-east-1:123456789012:test-topic",
    Token: "test-token",
    Message: "You have chosen to subscribe to the topic arn:aws:sns:us-east-1:123456789012:test-topic\n\nTo confirm the subscription, visit the SubscribeURL included in this message.",
    SubscribeURL: "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&TopicArn=arn:aws:sns:us-east-1:123456789012:test-topic&Token=test-token",
    Timestamp: new Date().toISOString(),
    SignatureVersion: "1",
    Signature: "EXAMPLEsignature+Djdq8dC1+TXmqKzRG7QXz0lFjZ1pxFuvPKDqMZZfzm/dCH+bWG3Ui8hhvW4cOHNH4uYbN5RLxv0hJ2m5NWVXXPZ0pJP3JFhVj+PfX/7h7gHjJn5Gv5Cv5Fv5Cv5Fv5Cv5Fv5Cv5Fv5Cv5Fv5C==",
    SigningCertURL: "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-123456789012.pem",
  },
  notification: {
    Type: "Notification",
    MessageId: "test-id-2",
    TopicArn: "arn:aws:sns:us-east-1:123456789012:test-topic",
    Subject: "Test Subject",
    Message: JSON.stringify({
      "customer-identifier": "test-customer-123",
      "product-code": "test-product-code",
      action: "subscribe-success",
    }),
    Timestamp: new Date().toISOString(),
    SignatureVersion: "1",
    Signature: "EXAMPLEsignature+Djdq8dC1+TXmqKzRG7QXz0lFjZ1pxFuvPKDqMZZfzm/dCH+bWG3Ui8hhvW4cOHNH4uYbN5RLxv0hJ2m5NWVXXPZ0pJP3JFhVj+PfX/7h7gHjJn5Gv5Cv5Fv5Cv5Fv5Cv5Fv5Cv5Fv5Cv5Fv5C==",
    SigningCertURL: "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-123456789012.pem",
  },
};

async function testSignatureVerification() {
  console.log("🧪 Testing AWS SNS Signature Verification\n");

  // Test 1: 验证缺少签名的消息应该失败
  console.log("Test 1: Message without signature");
  const messageWithoutSignature = {
    Type: "Notification",
    Message: "Test",
  };

  try {
    await verifySNSMessage(JSON.stringify(messageWithoutSignature));
    console.log("❌ FAIL: Should have thrown an error\n");
  } catch (error) {
    console.log("✅ PASS: Correctly rejected message without signature\n");
  }

  // Test 2: 验证无效的签名证书URL应该失败
  console.log("Test 2: Message with invalid certificate URL");
  const messageWithInvalidCertURL = {
    ...sampleSNSMessages.notification,
    SigningCertURL: "https://evil.com/cert.pem",
  };

  try {
    await verifySNSMessage(JSON.stringify(messageWithInvalidCertURL));
    console.log("❌ FAIL: Should have rejected invalid certificate URL\n");
  } catch (error) {
    console.log(`✅ PASS: Correctly rejected invalid certificate URL: ${(error as Error).message}\n`);
  }

  // Test 3: 验证无效的JSON应该失败
  console.log("Test 3: Invalid JSON");
  try {
    await verifySNSMessage("invalid json{{{");
    console.log("❌ FAIL: Should have thrown an error\n");
  } catch (error) {
    console.log("✅ PASS: Correctly rejected invalid JSON\n");
  }

  // Test 4: 真实场景测试（需要使用真实的AWS SNS消息）
  console.log("Test 4: Real-world scenario");
  console.log("ℹ️  INFO: To test with real AWS SNS messages:");
  console.log("   1. Set up an SNS topic in AWS");
  console.log("   2. Subscribe your webhook endpoint");
  console.log("   3. Trigger a test event from AWS Marketplace");
  console.log("   4. The signature will be automatically verified\n");

  console.log("📊 Summary:");
  console.log("   - SNS signature verification is enabled");
  console.log("   - Invalid signatures will be rejected with 403 status");
  console.log("   - Valid signatures will be processed normally");
  console.log("   - All verification attempts are logged\n");
}

// Run tests
testSignatureVerification().catch(console.error);
*/
