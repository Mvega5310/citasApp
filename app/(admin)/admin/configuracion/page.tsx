'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import QrCard from '@/components/admin/QrCard';
import {
  Store, Phone, MapPin, Mail, Instagram, Facebook,
  MessageCircle, Bell, Save, CheckCircle, Settings, QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';

type SalonSettings = {
  salonName: string;
  phone: string;
  address: string;
  city: string;
  contactEmail: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  notifyClient: boolean;
  notifyAdmin: boolean;
};

const ACCESOS = [
  { id: 'salon', label: 'Inf. salón', Icon: Store },
  { id: 'redes', label: 'Redes sociales', Icon: Instagram },
  { id: 'correos', label: 'Not. email', Icon: Bell },
  { id: 'qr', label: 'Código QR', Icon: QrCode },
] as const;

const DEFAULTS: SalonSettings = {
  salonName: 'Marcos BarberShop',
  phone: '+57 300 123 4567',
  address: 'Calle 123 #45-67',
  city: 'Bogotá',
  contactEmail: 'info@beautyturno.com',
  instagram: '',
  facebook: '',
  whatsapp: '',
  notifyClient: true,
  notifyAdmin: true,
};

function Field({
  label, icon: Icon, type = 'text', value, onChange, placeholder, hint,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-cafe-text mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cafe-subtle" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-cafe-soft border border-cafe-border rounded-lg pl-10 pr-4 py-2.5 text-cafe-text focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 focus:border-transparent transition"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-cafe-subtle">{hint}</p>}
    </div>
  );
}

function Toggle({
  label, description, checked, onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-cafe-text">{label}</p>
        <p className="text-xs text-cafe-muted mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-cafe-gold' : 'bg-cafe-border'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-cafe-card rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<SalonSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setSettings({ ...DEFAULTS, ...d }))
      .catch(() => toast.error('Error al cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof SalonSettings>(key: K, value: SalonSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        toast.success('Configuración guardada');
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        toast.error(d.error || 'Error al guardar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-cafe-bg text-cafe-text pb-14 md:pb-0">
      <AdminSidebar />
      <AdminBottomNav />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — sticky para que no desaparezca al hacer scroll */}
        <div className="bg-cafe-bg/90 backdrop-blur-md border-b border-cafe-border px-4 md:px-6 py-4 flex items-center gap-3 sticky top-14 md:top-0 z-10 mt-14 md:mt-0">
          <div className="w-9 h-9 bg-cafe-gold/15 rounded-lg flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-cafe-goldlight" />
          </div>
          <div>
            <h1 className="text-lg font-display font-medium text-cafe-text leading-tight">Configuración</h1>
            <p className="text-xs text-cafe-subtle">Personaliza la información de tu salón</p>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 max-w-2xl">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-cafe-border border-t-cafe-gold rounded-full animate-spin" />
            </div>
          ) : (
            <>
            {/* Accesos rápidos: el código QR quedaba al final y no se veía */}
            <nav aria-label="Secciones" className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              {ACCESOS.map(({ id, label, Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-cafe-border bg-cafe-card px-2 py-3 text-center text-[11px] font-medium text-cafe-muted hover:border-cafe-gold hover:text-cafe-text transition min-h-[72px]"
                >
                  <Icon className="w-5 h-5 text-cafe-goldlight shrink-0" />
                  {label}
                </a>
              ))}
            </nav>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Información general */}
              <div id="salon" className="bg-cafe-card rounded-xl border border-cafe-border shadow-sm p-6 scroll-mt-32">
                <h2 className="text-base font-semibold text-cafe-text mb-5 flex items-center gap-2">
                  <Store className="w-4 h-4 text-cafe-goldlight" />
                  Información del salón
                </h2>
                <div className="space-y-4">
                  <Field
                    label="Nombre del salón"
                    icon={Store}
                    value={settings.salonName}
                    onChange={(v) => set('salonName', v)}
                    placeholder="Marcos BarberShop"
                  />
                  <Field
                    label="Teléfono"
                    icon={Phone}
                    value={settings.phone}
                    onChange={(v) => set('phone', v)}
                    placeholder="+57 3024075828"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Dirección"
                      icon={MapPin}
                      value={settings.address}
                      onChange={(v) => set('address', v)}
                      placeholder="Bella vista, Colombia"
                    />
                    <Field
                      label="Ciudad"
                      icon={MapPin}
                      value={settings.city}
                      onChange={(v) => set('city', v)}
                      placeholder="Bogotá"
                    />
                  </div>
                  <Field
                    label="Email de contacto"
                    icon={Mail}
                    type="email"
                    value={settings.contactEmail}
                    onChange={(v) => set('contactEmail', v)}
                    placeholder="marcosvega5310@gmail.com"
                  />
                </div>
              </div>

              {/* Redes sociales */}
              <div id="redes" className="bg-cafe-card rounded-xl border border-cafe-border shadow-sm p-6 scroll-mt-32">
                <h2 className="text-base font-semibold text-cafe-text mb-5 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-cafe-goldlight" />
                  Redes sociales
                </h2>
                <div className="space-y-4">
                  <Field
                    label="Instagram"
                    icon={Instagram}
                    value={settings.instagram}
                    onChange={(v) => set('instagram', v)}
                    placeholder="https://instagram.com/tu_salon"
                    hint="URL completa de tu perfil"
                  />
                  <Field
                    label="Facebook"
                    icon={Facebook}
                    value={settings.facebook}
                    onChange={(v) => set('facebook', v)}
                    placeholder="https://facebook.com/tu_salon"
                  />
                  <Field
                    label="WhatsApp"
                    icon={MessageCircle}
                    value={settings.whatsapp}
                    onChange={(v) => set('whatsapp', v)}
                    placeholder="+573024075828"
                    hint="Número con código de país, sin espacios"
                  />
                </div>
              </div>

              {/* Notificaciones */}
              <div id="correos" className="bg-cafe-card rounded-xl border border-cafe-border shadow-sm p-6 scroll-mt-32">
                <h2 className="text-base font-semibold text-cafe-text mb-5 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cafe-goldlight" />
                  Notificaciones por email
                </h2>
                <div className="space-y-5">
                  <Toggle
                    label="Confirmar al cliente"
                    description="Envía email de confirmación al cliente cuando hace una reserva"
                    checked={settings.notifyClient}
                    onChange={(v) => set('notifyClient', v)}
                  />
                  <div className="border-t border-cafe-border" />
                  <Toggle
                    label="Notificar al administrador"
                    description="Envía email al admin con los detalles de cada nueva reserva"
                    checked={settings.notifyAdmin}
                    onChange={(v) => set('notifyAdmin', v)}
                  />
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg text-sm font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {saved ? (
                    <><CheckCircle className="w-4 h-4" /> Guardado</>
                  ) : saving ? (
                    <><div className="w-4 h-4 border-2 border-cafe-bg/30 border-t-cafe-bg rounded-full animate-spin" /> Guardando...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Guardar configuración</>
                  )}
                </button>
              </div>
            </form>

            <div id="qr" className="mt-6 scroll-mt-32">
              <QrCard />
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
