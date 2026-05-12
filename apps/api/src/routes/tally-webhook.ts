import crypto from "crypto";

import express, { Router, type Router as IRouter } from "express";

import { processarSubmission as defaultProcessor } from "../services/formularios-processor.js";
import { fromWebhookFields } from "../services/tally.js";

import type { TallyWebhookEvent } from "@link-leagues/types";

export const tallyWebhookRouter: IRouter = Router();

type Processor = (
  formId: string,
  submissionId: string,
  respostas: ReturnType<typeof fromWebhookFields>,
  submittedAt: string,
) => Promise<boolean>;

let processor: Processor = defaultProcessor;

/** Testing seam — não usar em prod. */
export function __setProcessor(fn: Processor): void {
  processor = fn;
}

tallyWebhookRouter.post(
  "/api/formularios/webhook/tally",
  express.raw({ type: "application/json", limit: "200kb" }),
  async (req, res, next) => {
    try {
      const sig = req.header("tally-signature");
      if (!sig) {
        res.status(401).end();
        return;
      }

      const rawBody = req.body as Buffer;
      const secret = process.env.TALLY_WEBHOOK_SIGNING_SECRET ?? "";
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");

      if (!timingSafeEqualB64(sig, expected)) {
        res.status(401).end();
        return;
      }

      const event = JSON.parse(rawBody.toString("utf8")) as TallyWebhookEvent;
      const respostas = fromWebhookFields(event.data.fields);

      await processor(event.data.formId, event.data.responseId, respostas, event.createdAt);

      res.status(200).end();
    } catch (err) {
      next(err);
    }
  },
);

function timingSafeEqualB64(a: string, b: string): boolean {
  const ab = Buffer.from(a, "base64");
  const bb = Buffer.from(b, "base64");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
