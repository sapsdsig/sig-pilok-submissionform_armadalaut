import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseBody, requireMethod, withJsonErrors } from "../../server/http.js";
import { createServices } from "../../server/services/factory.js";
import { parseVerifyInput } from "../../server/validation.js";

export default withJsonErrors(async (request: VercelRequest, response: VercelResponse) => {
  requireMethod(request, response, ["POST"]);
  const input = parseVerifyInput(parseBody(request));
  const file = await createServices().uploads.verify(input.fileId, input.uploadToken);
  response.status(200).json({
    ok: true,
    file: {
      fileId: file.id,
      fileName: file.appProperties.displayName || file.name,
      fileUrl: file.webViewLink,
    },
  });
});
