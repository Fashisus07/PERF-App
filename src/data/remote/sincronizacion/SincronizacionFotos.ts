import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../../local/Database';
import { generarUUID } from '../../local/uuid';
import { supabase } from '../supabaseClient';

// Fotos de los casos: la foto principal se sube a Storage (bucket privado) y se registra en
// `fotos_caso`. Cada foto tiene ruta única, así que dos teléfonos nunca se pisan. Los teléfonos
// que no la tienen bajan un enlace firmado. Corre después de la sincronización de datos y nunca
// la rompe: si falla, la foto se reintenta en la próxima.

const BUCKET = 'fotos-casos';
const CLAVE = 'perf.sync.fotos';
const VIGENCIA_ENLACE_SEG = 7 * 24 * 3600;

interface FotoSubida {
  uri: string;
  fotoId: string;
  /** Ya está en Storage y registrada: no se vuelve a subir mientras la foto local no cambie. */
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

  // ── Subir las fotos hechas en este teléfono ──
  const locales = await db.getAllAsync<{ id: string; foto_uri: string }>(
    `SELECT id, foto_uri FROM casos WHERE foto_uri LIKE 'file:%' OR foto_uri LIKE 'content:%';`
  );
  for (const caso of locales) {
    const previa = mapa[caso.id];
    if (previa?.lista && previa.uri === caso.foto_uri) continue;

    // El id se guarda antes de subir: si se corta a la mitad, el reintento usa la misma ruta.
    const fotoId = previa && previa.uri === caso.foto_uri ? previa.fotoId : generarUUID();
    mapa[caso.id] = { uri: caso.foto_uri, fotoId, lista: false };
    await AsyncStorage.setItem(CLAVE, JSON.stringify(mapa));

    try {
      const ruta = `${caso.id}/${fotoId}.jpg`;
      const bytes = await (await fetch(caso.foto_uri)).arrayBuffer();
      const subida = await supabase.storage.from(BUCKET).upload(ruta, bytes, { contentType: 'image/jpeg' });
      // "ya existe" = una subida anterior llegó a completarse: sigue con el registro.
      if (subida.error && !/already exists|duplicate/i.test(subida.error.message)) throw subida.error;

      const { error } = await supabase
        .from('fotos_caso')
        .insert({ id: fotoId, caso_id: caso.id, ruta, principal: true });
      if (error && error.code !== '23505') throw error;

      mapa[caso.id].lista = true;
      await AsyncStorage.setItem(CLAVE, JSON.stringify(mapa));
      resultado.subidas++;
    } catch (e) {
      resultado.fallidas++;
      console.warn(`[sync] foto del caso ${caso.id} falló:`, (e as Error).message);
    }
  }

  // ── Bajar las fotos de casos que cargó otro voluntario ──
  // Los casos sin foto, o con un enlace (que vence), reciben uno nuevo. Nunca se pisa una foto local.
  const sinFoto = await db.getAllAsync<{ id: string; foto_uri: string | null }>(
    `SELECT id, foto_uri FROM casos WHERE foto_uri IS NULL OR foto_uri = '' OR foto_uri LIKE 'http%';`
  );
  if (sinFoto.length > 0) {
    const { data, error } = await supabase
      .from('fotos_caso')
      .select('caso_id, ruta')
      .eq('principal', true)
      .order('created_at', { ascending: false });
    if (error) {
      resultado.fallidas++;
      console.warn('[sync] no se pudo listar fotos:', error.message);
      return resultado;
    }
    const rutaPorCaso = new Map<string, string>();
    for (const f of data ?? []) if (!rutaPorCaso.has(f.caso_id)) rutaPorCaso.set(f.caso_id, f.ruta);

    for (const caso of sinFoto) {
      const ruta = rutaPorCaso.get(caso.id);
      if (!ruta || (!!caso.foto_uri && !esEnlaceRemoto(caso.foto_uri))) continue;
      const { data: firmado, error: errFirma } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(ruta, VIGENCIA_ENLACE_SEG);
      if (errFirma || !firmado) {
        resultado.fallidas++;
        continue;
      }
      await db.runAsync('UPDATE casos SET foto_uri = ? WHERE id = ?;', [firmado.signedUrl, caso.id]);
      resultado.descargadas++;
    }
  }

  return resultado;
}
