'use client';

import { useEffect, useState } from 'react';

function getHeaders(): HeadersInit {
  const pw = sessionStorage.getItem('adminPassword') ?? '';
  return { 'x-admin-password': pw };
}

export default function ConfigPage() {
  const [storeLocked, setStoreLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigningCategories, setAssigningCategories] = useState(false);
  const [categoryResult, setCategoryResult] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setStoreLocked(data.store_locked === 'true');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function toggleStoreLock() {
    const newValue = !storeLocked;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_locked: newValue ? 'true' : 'false' }),
      });
      if (res.ok) {
        setStoreLocked(newValue);
      }
    } catch {
      alert('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Configurações</h2>

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">Bloquear loja</p>
            <p className="text-sm text-gray-500 mt-1">
              Quando ativado, os compradores verão uma mensagem de &quot;em breve&quot;
              em vez dos itens.
            </p>
          </div>
          <button
            onClick={toggleStoreLock}
            disabled={saving}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              storeLocked ? 'bg-red-500' : 'bg-gray-300'
            } ${saving ? 'opacity-50' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                storeLocked ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <p className="mt-3 text-sm">
          Status:{' '}
          {storeLocked ? (
            <span className="text-red-600 font-medium">Loja bloqueada</span>
          ) : (
            <span className="text-green-600 font-medium">Loja aberta</span>
          )}
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-lg mt-6">
        <div>
          <p className="font-medium text-gray-800">Categorias automáticas</p>
          <p className="text-sm text-gray-500 mt-1">
            Atribui categorias automaticamente aos itens que ainda não possuem uma,
            com base no título.
          </p>
          <button
            onClick={async () => {
              setAssigningCategories(true);
              setCategoryResult(null);
              try {
                const res = await fetch('/api/items/assign-categories', {
                  method: 'POST',
                  headers: getHeaders(),
                });
                if (!res.ok) throw new Error('Erro ao atribuir categorias');
                const data = await res.json();
                setCategoryResult(
                  `${data.assigned} de ${data.total} itens categorizados. ${data.unmatched} sem correspondência.`
                );
              } catch {
                setCategoryResult('Erro ao atribuir categorias.');
              } finally {
                setAssigningCategories(false);
              }
            }}
            disabled={assigningCategories}
            className="mt-3 bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assigningCategories ? 'Atribuindo...' : 'Atribuir categorias automaticamente'}
          </button>
          {categoryResult && (
            <p className="mt-2 text-sm text-gray-700">{categoryResult}</p>
          )}
        </div>
      </div>
    </div>
  );
}
