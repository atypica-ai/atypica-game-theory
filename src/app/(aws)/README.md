# AWS Marketplace Integration

This module contains all AWS Marketplace related code for atypica.AI.

## Structure

```
src/app/(aws)/
├── api/
│   └── aws-marketplace/
│       ├── register/route.ts    # Registration endpoint: /api/aws-marketplace/register
│       └── webhook/route.ts     # SNS webhook endpoint: /api/aws-marketplace/webhook
├── lib/
│   ├── entitlement.ts          # AWS Entitlement Service integration
│   ├── sns-validator.ts        # SNS message signature verification
│   ├── types.ts                # TypeScript type definitions
│   └── middleware.ts           # Middleware for AWS auth (not yet used)
├── config.ts                   # AWS configuration constants
└── README.md                   # This file
```

## API Endpoints

### Registration: `/api/aws-marketplace/register`

Handles new customer registration and existing customer login from AWS Marketplace.

**Flow:**
1. AWS sends user to this URL with a registration token
2. Resolve customer identifier using AWS Marketplace Metering API
3. Check if customer already exists in database
4. If new: create user, team, and subscription
5. If existing: validate subscription status
6. Set session token and redirect to `/account`

**Methods:** GET, POST

### Webhook: `/api/aws-marketplace/webhook`

Receives SNS notifications about subscription events.

**Events handled:**
- `subscribe-success` - Subscription activated
- `unsubscribe-pending` - Cancellation initiated
- `unsubscribe-success` - Subscription cancelled
- `entitlement-updated` - Subscription renewed or modified

**Security:** All messages are verified using SNS signature validation.

## Key Features

### 1. User Management

AWS Marketplace users are created with:
- Email: `{customerIdentifier}@aws.atypica.ai`
- Empty password (cannot login via email/password)
- Automatic team creation with configured seats
- Team member user for actual usage

### 2. Subscription Sync

Subscription status is synced from AWS Entitlement Service:
- Dimension/plan (e.g., "team_plan")
- Quantity (number of seats)
- Expiration date
- Active/inactive status

### 3. Security

- SNS message signature verification
- Certificate URL validation (must be from amazonaws.com)
- Token-based authentication (tokens can only be used once)
- Concurrent registration handling

## Configuration

All AWS configuration is in `config.ts`:

```typescript
AWS_MARKETPLACE_CONFIG = {
  REGION: "us-east-1",              // Fixed by AWS
  DEFAULT_DIMENSION: "team_plan",   // Default subscription plan
  DEFAULT_QUANTITY: 3,              // Default team seats
  REQUEST_TIMEOUT: 30000,           // 30 seconds
  CONNECTION_TIMEOUT: 10000,        // 10 seconds
  MAX_RETRIES: 2,
}
```

## Environment Variables

Required:
- `AWS_MARKETPLACE_ACCESS_KEY_ID` - AWS IAM access key for Marketplace
- `AWS_MARKETPLACE_SECRET_ACCESS_KEY` - AWS IAM secret key for Marketplace
- `AWS_MARKETPLACE_PRODUCT_CODE` - Product code from AWS Marketplace

**Note**: Use dedicated environment variables (prefixed with `AWS_MARKETPLACE_`) to avoid conflicts with other AWS SDK integrations that may use the default `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

## Database Schema

### AWSMarketplaceCustomer

```typescript
{
  userId: number
  customerIdentifier: string    // AWS customer ID (unique)
  productCode: string
  status: string                // pending, active, cancelling, cancelled, expired
  dimension: string?            // Subscription plan
  quantity: number              // Number of seats
  subscribedAt: DateTime?
  expiresAt: DateTime?
  cancelledAt: DateTime?
}
```

### AWSMarketplaceEvent

```typescript
{
  customerId: number
  eventType: string            // Event action type
  eventData: Json              // Complete SNS message
}
```

## Testing

Run SNS webhook tests:

```bash
npx tsx scripts/test-sns-webhook.ts
```

## Related Code

- User creation: `src/app/(auth)/lib.ts::createAWSMarketplaceUserWithTeam()`
- Token reset: `src/app/payment/monthlyTokens.ts::resetTeamMonthlyTokens()`
- Profile UI: `src/app/account/profile/page.tsx` (AWS users cannot change name/password)

## Notes

- Route group `(aws)` does not affect URL paths
- All API URLs remain unchanged: `/api/aws-marketplace/*`
- AWS users login as team member users, not personal users
- Session tokens use NextAuth JWT format
