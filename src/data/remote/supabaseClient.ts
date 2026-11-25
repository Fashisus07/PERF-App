import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Cliente único de Supabase.
 * La clave "publishable" es pública por diseño: la seguridad real la dan las políticas RLS
 * del servidor (ver supabase/migrations). Nunca poner acá la clave "secret"/service_role: todo lo `EXPO_PUBLIC_` queda dentro del APK.
 * Lo que necesita permisos de administración (correos a coordinadores, aprobar desde el enlace del
 * correo) corre en las Edge Functions de supabase/functions.
 */
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://kdnosvxrgoxsopmzkghh.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  'sb_publishable_N9ImvM-07t2h9XIVs0EKhA_xoqPD9Qm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
