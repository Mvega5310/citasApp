import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.EMAIL_SERVER_HOST;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_SERVER_PORT || 587),
    secure: false,
    auth: { user, pass },
  });
}

function getSender() {
  return process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER || 'no-reply@beautyturno.com';
}

function getToDefault() {
  return process.env.EMAIL_TO_DEFAULT || '';
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
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  date: string;
  time: string;
}) {
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
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">BeautyTurno</p>
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
          BeautyTurno · Sistema de Reservas · ${new Date().getFullYear()}
        </div>
      </div>
    </div>
  `;
}

function buildClientConfirmationEmail(payload: {
  serviceName: string;
  clientName: string;
  date: string;
  time: string;
}) {
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
          <div style="font-size:32px; margin-bottom:8px;">✨</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">¡Cita Confirmada!</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">BeautyTurno</p>
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
              📍 <strong>Dirección:</strong> Bella vista, Colombia<br/>
              📞 <strong>Teléfono:</strong> +57 3024075828<br/>
              ⏰ Llega 10 minutos antes de tu cita.
            </p>
          </div>
          <p style="color:#6b7280; font-size:13px; margin:20px 0 0;">
            Si necesitas cancelar o modificar tu cita, contáctanos con al menos 2 horas de anticipación.
          </p>
        </div>
        <div style="${footerStyle}">
          BeautyTurno · Sistema de Reservas · ${new Date().getFullYear()}<br/>
          <span style="color:#d1d5db;">Este es un mensaje automático, no respondas a este correo.</span>
        </div>
      </div>
    </div>
  `;
}

function buildContactEmail(payload: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) {
  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="font-size:32px; margin-bottom:8px;">💬</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Nuevo Mensaje</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">Formulario de Contacto · BeautyTurno</p>
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
          BeautyTurno · ${new Date().getFullYear()}
        </div>
      </div>
    </div>
  `;
}

export async function sendBookingNotification(payload: {
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  date: string;
  time: string;
}): Promise<{ sentToDefault: boolean; sentToClient: boolean }> {
  const transporter = getTransporter();
  const from = getSender();
  const toDefault = getToDefault();

  if (!transporter) {
    return { sentToDefault: false, sentToClient: false };
  }

  const subject = `Nueva reserva: ${payload.serviceName} — ${payload.date} ${payload.time}`;
  let sentToDefault = false;
  let sentToClient = false;

  if (toDefault) {
    try {
      await transporter.sendMail({
        from,
        to: toDefault,
        subject,
        html: buildAdminBookingEmail(payload),
      });
      sentToDefault = true;
    } catch {}
  }

  if (payload.clientEmail) {
    try {
      await transporter.sendMail({
        from,
        to: payload.clientEmail,
        subject: `✅ Confirmación de tu cita — ${payload.serviceName}`,
        html: buildClientConfirmationEmail(payload),
      });
      sentToClient = true;
    } catch {}
  }

  return { sentToDefault, sentToClient };
}

function buildAdminInvitationEmail(payload: {
  inviteeName: string;
  inviterName: string;
  role: string;
  setupLink: string;
}) {
  const roleLabel = payload.role === 'admin' ? 'Administrador' : 'Solo lectura';
  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="font-size:32px; margin-bottom:8px;">🔐</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Invitación al Panel</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">BeautyTurno · Administración</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 20px; font-size:16px;">
            Hola <strong>${payload.inviteeName}</strong>,
          </p>
          <p style="color:#374151; margin:0 0 20px; font-size:15px; line-height:1.6;">
            <strong>${payload.inviterName}</strong> te ha invitado a unirte como
            <strong>${roleLabel}</strong> del panel de administración de BeautyTurno.
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
              🔒 Este enlace expira en <strong>24 horas</strong>. Si no lo solicitaste, ignora este mensaje.
            </p>
          </div>
        </div>
        <div style="${footerStyle}">
          BeautyTurno · ${new Date().getFullYear()}<br/>
          <span style="color:#d1d5db;">Este es un mensaje automático, no respondas a este correo.</span>
        </div>
      </div>
    </div>
  `;
}

export async function sendAdminInvitation(payload: {
  inviteeName: string;
  inviteeEmail: string;
  inviterName: string;
  role: string;
  setupLink: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  const from = getSender();
  if (!transporter) return false;
  try {
    await transporter.sendMail({
      from,
      to: payload.inviteeEmail,
      subject: `Invitación al panel de administración — BeautyTurno`,
      html: buildAdminInvitationEmail(payload),
    });
    return true;
  } catch {
    return false;
  }
}

function buildReminderEmail(payload: {
  clientName: string;
  serviceName: string;
  time: string;
}) {
  return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="font-size:32px; margin-bottom:8px;">⏰</div>
          <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">¡Tu cita es en 10 minutos!</h1>
          <p style="color:#fce7f3; margin:6px 0 0; font-size:14px;">BeautyTurno</p>
        </div>
        <div style="${bodyStyle}">
          <p style="color:#374151; margin:0 0 24px; font-size:16px;">
            Hola <strong>${payload.clientName}</strong>, te recordamos que tu cita está a punto de comenzar. 💅
          </p>
          ${buildRow('Servicio', payload.serviceName)}
          ${buildRow('Hora', payload.time)}
          <div style="margin-top:24px; padding:16px; background:#fdf2f8; border-radius:8px; border-left:4px solid #ec4899;">
            <p style="margin:0; font-size:13px; color:#9d174d; line-height:1.6;">
              📍 <strong>Dirección:</strong> Calle 123 #45-67, Bogotá, Colombia<br/>
              👟 ¡Estamos listos para recibirte!
            </p>
          </div>
        </div>
        <div style="${footerStyle}">
          BeautyTurno · Sistema de Reservas · ${new Date().getFullYear()}<br/>
          <span style="color:#d1d5db;">Este es un mensaje automático, no respondas a este correo.</span>
        </div>
      </div>
    </div>
  `;
}

export async function sendReminderEmail(payload: {
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
      html: buildReminderEmail(payload),
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendContactMessage(payload: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  const from = getSender();
  const toDefault = getToDefault();
  if (!transporter || !toDefault) return false;

  try {
    await transporter.sendMail({
      from,
      to: toDefault,
      replyTo: payload.email,
      subject: `[Contacto] ${payload.subject} — ${payload.name}`,
      html: buildContactEmail(payload),
    });
    return true;
  } catch {
    return false;
  }
}
