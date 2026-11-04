import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import Header from '@/components/cliente/Header';
import Footer from '@/components/cliente/Footer';
import WhatsAppButton from '@/components/cliente/WhatsAppButton';
import BottomNav from '@/components/cliente/BottomNav';
import ServiceIcon from '@/components/shared/ServiceIcon';
import { getPageCatalog } from '@/lib/server/pageTenant';

export default async function ServicesPage() {
  const { services } = await getPageCatalog();

  return (
    <div className="min-h-screen pb-16 md:pb-0 bg-cafe-bg text-cafe-text">
      <Header />

      {/* Encabezado con fotografía */}
      <section className="sm:px-5 sm:pt-6">
        <div className="relative max-w-6xl mx-auto overflow-hidden sm:rounded-[28px] bg-cafe-soft">
          <Image
            src="/images/hero-barberia.png"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="object-cover object-[62%_30%] pointer-events-none select-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/95 via-black/80 to-black/40"
          />

          <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-cafe-goldlight mb-4">
              Nuestros servicios
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.05] text-white">
              Servicios
            </h1>
            <p className="max-w-md text-base sm:text-lg text-white/75 mt-4">
              Elige el servicio que deseas reservar
            </p>
          </div>
        </div>
      </section>

      <main className="px-5 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">
          {/* Lista de servicios */}
          {services.length === 0 && (
            <p className="rounded-[20px] p-8 text-center text-cafe-muted bg-cafe-card border border-cafe-border">
              Muy pronto publicaremos nuestros servicios. Escríbenos para reservar.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.id}
                className="flex flex-col gap-5 rounded-[20px] p-6 bg-cafe-card border border-cafe-border transition-colors duration-300 hover:border-cafe-gold/70"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-cafe-soft border border-cafe-border text-cafe-gold">
                    <ServiceIcon serviceId={service.id} size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-xl sm:text-2xl font-medium leading-snug text-cafe-text">
                      {service.name}
                    </h2>
                    <p className="text-sm leading-relaxed text-cafe-muted mt-1">{service.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-5 border-t border-cafe-border">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-cafe-gold">
                      ${service.price.toLocaleString('es-CO')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-cafe-muted">
                      <Clock className="w-3.5 h-3.5" width={14} height={14} aria-hidden="true" />
                      {service.duration} min
                    </span>
                  </div>

                  <Link
                    href={`/reservar?service=${service.id}`}
                    aria-label={`Reservar ${service.name}`}
                    className="btn-primary shrink-0 gap-1.5 text-sm py-2.5 px-5 min-h-[44px]"
                  >
                    Reservar
                    <ArrowRight className="w-4 h-4" width={16} height={16} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 rounded-[24px] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 bg-cafe-soft border border-cafe-border">
            <div className="flex-1 text-center sm:text-left">
              <p className="font-display text-2xl font-medium text-cafe-text mb-1">
                ¿No encuentras lo que buscas?
              </p>
              <p className="text-sm text-cafe-muted">Escríbenos y te ayudamos</p>
            </div>
            <Link href="/contacto" className="btn-outline shrink-0 w-full sm:w-auto">
              Contactar
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
      <BottomNav />
    </div>
  );
}
