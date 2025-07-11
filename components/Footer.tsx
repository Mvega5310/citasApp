import Link from 'next/link';
import { Phone, Mail, MapPin, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg">
                <span className="text-white text-xl">✨</span>
              </div>
              <span className="text-xl font-bold font-serif">BeautyTurno</span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              Tu belleza es nuestra prioridad. Reserva tu cita de manera fácil y rápida 
              para disfrutar de nuestros servicios profesionales de manicure, pedicure y blower.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-primary-400 transition-colors duration-200"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-primary-400 transition-colors duration-200"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contacto</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-primary-400" />
                <span className="text-gray-300">+57 300 123 4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-primary-400" />
                <span className="text-gray-300">info@beautyturno.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-primary-400" />
                <span className="text-gray-300">Calle 123 #45-67, Bogotá</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Enlaces</h3>
            <div className="space-y-2">
              <Link 
                href="/servicios" 
                className="block text-gray-300 hover:text-primary-400 transition-colors duration-200"
              >
                Servicios
              </Link>
              <Link 
                href="/reservar" 
                className="block text-gray-300 hover:text-primary-400 transition-colors duration-200"
              >
                Reservar
              </Link>
              <Link 
                href="/contacto" 
                className="block text-gray-300 hover:text-primary-400 transition-colors duration-200"
              >
                Contacto
              </Link>
              <Link 
                href="/admin" 
                className="block text-gray-300 hover:text-primary-400 transition-colors duration-200"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2024 BeautyTurno. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
} 