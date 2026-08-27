import { syncCatalogFromDb } from "@/lib/catalog/store";

/** Sincroniza catálogo desde Supabase antes de operaciones admin. */
export async function ensureCatalogSynced() {
  await syncCatalogFromDb();
}
