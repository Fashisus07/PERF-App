import {
  generarHtmlEmailCoordinador,
  DatosNuevoVoluntario,
} from '../../../../supabase/functions/_shared/emailCoordinador';

describe('Correo a coordinadores (Edge Function notificar-voluntario)', () => {
  const datosMock: DatosNuevoVoluntario = {
    id: '1bdb437b-2c0f-4de7-bb33-9cae6b569b6f',
    nombre: 'Facundo Espinosa',
    email: 'perezespinosafacundo@gmail.com',
    telefono: '1177889900',
    zona: 'Caballito',
    brigada: 'Brigada Caballito',
    recursos: ['movil', 'transito'],
    tokenAprobacion: 'token-uuid-12345',
    fechaSolicitud: '2026-11-24T18:58:23.519Z',
  };

  const urlAprobar =
    'http://localhost:8081/?accion=aprobar_voluntario&id=1bdb437b-2c0f-4de7-bb33-9cae6b569b6f&token=token-uuid-12345';
  const urlRechazar =
    'http://localhost:8081/?accion=rechazar_voluntario&id=1bdb437b-2c0f-4de7-bb33-9cae6b569b6f&token=token-uuid-12345';

  it('debe generar un correo HTML con todos los datos del voluntario postulante', () => {
    const html = generarHtmlEmailCoordinador(
      datosMock,
      urlAprobar,
      urlRechazar,
      'Facundo Pérez Espinosa'
    );

    expect(html).toContain('Facundo Espinosa');
    expect(html).toContain('perezespinosafacundo@gmail.com');
    expect(html).toContain('1177889900');
    expect(html).toContain('Caballito');
    expect(html).toContain('Brigada Caballito');
    expect(html).toContain('Móvil / Auto propio');
    expect(html).toContain('Hogar de tránsito');
  });

  it('debe incluir los botones y enlaces de acción con sus respectivos tokens', () => {
    const html = generarHtmlEmailCoordinador(
      datosMock,
      urlAprobar,
      urlRechazar,
      'Facundo Pérez Espinosa'
    );

    expect(html).toContain(urlAprobar);
    expect(html).toContain(urlRechazar);
    expect(html).toContain('ACEPTAR Y HABILITAR VOLUNTARIO');
    expect(html).toContain('RECHAZAR Y BORRAR SOLICITUD');
  });

  it('debe incluir el botón de acceso directo a WhatsApp', () => {
    const html = generarHtmlEmailCoordinador(
      datosMock,
      urlAprobar,
      urlRechazar,
      'Facundo Pérez Espinosa'
    );

    expect(html).toContain('https://wa.me/5491177889900');
    expect(html).toContain('Abrir WhatsApp');
  });

  it('debe incluir advertencia de eliminación definitiva al rechazar', () => {
    const html = generarHtmlEmailCoordinador(
      datosMock,
      urlAprobar,
      urlRechazar,
      'Facundo Pérez Espinosa'
    );

    expect(html).toContain('eliminarán definitivamente de la base de datos');
  });

  it('debe escapar el HTML de los datos que escribe el postulante', () => {
    const html = generarHtmlEmailCoordinador(
      { ...datosMock, nombre: '<script>alert(1)</script>' },
      urlAprobar,
      urlRechazar,
      'Facundo'
    );

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
