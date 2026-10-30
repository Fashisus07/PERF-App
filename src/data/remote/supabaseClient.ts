import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente único de Supabase.
 * La clave "publishable" es pública por diseño: la seguridad real la dan las políticas RLS
 * del servidor (ver supabase/migrations). Nunca poner acá la clave "secret"/service_role.
 */
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://kdnosvxrgoxsopmzkghh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_N9ImvM-07t2h9XIVs0EKhA_xoqPD9Qm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
