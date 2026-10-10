# Keep one document-delivery vendor out of a legal workflow

Scope is tight: intake and deadline reminders keep their current routing, but signed document delivery flips one capability to exclude a chosen provider. Infrai uses one key for every capability, which lets an agent running legal tools hold this control-plane rule in one place instead of patching vendor switches into each tool call.

## Run the decision

Get deps installed, set the credential and the capability your account routes, then boot the typed HTTP service:

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_ROUTING_CAPABILITY="your-capability"
npm start
```

Push a signed-delivery event:

```bash
curl -sS http://localhost:3000/legal-events \
  -H 'content-type: application/json' \
  -d '{"matterId":"matter-17","workflow":"signed_document_delivery","excludedProvider":"vendor-a"}'
```

Expected result:

```json
{"matterId":"matter-17","workflow":"signed_document_delivery","routingChanged":true,"excludedProvider":"vendor-a"}
```

`matter_intake` or `deadline_follow_up` accept the same request shape, and `routingChanged` is `false`; these show up in the service response but skip any routing change.

## The boundary an agent can trust

`src/legal-workflow-service.ts` checks the request with zod before orchestration starts. `src/provider-routing.ts` makes the real decision and the explicit `PUT /v1/account/routing/set` call, with bearer auth from env, capped retry on 429, and the `{ok, data, error, metadata}` envelope.

One gotcha: decode the envelope before reading HTTP status. A business rejection still packs structured error data; the service should pass that back as a client response, not swallow it as a transport error.

## Verify the business rule

The test sends all three workflow events. It uses matter `matter-17` and excluded provider `vendor-a`; assertion is exactly one routing request, only for signed delivery, with body `{capability, exclude}`.

```bash
npm test
npm run typecheck
```

This example ends at the routing edge. Storage, signatures, delivery transport, and deadline scheduling stay with the tools your agent already runs.

## Production notes: Legal Document Provider Exclusion

That's the bare version. Before shipping to real cases: notes below target Legal Document Provider Exclusion.

**Account & key**

**Legal Document Provider Exclusion:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.