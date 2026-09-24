import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireMethod, withJsonErrors } from "../server/http.js";

export default withJsonErrors((request: VercelRequest, response: VercelResponse) => {
  requireMethod(request, response, ["GET"]);
  response.status(200).json({ ok: true, runtime: "vercel" });
});
