export const STRIPE_PLANS = {
  lite: {
    name: 'Clinic Lite',
    priceId: process.env.STRIPE_PRICE_LITE,   // e.g. price_1ABCdefGHIjkLMno
    amount: 99900,      // ₹999/month in paise
    currency: 'inr',
    interval: 'month',
  },
  plus: {
    name: 'Clinic Plus',
    priceId: process.env.STRIPE_PRICE_PLUS,   // e.g. price_1ABCdefGHIjkLMno
    amount: 149900,     // ₹1499/month in paise
    currency: 'inr',
    interval: 'month',
  },
  pro: {
    name: 'Clinic Pro',
    priceId: process.env.STRIPE_PRICE_PRO,    // e.g. price_1ABCdefGHIjkLMno
    amount: 199900,     // ₹1999/month in paise
    currency: 'inr',
    interval: 'month',
  },
};

export function getPlanByPriceId(priceId) {
  return Object.values(STRIPE_PLANS).find((p) => p.priceId === priceId) ?? null;
}

export function getPlanKeyByPriceId(priceId) {
  return (
    Object.keys(STRIPE_PLANS).find(
      (key) => STRIPE_PLANS[key].priceId === priceId
    ) ?? null
  );
}