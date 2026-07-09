import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      unique: true,
      index: true,
    },

    // Stripe IDs
    stripeCustomerId: {
      type: String,
      required: true,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
    },
    stripePaymentMethodId: {
      type: String,
      default: null,
    },

    // Plan info
    plan: {
      type: String,
      enum: ['lite', 'plus', 'pro'],
      default: 'lite',
    },

    // Subscription status mirrors Stripe statuses
    status: {
      type: String,
      enum: [
        'active',
        'trialing',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired',
        'paused',
        'free',          // lite / no subscription
      ],
      default: 'free',
    },

    // Billing period
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd:   { type: Date, default: null },

    // Cancellation
    cancelAtPeriodEnd:  { type: Boolean, default: false },
    canceledAt:         { type: Date,    default: null },

    // Latest invoice / payment intent for reference
    latestInvoiceId:    { type: String,  default: null },
    latestInvoiceUrl:   { type: String,  default: null },  // hosted invoice page

    // Metadata
    trialEnd: { type: Date, default: null },
  },
  { timestamps: true }
);
const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;