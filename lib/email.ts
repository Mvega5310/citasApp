import nodemailer from 'nodemailer';

const from = process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER || 'no-reply@beautyturno.com';
const toDefault = process.env.EMAIL_TO_DEFAULT || 'marcosvega5310@gmail.com';

const hasConfig =
  !!process.env.EMAIL_SERVER_HOST &&
  !!process.env.EMAIL_SERVER_USER &&
  !!process.env.EMAIL_SERVER_PASSWORD;

const transporter = hasConfig
  ? nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT || 587),
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    })
  : null;

export async function sendBookingNotification(payload: {
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  date: string;
  time: string;
}): Promise<{ sentToDefault: boolean; sentToClient: boolean }> {
  if (!transporter) {
    return { sentToDefault: false, sentToClient: false };
  }

  const subject = `Nueva reserva: ${payload.serviceName} - ${payload.date} ${payload.time}`;
  const html = `
    <h2>Nueva Reserva</h2>
    <p><strong>Servicio:</strong> ${payload.serviceName}</p>
    <p><strong>Cliente:</strong> ${payload.clientName}</p>
    <p><strong>Email:</strong> ${payload.clientEmail}</p>
    <p><strong>WhatsApp:</strong> ${payload.clientWhatsApp}</p>
    <p><strong>Fecha:</strong> ${payload.date}</p>
    <p><strong>Hora:</strong> ${payload.time}</p>
  `;

  let sentToDefault = false;
  let sentToClient = false;

  try {
    await transporter.sendMail({
      from,
      to: toDefault,
      subject,
      html,
    });
    sentToDefault = true;
  } catch {}

  if (payload.clientEmail) {
    try {
      await transporter.sendMail({
        from,
        to: payload.clientEmail,
        subject: 'Confirmación de tu reserva',
        html: `
          <p>Hola ${payload.clientName},</p>
          <p>Tu reserva de <strong>${payload.serviceName}</strong> fue programada para el <strong>${payload.date}</strong> a las <strong>${payload.time}</strong>.</p>
          <p>¡Gracias por elegir BeautyTurno!</p>
        `,
      });
      sentToClient = true;
    } catch {}
  }

  return { sentToDefault, sentToClient };
}
