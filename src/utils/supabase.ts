import { createClient } from '@supabase/supabase-js';

const readRuntimeValue = (name: string): string => {
  const maybeProcess = (
    globalThis as unknown as {
      process?: { env?: Record<string, string> };
    }
  ).process;
  return maybeProcess?.env?.[name] || '';
};

const supabaseUrl = readRuntimeValue('SUPABASE_URL');
const supabaseAnonKey = readRuntimeValue('SUPABASE_ANON_KEY');

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
