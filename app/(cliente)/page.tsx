import Link from 'next/link';
import { ArrowRight, Clock, Sparkles, Star, Users, Shield, CheckCircle } from 'lucide-react';
import Footer from '@/components/cliente/Footer';
import Header from '@/components/cliente/Header';
import WhatsAppButton from '@/components/cliente/WhatsAppButton';
import BottomNav from '@/components/cliente/BottomNav';
import { services } from '@/lib/shared/services';

const stats = [
  { value: '500+', label: 'Clientes felices' },
  { value: '4.9★', label: 'Calificación promedio' },
  { value: '8+', label: 'Años de experiencia' },
  { value: '24/7', label: 'Reservas en línea' },
];

const testimonials = [
  {
    name: 'María García',
    service: 'Manicure & Pedicure',
    text: 'Excelente servicio, las chicas son muy profesionales y el ambiente es increíble. Siempre salgo encantada.',
    rating: 5,
    initials: 'MG',
  },
  {
    name: 'Laura Martínez',
    service: 'Blower profesional',
    text: 'El mejor blower que me han hecho. Duró perfecto por días y el precio es muy accesible. 100% recomendado.',
    rating: 5,
    initials: 'LM',
  },
  {
    name: 'Sofía Rodríguez',
    service: 'Corte y estilo',
    text: 'Reservé mi cita en 2 minutos desde el celular. La atención fue impecable y el resultado fue exactamente lo que quería.',
    rating: 5,
    initials: 'SR',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden gradient-bg py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-pink-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/70 backdrop-blur-sm rounded-full border border-pink-100 text-pink-700 text-sm font-medium mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" />
            Belleza y barbería profesional
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 font-serif leading-tight">
            Tu cita de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500">
              belleza
            </span>{' '}
            en minutos
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Manicure, pedicure, blower y barbería profesional. Reserva en línea,
            sin filas y desde cualquier dispositivo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/reservar" className="btn-primary text-base px-8 py-4 inline-flex items-center justify-center">
              Reservar ahora
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/servicios" className="btn-outline text-base px-8 py-4 inline-flex items-center justify-center">
              Ver servicios
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold text-primary-500 mb-1">{s.value}</p>
                <p className="text-sm text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-pink-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Reserva 24/7</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Agenda tu cita en cualquier momento del día, desde tu celular o computador.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                <Star className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Calidad premium</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Productos y técnicas de alta gama para que tu belleza brille de verdad.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Atención personalizada</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Cada cliente recibe un trato único, adaptado a su estilo y necesidades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 font-serif">
              Nuestros Servicios
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Descubre nuestra gama completa de servicios de belleza y barbería profesionales
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service) => (
              <div key={service.id} className="service-card group bg-white">
                <div className="text-4xl sm:text-5xl mb-4">{service.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-gray-500 mb-4 text-sm leading-relaxed">{service.description}</p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-primary-600">
                    ${service.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                    {service.duration} min
                  </span>
                </div>
                <Link
                  href={`/reservar?service=${service.id}`}
                  className="btn-primary w-full text-center block text-sm"
                >
                  Reservar
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/servicios" className="btn-outline inline-flex items-center gap-2">
              Ver todos los servicios
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 font-serif">
              Lo que dicen nuestras clientas
            </h2>
            <p className="text-lg text-gray-500">
              Más de 500 clientes confían en nosotros
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.service}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantees strip */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 bg-pink-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: CheckCircle, label: 'Confirmación inmediata por email' },
              { icon: Shield, label: 'Sin cargos por cancelación' },
              { icon: Star, label: 'Satisfacción garantizada' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2 text-pink-700">
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 font-serif">
            ¿Lista para tu transformación?
          </h2>
          <p className="text-lg text-gray-500 mb-8">
            Reserva tu cita ahora y disfruta de nuestros servicios profesionales de belleza
          </p>
          <Link href="/reservar" className="btn-primary text-base px-10 py-4 inline-flex items-center gap-2">
            Reservar mi cita
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
      <BottomNav />
    </div>
  );
}
