'use client';

import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Header from '@/components/cliente/Header';
import Footer from '@/components/cliente/Footer';
import BottomNav from '@/components/cliente/BottomNav';
import { ArrowRight, ArrowUpRight, MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const WHATSAPP = '573024075828';
const PHONE = '+57 302 407 5828';
const EMAIL = 'marcosvega5310@gmail.com';
const ADDRESS = 'Bella Vista, Colombia';
const MAPS_URL =
  'https://www.google.com/maps/place/Centro+De+Vida+Bella+Vista/@10.3710068,-75.506578,17z/data=!4m14!1m7!3m6!1s0x8ef6272ed668921b:0x10f68528a6dc159!2sCentro+De+Vida+Bella+Vista!8m2!3d10.3710015!4d-75.5040031!16s%2Fg%2F11y1trpzsh!3m5!1s0x8ef6272ed668921b:0x10f68528a6dc159!8m2!3d10.3710015!4d-75.5040031!16s%2Fg%2F11y1trpzsh?entry=ttu';

const hours = [
  { day: 'Lun – Sáb', hours: '9:00 – 19:00' },
  { day: 'Domingo', hours: '9:00 – 17:00' },
];

type ContactFormData = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Error al enviar el mensaje');
        return;
      }
      setSubmitted(true);
      reset();
      toast.success('¡Mensaje enviado! Te responderemos pronto.');
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen pb-16 md:pb-0" style={{ background: '#100E0C' }}>
      <Header />

      <main className="max-w-xl mx-auto px-5 py-8">
        {/* Heading */}
        <div className="mb-7">
          <h1 className="text-3xl font-bold font-display mb-2" style={{ color: '#F4EEE5' }}>
            Contáctanos
          </h1>
          <p className="text-sm" style={{ color: '#A39583' }}>
            Estamos aquí para ayudarte
          </p>
        </div>

        {/* WhatsApp CTA — primary action */}
        <a
          href={`https://wa.me/${WHATSAPP}?text=Hola%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20sus%20servicios.`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-[18px] p-5 mb-4 transition-all duration-200 active:scale-[0.98]"
          style={{ background: '#24845E', color: 'white' }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20 shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base">Escribir por WhatsApp</p>
            <p className="text-sm opacity-80">Respuesta rápida garantizada</p>
          </div>
          <ArrowRight className="w-5 h-5 opacity-70 shrink-0" width={20} height={20} aria-hidden="true" />
        </a>

        {/* Info cards */}
        <div className="flex flex-col gap-3 mb-6">
          {[
            { icon: Phone, label: 'Teléfono', value: PHONE, href: `tel:${PHONE.replace(/\s/g, '')}` },
            { icon: Mail, label: 'Correo', value: EMAIL, href: `mailto:${EMAIL}` },
            { icon: MapPin, label: 'Dirección', value: ADDRESS, href: MAPS_URL },
          ].map(({ icon: Icon, label, value, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-4 rounded-[14px] p-4 transition-all duration-200"
              style={{ background: '#201A15', border: '1px solid #403328' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#191511' }}
              >
                <Icon className="w-4 h-4" style={{ color: '#C69B62' }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs mb-0.5" style={{ color: '#A39583' }}>{label}</p>
                <p className="text-sm font-medium truncate" style={{ color: '#F4EEE5' }}>{value}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Hours */}
        <div
          className="rounded-[14px] p-4 mb-6"
          style={{ background: '#201A15', border: '1px solid #403328' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" style={{ color: '#C69B62' }} />
            <p className="text-sm font-semibold" style={{ color: '#F4EEE5' }}>Horarios</p>
          </div>
          <div className="flex flex-col gap-2">
            {hours.map(({ day, hours: h }) => (
              <div key={day} className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#B8AA99' }}>{day}</span>
                <span className="text-sm font-medium" style={{ color: '#F4EEE5' }}>{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map placeholder */}
        <div
          className="rounded-[14px] p-5 mb-6 flex flex-col items-center gap-3"
          style={{ background: '#201A15', border: '1px solid #403328' }}
        >
          <MapPin className="w-8 h-8" style={{ color: '#857767' }} />
          <p className="text-sm text-center" style={{ color: '#B8AA99' }}>{ADDRESS}</p>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 min-h-[44px] text-sm font-medium transition-colors duration-200"
            style={{ color: '#C69B62' }}
          >
            Ver en Google Maps
            <ArrowUpRight className="w-4 h-4" width={16} height={16} aria-hidden="true" />
          </a>
        </div>

        {/* Contact form */}
        <div className="rounded-[18px] p-5" style={{ background: '#201A15', border: '1px solid #403328' }}>
          {submitted ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                style={{ background: '#191511' }}
              >
                <CheckCircle className="w-7 h-7" style={{ color: '#24845E' }} />
              </div>
              <p className="font-semibold text-base mb-1" style={{ color: '#F4EEE5' }}>
                ¡Mensaje enviado!
              </p>
              <p className="text-sm mb-5" style={{ color: '#A39583' }}>
                Te responderemos en menos de 24 horas.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-sm font-medium"
                style={{ color: '#C69B62' }}
              >
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <>
              <p className="font-semibold text-base mb-4" style={{ color: '#F4EEE5' }}>
                Envíanos un mensaje
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#B8AA99' }}>
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    className="input-field"
                    {...register('name', {
                      required: 'El nombre es obligatorio',
                      minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                    })}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs" style={{ color: '#FF7A66' }}>{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#B8AA99' }}>
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    className="input-field"
                    {...register('email', {
                      required: 'El email es obligatorio',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
                    })}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs" style={{ color: '#FF7A66' }}>{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#B8AA99' }}>
                    Asunto *
                  </label>
                  <select
                    className="input-field"
                    {...register('subject', { required: 'Selecciona un asunto' })}
                  >
                    <option value="">Selecciona un asunto</option>
                    <option value="reserva">Consulta sobre reserva</option>
                    <option value="servicios">Información de servicios</option>
                    <option value="precios">Consulta de precios</option>
                    <option value="horarios">Horarios de atención</option>
                    <option value="otro">Otro</option>
                  </select>
                  {errors.subject && (
                    <p className="mt-1 text-xs" style={{ color: '#FF7A66' }}>{errors.subject.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#B8AA99' }}>
                    Mensaje *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Escribe tu mensaje aquí..."
                    className="input-field resize-none"
                    {...register('message', {
                      required: 'El mensaje es obligatorio',
                      minLength: { value: 10, message: 'Mínimo 10 caracteres' },
                    })}
                  />
                  {errors.message && (
                    <p className="mt-1 text-xs" style={{ color: '#FF7A66' }}>{errors.message.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Mensaje
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
