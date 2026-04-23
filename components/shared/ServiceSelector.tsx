'use client';

import { Service } from '@/types';

interface ServiceSelectorProps {
  services: Service[];
  onSelect: (service: Service) => void;
}

export default function ServiceSelector({ services, onSelect }: ServiceSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {services.map((service) => (
        <button
          key={service.id}
          type="button"
          onClick={() => onSelect(service)}
          className="service-card group cursor-pointer text-left"
          aria-label={`Seleccionar servicio ${service.name}`}
        >
          <div className="text-5xl mb-4 text-center">{service.icon}</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            {service.name}
          </h3>
          <p className="text-gray-600 mb-4 text-center">
            {service.description}
          </p>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-primary-600">
              ${service.price.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">
              {service.duration} min
            </span>
          </div>
          <div className="btn-primary w-full text-center group-hover:scale-105 transition-transform duration-200">
            Seleccionar
          </div>
        </button>
      ))}
    </div>
  );
} 
