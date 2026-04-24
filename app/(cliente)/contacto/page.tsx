'use client';

import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Header from '@/components/cliente/Header';
import Footer from '@/components/cliente/Footer';
import BottomNav from '@/components/cliente/BottomNav';
import { Mail, Phone, MapPin, Clock, MessageCircle, Send, CheckCircle } from 'lucide-react';
import { useState } from 'react';

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
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />

      {/* Hero */}
      <section className="gradient-bg py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 font-serif">
            Contáctanos
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Estamos aquí para ayudarte. Contáctanos para cualquier consulta o para reservar tu cita.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 font-serif">
                Información de Contacto
              </h2>

              <div className="space-y-6">
                {[
                  {
                    icon: Phone,
                    color: 'primary',
                    title: 'Teléfono',
                    lines: ['+57 300 123 4567', 'Lunes a Viernes, 9:00 AM – 8:00 PM'],
                  },
                  {
                    icon: Mail,
                    color: 'secondary',
                    title: 'Correo Electrónico',
                    lines: ['info@beautyturno.com', 'Respondemos en menos de 24 horas'],
                  },
                  {
                    icon: MapPin,
                    color: 'accent',
                    title: 'Dirección',
                    lines: ['Calle 123 #45-67, Bogotá', 'Colombia'],
                  },
                  {
                    icon: Clock,
                    color: 'green',
                    title: 'Horarios',
                    lines: [
                      'Lunes a Viernes: 9:00 AM – 8:00 PM',
                      'Sábados: 9:00 AM – 6:00 PM',
                      'Domingos: Cerrado',
                    ],
                  },
                ].map(({ icon: Icon, color, title, lines }) => (
                  <div key={title} className="flex items-start space-x-4">
                    <div
                      className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-6 h-6 text-${color}-600`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
                      {lines.map((l, i) => (
                        <p
                          key={i}
                          className={i === 0 ? 'text-gray-600' : 'text-sm text-gray-500'}
                        >
                          {l}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Síguenos</h3>
                <div className="flex space-x-4">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center text-white hover:scale-105 transition-transform"
                  >
                    <span className="text-lg">📷</span>
                  </a>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:scale-105 transition-transform"
                  >
                    <span className="text-lg">📘</span>
                  </a>
                  <a
                    href="https://wa.me/573001234567"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white hover:scale-105 transition-transform"
                  >
                    <span className="text-lg">💬</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="bg-gray-50 rounded-xl p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">¡Mensaje enviado!</h3>
                  <p className="text-gray-600 mb-6">
                    Gracias por contactarnos. Te responderemos en menos de 24 horas.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-primary-600 font-medium hover:underline"
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <MessageCircle className="w-5 h-5 text-primary-500" />
                    <h2 className="text-2xl font-bold text-gray-900 font-serif">
                      Envíanos un mensaje
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        placeholder="Tu nombre completo"
                        className={`input-field ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
                        {...register('name', {
                          required: 'El nombre es obligatorio',
                          minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                        })}
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Correo electrónico *
                      </label>
                      <input
                        type="email"
                        placeholder="tu@email.com"
                        className={`input-field ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                        {...register('email', {
                          required: 'El email es obligatorio',
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'Email inválido',
                          },
                        })}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Teléfono (opcional)
                      </label>
                      <input
                        type="tel"
                        placeholder="+57 300 123 4567"
                        className="input-field"
                        {...register('phone')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Asunto *
                      </label>
                      <select
                        className={`input-field ${errors.subject ? 'border-red-400 focus:ring-red-400' : ''}`}
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
                        <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Mensaje *
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Escribe tu mensaje aquí..."
                        className={`input-field resize-none ${errors.message ? 'border-red-400 focus:ring-red-400' : ''}`}
                        {...register('message', {
                          required: 'El mensaje es obligatorio',
                          minLength: { value: 10, message: 'Mínimo 10 caracteres' },
                          maxLength: { value: 2000, message: 'Máximo 2000 caracteres' },
                        })}
                      />
                      {errors.message && (
                        <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-serif">Nuestra Ubicación</h2>
            <p className="text-gray-600">Visítanos en nuestro local para una experiencia personalizada</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="rounded-lg bg-gray-100 flex items-center justify-center h-64">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Calle 123 #45-67, Bogotá, Colombia</p>
                <a
                  href="https://maps.google.com/?q=Bogotá,Colombia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-primary-600 hover:underline text-sm font-medium"
                >
                  Ver en Google Maps →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <BottomNav />
    </div>
  );
}
