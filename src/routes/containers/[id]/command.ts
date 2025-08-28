import { Route } from "@/types";
import { Responses } from "@/types/Http";
import { Param } from "@/types/Routes";
import { dockerService } from "@/services/Docker.service";
import { z } from "zod";
import { ZodErrorFormatter } from "@/lib/utils";

export default {
  method: "POST",
  handler: async ({ params, body }) => {
    const id = params.id.value;

    const expectedBody = z.object({
      command: z.string(),
    });
    const validatedBody = expectedBody.safeParse(body);
    if (!validatedBody.success) {
      throw Responses.BadRequest("Invalid body", {
        details: ZodErrorFormatter(expectedBody, validatedBody.error),
      });
    }

    const result = await dockerService.executeCommand(
      id,
      `rcon-cli ${validatedBody.data.command}`
    );

    return Responses.Ok(result);
  },
} as Route<{ id: Param<string> }>;
