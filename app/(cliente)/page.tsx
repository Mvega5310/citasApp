import Link from 'next/link';
import { Star } from 'lucide-react';
import Footer from '@/components/cliente/Footer';
import Header from '@/components/cliente/Header';
import WhatsAppButton from '@/components/cliente/WhatsAppButton';
import BottomNav from '@/components/cliente/BottomNav';
import { services } from '@/lib/shared/services';

const testimonial = {
  name: 'Carlos M.',
  service: 'Corte y Barba',
  text: 'El mejor corte que me han hecho. Reservé en 2 minutos y quedé impecable. 100% recomendado.',
  rating: 5,
  initials: 'CM',
};

const WHATSAPP = '573024075828';

export default function HomePage() {
  const featured = services.slice(0, 3);

  return (
    <div className="min-h-screen pb-16 md:pb-0" style={{ background: '#0A1210' }}>
      <Header />

      {/* Hero */}
      <section className="px-5 pt-10 pb-8">
        <div className="max-w-xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-5"
            style={{ background: '#17231D', border: '1px solid #2C3E36', color: '#9FB0A2' }}
          >
            <span style={{ color: '#E84B85' }}>✦</span>
            Barbería &amp; Belleza profesional
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold leading-tight mb-3 font-display"
            style={{ color: '#F1EDE3' }}
          >
            Tu turno de{' '}
            <em className="not-italic" style={{ color: '#E84B85' }}>brillar</em>
          </h1>
          <p className="text-base leading-relaxed mb-7" style={{ color: '#9FB0A2' }}>
            Reserva tu cita en minutos, sin filas y desde cualquier dispositivo.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/reservar" className="btn-primary">
              Reservar ahora
            </Link>
            <Link href="/servicios" className="btn-outline">
              Servicios
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="px-5 py-6">
        <div className="max-w-xl mx-auto">
          <h2 className="text-lg font-semibold mb-4 font-display" style={{ color: '#F1EDE3' }}>
            Servicios
          </h2>
          <div className="flex gap-3 overflow-x-auto mobile-scroll -mx-5 px-5 pb-2">
            {featured.map((service) => (
              <Link
                key={service.id}
                href={`/reservar?service=${service.id}`}
                className="shrink-0 w-44 rounded-[18px] p-4 flex flex-col gap-3 transition-all duration-200"
                style={{ background: '#17231D', border: '1.5px solid #2C3E36' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: '#22322A' }}
                >
                  {service.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight mb-0.5" style={{ color: '#F1EDE3' }}>
                    {service.name}
                  </p>
                  <p className="text-xs" style={{ color: '#7C8F81' }}>
                    {service.duration} min
                  </p>
                </div>
                <p className="text-base font-bold" style={{ color: '#E84B85' }}>
                  ${service.price.toLocaleString('es-CO')}
                </p>
              </Link>
            ))}
            <Link
              href="/servicios"
              className="shrink-0 w-32 rounded-[18px] p-4 flex flex-col items-center justify-center gap-2"
              style={{ background: '#0E1713', border: '1.5px dashed #2C3E36' }}
            >
              <span className="text-2xl" style={{ color: '#7C8F81' }}>→</span>
              <span className="text-xs font-medium text-center" style={{ color: '#7C8F81' }}>
                Ver todos
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-5 py-6">
        <div className="max-w-xl mx-auto">
          <div className="rounded-[22px] p-6" style={{ background: '#17231D', border: '1px solid #2C3E36' }}>
            <div className="flex gap-1 mb-3">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" style={{ color: '#E9B949' }} />
              ))}
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#9FB0A2' }}>
              &ldquo;{testimonial.text}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: '#E84B85' }}
              >
                {testimonial.initials}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#F1EDE3' }}>{testimonial.name}</p>
                <p className="text-xs" style={{ color: '#7C8F81' }}>{testimonial.service}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp CTA */}
      <section className="px-5 pb-10 pt-2">
        <div className="max-w-xl mx-auto">
          <div
            className="rounded-[22px] p-5 flex flex-col sm:flex-row items-center gap-4"
            style={{ background: '#0E1713', border: '1px solid #2C3E36' }}
          >
            <div className="flex-1 text-center sm:text-left">
              <p className="font-semibold text-base mb-1" style={{ color: '#F1EDE3' }}>
                ¿Preguntas? Escríbenos
              </p>
              <p className="text-sm" style={{ color: '#7C8F81' }}>
                Respuesta inmediata por WhatsApp
              </p>
            </div>
            <a
              href={`https://wa.me/${WHATSAPP}?text=Hola%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20sus%20servicios.`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
      <BottomNav />
    </div>
  );
}
