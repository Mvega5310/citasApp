import Link from 'next/link';
import Header from '@/components/cliente/Header';
import Footer from '@/components/cliente/Footer';
import WhatsAppButton from '@/components/cliente/WhatsAppButton';
import BottomNav from '@/components/cliente/BottomNav';
import { services } from '@/lib/shared/services';

export default function ServicesPage() {
  return (
    <div className="min-h-screen pb-16 md:pb-0" style={{ background: '#0A1210' }}>
      <Header />

      <main className="max-w-xl mx-auto px-5 py-8">
        {/* Heading */}
        <div className="mb-7">
          <h1 className="text-3xl font-bold font-display mb-2" style={{ color: '#F1EDE3' }}>
            Servicios
          </h1>
          <p className="text-sm" style={{ color: '#7C8F81' }}>
            Elige el servicio que deseas reservar
          </p>
        </div>

        {/* Service list */}
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="rounded-[18px] p-4 flex items-center gap-4"
              style={{ background: '#17231D', border: '1.5px solid #2C3E36' }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: '#22322A' }}
              >
                {service.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-0.5" style={{ color: '#F1EDE3' }}>
                  {service.name}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#7C8F81' }}>
                  {service.description}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs" style={{ color: '#9FB0A2' }}>
                    {service.duration} min
                  </span>
                  <span className="font-bold text-sm" style={{ color: '#E84B85' }}>
                    ${service.price.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              {/* Reservar */}
              <Link
                href={`/reservar?service=${service.id}`}
                className="shrink-0 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 touch-manipulation"
                style={{ background: '#E84B85', color: 'white', minHeight: '40px', display: 'flex', alignItems: 'center' }}
              >
                Reservar
              </Link>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="mt-8 rounded-[18px] p-5 text-center"
          style={{ background: '#0E1713', border: '1px solid #2C3E36' }}
        >
          <p className="text-sm mb-3" style={{ color: '#9FB0A2' }}>
            ¿No encuentras lo que buscas? Escríbenos
          </p>
          <Link href="/contacto" className="btn-outline text-sm px-5 py-2" style={{ minHeight: '38px' }}>
            Contactar
          </Link>
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
      <BottomNav />
    </div>
  );
}
