import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { store } from '@/lib/server/data';
import { verificarTokenRegistro } from '@/lib/server/registroToken';
import { AuthError, appOriginForNewTenant, auth } from '@/lib/server/auth';
import { sendAdminInvitation } from '@/lib/server/email';
import { emailContextFor, tenantFromSlug } from '@/lib/server/settings';
import { logger } from '@/lib/server/logger';

/** Días de prueba gratis con los que arranca una barbería del registro directo. */
const DIAS_DE_PRUEBA = 15;

function masDias(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function Resultado({
  ok,
  titulo,
  children,
}: {
  ok: boolean;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cafe-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-cafe-card rounded-2xl shadow-lg border border-cafe-border p-8 text-center">
        {ok ? (
          <CheckCircle2 className="w-12 h-12 text-cafe-green mx-auto mb-4" aria-hidden="true" />
        ) : (
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" aria-hidden="true" />
        )}
        <h1 className="text-xl font-display font-medium text-cafe-text mb-3">{titulo}</h1>
        <div className="text-sm text-cafe-muted leading-relaxed space-y-3">{children}</div>
      </div>
    </div>
  );
}

/**
 * Confirma el registro directo y recién ahí crea la barbería.
 *
 * Idempotente a propósito: si el enlace ya se usó (alguien lo abrió dos
 * veces, o un cliente de correo lo visita solo para revisarlo antes de que la
 * persona lo vea) la barbería ya existe y simplemente se avisa de eso, en vez
 * de fallar o de intentar crearla de nuevo.
 */
export default async function ConfirmarRegistroPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? '';
  const datos = token ? await verificarTokenRegistro(token) : null;

  if (!datos) {
    return (
      <Resultado ok={false} titulo="Enlace inválido o vencido">
        <p>Vuelve a registrar tu barbería para recibir un enlace nuevo.</p>
        <Link href="/registro" className="inline-block mt-2 text-cafe-goldlight font-semibold hover:underline">
          Volver al registro
        </Link>
      </Resultado>
    );
  }

  const { slug, name, adminName, adminEmail } = datos;

  const existente = await store().lookupTenant(slug).catch(() => null);
  if (existente?.found) {
    const dominio = process.env.NEXT_PUBLIC_APP_DOMAIN;
    return (
      <Resultado ok titulo="Tu barbería ya está activa">
        <p>
          <strong className="text-cafe-text">{name}</strong> ya había quedado creada con este mismo enlace. Si
          todavía no tienes el correo con tu acceso, revisa spam o pide que te lo reenvíen desde el panel.
        </p>
        {dominio && (
          <a
            href={`https://${slug}.${dominio}/admin/login`}
            className="inline-block mt-2 text-cafe-goldlight font-semibold hover:underline"
          >
            Ir a tu panel
          </a>
        )}
      </Resultado>
    );
  }

  try {
    await store().createTenant({ slug, name });
  } catch (error) {
    logger.error('registro_confirmar_crear_failed', {
      slug,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return (
      <Resultado ok={false} titulo="No se pudo crear tu barbería">
        <p>Ocurrió un problema inesperado. Escríbenos o vuelve a registrarte en unos minutos.</p>
      </Resultado>
    );
  }

  // Prueba gratis automática: el registro directo no cobra nada, y 15 días
  // bastan para que la barbería la pruebe de verdad antes de que Marcos
  // tenga que mirar el caso.
  await store()
    .updateTenantPlan(slug, { hasta: masDias(DIAS_DE_PRUEBA), precio: 0, nota: 'Prueba automática (registro directo)' })
    .catch((error) => {
      logger.warn('registro_confirmar_plan_failed', {
        slug,
        error: error instanceof Error ? error.message : 'unknown',
      });
    });

  let emailSent = false;
  try {
    const origin = appOriginForNewTenant(slug);
    const invited = await auth().invite({ tenantSlug: slug, email: adminEmail, name: adminName, role: 'admin' }, origin);
    if (invited.setupLink) {
      const ctx = await emailContextFor(await tenantFromSlug(slug));
      emailSent = await sendAdminInvitation({
        inviteeName: adminName,
        inviteeEmail: adminEmail,
        inviterName: 'BeautyTurno',
        role: 'admin',
        setupLink: invited.setupLink,
        expiresIn: invited.expiresIn,
        brand: ctx.brand,
      });
    }
  } catch (error) {
    const msg = error instanceof AuthError ? error.message : 'No se pudo preparar el acceso';
    logger.error('registro_confirmar_invite_failed', { slug, error: msg });
    return (
      <Resultado ok titulo="Tu barbería ya está creada">
        <p>
          <strong className="text-cafe-text">{name}</strong> quedó activa, pero no se pudo enviar el correo con tu
          acceso ({msg}). Escríbenos para que te lo demos a mano.
        </p>
      </Resultado>
    );
  }

  logger.info('tenant_created', { slug, by: 'registro-directo', emailSent });

  return (
    <Resultado ok titulo="¡Listo! Tu barbería está activa">
      <p>
        Creamos <strong className="text-cafe-text">{name}</strong> con {DIAS_DE_PRUEBA} días de prueba gratis.
      </p>
      {emailSent ? (
        <p>
          Te enviamos un enlace a <strong className="text-cafe-text">{adminEmail}</strong> para crear tu contraseña y
          entrar al panel.
        </p>
      ) : (
        <p>No se pudo enviar el correo de acceso. Escríbenos para que te lo demos a mano.</p>
      )}
    </Resultado>
  );
}
