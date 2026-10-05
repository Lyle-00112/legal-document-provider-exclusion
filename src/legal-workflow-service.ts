import { createServer } from "node:http";
import { z } from "zod";
import { InfraiError, ProviderRouting } from "./provider-routing.js";

const requestSchema = z.object({
  matterId: z.string().min(1),
  workflow: z.enum([
    "matter_intake",
    "signed_document_delivery",
    "deadline_follow_up",
  ]),
  excludedProvider: z.string().min(1),
}).strict();

const apiKey = process.env.INFRAI_API_KEY;
const capability = process.env.INFRAI_ROUTING_CAPABILITY;
if (!apiKey || !capability) {
  throw new Error("INFRAI_API_KEY and INFRAI_ROUTING_CAPABILITY are required");
}

const routing = new ProviderRouting(apiKey, capability);
const port = Number(process.env.PORT ?? "3000");

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/legal-events") {
    return sendJson(response, 404, { error: "Route not found" });
  }

  try {
    const parsed = requestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return sendJson(response, 400, { error: "Invalid request", issues: parsed.error.issues });
    }

    const input = parsed.data;
    const decision = await routing.apply(input.matterId, input.workflow, input.excludedProvider);
    return sendJson(response, 200, decision);
  } catch (error) {
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return sendJson(response, status, { error: error.code, detail: error.detail });
    }
    if (error instanceof SyntaxError) {
      return sendJson(response, 400, { error: "Request body must be valid JSON" });
    }
    return sendJson(response, 502, { error: "Upstream request failed" });
  }
}).listen(port, () => {
  console.log(`Legal workflow service listening on http://localhost:${port}`);
});

async function readJson(request: AsyncIterable<Buffer>): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(
  response: { writeHead(status: number, headers: Record<string, string>): void; end(body: string): void },
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}
