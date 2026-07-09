
import express from 'express';
import Stripe from 'stripe';
import Subscription from '../models/Subscription.js';
import Clinic from '../models/Clinic.js';
import { getPlanByPriceId } from '../config/plans.js';


const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_preventing_startup_crash_only', {
  apiVersion: '2024-04-10',
});

// ── Raw body middleware (must come before express.json) ──────────────
router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig       = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    

    try {
      await handleStripeEvent(event);
    } catch (err) {
      console.error('[Stripe Webhook] Handler error:', err.message);
      // Still return 200 so Stripe doesn't retry endlessly for non-critical errors
    }

    res.json({ received: true });
  }
);

// ── Core event dispatcher ────────────────────────────────────────────
async function handleStripeEvent(event) {
  switch (event.type) {

    // ── Checkout completed → subscription created ──────────────────
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription') break;

      const clinicId = session.metadata?.clinicId;
      const planKey  = session.metadata?.plan;
      if (!clinicId) break;

      const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
      await upsertSubscription(clinicId, stripeSub, planKey);
      break;
    }

    // ── Subscription created (also fired on checkout) ──────────────
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const stripeSub = event.data.object;
      const clinicId  = stripeSub.metadata?.clinicId;
      if (!clinicId) break;

      const planKey = resolvePlan(stripeSub);
      await upsertSubscription(clinicId, stripeSub, planKey);
      break;
    }

    // ── Subscription deleted / expired ─────────────────────────────
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object;
      const clinicId  = stripeSub.metadata?.clinicId;
      if (!clinicId) break;

      await Subscription.findOneAndUpdate(
        { clinicId },
        {
          status:    'canceled',
          plan:      'lite',
          stripeSubscriptionId: null,
          cancelAtPeriodEnd:    false,
        }
      );

      // Downgrade clinic plan
      await Clinic.findByIdAndUpdate(clinicId, { plan: 'lite' });
      
      break;
    }

    // ── Invoice paid → confirm active ──────────────────────────────
    case 'invoice.paid': {
      const invoice    = event.data.object;
      const customerId = invoice.customer;

      const sub = await Subscription.findOne({ stripeCustomerId: customerId });
      if (!sub) break;

      sub.status            = 'active';
      sub.latestInvoiceId   = invoice.id;
      sub.latestInvoiceUrl  = invoice.hosted_invoice_url ?? null;
      await sub.save();
      break;
    }

    // ── Invoice payment failed ─────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice    = event.data.object;
      const customerId = invoice.customer;

      const sub = await Subscription.findOne({ stripeCustomerId: customerId });
      if (!sub) break;

      sub.status           = 'past_due';
      sub.latestInvoiceId  = invoice.id;
      sub.latestInvoiceUrl = invoice.hosted_invoice_url ?? null;
      await sub.save();

      console.warn(`[Stripe Webhook] Payment failed for clinic (customer: ${customerId})`);
      break;
    }

    default:
      // Unhandled — that's fine
      break;
  }
}

// ── Helpers ────────────────────────────────────────────────────────
function resolvePlan(stripeSub) {
  // Try metadata first (set at checkout)
  if (stripeSub.metadata?.plan) return stripeSub.metadata.plan;

  // Fall back to reading the price ID from the first item
  const priceId = stripeSub.items?.data?.[0]?.price?.id;
  if (priceId) return getPlanByPriceId(priceId) ?? 'lite';

  return 'lite';
}

async function upsertSubscription(clinicId, stripeSub, planKey = 'lite') {
  const status = stripeSub.status; // active | trialing | past_due | etc.

  await Subscription.findOneAndUpdate(
    { clinicId },
    {
      stripeSubscriptionId: stripeSub.id,
      plan:               planKey,
      status:             status,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
      cancelAtPeriodEnd:  stripeSub.cancel_at_period_end ?? false,
      trialEnd:           stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
    },
    { new: true, upsert: true }
  );

  // Sync plan onto the Clinic document so planConfig.js picks it up
  await Clinic.findByIdAndUpdate(clinicId, { plan: planKey });

  
}

export default router;