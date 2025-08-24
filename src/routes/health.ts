import { Route } from "@/types";
import { Responses } from "@/types/Http";

export default {
  handler: () => {
    return Responses.Ok("OK");
  },
} as Route;
