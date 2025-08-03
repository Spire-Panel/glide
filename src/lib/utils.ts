import { ZodObject, ZodError } from "zod";

export const ZodErrorFormatter = <T extends ZodObject<any>>(
  validator: T,
  error: ZodError
) => {
  const fieldErrors = error.flatten().fieldErrors;
  const availableFields = Object.entries(validator.shape)
    .map(([key, schema]) => {
      const schemaAny = schema as any;
      const isOptional =
        typeof schemaAny?.isOptional === "function" && schemaAny.isOptional();
      return `${key}${isOptional ? " (optional)" : " (required)"}`;
    })
    .join(", ");

  return {
    ...fieldErrors,
    availableFields,
  };
};
