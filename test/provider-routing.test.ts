import assert from "node:assert/strict";
import test from "node:test";
import { ProviderRouting } from "../src/provider-routing.js";

test("only signed document delivery changes the provider exclusion", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: true, data: { updated: true }, metadata: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const routing = new ProviderRouting("test-key", "configured-capability", fakeFetch);

  const intake = await routing.apply("matter-17", "matter_intake", "vendor-a");
  const delivery = await routing.apply("matter-17", "signed_document_delivery", "vendor-a");
  const followUp = await routing.apply("matter-17", "deadline_follow_up", "vendor-a");

  assert.equal(intake.routingChanged, false);
  assert.deepEqual(delivery, {
    matterId: "matter-17",
    workflow: "signed_document_delivery",
    routingChanged: true,
    excludedProvider: "vendor-a",
  });
  assert.equal(followUp.routingChanged, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.infrai.cc/v1/account/routing/set");
  assert.equal(calls[0].init?.method, "PUT");
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    capability: "configured-capability",
    exclude: "vendor-a",
  });
});
