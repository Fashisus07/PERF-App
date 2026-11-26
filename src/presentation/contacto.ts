import { Linking } from 'react-native';

/**
 * Link de WhatsApp (wa.me) para un teléfono argentino escrito de cualquier forma
 * ("11 5555-1234", "011 5555 1234", "+54 9 11 5555-1234"). Sin dígitos devuelve null.
 */
export function urlWhatsApp(telefono: string | null | undefined, mensaje?: string): string | null {
  let digitos = (telefono ?? '').replace(/\D/g, '');
  if (!digitos) return null;
  digitos = digitos.replace(/^00/, '').replace(/^0/, '');
  if (!digitos.startsWith('54')) digitos = `549${digitos}`;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : '';
  return `https://wa.me/${digitos}${texto}`;
}

/** Abre el chat de WhatsApp con ese teléfono. No hace nada si el número no sirve. */
export function abrirWhatsApp(telefono: string | null | undefined, mensaje?: string): void {
  const url = urlWhatsApp(telefono, mensaje);
  if (url) Linking.openURL(url).catch(() => {});
}
