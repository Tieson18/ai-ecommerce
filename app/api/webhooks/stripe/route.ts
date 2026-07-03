import { NextResponse } from "next/server";
import Stripe from "stripe";
import { client, writeClient } from "@/sanity/lib/client";
import { ORDER_BY_STRIPE_PAYMENT_ID_QUERY } from "@/sanity/queries/orders";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined");
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not defined");
}

if (!process.env.SANITY_API_WRITE_TOKEN) {
  throw new Error("SANITY_API_WRITE_TOKEN is not defined");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 },
    );
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") {
        console.log(
          `Checkout session ${session.id} has payment_status=${session.payment_status}; waiting for payment confirmation`,
        );
        break;
      }

      await handleCheckoutPaid(session);
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.warn(`Payment failed for checkout session ${session.id}`);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

function getStripePaymentId(session: Stripe.Checkout.Session) {
  const paymentIntent = session.payment_intent;

  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }

  if (paymentIntent?.id) {
    return paymentIntent.id;
  }

  throw new Error(`Checkout session ${session.id} is missing payment_intent`);
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCheckoutMetadata(session: Stripe.Checkout.Session) {
  const {
    clerkUserId,
    userEmail,
    sanityCustomerId,
    productIds: productIdsString,
    quantities: quantitiesString,
  } = session.metadata ?? {};

  if (!clerkUserId || !productIdsString || !quantitiesString) {
    throw new Error(`Checkout session ${session.id} is missing order metadata`);
  }

  const productIds = parseCsv(productIdsString);
  const quantities = parseCsv(quantitiesString).map(Number);

  if (productIds.length === 0 || productIds.length !== quantities.length) {
    throw new Error(
      `Checkout session ${session.id} has mismatched order metadata`,
    );
  }

  if (
    quantities.some((quantity) => !Number.isInteger(quantity) || quantity <= 0)
  ) {
    throw new Error(
      `Checkout session ${session.id} has invalid item quantities`,
    );
  }

  return {
    clerkUserId,
    userEmail,
    sanityCustomerId,
    productIds,
    quantities,
  };
}

async function handleCheckoutPaid(session: Stripe.Checkout.Session) {
  const stripePaymentId = getStripePaymentId(session);

  try {
    // Idempotency check: prevent duplicate processing on webhook retries.
    const existingOrder = await client.fetch(ORDER_BY_STRIPE_PAYMENT_ID_QUERY, {
      stripePaymentId,
    });

    if (existingOrder) {
      console.log(
        `Webhook already processed for payment ${stripePaymentId}, skipping`,
      );
      return;
    }

    const { clerkUserId, userEmail, sanityCustomerId, productIds, quantities } =
      getCheckoutMetadata(session);

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100,
    });

    const orderItems = productIds.map((productId, index) => {
      const lineItem = lineItems.data[index];
      const lineItemQuantity = lineItem?.quantity ?? quantities[index];
      const priceAtPurchase =
        lineItem?.amount_total && lineItemQuantity
          ? lineItem.amount_total / lineItemQuantity / 100
          : 0;

      return {
        _key: `item-${index}`,
        product: {
          _type: "reference" as const,
          _ref: productId,
        },
        quantity: quantities[index],
        priceAtPurchase,
      };
    });

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const shippingAddress = session.customer_details?.address;
    const address = shippingAddress
      ? {
          name: session.customer_details?.name ?? "",
          line1: shippingAddress.line1 ?? "",
          line2: shippingAddress.line2 ?? "",
          city: shippingAddress.city ?? "",
          postcode: shippingAddress.postal_code ?? "",
          country: shippingAddress.country ?? "",
        }
      : undefined;

    const order = {
      _type: "order",
      orderNumber,
      ...(sanityCustomerId && {
        customer: {
          _type: "reference",
          _ref: sanityCustomerId,
        },
      }),
      clerkUserId,
      email: userEmail ?? session.customer_details?.email ?? "",
      items: orderItems,
      total: (session.amount_total ?? 0) / 100,
      status: "paid",
      stripePaymentId,
      address,
      createdAt: new Date().toISOString(),
    };

    // Commit the order and stock updates together so retries cannot leave partial state.
    await productIds
      .reduce(
        (tx, productId, i) =>
          tx.patch(productId, (p) => p.dec({ stock: quantities[i] })),
        writeClient.transaction().create(order),
      )
      .commit({ visibility: "sync" });

    console.log(
      `Order created: ${orderNumber}; stock updated for ${productIds.length} products`,
    );
  } catch (error) {
    console.error("Error handling paid checkout session:", error);
    throw error; // Re-throw to return 500 and trigger Stripe retry.
  }
}
