'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { Item, ItemVariation } from '@/lib/types';

function getHeaders(): HeadersInit {
  const pw = sessionStorage.getItem('adminPassword') ?? '';
  return { 'x-admin-password': pw };
}

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function phoneToWhatsAppUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://api.whatsapp.com/send?phone=55${digits}`;
}

interface ReservedEntry {
  item: Item;
  variation: ItemVariation;
}

export default function ReservadosPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/items?all=true', { headers: getHeaders() });
      if (!res.ok) throw new Error('Erro ao carregar itens');
      const data: Item[] = await res.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleVariationStatusChange(itemId: string, variationId: string, newStatus: 'available' | 'sold') {
    try {
      const res = await fetch(`/api/items/${itemId}/status`, {
        method: 'PUT',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ variationId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar status');
      fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status');
    }
  }

  // Collect all reserved variations
  const reservedEntries: ReservedEntry[] = [];
  for (const item of items) {
    for (const v of (item.variations || [])) {
      if (v.status === 'reserved') {
        reservedEntries.push({ item, variation: v });
      }
    }
  }

  // Group by buyer
  const buyerGroups = new Map<string, ReservedEntry[]>();
  for (const entry of reservedEntries) {
    const key = `${entry.variation.buyer_name}|||${entry.variation.buyer_contact}`;
    const list = buyerGroups.get(key) ?? [];
    list.push(entry);
    buyerGroups.set(key, list);
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Itens reservados</h2>

      {loading && <p className="text-gray-500">Carregando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && reservedEntries.length === 0 && (
        <p className="text-gray-500">Nenhum item reservado.</p>
      )}

      {!loading && !error && reservedEntries.length > 0 && (
        <div className="space-y-6">
          {Array.from(buyerGroups.entries()).map(([key, entries]) => {
            const [name, contact] = key.split('|||');
            const total = entries.reduce((sum, e) => sum + e.item.price, 0);

            return (
              <div key={key} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Buyer header */}
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-semibold text-gray-800">{name}</span>
                    {contact && (() => {
                      const waUrl = phoneToWhatsAppUrl(contact);
                      return waUrl ? (
                        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 text-sm ml-2 underline">{contact}</a>
                      ) : (
                        <span className="text-gray-500 text-sm ml-2">{contact}</span>
                      );
                    })()}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">{entries.length} {entries.length === 1 ? 'item' : 'itens'}</span>
                    <span className="font-bold text-amber-700 ml-3">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-100">
                  {entries.map((entry) => {
                    const { item, variation } = entry;
                    const thumb = item.photos.length > 0
                      ? `/api/uploads/${[...item.photos].sort((a, b) => a.sort_order - b.sort_order)[0].filename}`
                      : null;

                    const showVariationName = variation.name !== 'Padrão' || (item.variations || []).length > 1;
                    const displayTitle = showVariationName
                      ? `${item.title} - ${variation.name}`
                      : item.title;

                    return (
                      <div key={variation.id} className="px-4 py-3 flex items-center gap-4">
                        {thumb ? (
                          <img src={thumb} alt={item.title} loading="lazy" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                            Sem foto
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <Link href={`/admin/itens/${item.id}/editar`} className="font-medium text-gray-800 hover:text-blue-600 text-sm truncate block">
                            {displayTitle}
                          </Link>
                          <p className="text-sm text-amber-700 font-semibold">
                            {item.previous_price != null && item.previous_price !== item.price && (
                              <span className="line-through text-gray-400 font-normal mr-1">{formatPrice(item.previous_price)}</span>
                            )}
                            {formatPrice(item.price)}
                          </p>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleVariationStatusChange(item.id, variation.id, 'sold')}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                          >
                            Vendido
                          </button>
                          <button
                            onClick={() => handleVariationStatusChange(item.id, variation.id, 'available')}
                            className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded transition-colors"
                          >
                            Liberar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
