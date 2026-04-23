'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, any>;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('request_failed');
  return res.json();
}

export default function AdminDataPage() {
  const [users, setUsers] = useState<Row[]>([]);
  const [clients, setClients] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [u, c, p] = await Promise.all([
          fetchJson<{ rows: Row[] }>('/api/users?limit=20'),
          fetchJson<{ rows: Row[] }>('/api/clients?limit=20'),
          fetchJson<{ rows: Row[] }>('/api/payments?limit=20'),
        ]);
        if (!mounted) return;
        setUsers(u.rows);
        setClients(c.rows);
        setPayments(p.rows);
      } catch (e) {
        if (!mounted) return;
        setError('No se pudieron cargar los datos');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Datos (Neon)</h1>
        {loading && <div className="text-gray-600">Cargando...</div>}
        {error && <div className="text-red-600">{error}</div>}

        {/* Users */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Usuarios</h2>
            <span className="text-sm text-gray-500">{users.length} registros</span>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Rol</th>
                  <th className="px-4 py-2 text-left">Creado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">{u.name}</td>
                    <td className="px-4 py-2">{u.role}</td>
                    <td className="px-4 py-2">{new Date(u.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clients */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Clientes</h2>
            <span className="text-sm text-gray-500">{clients.length} registros</span>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Teléfono</th>
                  <th className="px-4 py-2 text-left">Creado</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2">{c.email || '-'}</td>
                    <td className="px-4 py-2">{c.phone || '-'}</td>
                    <td className="px-4 py-2">{new Date(c.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payments */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Pagos</h2>
            <span className="text-sm text-gray-500">{payments.length} registros</span>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Proveedor</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Monto</th>
                  <th className="px-4 py-2 text-left">Moneda</th>
                  <th className="px-4 py-2 text-left">Creado</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2">{p.provider}</td>
                    <td className="px-4 py-2">{p.status}</td>
                    <td className="px-4 py-2">${(p.amount_cents / 100).toLocaleString()}</td>
                    <td className="px-4 py-2">{p.currency}</td>
                    <td className="px-4 py-2">{new Date(p.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

