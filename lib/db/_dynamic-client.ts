import type { DbErrorLike } from "@/lib/db/_errors";

type ResultOne = Promise<{ data: Record<string, unknown> | null; error: DbErrorLike | null }>;
type ResultMany = Promise<{ data: Record<string, unknown>[] | null; error: DbErrorLike | null }>;

export type DynamicSelect = {
  eq: (column: string, value: unknown) => DynamicSelect;
  order: (column: string, options: { ascending: boolean }) => ResultMany;
  maybeSingle: () => ResultOne;
  single: () => ResultOne;
};

export type DynamicMutate = {
  eq: (column: string, value: unknown) => DynamicMutate;
  select: (columns: string) => {
    single: () => ResultOne;
    maybeSingle: () => ResultOne;
  };
};

export type DynamicTable = {
  select: (columns: string) => DynamicSelect;
  insert: (value: unknown) => { select: (columns: string) => { single: () => ResultOne } };
  update: (value: unknown) => DynamicMutate;
  delete: () => DynamicMutate;
};

export type DynamicClient = {
  from: (table: string) => DynamicTable;
};

