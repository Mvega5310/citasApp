import { NextResponse } from 'next/server';
import { authorizeAdmin } from './authorization';
import { store } from './data';
import type { SessionUser } from './session';

/**
 * Autorización de las rutas que operan la plataforma (crear barberías).
 *
 * Se apoya en authorizeAdmin, así que hereda todo lo de siempre: sesión
 * válida, que pertenezca a la barbería del host y que no sea anterior al
 * último cambio de contraseña. Encima exige la marca de operador.
 *
 * La marca se vuelve a comprobar contra la base y no solo contra el token:
 * si se le retira a alguien, su sesión deja de poder crear barberías en el
 * acto, sin esperar a que el token expire.
 *
 * Esto NO da acceso a los datos de otras barberías. authorizeAdmin sigue
 * atando la sesión a su propia barbería; lo único que se habilita es dar de
 * alta barberías nuevas.
 */
type PlatformResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

export async function authorizePlatformAdmin(request: Request): Promise<PlatformResult> {
  const authorized = await authorizeAdmin(request);
  if (!authorized.ok) return authorized;

  const denegar = () =>
    NextResponse.json({ error: 'No tienes permisos para administrar la plataforma' }, { status: 403 });

  if (!authorized.session.platformAdmin) return { ok: false, response: denegar() };

  try {
    const admin = await store().getAdmin(authorized.session.uid);
    if (!admin?.platformAdmin) return { ok: false, response: denegar() };
  } catch {
    // Si la consulta falla no se concede: ante la duda, no se crean barberías.
    return { ok: false, response: denegar() };
  }

  return { ok: true, session: authorized.session };
}
