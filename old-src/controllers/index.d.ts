export type Middleware = (
  c: Context,
  next: () => Promise<void>
) => Promise<void>;
