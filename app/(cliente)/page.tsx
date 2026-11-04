import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock, Star } from 'lucide-react';
import Footer from '@/components/cliente/Footer';
import Header from '@/components/cliente/Header';
import WhatsAppButton from '@/components/cliente/WhatsAppButton';
import BottomNav from '@/components/cliente/BottomNav';
import ServiceIcon from '@/components/shared/ServiceIcon';
import { services } from '@/lib/shared/services';

const testimonial = {
  name: 'Carlos M.',
  service: 'Corte y Barba',
  text: 'El mejor corte que me han hecho. Reservé en 2 minutos y quedé impecable. 100% recomendado.',
  rating: 5,
  initials: 'CM',
};

const WHATSAPP = '573024075828';
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Marcos BarberShop';

export default function HomePage() {
  const featured = services.slice(0, 3);

  return (
    <div className="min-h-screen pb-16 md:pb-0 bg-cafe-bg text-cafe-text">
      <Header />

      {/* Hero fotográfico */}
      <section className="sm:px-5 sm:pt-6">
        <div className="relative max-w-6xl mx-auto overflow-hidden sm:rounded-[28px] bg-cafe-soft min-h-[580px] sm:min-h-[640px]">
          {/* Capas decorativas: detrás del contenido y sin capturar clics */}
          <Image
            src="/images/hero-barberia.png"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="object-cover object-[62%_center] sm:object-center pointer-events-none select-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/95 via-black/60 to-black/25 sm:bg-gradient-to-r sm:from-black/90 sm:via-black/55 sm:to-black/5"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-32 pointer-events-none bg-gradient-to-t from-black/50 to-transparent"
          />

          <div className="relative z-10 min-h-[580px] sm:min-h-[640px] flex flex-col justify-between p-6 sm:p-12 lg:p-16">
            {/* Marca */}
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-cafe-gold" aria-hidden="true" />
              <span className="font-display text-sm sm:text-base tracking-wide text-cafe-goldlight">
                {APP_NAME}
              </span>
            </div>

            <div className="max-w-xl">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-cafe-goldlight mb-5">
                Barbería &amp; Belleza profesional
              </p>

              <h1 className="font-display text-[2.75rem] sm:text-6xl lg:text-7xl font-medium leading-[1.05] text-white">
                Estilo que habla{' '}
                <em className="italic text-cafe-goldlight">por ti.</em>
              </h1>

              <p className="max-w-md text-base sm:text-lg leading-relaxed text-white/75 mt-5">
                Reserva tu cita en minutos, sin filas y desde cualquier dispositivo.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Link href="/reservar" className="btn-primary gap-2">
                  Reservar ahora
                  <ArrowRight className="w-4 h-4" width={16} height={16} aria-hidden="true" />
                </Link>
                <Link href="/servicios" className="btn-outline">
                  Ver servicios
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios destacados */}
      <section className="px-5 py-14 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-cafe-gold mb-3">
                Nuestros servicios
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-cafe-text">
                Servicios destacados
              </h2>
            </div>
            <Link
              href="/servicios"
              className="shrink-0 inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-cafe-goldlight hover:text-cafe-text transition-colors"
            >
              Ver todos
              <ArrowRight className="w-4 h-4" width={16} height={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {featured.map((service) => (
              <Link
                key={service.id}
                href={`/reservar?service=${service.id}`}
                className="group flex flex-col gap-5 rounded-[20px] p-6 bg-cafe-card border border-cafe-border transition-all duration-300 hover:bg-cafe-hover hover:border-cafe-gold hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-cafe-soft border border-cafe-border text-cafe-gold">
                    <ServiceIcon serviceId={service.id} />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-cafe-muted">
                    <Clock className="w-3.5 h-3.5" width={14} height={14} aria-hidden="true" />
                    {service.duration} min
                  </span>
                </div>

                <div className="flex-1">
                  <h3 className="font-display text-xl font-medium text-cafe-text leading-snug">
                    {service.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-cafe-border">
                  <span className="text-lg font-bold text-cafe-gold">
                    ${service.price.toLocaleString('es-CO')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-cafe-goldlight transition-transform duration-300 group-hover:translate-x-0.5">
                    Reservar
                    <ArrowRight className="w-4 h-4" width={16} height={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonio */}
      <section className="px-5 pb-14 sm:pb-20">
        <div className="max-w-6xl mx-auto">
          <figure className="relative overflow-hidden rounded-[24px] p-8 sm:p-12 bg-cafe-soft border border-cafe-border">
            <span
              aria-hidden="true"
              className="absolute -top-6 right-6 font-display text-[10rem] leading-none text-cafe-gold/10 pointer-events-none select-none"
            >
              &rdquo;
            </span>

            <div className="relative max-w-3xl">
              <div className="flex gap-1 mb-5" aria-label={`${testimonial.rating} de 5 estrellas`}>
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-current text-cafe-gold"
                    width={16}
                    height={16}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <blockquote className="font-display text-2xl sm:text-3xl leading-snug text-cafe-text">
                &ldquo;{testimonial.text}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3 mt-7">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-cafe-gold text-cafe-bg">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-cafe-text">{testimonial.name}</p>
                  <p className="text-xs text-cafe-muted">{testimonial.service}</p>
                </div>
              </figcaption>
            </div>
          </figure>
        </div>
      </section>

      {/* WhatsApp CTA */}
      <section className="px-5 pb-12 sm:pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-[24px] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 bg-cafe-card border border-cafe-border">
            <div className="flex-1 text-center sm:text-left">
              <p className="font-display text-2xl font-medium text-cafe-text mb-1">
                ¿Preguntas? Escríbenos
              </p>
              <p className="text-sm text-cafe-muted">
                Respuesta inmediata por WhatsApp
              </p>
            </div>
            <a
              href={`https://wa.me/${WHATSAPP}?text=Hola%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20sus%20servicios.`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp shrink-0 w-full sm:w-auto"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" width={16} height={16} aria-hidden="true">
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
