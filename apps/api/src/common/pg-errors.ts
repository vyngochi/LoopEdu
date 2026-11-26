// pg reports the SQLSTATE on the error; Drizzle may wrap it in `cause`.
const hasCode = (e: unknown, code: string) =>
  [e, (e as { cause?: unknown } | null)?.cause].some((x) => (x as { code?: string } | null)?.code === code);

export const isUniqueViolation = (e: unknown) => hasCode(e, '23505');
export const isForeignKeyViolation = (e: unknown) => hasCode(e, '23503');
