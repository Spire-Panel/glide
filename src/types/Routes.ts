export type ValidParamType = "string" | "number" | "boolean";
export type Param<T = string | number | boolean> = {
  name: string;
  type: ValidParamType;
  index: number;
  value: T;
};
