import nodemailer from 'nodemailer';

/** Lo mínimo que necesitamos para enviar: lo cumplen nodemailer (SMTP) y Resend. */
type Mailer = {
  sendMail(message: { from: string; to: string; subject: string; html: string; replyTo?: string }): Promise<unknown>;
};

/**
 * Envío por Resend (https://resend.com) mediante su API HTTP.
 * Se activa con RESEND_API_KEY; el remitente (EMAIL_FROM) debe ser de un dominio
 * verificado en Resend, p. ej. "Marcos BarberShop <citas@proyects.store>".
 */
function resendMailer(apiKey: string): Mailer {
  return {
    async sendMail(message) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: message.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
        // Igual que con SMTP: un proveedor lento no debe colgar la reserva
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Resend respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return res.json();
    },
  };
}

function getTransporter(): Mailer | null {
  // Resend tiene prioridad si está configurado; si no, SMTP como hasta ahora
  if (process.env.RESEND_API_KEY) return resendMailer(process.env.RESEND_API_KEY);
  const host = process.env.EMAIL_SERVER_HOST;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_SERVER_PORT || 587),
    secure: false,
    auth: { user, pass },
    // Sin estos límites, un servidor de destino lento (Hotmail/Outlook suele
    // demorar o hacer greylisting) puede dejar la conexión colgada varios
    // minutos (el timeout por defecto de nodemailer es de hasta 10 min),
    // bloqueando cualquier ruta que espere el envío del correo.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

function getSender() {
  return process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER || 'no-reply@beautyturno.com';
}

function getToDefault() {
  return process.env.EMAIL_TO_DEFAULT || '';
}

/**
 * Destinatarios de una notificación, según la barbería:
 * - admin: correo del negocio que recibe los avisos (null = no enviar al negocio)
 * - client: si se envía copia al cliente
 * Si no se indica, se mantiene el comportamiento original (EMAIL_TO_DEFAULT + cliente).
 */
export type NotifyRecipients = { admin: string | null; client: boolean };

function adminRecipient(recipients?: NotifyRecipients): string {
  return recipients ? recipients.admin ?? '' : getToDefault();
}

function clientAllowed(recipients?: NotifyRecipients): boolean {
  return recipients ? recipients.client : true;
}

/** Identidad de la barbería en los correos. */
export type EmailBrand = { name: string; address: string; phone: string };

/** Marca de la barbería por defecto: los datos que ya mostraban los correos. */
export const DEFAULT_BRAND: EmailBrand = {
  name: 'Marcos BarberShop',
  address: 'Bella vista, Colombia',
  phone: '+57 3024075828',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Copia del payload con todos los textos escapados, para insertarlos en HTML. */
function esc<T>(value: T): T {
  if (typeof value === 'string') return escapeHtml(value) as T;
  if (Array.isArray(value)) return value.map(esc) as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, esc(v)])) as T;
  }
  return value;
}

function brandOf(payload: { brand?: EmailBrand }): EmailBrand {
  return payload.brand ?? DEFAULT_BRAND;
}

/** Líneas de dirección y teléfono; omite las que la barbería no configuró. */
function contactLines(b: EmailBrand): string {
  return [
    b.address ? `📍 <strong>Dirección:</strong> ${b.address}<br/>` : '',
    b.phone ? `📞 <strong>Teléfono:</strong> ${b.phone}<br/>` : '',
  ].join('');
}

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f9fafb;
  padding: 40px 20px;
`;

const cardStyle = `
  background: #ffffff;
  border-radius: 12px;
  max-width: 560px;
  margin: 0 auto;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
`;

const headerStyle = `
  background: linear-gradient(135deg, #ec4899, #db2777);
  padding: 32px 40px;
  text-align: center;
`;

const bodyStyle = `
  padding: 32px 40px;
`;

const rowStyle = `
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
`;

const labelStyle = `
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  min-width: 120px;
  padding-top: 2px;
`;

const valueStyle = `
  font-size: 15px;
  color: #111827;
  font-weight: 500;
`;

const footerStyle = `
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
  padding: 20px 40px;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
`;

function buildRow(label: string, value: string) {
  return `
    <div style="${rowStyle}">
      <span style="${labelStyle}">${label}</span>
      <span style="${valueStyle}">${value}</span>
    </div>
  `;
}

function buildAdminBookingEmail(payload: {
  brand?: EmailBrand;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  date: string;
  time: string;
}) {
  const b = brandOf(payload);
  const dateFormatted = new Date(payload.date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="font-size:32px; margin-bottom:8px;">📅</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Nueva Reserva</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">${b.name}</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 24px; font-size:15px;">
            Se ha registrado una nueva cita. Aquí están los detalles:
          </p>
          ${buildRow('Servicio', payload.serviceName)}
          ${buildRow('Cliente', payload.clientName)}
          ${buildRow('Email', payload.clientEmail)}
          ${buildRow('WhatsApp', payload.clientWhatsApp)}
          ${buildRow('Fecha', dateFormatted)}
          ${buildRow('Hora', payload.time)}
          <div style="margin-top:24px; padding:16px; background:#fdf2f8; border-radius:8px; border-left:4px solid #ec4899;">
            <p style="margin:0; font-size:13px; color:#9d174d;">
              💡 Recuerda confirmar la cita al cliente para garantizar su asistencia.
            </p>
          </div>
        </div>
        <div style="${footerStyle}">
          ${b.name} · Sistema de Reservas · ${new Date().getFullYear()}
        </div>
      </div>
    </div>
  `;
}

function buildClientConfirmationEmail(payload: {
  brand?: EmailBrand;
  serviceName: string;
  clientName: string;
  date: string;
  time: string;
  cancelUrl?: string;
}) {
  const b = brandOf(payload);
  const dateFormatted = new Date(payload.date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const cancelBlock = payload.cancelUrl
    ? `<div style="text-align:center; margin-top:24px;">
        <a href="${payload.cancelUrl}"
           style="display:inline-block; background:#f3f4f6; color:#6b7280; text-decoration:none; padding:10px 22px; border-radius:8px; font-size:13px; font-weight:500; border:1px solid #e5e7eb;">
          Cancelar mi cita
        </a>
        <p style="color:#9ca3af; font-size:11px; margin:8px 0 0;">
          Puedes cancelar hasta 30 minutos antes de tu cita.
        </p>
      </div>`
    : '';

  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="font-size:32px; margin-bottom:8px;">✨</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">¡Cita Confirmada!</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">${b.name}</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 24px; font-size:16px;">
            Hola <strong>${payload.clientName}</strong>, tu reserva ha sido registrada con éxito. 🎉
          </p>
          ${buildRow('Servicio', payload.serviceName)}
          ${buildRow('Fecha', dateFormatted)}
          ${buildRow('Hora', payload.time)}
          <div style="margin-top:24px; padding:16px; background:#fdf2f8; border-radius:8px; border-left:4px solid #ec4899;">
            <p style="margin:0; font-size:13px; color:#9d174d;">
              ${contactLines(b)}
              ⏰ Llega 10 minutos antes de tu cita.
            </p>
          </div>
          ${cancelBlock}
        </div>
        <div style="${footerStyle}">
          ${b.name} · Sistema de Reservas · ${new Date().getFullYear()}<br/>
          <span style="color:#d1d5db;">Este es un mensaje automático, no respondas a este correo.</span>
        </div>
      </div>
    </div>
  `;
}

function buildCancellationClientEmail(payload: {
  brand?: EmailBrand;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  const b = brandOf(payload);
  const dateFormatted = new Date(payload.date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="background:linear-gradient(135deg,#6b7280,#4b5563); padding:32px 40px; text-align:center;">
          <div style="font-size:32px; margin-bottom:8px;">❌</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Cita Cancelada</h1>
          <p style="color:#e5e7eb; margin:6px 0 0; font-size:14px;">${b.name}</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 24px; font-size:16px;">
            Hola <strong>${payload.clientName}</strong>, tu cita ha sido cancelada correctamente.
          </p>
          ${buildRow('Servicio', payload.serviceName)}
          ${buildRow('Fecha', dateFormatted)}
          ${buildRow('Hora', payload.time)}
          <div style="margin-top:24px; padding:16px; background:#f9fafb; border-radius:8px; border-left:4px solid #9ca3af;">
            <p style="margin:0; font-size:13px; color:#6b7280; line-height:1.6;">
              Si deseas reagendar tu cita, puedes hacerlo desde nuestra página web cuando quieras.
            </p>
          </div>
        </div>
        <div style="${footerStyle}">
          ${b.name} · Sistema de Reservas · ${new Date().getFullYear()}<br/>
          <span style="color:#d1d5db;">Este es un mensaje automático, no respondas a este correo.</span>
        </div>
      </div>
    </div>
  `;
}

function buildLateCancellationAdminEmail(payload: {
  brand?: EmailBrand;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  const b = brandOf(payload);
  const dateFormatted = new Date(payload.date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="background:linear-gradient(135deg,#dc2626,#b91c1c); padding:32px 40px; text-align:center;">
          <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Cancelación Tardía</h1>
          <p style="color:#fecaca; margin:6px 0 0; font-size:14px;">El cliente canceló fuera de la ventana de 30 minutos</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 24px; font-size:15px;">
            Un cliente canceló su cita con menos de 30 minutos de anticipación:
          </p>
          ${buildRow('Cliente', payload.clientName)}
          ${buildRow('Servicio', payload.serviceName)}
          ${buildRow('Fecha', dateFormatted)}
          ${buildRow('Hora', payload.time)}
        </div>
        <div style="${footerStyle}">
          ${b.name} · Sistema de Reservas · ${new Date().getFullYear()}
        </div>
      </div>
    </div>
  `;
}

function buildContactEmail(payload: {
  brand?: EmailBrand;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) {
  const b = brandOf(payload);
  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="font-size:32px; margin-bottom:8px;">💬</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Nuevo Mensaje</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">Formulario de Contacto · ${b.name}</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 24px; font-size:15px;">
            Has recibido un nuevo mensaje a través del formulario de contacto.
          </p>
          ${buildRow('Nombre', payload.name)}
          ${buildRow('Email', payload.email)}
          ${payload.phone ? buildRow('Teléfono', payload.phone) : ''}
          ${buildRow('Asunto', payload.subject)}
          <div style="margin-top:8px;">
            <p style="${labelStyle}">Mensaje</p>
            <div style="background:#f9fafb; border-radius:8px; padding:16px; margin-top:8px; color:#374151; font-size:15px; line-height:1.6; white-space:pre-wrap;">${payload.message}</div>
          </div>
          <div style="margin-top:24px;">
            <a href="mailto:${payload.email}" style="display:inline-block; background:#ec4899; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; font-size:14px;">
              Responder a ${payload.name}
            </a>
          </div>
        </div>
        <div style="${footerStyle}">
          ${b.name} · ${new Date().getFullYear()}
        </div>
      </div>
    </div>
  `;
}

export async function sendCancellationEmails(payload: {
  brand?: EmailBrand;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  date: string;
  time: string;
  isLate: boolean;
}, recipients?: NotifyRecipients): Promise<void> {
  const transporter = getTransporter();
  const from = getSender();
  const toDefault = adminRecipient(recipients);

  if (!transporter) return;

  // Se espera a que ambos envíos terminen (en paralelo) antes de devolver el
  // control: en un entorno serverless, una promesa "suelta" que sigue
  // corriendo después de responder al cliente puede quedar cortada a medias.
  await Promise.all([
    payload.clientEmail && clientAllowed(recipients)
      ? transporter
          .sendMail({
            from,
            to: payload.clientEmail,
            subject: `Cancelación de tu cita — ${payload.serviceName}`,
            html: buildCancellationClientEmail(esc(payload)),
          })
          .catch(() => {})
      : Promise.resolve(),
    payload.isLate && toDefault
      ? transporter
          .sendMail({
            from,
            to: toDefault,
            subject: `⚠️ Cancelación tardía: ${payload.clientName} — ${payload.serviceName}`,
            html: buildLateCancellationAdminEmail(esc(payload)),
          })
          .catch(() => {})
      : Promise.resolve(),
  ]);
}

export async function sendBookingNotification(payload: {
  brand?: EmailBrand;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  date: string;
  time: string;
  cancelUrl?: string;
}, recipients?: NotifyRecipients): Promise<{ sentToDefault: boolean; sentToClient: boolean }> {
  const transporter = getTransporter();
  const from = getSender();
  const toDefault = adminRecipient(recipients);

  if (!transporter) {
    return { sentToDefault: false, sentToClient: false };
  }

  const subject = `Nueva reserva: ${payload.serviceName} — ${payload.date} ${payload.time}`;

  // Se envían en paralelo (no uno tras otro) para que un destinatario lento
  // no duplique la espera del otro.
  const [sentToDefault, sentToClient] = await Promise.all([
    toDefault
      ? transporter
          .sendMail({ from, to: toDefault, subject, html: buildAdminBookingEmail(esc(payload)) })
          .then(() => true)
          .catch(() => false)
      : Promise.resolve(false),
    payload.clientEmail && clientAllowed(recipients)
      ? transporter
          .sendMail({
            from,
            to: payload.clientEmail,
            subject: `✅ Confirmación de tu cita — ${payload.serviceName}`,
            html: buildClientConfirmationEmail(esc(payload)),
          })
          .then(() => true)
          .catch(() => false)
      : Promise.resolve(false),
  ]);

  return { sentToDefault, sentToClient };
}

type GroupAppointmentInfo = { serviceName: string; date: string; time: string };

function formatGroupDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function buildGroupAppointmentList(appointments: GroupAppointmentInfo[]) {
  return appointments
    .map(
      (a, i) => `
        <div style="margin-bottom:12px; padding:14px 16px; background:#f9fafb; border-radius:8px; border-left:4px solid #ec4899;">
          <p style="margin:0 0 4px; font-size:12px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px;">Cita ${i + 1}</p>
          <p style="margin:0; font-size:15px; color:#111827; font-weight:500;">${a.serviceName}</p>
          <p style="margin:2px 0 0; font-size:13px; color:#6b7280;">${formatGroupDate(a.date)} · ${a.time}</p>
        </div>
      `
    )
    .join('');
}

function buildGroupBookingAdminEmail(payload: {
  brand?: EmailBrand;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  appointments: GroupAppointmentInfo[];
}) {
  const b = brandOf(payload);
  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="font-size:32px; margin-bottom:8px;">📅</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Nuevas Reservas</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">${b.name}</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 20px; font-size:15px;">
            Se registraron <strong>${payload.appointments.length} citas</strong> en una misma reserva. Aquí están los detalles:
          </p>
          ${buildRow('Cliente', payload.clientName)}
          ${buildRow('Email', payload.clientEmail)}
          ${buildRow('WhatsApp', payload.clientWhatsApp)}
          <div style="margin-top:16px;">
            ${buildGroupAppointmentList(payload.appointments)}
          </div>
        </div>
        <div style="${footerStyle}">
          ${b.name} · Sistema de Reservas · ${new Date().getFullYear()}
        </div>
      </div>
    </div>
  `;
}

function buildGroupBookingClientEmail(payload: {
  brand?: EmailBrand;
  clientName: string;
  appointments: GroupAppointmentInfo[];
  cancelUrl?: string;
}) {
  const b = brandOf(payload);
  const cancelBlock = payload.cancelUrl
    ? `<div style="text-align:center; margin-top:24px;">
        <a href="${payload.cancelUrl}"
           style="display:inline-block; background:#f3f4f6; color:#6b7280; text-decoration:none; padding:10px 22px; border-radius:8px; font-size:13px; font-weight:500; border:1px solid #e5e7eb;">
          Gestionar mis citas
        </a>
        <p style="color:#9ca3af; font-size:11px; margin:8px 0 0;">
          Desde ahí puedes cancelar una, varias o todas tus citas.
        </p>
      </div>`
    : '';

  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="font-size:32px; margin-bottom:8px;">✨</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">¡Citas Confirmadas!</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">${b.name}</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 20px; font-size:16px;">
            Hola <strong>${payload.clientName}</strong>, reservamos <strong>${payload.appointments.length} citas</strong> con éxito. 🎉
          </p>
          ${buildGroupAppointmentList(payload.appointments)}
          <div style="margin-top:24px; padding:16px; background:#fdf2f8; border-radius:8px; border-left:4px solid #ec4899;">
            <p style="margin:0; font-size:13px; color:#9d174d;">
              ${contactLines(b)}
              ⏰ Llega 10 minutos antes de cada cita.
            </p>
          </div>
          ${cancelBlock}
        </div>
        <div style="${footerStyle}">
          ${b.name} · Sistema de Reservas · ${new Date().getFullYear()}<br/>
          <span style="color:#d1d5db;">Este es un mensaje automático, no respondas a este correo.</span>
        </div>
      </div>
    </div>
  `;
}

export async function sendGroupBookingNotification(payload: {
  brand?: EmailBrand;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  appointments: GroupAppointmentInfo[];
  cancelUrl?: string;
}, recipients?: NotifyRecipients): Promise<{ sentToDefault: boolean; sentToClient: boolean }> {
  const transporter = getTransporter();
  const from = getSender();
  const toDefault = adminRecipient(recipients);

  if (!transporter) {
    return { sentToDefault: false, sentToClient: false };
  }

  const subject = `Nuevas reservas: ${payload.appointments.length} citas — ${payload.clientName}`;

  const [sentToDefault, sentToClient] = await Promise.all([
    toDefault
      ? transporter
          .sendMail({ from, to: toDefault, subject, html: buildGroupBookingAdminEmail(esc(payload)) })
          .then(() => true)
          .catch(() => false)
      : Promise.resolve(false),
    payload.clientEmail && clientAllowed(recipients)
      ? transporter
          .sendMail({
            from,
            to: payload.clientEmail,
            subject: `✅ Confirmación de tus ${payload.appointments.length} citas`,
            html: buildGroupBookingClientEmail(esc(payload)),
          })
          .then(() => true)
          .catch(() => false)
      : Promise.resolve(false),
  ]);

  return { sentToDefault, sentToClient };
}

function buildGroupCancellationClientEmail(payload: {
  brand?: EmailBrand;
  clientName: string;
  cancelled: GroupAppointmentInfo[];
  stillActive: GroupAppointmentInfo[];
}) {
  const b = brandOf(payload);
  const stillActiveBlock = payload.stillActive.length
    ? `<div style="margin-top:20px;">
        <p style="${labelStyle}">Citas que siguen activas</p>
        <div style="margin-top:8px;">${buildGroupAppointmentList(payload.stillActive)}</div>
      </div>`
    : '';

  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="background:linear-gradient(135deg,#6b7280,#4b5563); padding:32px 40px; text-align:center;">
          <div style="font-size:32px; margin-bottom:8px;">❌</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Citas Canceladas</h1>
          <p style="color:#e5e7eb; margin:6px 0 0; font-size:14px;">${b.name}</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 20px; font-size:16px;">
            Hola <strong>${payload.clientName}</strong>, se cancelaron ${payload.cancelled.length} de tus citas correctamente.
          </p>
          ${buildGroupAppointmentList(payload.cancelled)}
          ${stillActiveBlock}
          <div style="margin-top:24px; padding:16px; background:#f9fafb; border-radius:8px; border-left:4px solid #9ca3af;">
            <p style="margin:0; font-size:13px; color:#6b7280; line-height:1.6;">
              Si deseas reagendar, puedes hacerlo desde nuestra página web cuando quieras.
            </p>
          </div>
        </div>
        <div style="${footerStyle}">
          ${b.name} · Sistema de Reservas · ${new Date().getFullYear()}<br/>
          <span style="color:#d1d5db;">Este es un mensaje automático, no respondas a este correo.</span>
        </div>
      </div>
    </div>
  `;
}

function buildGroupLateCancellationAdminEmail(payload: {
  brand?: EmailBrand;
  clientName: string;
  cancelled: GroupAppointmentInfo[];
}) {
  const b = brandOf(payload);
  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="background:linear-gradient(135deg,#dc2626,#b91c1c); padding:32px 40px; text-align:center;">
          <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Cancelación Tardía</h1>
          <p style="color:#fecaca; margin:6px 0 0; font-size:14px;">El cliente canceló fuera de la ventana de 30 minutos</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 24px; font-size:15px;">
            <strong>${payload.clientName}</strong> canceló ${payload.cancelled.length} cita(s) con menos de 30 minutos de anticipación:
          </p>
          ${buildGroupAppointmentList(payload.cancelled)}
        </div>
        <div style="${footerStyle}">
          ${b.name} · Sistema de Reservas · ${new Date().getFullYear()}
        </div>
      </div>
    </div>
  `;
}

export async function sendGroupCancellationEmails(payload: {
  brand?: EmailBrand;
  clientName: string;
  clientEmail: string;
  cancelled: GroupAppointmentInfo[];
  stillActive: GroupAppointmentInfo[];
  anyLate: boolean;
}, recipients?: NotifyRecipients): Promise<void> {
  const transporter = getTransporter();
  const from = getSender();
  const toDefault = adminRecipient(recipients);

  if (!transporter) return;

  await Promise.all([
    payload.clientEmail && clientAllowed(recipients)
      ? transporter
          .sendMail({
            from,
            to: payload.clientEmail,
            subject: `Cancelación de ${payload.cancelled.length} cita(s)`,
            html: buildGroupCancellationClientEmail(esc(payload)),
          })
          .catch(() => {})
      : Promise.resolve(),
    payload.anyLate && toDefault
      ? transporter
          .sendMail({
            from,
            to: toDefault,
            subject: `⚠️ Cancelación tardía: ${payload.clientName} — ${payload.cancelled.length} cita(s)`,
            html: buildGroupLateCancellationAdminEmail(esc(payload)),
          })
          .catch(() => {})
      : Promise.resolve(),
  ]);
}

function buildAdminInvitationEmail(payload: {
  brand?: EmailBrand;
  inviteeName: string;
  inviterName: string;
  role: string;
  setupLink: string;
  expiresIn?: string;
}) {
  const b = brandOf(payload);
  const roleLabel = payload.role === 'admin' ? 'Administrador' : 'Solo lectura';
  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="font-size:32px; margin-bottom:8px;">🔐</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Invitación al Panel</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">${b.name} · Administración</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 20px; font-size:16px;">
            Hola <strong>${payload.inviteeName}</strong>,
          </p>
          <p style="color:#374151; margin:0 0 20px; font-size:15px; line-height:1.6;">
            <strong>${payload.inviterName}</strong> te ha invitado a unirte como
            <strong>${roleLabel}</strong> del panel de administración de ${b.name}.
          </p>
          <p style="color:#374151; margin:0 0 28px; font-size:15px; line-height:1.6;">
            Haz clic en el botón para crear tu contraseña y activar tu cuenta:
          </p>
          <div style="text-align:center; margin-bottom:28px;">
            <a href="${payload.setupLink}"
               style="display:inline-block; background:linear-gradient(135deg,#ec4899,#db2777); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:10px; font-weight:700; font-size:15px; letter-spacing:0.3px;">
              Crear mi contraseña
            </a>
          </div>
          <div style="padding:14px 16px; background:#fdf2f8; border-radius:8px; border-left:4px solid #ec4899;">
            <p style="margin:0; font-size:13px; color:#9d174d; line-height:1.5;">
              🔒 Este enlace expira en <strong>${payload.expiresIn ?? '72 horas'}</strong>. Si no lo solicitaste, ignora este mensaje.
            </p>
          </div>
        </div>
        <div style="${footerStyle}">
          ${b.name} · ${new Date().getFullYear()}<br/>
          <span style="color:#d1d5db;">Este es un mensaje automático, no respondas a este correo.</span>
        </div>
      </div>
    </div>
  `;
}

export async function sendAdminInvitation(payload: {
  brand?: EmailBrand;
  inviteeName: string;
  inviteeEmail: string;
  inviterName: string;
  role: string;
  setupLink: string;
  expiresIn?: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  const from = getSender();
  if (!transporter) return false;
  try {
    await transporter.sendMail({
      from,
      to: payload.inviteeEmail,
      subject: `Invitación al panel de administración — ${brandOf(payload).name}`,
      html: buildAdminInvitationEmail(esc(payload)),
    });
    return true;
  } catch {
    return false;
  }
}

function buildReminderEmail(payload: {
  brand?: EmailBrand;
  clientName: string;
  serviceName: string;
  time: string;
}) {
  const b = brandOf(payload);
  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="font-size:32px; margin-bottom:8px;">⏰</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">¡Tu cita es en 10 minutos!</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">${b.name}</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 24px; font-size:16px;">
            Hola <strong>${payload.clientName}</strong>, te recordamos que tu cita está a punto de comenzar. 💅
          </p>
          ${buildRow('Servicio', payload.serviceName)}
          ${buildRow('Hora', payload.time)}
          <div style="margin-top:24px; padding:16px; background:#fdf2f8; border-radius:8px; border-left:4px solid #ec4899;">
            <p style="margin:0; font-size:13px; color:#9d174d; line-height:1.6;">
              ${contactLines(b)}
              👟 ¡Estamos listos para recibirte!
            </p>
          </div>
        </div>
        <div style="${footerStyle}">
          ${b.name} · Sistema de Reservas · ${new Date().getFullYear()}<br/>
          <span style="color:#d1d5db;">Este es un mensaje automático, no respondas a este correo.</span>
        </div>
      </div>
    </div>
  `;
}

export async function sendReminderEmail(payload: {
  brand?: EmailBrand;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  time: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  const from = getSender();
  if (!transporter || !payload.clientEmail) return false;
  try {
    await transporter.sendMail({
      from,
      to: payload.clientEmail,
      subject: `⏰ Tu cita de ${payload.serviceName} comienza en 10 minutos`,
      html: buildReminderEmail(esc(payload)),
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendContactMessage(payload: {
  brand?: EmailBrand;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}, recipients?: NotifyRecipients): Promise<boolean> {
  const transporter = getTransporter();
  const from = getSender();
  const toDefault = adminRecipient(recipients);
  if (!transporter || !toDefault) return false;

  try {
    await transporter.sendMail({
      from,
      to: toDefault,
      replyTo: payload.email,
      subject: `[Contacto] ${payload.subject} — ${payload.name}`,
      html: buildContactEmail(esc(payload)),
    });
    return true;
  } catch {
    return false;
  }
}

function buildPasswordLinkEmail(payload: {
  brand?: EmailBrand;
  name: string;
  link: string;
  purpose: 'setup' | 'reset';
  expiresIn: string;
}) {
  const b = brandOf(payload);
  const isSetup = payload.purpose === 'setup';
  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="font-size:32px; margin-bottom:8px;">🔐</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">${isSetup ? 'Crea tu contraseña' : 'Restablece tu contraseña'}</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">${b.name} · Administración</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 20px; font-size:16px;">Hola <strong>${payload.name}</strong>,</p>
          <p style="color:#374151; margin:0 0 28px; font-size:15px; line-height:1.6;">
            ${isSetup
              ? 'Para entrar al panel de administración necesitas crear tu contraseña. Haz clic en el botón:'
              : 'Recibimos una solicitud para restablecer la contraseña de tu cuenta del panel. Haz clic en el botón para elegir una nueva:'}
          </p>
          <div style="text-align:center; margin-bottom:28px;">
            <a href="${payload.link}"
               style="display:inline-block; background:linear-gradient(135deg,#ec4899,#db2777); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:10px; font-weight:700; font-size:15px; letter-spacing:0.3px;">
              ${isSetup ? 'Crear mi contraseña' : 'Elegir nueva contraseña'}
            </a>
          </div>
          <div style="padding:14px 16px; background:#fdf2f8; border-radius:8px; border-left:4px solid #ec4899;">
            <p style="margin:0; font-size:13px; color:#9d174d; line-height:1.5;">
              🔒 El enlace sirve una sola vez y expira en <strong>${payload.expiresIn}</strong>.
              Si no lo solicitaste, ignora este mensaje: tu contraseña no cambia.
            </p>
          </div>
        </div>
        <div style="${footerStyle}">
          ${b.name} · ${new Date().getFullYear()}<br/>
          <span style="color:#d1d5db;">Este es un mensaje automático, no respondas a este correo.</span>
        </div>
      </div>
    </div>
  `;
}

export async function sendPasswordLinkEmail(payload: {
  brand?: EmailBrand;
  name: string;
  email: string;
  link: string;
  purpose: 'setup' | 'reset';
  expiresIn: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;
  try {
    await transporter.sendMail({
      from: getSender(),
      to: payload.email,
      subject: `${payload.purpose === 'setup' ? 'Crea tu contraseña' : 'Restablece tu contraseña'} — ${brandOf(payload).name}`,
      html: buildPasswordLinkEmail(esc(payload)),
    });
    return true;
  } catch {
    return false;
  }
}
