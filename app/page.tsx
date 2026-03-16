import Link from 'next/link';
import { ArrowRight, Clock, Sparkles, Star, Users } from 'lucide-react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { services } from '@/lib/services';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="gradient-bg py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-primary-700 font-medium mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              Belleza y barbería profesional a tu alcance
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 mb-6 font-serif">
              Reserva tu cita de
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500">
                {' '}belleza
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Disfruta de nuestros servicios profesionales de manicure, pedicure, blower y barbería.
              Reserva tu cita de manera fácil y rápida, 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/reservar" className="btn-primary text-lg px-8 py-4">
                Reservar Ahora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link href="/servicios" className="btn-outline text-lg px-8 py-4">
                Ver Servicios
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Reserva 24/7</h3>
              <p className="text-gray-600">
                Reserva tu cita en cualquier momento del día, desde cualquier dispositivo.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Calidad Premium</h3>
              <p className="text-gray-600">
                Servicios profesionales con los mejores productos y técnicas del mercado.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-accent-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Atención Personalizada</h3>
              <p className="text-gray-600">
                Cada cliente recibe atención personalizada y tratamientos a medida.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-serif">
              Nuestros Servicios
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Descubre nuestra amplia gama de servicios de belleza y barbería profesionales
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service) => (
              <div key={service.id} className="service-card group">
                <div className="text-4xl sm:text-5xl mb-4">{service.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  {service.name}
                </h3>
                <p className="text-gray-600 mb-4 text-sm sm:text-base">
                  {service.description}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl sm:text-2xl font-bold text-primary-600">
                    ${service.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">{service.duration} min</span>
                </div>
                <Link
                  href={`/reservar?service=${service.id}`}
                  className="btn-primary w-full group-hover:scale-105 transition-transform duration-200"
                >
                  Reservar
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-serif">
            ¿Lista para tu transformación?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-8">
            Reserva tu cita ahora y disfruta de nuestros servicios profesionales de belleza y barbería
          </p>
          <Link href="/reservar" className="btn-primary text-lg px-8 py-4">
            Reservar Mi Cita
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
