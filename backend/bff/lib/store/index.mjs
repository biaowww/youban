/* 存储选择：file（默认）| supabase */
import { createFileStore } from './file.mjs';
import { createSupabaseStore } from './supabase.mjs';

export function getStore(config) {
  if (config.store === 'supabase') return createSupabaseStore(config.supabase);
  if (config.store === 'file') return createFileStore(config.dataDir);
  throw new Error(`未知 COMPANION_STORE=${config.store}`);
}
