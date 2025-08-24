import { redisService } from "@/services/Redis.service";
import { Route } from "@/types";
import { Param } from "@/types/Routes";
import { Responses } from "@/types/Http";

export default {
  handler: async ({ params }) => {
    const id = params.id.value;
    const logs = await redisService.getLogs(id);
    return Responses.Ok(logs);
  },
} as Route<{
  id: Param<string>;
}>;
