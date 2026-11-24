import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Cliente único de Supabase.
 * La clave "publishable" es pública por diseño: la seguridad real la dan las políticas RLS
 * del servidor (ver supabase/migrations). Nunca poner acá la clave "secret"/service_role.
 */
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://ibeinjomorryrkqrdpsx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  'sb_publishable_6HdilHj9S5-9BBKJYMXMyg_Tqpoh1gq';

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/**
 * Cliente con permisos de administración (service_role) para operaciones de coordinación,
 * como listar postulaciones pendientes, aprobar voluntarios y eliminar perfiles rechazados.
 * Requiere configurar EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY en .env (no versionado).
 */
export const adminSupabase = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : supabase;

