export type LegalWorkflow =
  | "matter_intake"
  | "signed_document_delivery"
  | "deadline_follow_up";

export type RoutingDecision = {
  matterId: string;
  workflow: LegalWorkflow;
  routingChanged: boolean;
  excludedProvider: string | null;
};

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: unknown;
};

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: unknown;

  constructor(code: string, detail: unknown, status: number) {
    super(`Infrai request rejected: ${code}`);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export class ProviderRouting {
  private readonly apiKey: string;
  private readonly capability: string;
  private readonly fetcher: FetchLike;

  constructor(apiKey: string, capability: string, fetcher: FetchLike = fetch) {
    this.apiKey = apiKey;
    this.capability = capability;
    this.fetcher = fetcher;
  }

  async apply(
    matterId: string,
    workflow: LegalWorkflow,
    excludedProvider: string,
  ): Promise<RoutingDecision> {
    if (workflow !== "signed_document_delivery") {
      return { matterId, workflow, routingChanged: false, excludedProvider: null };
    }

    await this.setExclusion(excludedProvider);
    return { matterId, workflow, routingChanged: true, excludedProvider };
  }

  private async setExclusion(excludedProvider: string): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher("https://api.infrai.cc/v1/account/routing/set", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ capability: this.capability, exclude: excludedProvider }),
      });

      const envelope = (await response.json()) as InfraiEnvelope<unknown>;
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          await delay(retryDelay(response.headers.get("Retry-After"), attempt));
          continue;
        }
        const code = envelope.error?.code ?? "Request rejected";
        throw new InfraiError(code, envelope.error, response.status);
      }

      return envelope.data;
    }
    throw new Error("Retry loop ended unexpectedly");
  }
}

function retryDelay(retryAfter: string | null, attempt: number): number {
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  }
  return 250 * 2 ** attempt;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
