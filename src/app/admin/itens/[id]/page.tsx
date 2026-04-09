'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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

export default function AdminItemViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const highlightVariationId = searchParams.get('v');

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);

  const fetchItem = useCallback(async () => {
    try {
      const res = await fetch(`/api/items/${id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Erro ao carregar item');
      const data: Item = await res.json();
      setItem(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  if (loading) return <p className="text-gray-500">Carregando...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!item) return <p className="text-gray-500">Item não encontrado.</p>;

  const photos = [...item.photos].sort((a, b) => a.sort_order - b.sort_order);
  const mainPhoto = photos[mainPhotoIndex];
  const variations = item.variations || [];
  const badge = statusLabel(item.status);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Detalhes do item</h2>
        <Link
          href={`/admin/itens/${id}/editar`}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Editar
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-w-3xl">
        <div className="md:flex">
          {/* Photos */}
          <div className="md:w-1/2">
            {mainPhoto ? (
              <img
                src={`/api/uploads/${mainPhoto.filename}`}
                alt={item.title}
                className="w-full h-64 sm:h-80 object-cover"
              />
            ) : (
              <div className="w-full h-64 sm:h-80 bg-gray-100 flex items-center justify-center text-gray-400">
                Sem foto
              </div>
            )}
            {photos.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setMainPhotoIndex(index)}
                    className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                      index === mainPhotoIndex
                        ? 'border-blue-600'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={`/api/uploads/${photo.filename}`}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="md:w-1/2 p-6">
            <h1 className="text-xl font-bold text-gray-900">{item.title}</h1>

            <p className="mt-2 text-2xl font-bold text-amber-700">
              {item.previous_price != null && item.previous_price !== item.price && (
                <span className="line-through text-gray-400 font-normal text-lg mr-2">{formatPrice(item.previous_price)}</span>
              )}
              {formatPrice(item.price)}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
                {badge.text}
              </span>
              {item.category && (
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                  {item.category}
                </span>
              )}
            </div>

            {item.description && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 mb-1">Descrição</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{item.description}</p>
              </div>
            )}

            {/* Variations */}
            {variations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 mb-2">
                  Variações ({variations.length})
                </p>
                <div className="space-y-2">
                  {variations.map((v: ItemVariation) => {
                    const vBadge = statusLabel(v.status);
                    const isHighlighted = v.id === highlightVariationId;
                    return (
                      <div
                        key={v.id}
                        className={`flex items-center justify-between p-2.5 rounded-md border text-sm ${
                          isHighlighted
                            ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{v.name}</span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${vBadge.className}`}>
                            {vBadge.text}
                          </span>
                          {v.buyer_name && (
                            <span className="text-xs text-gray-400">
                              {v.buyer_name}
                            </span>
                          )}
                        </div>
                        {v.price != null && (
                          <span className="text-sm font-medium text-amber-700">
                            {v.previous_price != null && v.previous_price !== v.price && (
                              <span className="line-through text-gray-400 font-normal mr-1">{formatPrice(v.previous_price)}</span>
                            )}
                            {formatPrice(v.price)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mt-4 text-xs text-gray-400">
              Criado em {new Date(item.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
