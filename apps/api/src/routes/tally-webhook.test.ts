import crypto from "crypto";

import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { tallyWebhookRouter, __setProcessor } from "./tally-webhook.js";

const SECRET = "test-secret-replace-in-prod-min-16-chars";

function makeApp() {
  const app = express();
  app.use(tallyWebhookRouter);
  return app;
}

function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("base64");
}

describe("POST /api/formularios/webhook/tally", () => {
  let processor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.TALLY_WEBHOOK_SIGNING_SECRET = SECRET;
    processor = vi.fn().mockResolvedValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __setProcessor(processor as any);
  });

  it("aceita assinatura válida e chama processador", async () => {
    const app = makeApp();
    const body = JSON.stringify({
      eventId: "evt_1",
      eventType: "FORM_RESPONSE",
      createdAt: "2026-05-12T00:00:00Z",
      data: {
        responseId: "resp_1",
        respondentId: "p_1",
        formId: "tally_abc",
        fields: [{ key: "k1", label: "Nome", type: "INPUT_TEXT", value: "João" }],
      },
    });
    const res = await request(app)
      .post("/api/formularios/webhook/tally")
      .set("Content-Type", "application/json")
      .set("tally-signature", sign(body))
      .send(body);
    expect(res.status).toBe(200);
    expect(processor).toHaveBeenCalledOnce();
    expect(processor).toHaveBeenCalledWith(
      "tally_abc",
      "resp_1",
      [{ questionId: "k1", label: "Nome", type: "INPUT_TEXT", value: "João" }],
      "2026-05-12T00:00:00Z",
    );
  });

  it("rejeita assinatura inválida com 401", async () => {
    const app = makeApp();
    const body = JSON.stringify({ data: { formId: "x", responseId: "y", fields: [] } });
    const res = await request(app)
      .post("/api/formularios/webhook/tally")
      .set("Content-Type", "application/json")
      .set("tally-signature", "bogus")
      .send(body);
    expect(res.status).toBe(401);
    expect(processor).not.toHaveBeenCalled();
  });

  it("rejeita sem header de assinatura com 401", async () => {
    const app = makeApp();
    const body = JSON.stringify({ data: { formId: "x", responseId: "y", fields: [] } });
    const res = await request(app)
      .post("/api/formularios/webhook/tally")
      .set("Content-Type", "application/json")
      .send(body);
    expect(res.status).toBe(401);
  });

  it("retorna 200 mesmo quando processarSubmission retorna false (idempotente)", async () => {
    processor.mockResolvedValueOnce(false);
    const app = makeApp();
    const body = JSON.stringify({
      eventId: "evt",
      eventType: "FORM_RESPONSE",
      createdAt: "2026-05-12T00:00:00Z",
      data: { responseId: "r", respondentId: "p", formId: "f", fields: [] },
    });
    const res = await request(app)
      .post("/api/formularios/webhook/tally")
      .set("Content-Type", "application/json")
      .set("tally-signature", sign(body))
      .send(body);
    expect(res.status).toBe(200);
  });
});
