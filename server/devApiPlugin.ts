import type { IncomingMessage, ServerResponse } from "node:http";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Plugin } from "vite";
import distributorsHandler from "../api/distributors.js";
import healthHandler from "../api/health.js";
import existingSubmissionHandler from "../api/submissions/by-distributor.js";
import submissionHandler from "../api/submissions/index.js";
import cleanupHandler from "../api/uploads/cleanup.js";
import sessionHandler from "../api/uploads/session.js";
import verifyHandler from "../api/uploads/verify.js";
import { loadServerEnvironment } from "./environment.js";
import type { ApiHandler } from "./http.js";

const apiRoutes = new Map<string, ApiHandler>([
  ["/api/health", healthHandler],
  ["/api/distributors", distributorsHandler],
  ["/api/submissions/by-distributor", existingSubmissionHandler],
  ["/api/submissions", submissionHandler],
  ["/api/uploads/session", sessionHandler],
  ["/api/uploads/verify", verifyHandler],
  ["/api/uploads/cleanup", cleanupHandler],
]);

async function readBody(request: IncomingMessage): Promise<string | undefined> {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks).toString("utf8") : undefined;
}

function queryObject(url: URL): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    result[key] = values.length > 1 ? values : values[0] ?? "";
  }
  return result;
}

function adaptResponse(response: ServerResponse): VercelResponse {
  const adapted = response as unknown as VercelResponse;
  adapted.status = (statusCode: number) => {
    response.statusCode = statusCode;
    return adapted;
  };
  adapted.json = (body: unknown) => {
    if (!response.hasHeader("Content-Type")) {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    response.end(JSON.stringify(body));
    return adapted;
  };
  return adapted;
}

export function localApiPlugin(): Plugin {
  return {
    name: "pilok-local-api",
    apply: "serve",
    configureServer(server) {
      loadServerEnvironment(process.cwd());
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
        const handler = apiRoutes.get(url.pathname.replace(/\/$/, ""));
        if (!handler) {
          next();
          return;
        }
        const body = await readBody(request);
        const adaptedRequest = Object.assign(request, {
          body,
          query: queryObject(url),
        }) as unknown as VercelRequest;
        await handler(adaptedRequest, adaptResponse(response));
      });
    },
  };
}
