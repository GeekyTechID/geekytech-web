import assert from "node:assert/strict";
import test from "node:test";

import {
  MIDTRANS_SANDBOX_ENABLED_PAYMENTS,
  getSnapPaymentConfig,
} from "./snap-payment-config.ts";

test("Sandbox includes ShopeePay with the existing payment methods", () => {
  assert.deepEqual(MIDTRANS_SANDBOX_ENABLED_PAYMENTS, [
    "gopay",
    "shopeepay",
    "qris",
    "bca_va",
    "bni_va",
    "bri_va",
    "permata_va",
    "echannel",
    "indomaret",
    "alfamart",
    "credit_card",
  ]);

  assert.deepEqual(getSnapPaymentConfig(false, null), {
    enabled_payments: [...MIDTRANS_SANDBOX_ENABLED_PAYMENTS],
  });
});

test("Production remains controlled by Snap Preferences", () => {
  assert.equal(
    Object.hasOwn(getSnapPaymentConfig(true, null), "enabled_payments"),
    false,
  );
});

test("ShopeePay callback points back to the order page", () => {
  assert.deepEqual(
    getSnapPaymentConfig(false, "https://geeky.id/dashboard/orders/order-1"),
    {
      enabled_payments: [...MIDTRANS_SANDBOX_ENABLED_PAYMENTS],
      shopeepay: {
        callback_url: "https://geeky.id/dashboard/orders/order-1",
      },
    },
  );
});

test("Empty order URL omits the ShopeePay callback", () => {
  assert.equal(
    Object.hasOwn(getSnapPaymentConfig(false, null), "shopeepay"),
    false,
  );
});
