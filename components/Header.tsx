'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Sparkles } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 font-serif">
              BeautyTurno
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-primary-500 transition-colors duration-200"
            >
              Inicio
            </Link>
            <Link 
              href="/servicios" 
              className="text-gray-700 hover:text-primary-500 transition-colors duration-200"
            >
              Servicios
            </Link>
            <Link 
              href="/reservar" 
              className="text-gray-700 hover:text-primary-500 transition-colors duration-200"
            >
              Reservar
            </Link>
            <Link 
              href="/contacto" 
              className="text-gray-700 hover:text-primary-500 transition-colors duration-200"
            >
              Contacto
            </Link>
            <Link 
              href="/admin" 
              className="btn-primary"
            >
              Admin
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-500 hover:bg-gray-100 transition-colors duration-200"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-100">
              <Link 
                href="/" 
                className="block px-3 py-2 text-gray-700 hover:text-primary-500 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Inicio
              </Link>
              <Link 
                href="/servicios" 
                className="block px-3 py-2 text-gray-700 hover:text-primary-500 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Servicios
              </Link>
              <Link 
                href="/reservar" 
                className="block px-3 py-2 text-gray-700 hover:text-primary-500 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Reservar
              </Link>
              <Link 
                href="/contacto" 
                className="block px-3 py-2 text-gray-700 hover:text-primary-500 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Contacto
              </Link>
              <Link 
                href="/admin" 
                className="block px-3 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 