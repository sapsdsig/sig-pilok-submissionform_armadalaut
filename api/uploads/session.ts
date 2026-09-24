import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseBody, requireMethod, withJsonErrors } from "../../server/http.js";
import { createServices } from "../../server/services/factory.js";
import { parseUploadSessionInput } from "../../server/validation.js";

export default withJsonErrors(async (request: VercelRequest, response: VercelResponse) => {
  requireMethod(request, response, ["POST"]);
  const input = parseUploadSessionInput(parseBody(request));
  const origin = typeof request.headers.origin === "string" ? request.headers.origin : undefined;
  const session = await createServices().uploads.createSession({ ...input, origin });
  response.status(201).json(session);
});
