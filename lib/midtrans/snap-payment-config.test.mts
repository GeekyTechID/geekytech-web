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

  assert.deepEqual(getSnapPaymentConfig(false), {
    enabled_payments: [...MIDTRANS_SANDBOX_ENABLED_PAYMENTS],
  });
});

test("Production remains controlled by Snap Preferences", () => {
  assert.equal(
    Object.hasOwn(getSnapPaymentConfig(true), "enabled_payments"),
    false,
  );
});

test("ShopeePay callback is omitted when the channel is not account-enabled", () => {
  assert.equal(
    Object.hasOwn(getSnapPaymentConfig(false), "shopeepay"),
    false,
  );
});
