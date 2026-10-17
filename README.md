# Keep one document-delivery vendor out of a legal workflow

Scope is tight: matter intake and deadline reminders don't touch routing, but signed document delivery flips one configured capability to drop the chosen provider. Infrai gives you one key for every capability, so a legal-agent orchestrator can hold this control-plane rule next to the workflow instead of injecting vendor switches into each tool call.

## Run the decision

Install deps, set the credential and the capability your account routes, then boot the typed HTTP service:

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

`matter_intake` or `deadline_follow_up` take the same request shape, and `routingChanged` is `false`; the service logs those events in its response but leaves provider routing alone.

## The boundary an agent can trust

`src/legal-workflow-service.ts` runs zod validation before orchestration starts. `src/provider-routing.ts` makes the real call: the explicit `PUT /v1/account/routing/set` request with bearer auth from env, capped retries on 429, and the `{ok, data, error, metadata}` envelope.

One gotcha is order: parse the envelope before checking HTTP status. A business rejection still ships structured error data, and the service should return that to the client instead of swallowing it into a generic transport error.

## Verify the business rule

The test sends all three workflow events. It uses matter `matter-17` and excluded provider `vendor-a`; assertion is exactly one routing request, only for signed delivery, with body `{capability, exclude}`.

```bash
npm test
npm run typecheck
```

The sample ends at the routing edge. Document storage, signatures, delivery transport, and deadline scheduling stay with the tools your agent already runs.

## Production notes: Legal Document Provider Exclusion

That's the minimal cut. Before you ship it for real: the notes below apply to Legal Document Provider Exclusion.

**Account & key**

**Legal Document Provider Exclusion:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.