import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { services } from '@/lib/services';
import { Clock, Star, Shield, Heart } from 'lucide-react';

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="gradient-bg py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 font-serif">
            Nuestros Servicios
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Descubre nuestra amplia gama de servicios de belleza profesionales. 
            Cada tratamiento está diseñado para realzar tu belleza natural.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div key={service.id} className="service-card group">
                <div className="text-6xl mb-6 text-center">{service.icon}</div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
                  {service.name}
                </h3>
                <p className="text-gray-600 mb-6 text-center leading-relaxed">
                  {service.description}
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Duración:</span>
                    <span className="font-medium">{service.duration} minutos</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Precio:</span>
                    <span className="text-2xl font-bold text-primary-600">
                      ${service.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Link 
                  href={`/reservar?service=${service.id}`}
                  className="btn-primary w-full text-center group-hover:scale-105 transition-transform duration-200"
                >
                  Reservar Ahora
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-serif">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Nos destacamos por la calidad de nuestros servicios y la atención personalizada
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Puntualidad</h3>
              <p className="text-gray-600">
                Respetamos tu tiempo. Todas nuestras citas comienzan a la hora programada.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Calidad Premium</h3>
              <p className="text-gray-600">
                Utilizamos solo los mejores productos y técnicas del mercado.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-accent-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Higiene Garantizada</h3>
              <p className="text-gray-600">
                Mantenemos los más altos estándares de limpieza y desinfección.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Atención Personalizada</h3>
              <p className="text-gray-600">
                Cada cliente recibe atención individualizada y tratamientos a medida.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-serif">
            ¿Lista para tu transformación?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Reserva tu cita ahora y disfruta de nuestros servicios profesionales de belleza
          </p>
          <Link href="/reservar" className="btn-primary text-lg px-8 py-4">
            Reservar Mi Cita
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
} 