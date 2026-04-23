import Link from 'next/link';
import { Phone, Mail, MapPin, Instagram, Facebook, MessageCircle } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg shrink-0">
                <span className="text-white text-xl">✨</span>
              </div>
              <span className="text-xl font-bold font-serif">BeautyTurno</span>
            </div>
            <p className="text-gray-400 mb-5 max-w-sm leading-relaxed">
              Tu belleza es nuestra prioridad. Reserva tu cita de manera fácil y rápida
              para disfrutar de nuestros servicios profesionales de manicure, pedicure y blower.
            </p>
            <div className="flex space-x-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 bg-gray-800 hover:bg-primary-500 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 bg-gray-800 hover:bg-primary-500 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/573024075828"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 bg-gray-800 hover:bg-green-500 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Contacto</h3>
            <div className="space-y-3">
              <a
                href="tel:+573001234567"
                className="flex items-center gap-3 text-gray-400 hover:text-primary-400 transition-colors group"
              >
                <Phone className="w-4 h-4 text-primary-500 shrink-0" />
                <span className="text-sm">+57 3024075828</span>
              </a>
              <a
                href="mailto:info@beautyturno.com"
                className="flex items-center gap-3 text-gray-400 hover:text-primary-400 transition-colors group"
              >
                <Mail className="w-4 h-4 text-primary-500 shrink-0" />
                <span className="text-sm">info@beautyturno.com</span>
              </a>
              <div className="flex items-start gap-3 text-gray-400">
                <MapPin className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <span className="text-sm">Bella vista Cartagena</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Navegación</h3>
            <div className="space-y-2">
              <Link
                href="/"
                className="block text-sm text-gray-400 hover:text-primary-400 transition-colors duration-200"
              >
                Inicio
              </Link>
              <Link
                href="/servicios"
                className="block text-sm text-gray-400 hover:text-primary-400 transition-colors duration-200"
              >
                Servicios
              </Link>
              <Link
                href="/reservar"
                className="block text-sm text-gray-400 hover:text-primary-400 transition-colors duration-200"
              >
                Reservar cita
              </Link>
              <Link
                href="/contacto"
                className="block text-sm text-gray-400 hover:text-primary-400 transition-colors duration-200"
              >
                Contacto
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-gray-500 text-sm">
            © {year} BeautyTurno. Todos los derechos reservados.
          </p>
          <p className="text-gray-600 text-xs">
            Hecho con cuidado para tu belleza
          </p>
        </div>
      </div>
    </footer>
  );
}
