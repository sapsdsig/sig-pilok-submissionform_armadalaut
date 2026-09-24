import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseBody, requireMethod, withJsonErrors } from "../../server/http.js";
import { createServices } from "../../server/services/factory.js";
import { parseCleanupInput } from "../../server/validation.js";

export default withJsonErrors(async (request: VercelRequest, response: VercelResponse) => {
  requireMethod(request, response, ["POST"]);
  const input = parseCleanupInput(parseBody(request));
  await createServices().uploads.cleanup(input.files);
  response.status(200).json({ ok: true });
});
