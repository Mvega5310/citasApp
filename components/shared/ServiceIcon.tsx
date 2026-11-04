import {
  Eye,
  Footprints,
  Hand,
  Scissors,
  ScissorsLineDashed,
  Slice,
  Sparkles,
  Wind,
  type LucideIcon,
} from 'lucide-react';

// Ícono vectorial por servicio. Los datos de lib/shared/services.ts no cambian:
// aquí solo se decide cómo se dibuja cada servicio en la interfaz.
const ICONS: Record<string, LucideIcon> = {
  'corte-cabello': Scissors,
  'corte-barba': ScissorsLineDashed,
  cejas: Eye,
  'solo-barba': Slice,
  manicure: Hand,
  pedicure: Footprints,
  blower: Wind,
};

interface ServiceIconProps {
  serviceId: string;
  className?: string;
  size?: number;
}

export default function ServiceIcon({ serviceId, className = '', size = 22 }: ServiceIconProps) {
  const Icon = ICONS[serviceId] ?? Sparkles;
  return <Icon width={size} height={size} strokeWidth={2} aria-hidden="true" className={className} />;
}
