import { Route } from "@/types";
import { Responses } from "@/types/Http";

export default {
  method: "GET",
  handler: ({}) => {
    return Responses.Ok({
      message: "Hello World",
    });
  },
} as Route;
