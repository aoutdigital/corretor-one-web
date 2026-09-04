import type { DbErrorLike } from "@/lib/db/_errors";

type ResultOne = Promise<{ data: Record<string, unknown> | null; error: DbErrorLike | null }>;
type ResultMany = Promise<{ data: Record<string, unknown>[] | null; error: DbErrorLike | null }>;
type ResultMutate = Promise<{ data?: unknown; error: DbErrorLike | null }>;

export type DynamicSelect = ResultMany & {
  eq: (column: string, value: unknown) => DynamicSelect;
  in: (column: string, values: unknown[]) => DynamicSelect;
  like: (column: string, pattern: string) => DynamicSelect;
  or: (filters: string) => DynamicSelect;
  order: (column: string, options: { ascending: boolean }) => DynamicSelect;
  limit: (count: number) => DynamicSelect;
  maybeSingle: () => ResultOne;
  single: () => ResultOne;
};

export type DynamicMutate = ResultMutate & {
  eq: (column: string, value: unknown) => DynamicMutate;
  select: (columns: string) => {
    single: () => ResultOne;
    maybeSingle: () => ResultOne;
  };
};

export type DynamicTable = {
  select: (columns: string) => DynamicSelect;
  insert: (value: unknown) => { select: (columns: string) => { single: () => ResultOne } };
  upsert: (
    value: unknown,
    options?: { onConflict?: string },
  ) => { select: (columns: string) => { single: () => ResultOne; maybeSingle: () => ResultOne } };
  update: (value: unknown) => DynamicMutate;
  delete: () => DynamicMutate;
};

export type DynamicClient = {
  from: (table: string) => DynamicTable;
};
