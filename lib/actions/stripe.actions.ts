"use server";

import { stripe } from "../stripe";

export const createPaymentIntent = async (amount: string) => {
  return await stripe.paymentIntents.create({
    amount: Math.round(Number(amount) * 100),
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
  });
};