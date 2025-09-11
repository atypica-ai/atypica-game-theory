import "server-only";

import Stripe from "stripe";

const globalForStripe = global as unknown as {
  stripe: Stripe | undefined;
};
export const stripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key not found");
  }
  if (!globalForStripe.stripe) {
    globalForStripe.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return globalForStripe.stripe;
};
