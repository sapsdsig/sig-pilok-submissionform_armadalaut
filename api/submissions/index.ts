import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseBody, requireMethod, withJsonErrors } from "../../server/http.js";
import { createServices } from "../../server/services/factory.js";
import { parseSubmissionInput } from "../../server/validation.js";

type SubmissionWriter = {
  create(input: ReturnType<typeof parseSubmissionInput>): Promise<unknown>;
  update(input: ReturnType<typeof parseSubmissionInput>): Promise<unknown>;
};

export function createSubmissionHandler(writer?: SubmissionWriter) {
  return withJsonErrors(async (request: VercelRequest, response: VercelResponse) => {
    requireMethod(request, response, ["POST", "PUT"]);
    const input = parseSubmissionInput(parseBody(request));
    const service = writer ?? createServices().submissions;
    const result = request.method === "POST"
      ? await service.create(input)
      : await service.update(input);
    response.status(request.method === "POST" ? 201 : 200).json({ submission: result });
  });
}

export default createSubmissionHandler();
