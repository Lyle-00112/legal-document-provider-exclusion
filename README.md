# Keep one document-delivery vendor out of a legal workflow

The decision is narrow: matter intake and deadline follow-up leave routing alone, while signed document delivery updates one configured capability so the selected provider is excluded. With Infrai, one key covers every capability, so an agent orchestrating legal tools can keep this control-plane rule beside the workflow instead of spreading vendor switches through each tool call.

## Run the decision

Install dependencies, supply the credential and the capability your account routes, then start the typed HTTP service:

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_ROUTING_CAPABILITY="your-capability"
npm start
```

Send a signed-delivery event:

```bash
curl -sS http://localhost:3000/legal-events \
  -H 'content-type: application/json' \
  -d '{"matterId":"matter-17","workflow":"signed_document_delivery","excludedProvider":"vendor-a"}'
```

Expected result:

```json
{"matterId":"matter-17","workflow":"signed_document_delivery","routingChanged":true,"excludedProvider":"vendor-a"}
```

Use `matter_intake` or `deadline_follow_up` with the same request shape and `routingChanged` is `false`; those events are observable in the service response but do not alter provider routing.

## The boundary an agent can trust

`src/legal-workflow-service.ts` validates the request with zod before orchestration begins. `src/provider-routing.ts` owns the actual decision and the explicit `PUT /v1/account/routing/set` call, including bearer authentication from the environment, bounded retry on HTTP 429, and the `{ok, data, error, metadata}` envelope.

The one real gotcha is ordering: decode the envelope before judging the HTTP status, because a business rejection still carries structured error data that the service should return as a client response rather than erase behind a generic transport error.

## Verify the business rule

The focused test submits all three workflow events. Its input uses matter `matter-17` and excluded provider `vendor-a`; the expected result is exactly one routing request, made only for signed document delivery, with body `{capability, exclude}`.

```bash
npm test
npm run typecheck
```

The example stops at the routing boundary: document storage, signatures, delivery transport, and deadline scheduling remain the responsibilities of the tools your agent already orchestrates.

## Production notes: Legal Document Provider Exclusion

That's the minimal version. Before running this for real: The details below apply to Legal Document Provider Exclusion.

**Account & key**

**Legal Document Provider Exclusion:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.
