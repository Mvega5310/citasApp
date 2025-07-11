import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
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

      {/* Contact Information */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 font-serif">
                Información de Contacto
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Teléfono</h3>
                    <p className="text-gray-600">+57 300 123 4567</p>
                    <p className="text-sm text-gray-500">Lunes a Viernes, 9:00 AM - 8:00 PM</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-secondary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Correo Electrónico</h3>
                    <p className="text-gray-600">info@beautyturno.com</p>
                    <p className="text-sm text-gray-500">Respondemos en menos de 24 horas</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-accent-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Dirección</h3>
                    <p className="text-gray-600">Calle 123 #45-67, Bogotá</p>
                    <p className="text-sm text-gray-500">Colombia</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Horarios</h3>
                    <p className="text-gray-600">Lunes a Viernes: 9:00 AM - 8:00 PM</p>
                    <p className="text-gray-600">Sábados: 9:00 AM - 6:00 PM</p>
                    <p className="text-sm text-gray-500">Domingos: Cerrado</p>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Síguenos</h3>
                <div className="flex space-x-4">
                  <a 
                    href="https://instagram.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center text-white hover:scale-105 transition-transform duration-200"
                  >
                    <span className="text-lg">📷</span>
                  </a>
                  <a 
                    href="https://facebook.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:scale-105 transition-transform duration-200"
                  >
                    <span className="text-lg">📘</span>
                  </a>
                  <a 
                    href="https://whatsapp.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white hover:scale-105 transition-transform duration-200"
                  >
                    <span className="text-lg">💬</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-gray-50 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 font-serif">
                Envíanos un mensaje
              </h2>
              
              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="input-field"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="input-field"
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    className="input-field"
                    placeholder="+57 300 123 4567"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Asunto *
                  </label>
                  <select id="subject" className="input-field" required>
                    <option value="">Selecciona un asunto</option>
                    <option value="reserva">Consulta sobre reserva</option>
                    <option value="servicios">Información de servicios</option>
                    <option value="precios">Consulta de precios</option>
                    <option value="horarios">Horarios de atención</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje *
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="input-field resize-none"
                    placeholder="Escribe tu mensaje aquí..."
                    required
                  ></textarea>
                </div>

                <button type="submit" className="btn-primary w-full">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Enviar Mensaje
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 font-serif">
              Nuestra Ubicación
            </h2>
            <p className="text-gray-600">
              Visítanos en nuestro local para una experiencia personalizada
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="aspect-w-16 aspect-h-9 rounded-lg bg-gray-200 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Mapa interactivo</p>
                <p className="text-sm text-gray-500">Calle 123 #45-67, Bogotá, Colombia</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
} 