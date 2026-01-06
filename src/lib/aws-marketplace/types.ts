/**
 * AWS Marketplace Type Definitions
 *
 * This module contains TypeScript interfaces and types for AWS Marketplace integration.
 * These types provide type safety without relying on type assertions.
 */

/**
 * Customer subscription status from AWS Entitlement Service
 */
export type CustomerSubscriptionStatus =
  | "pending"
  | "active"
  | "cancelling"
  | "cancelled"
  | "expired";

/**
 * AWS Marketplace subscription plan dimension
 */
export type SubscriptionDimension = "team_plan" | "superteam" | string;

/**
 * Customer subscription information from AWS Entitlement Service
 */
export interface CustomerSubscription {
  active: boolean;
  plan: SubscriptionDimension | null;
  quantity: number;
  expiresAt?: Date;
}

/**
 * Active customer subscription (when active is true)
 */
export interface ActiveCustomerSubscription extends CustomerSubscription {
  active: true;
  expiresAt: Date;
}

/**
 * Expired/inactive customer subscription
 */
export interface InactiveCustomerSubscription extends CustomerSubscription {
  active: false;
  expiresAt?: Date;
}

/**
 * AWS Marketplace customer record from database
 */
export interface AWSMarketplaceCustomerData {
  id: number;
  userId: number;
  customerIdentifier: string;
  productCode: string;
  status: CustomerSubscriptionStatus;
  dimension: SubscriptionDimension | null;
  quantity: number;
  subscribedAt: Date | null;
  expiresAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription access check result
 */
export interface SubscriptionAccessResult {
  hasAccess: boolean;
  reason?: "not_authenticated" | "not_aws_customer" | "subscription_inactive" | "subscription_expired";
  subscription?: {
    plan: SubscriptionDimension;
    quantity: number;
    expiresAt: Date | null;
  };
}

/**
 * SNS notification message payload
 */
export interface SNSNotificationPayload {
  "customer-identifier": string;
  "product-code": string;
  action: "subscribe-success" | "unsubscribe-pending" | "unsubscribe-success" | "entitlement-updated";
  [key: string]: any;
}

/**
 * Type guard to check if subscription is active
 */
export function isActiveSubscription(
  subscription: CustomerSubscription
): subscription is ActiveCustomerSubscription {
  return subscription.active === true && subscription.expiresAt !== undefined;
}

/**
 * Type guard to check if subscription is inactive
 */
export function isInactiveSubscription(
  subscription: CustomerSubscription
): subscription is InactiveCustomerSubscription {
  return subscription.active === false;
}

/**
 * Assert that subscription is active (throws if not)
 *
 * @throws Error if subscription is not active
 */
export function assertActiveSubscription(
  subscription: CustomerSubscription
): asserts subscription is ActiveCustomerSubscription {
  if (!isActiveSubscription(subscription)) {
    throw new Error("Subscription is not active");
  }
}
