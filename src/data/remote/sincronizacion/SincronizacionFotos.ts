import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../../local/Database';
import { generarUUID } from '../../local/uuid';
import { supabase } from '../supabaseClient';

// Sincronización de Fotografías en 2 Fases (Offline First):
// - Fase A: Subir el binario local al bucket privado 'casos-fotos/{caso_id}/{uuid}.jpg' en Supabase Storage.
// - Fase B: Obtener la ruta remota ('foto_remote_path'), registrarla en PostgreSQL y marcar 'foto_sync_status = SYNCED' en SQLite.
// Si falla la subida de la imagen, el caso igual se sincroniza y la foto queda en cola de reintento.

const BUCKET = 'casos-fotos';
const CLAVE = 'perf.sync.fotos';
const VIGENCIA_ENLACE_SEG = 7 * 24 * 3600;

interface FotoSubida {
  uri: string;
  fotoId: string;
  lista: boolean;
}

export interface ResultadoFotos {
  subidas: number;
  descargadas: number;
  fallidas: number;
}

const esEnlaceRemoto = (uri: string | null) => !!uri && /^https?:/.test(uri);

async function leerMapa(): Promise<Record<string, FotoSubida>> {
  const raw = await AsyncStorage.getItem(CLAVE);
  return raw ? (JSON.parse(raw) as Record<string, FotoSubida>) : {};
}

export async function sincronizarFotos(): Promise<ResultadoFotos> {
  const resultado: ResultadoFotos = { subidas: 0, descargadas: 0, fallidas: 0 };
  const db = await getDatabase();
  const mapa = await leerMapa();

  // ── 1. Subida en 2 Fases: fotos hechas en este teléfono ──
  const pendientes = await db.getAllAsync<{
    id: string;
    foto_uri: string | null;
    foto_local_uri: string | null;
    foto_remote_path: string | null;
    foto_sync_status: string | null;
  }>(
    `SELECT id, foto_uri, foto_local_uri, foto_remote_path, foto_sync_status
       FROM casos
      WHERE (foto_sync_status = 'PENDING' OR foto_sync_status IS NULL)
        AND (
          (foto_local_uri IS NOT NULL AND (foto_local_uri LIKE 'file:%' OR foto_local_uri LIKE 'content:%'))
          OR (foto_uri IS NOT NULL AND (foto_uri LIKE 'file:%' OR foto_uri LIKE 'content:%'))
        );`
  );

  for (const caso of pendientes) {
    const localUri = caso.foto_local_uri || caso.foto_uri;
    if (!localUri) continue;

    const previa = mapa[caso.id];
    if (previa?.lista && previa.uri === localUri && caso.foto_sync_status === 'SYNCED') continue;

    const fotoId = previa && previa.uri === localUri ? previa.fotoId : generarUUID();
    mapa[caso.id] = { uri: localUri, fotoId, lista: false };
    await AsyncStorage.setItem(CLAVE, JSON.stringify(mapa));

    try {
      const ruta = `${caso.id}/${fotoId}.jpg`;

      // Fase A: Subir el binario al Storage
      const respuestaFetch = await fetch(localUri);
      const bytes = await respuestaFetch.arrayBuffer();
      const subida = await supabase.storage.from(BUCKET).upload(ruta, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });

      if (subida.error && !/already exists|duplicate/i.test(subida.error.message)) {
        throw subida.error;
      }

      // Fase B: Registrar metadatos y actualizar estado local
      const { error: errInsert } = await supabase
        .from('fotos_caso')
        .upsert({ id: fotoId, caso_id: caso.id, ruta, principal: true }, { onConflict: 'id' });
      if (errInsert && errInsert.code !== '23505') throw errInsert;

      // Actualizar columna foto_remote_path en casos remoto
      await supabase
        .from('casos')
        .update({ foto_remote_path: ruta, updated_at: new Date().toISOString() })
        .eq('id', caso.id);

      // Marcar SYNCED en SQLite local
      await db.runAsync(
        `UPDATE casos SET foto_remote_path = ?, foto_sync_status = 'SYNCED' WHERE id = ?;`,
        [ruta, caso.id]
      );

      mapa[caso.id].lista = true;
      await AsyncStorage.setItem(CLAVE, JSON.stringify(mapa));
      resultado.subidas++;
    } catch (e) {
      resultado.fallidas++;
      // Si falla, el caso igual se sincroniza y la foto queda en cola de reintento
      await db.runAsync(
        `UPDATE casos SET foto_sync_status = 'PENDING' WHERE id = ?;`,
        [caso.id]
      );
      console.warn(`[sync] Foto del caso ${caso.id} falló en 2 fases:`, (e as Error).message);
    }
  }

  // ── 2. Descarga de enlaces firmados para fotos cargadas por otros voluntarios ──
  const sinFotoLocal = await db.getAllAsync<{ id: string; foto_uri: string | null; foto_remote_path: string | null }>(
    `SELECT id, foto_uri, foto_remote_path
       FROM casos
      WHERE (foto_uri IS NULL OR foto_uri = '' OR foto_uri LIKE 'http%')
        AND (foto_local_uri IS NULL OR foto_local_uri NOT LIKE 'file:%');`
  );

  if (sinFotoLocal.length > 0) {
    const { data: fotosRemotas, error: errFotos } = await supabase
      .from('fotos_caso')
      .select('caso_id, ruta')
      .eq('principal', true)
      .order('created_at', { ascending: false });

    if (!errFotos && fotosRemotas) {
      const rutaPorCaso = new Map<string, string>();
      for (const f of fotosRemotas) {
        if (!rutaPorCaso.has(f.caso_id)) rutaPorCaso.set(f.caso_id, f.ruta);
      }

      for (const caso of sinFotoLocal) {
        const ruta = caso.foto_remote_path || rutaPorCaso.get(caso.id);
        if (!ruta) continue;

        const { data: firmado, error: errFirma } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(ruta, VIGENCIA_ENLACE_SEG);

        if (!errFirma && firmado?.signedUrl) {
          await db.runAsync(
            `UPDATE casos SET foto_uri = ?, foto_remote_path = ?, foto_sync_status = 'SYNCED' WHERE id = ?;`,
            [firmado.signedUrl, ruta, caso.id]
          );
          resultado.descargadas++;
        }
      }
    }
  }

  return resultado;
}
