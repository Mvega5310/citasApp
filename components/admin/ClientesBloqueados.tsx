'use client';

import { useEffect, useState } from 'react';
import { UserX, Ban, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Bloqueado = { email: string; reason: string; blockedAt: string | null; blockedBy: string | null };

/**
 * Quién no puede reservar solo, por correo.
 *
 * Sin cuentas de cliente esto es una barrera de fricción, no un control de
 * seguridad: nada impide volver a reservar con otro correo. Para esta
 * barbería informal basta con eso — desalienta al que no llegó y lo obliga a
 * hablar con quien administra antes de agendar de nuevo.
 */
export default function ClientesBloqueados() {
  const [cargando, setCargando] = useState(true);
  const [lista, setLista] = useState<Bloqueado[]>([]);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [quitando, setQuitando] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    fetch('/api/admin/blocked-clients')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLista(d?.bloqueados ?? []))
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const bloquear = async (e: React.FormEvent) => {
    e.preventDefault();
    const correo = email.trim().toLowerCase();
    if (!correo) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/blocked-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo, reason, action: 'block' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo bloquear');
        return;
      }
      toast.success(`${correo} ya no puede reservar solo`);
      setEmail('');
      setReason('');
      cargar();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const desbloquear = async (correo: string) => {
    setQuitando(correo);
    try {
      const res = await fetch('/api/admin/blocked-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo, action: 'unblock' }),
      });
      if (!res.ok) {
        toast.error('No se pudo desbloquear');
        return;
      }
      setLista((prev) => prev.filter((b) => b.email !== correo));
      toast.success(`${correo} ya puede reservar de nuevo`);
    } catch {
      toast.error('Error de conexión');
    } finally {
      setQuitando(null);
    }
  };

  return (
    <div
      id="bloqueados"
      className="bg-cafe-card rounded-xl border border-cafe-border shadow-sm p-6 scroll-mt-32"
    >
      <h2 className="text-base font-semibold text-cafe-text mb-1 flex items-center gap-2">
        <UserX className="w-4 h-4 text-cafe-goldlight" />
        Clientes bloqueados
      </h2>
      <p className="text-xs text-cafe-muted mb-5 leading-relaxed">
        Para quien apartó y no llegó. Mientras esté aquí, su correo no puede reservar solo: el sitio
        le pide que se comunique contigo. No impide que reserve con otro correo — es un freno, no un
        control de identidad.
      </p>

      <form onSubmit={bloquear} className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          required
          className="flex-1 min-w-0 bg-cafe-soft border border-cafe-border rounded-lg px-3.5 py-2.5 text-sm text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
        />
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          maxLength={200}
          className="flex-1 min-w-0 bg-cafe-soft border border-cafe-border rounded-lg px-3.5 py-2.5 text-sm text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
        />
        <button
          type="submit"
          disabled={guardando || !email.trim()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cafe-gold hover:bg-cafe-goldlight text-cafe-bg text-sm font-semibold rounded-lg transition disabled:opacity-60 shrink-0"
        >
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
          Bloquear
        </button>
      </form>

      {cargando ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-cafe-gold" />
        </div>
      ) : lista.length === 0 ? (
        <p className="text-sm text-cafe-muted py-2">Nadie bloqueado por ahora.</p>
      ) : (
        <ul className="divide-y divide-cafe-border">
          {lista.map((b) => (
            <li key={b.email} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-cafe-text truncate">{b.email}</p>
                {b.reason && <p className="text-xs text-cafe-subtle truncate">{b.reason}</p>}
              </div>
              <button
                type="button"
                onClick={() => desbloquear(b.email)}
                disabled={quitando === b.email}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-cafe-border text-cafe-muted hover:text-cafe-text hover:border-cafe-gold/40 transition disabled:opacity-50 shrink-0"
              >
                {quitando === b.email ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Desbloquear
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
