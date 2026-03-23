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

function statusLabel(status: string): { text: string; className: string } {
  switch (status) {
    case 'available':
      return { text: 'Disponível', className: 'bg-green-100 text-green-800' };
    case 'reserved':
      return { text: 'Reservado', className: 'bg-yellow-100 text-yellow-800' };
    case 'sold':
      return { text: 'Vendido', className: 'bg-gray-100 text-gray-600' };
    default:
      return { text: status, className: 'bg-gray-100 text-gray-600' };
  }
}

export default function AdminItensPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/items?all=true', { headers: getHeaders() });
      if (!res.ok) throw new Error('Erro ao carregar itens');
      const data = await res.json();
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

  async function handleDelete(item: Item) {
    if (!confirm(`Tem certeza que deseja excluir "${item.title}"?`)) return;
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Erro ao excluir item');
      fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

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

  function toggleExpand(itemId: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function thumbnailUrl(item: Item): string | null {
    if (item.photos.length === 0) return null;
    const sorted = [...item.photos].sort((a, b) => a.sort_order - b.sort_order);
    return `/api/uploads/${sorted[0].filename}`;
  }

  function hasMultipleVariations(item: Item): boolean {
    return (item.variations || []).length > 1;
  }

  function isSingleDefault(item: Item): boolean {
    const vars = item.variations || [];
    return vars.length <= 1;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Itens</h2>
        <Link
          href="/admin/itens/novo"
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Novo item
        </Link>
      </div>

      {loading && <p className="text-gray-500">Carregando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="text-gray-500">Nenhum item cadastrado.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 font-medium">Foto</th>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Info</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const thumb = thumbnailUrl(item);
                const badge = statusLabel(item.status);
                const multiVariation = hasMultipleVariations(item);
                const singleDefault = isSingleDefault(item);
                const isExpanded = expandedItems.has(item.id);
                const variations = item.variations || [];
                const singleVariation = singleDefault ? variations[0] : null;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 last:border-b-0 align-top"
                  >
                    <td className="px-4 py-3">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.title}
                          loading="lazy"
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                          Sem foto
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {item.title}
                      {multiVariation && (
                        <span className="block text-xs text-gray-500 mt-0.5">
                          {variations.length} variações
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatPrice(item.price)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}
                      >
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {singleDefault && singleVariation && singleVariation.status === 'reserved' && singleVariation.buyer_name && (
                        <div>
                          <div>{singleVariation.buyer_name}</div>
                          {singleVariation.buyer_contact && (
                            <div className="text-gray-400">
                              {singleVariation.buyer_contact}
                            </div>
                          )}
                        </div>
                      )}
                      {multiVariation && !isExpanded && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Ver variações
                        </button>
                      )}
                      {multiVariation && isExpanded && (
                        <div className="space-y-2">
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium mb-1"
                          >
                            Ocultar variações
                          </button>
                          {variations.map((v: ItemVariation) => {
                            const vBadge = statusLabel(v.status);
                            return (
                              <div key={v.id} className="flex items-center gap-2 flex-wrap border-t border-gray-50 pt-1">
                                <span className="font-medium text-gray-700">{v.name}</span>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${vBadge.className}`}>
                                  {vBadge.text}
                                </span>
                                {v.buyer_name && (
                                  <span className="text-gray-400">{v.buyer_name}</span>
                                )}
                                <div className="flex gap-1 ml-auto">
                                  {v.status === 'reserved' && (
                                    <>
                                      <button
                                        onClick={() => handleVariationStatusChange(item.id, v.id, 'sold')}
                                        className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded transition-colors"
                                      >
                                        Vendido
                                      </button>
                                      <button
                                        onClick={() => handleVariationStatusChange(item.id, v.id, 'available')}
                                        className="text-[10px] bg-green-50 hover:bg-green-100 text-green-700 px-1.5 py-0.5 rounded transition-colors"
                                      >
                                        Liberar
                                      </button>
                                    </>
                                  )}
                                  {v.status === 'sold' && (
                                    <button
                                      onClick={() => handleVariationStatusChange(item.id, v.id, 'available')}
                                      className="text-[10px] bg-green-50 hover:bg-green-100 text-green-700 px-1.5 py-0.5 rounded transition-colors"
                                    >
                                      Liberar
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Link
                          href={`/admin/itens/${item.id}/editar`}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Excluir
                        </button>
                        {/* For single-variation items, show quick status buttons */}
                        {singleDefault && singleVariation && singleVariation.status === 'reserved' && (
                          <>
                            <button
                              onClick={() => handleVariationStatusChange(item.id, singleVariation.id, 'sold')}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                            >
                              Marcar como vendido
                            </button>
                            <button
                              onClick={() => handleVariationStatusChange(item.id, singleVariation.id, 'available')}
                              className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded transition-colors"
                            >
                              Liberar
                            </button>
                          </>
                        )}
                        {singleDefault && singleVariation && singleVariation.status === 'sold' && (
                          <button
                            onClick={() => handleVariationStatusChange(item.id, singleVariation.id, 'available')}
                            className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded transition-colors"
                          >
                            Liberar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
