'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Item, ItemVariation } from '@/lib/types';
import { getCart, addToCart, removeFromCart } from '@/lib/cart';
import ItemCard from '@/components/ItemCard';

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [cartVariationIds, setCartVariationIds] = useState<string[]>([]);
  const [selectedVariationIds, setSelectedVariationIds] = useState<Set<string>>(new Set());
  const [allItems, setAllItems] = useState<Item[]>([]);

  useEffect(() => {
    setCartVariationIds(getCart());
    fetch('/api/items')
      .then((res) => res.json())
      .then((data: Item[]) => setAllItems(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/items/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Item não encontrado');
        return res.json();
      })
      .then((data: Item) => {
        setItem(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.id]);

  function toggleVariationSelection(variationId: string) {
    setSelectedVariationIds((prev) => {
      const next = new Set(prev);
      if (next.has(variationId)) {
        next.delete(variationId);
      } else {
        next.add(variationId);
      }
      return next;
    });
  }

  function handleAddSelectedToCart() {
    const toAdd = Array.from(selectedVariationIds).filter(
      (id) => !cartVariationIds.includes(id)
    );
    for (const id of toAdd) {
      addToCart(id);
    }
    setCartVariationIds((prev) => [...prev, ...toAdd]);
    setSelectedVariationIds(new Set());
  }

  function handleRemoveFromCart(variationId: string) {
    removeFromCart(variationId);
    setCartVariationIds((prev) => prev.filter((id) => id !== variationId));
  }

  function handleToggleSingleCart(variationId: string) {
    if (cartVariationIds.includes(variationId)) {
      handleRemoveFromCart(variationId);
    } else {
      addToCart(variationId);
      setCartVariationIds((prev) => [...prev, variationId]);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error || 'Item não encontrado'}</p>
        <button
          onClick={() => router.back()}
          className="text-amber-700 hover:text-amber-800 font-medium"
        >
          Voltar
        </button>
      </div>
    );
  }

  const variations = item.variations || [];
  const showVariationSelector = variations.length > 1 || (variations.length === 1 && variations[0].name !== 'Padrão');
  const isSingleDefault = variations.length === 1 && variations[0].name === 'Padrão';
  const allUnavailable = variations.every((v) => v.status !== 'available');
  const availableNotInCart = variations.filter(
    (v) => v.status === 'available' && !cartVariationIds.includes(v.id)
  );
  const selectedNotInCart = Array.from(selectedVariationIds).filter(
    (id) => !cartVariationIds.includes(id)
  );

  const photos = item.photos || [];
  const mainPhoto = photos[mainPhotoIndex];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-amber-700 hover:text-amber-800 font-medium text-sm"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Voltar
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="md:flex">
            {/* Photo carousel */}
            <div className="md:w-1/2">
              <div
                className="relative"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  (e.currentTarget as HTMLElement).dataset.touchX = String(touch.clientX);
                }}
                onTouchEnd={(e) => {
                  const startX = Number((e.currentTarget as HTMLElement).dataset.touchX);
                  const endX = e.changedTouches[0].clientX;
                  const diff = startX - endX;
                  if (Math.abs(diff) > 50) {
                    if (diff > 0 && mainPhotoIndex < photos.length - 1) {
                      setMainPhotoIndex((i) => i + 1);
                    } else if (diff < 0 && mainPhotoIndex > 0) {
                      setMainPhotoIndex((i) => i - 1);
                    }
                  }
                }}
              >
                {mainPhoto ? (
                  <img
                    src={`/api/uploads/${mainPhoto.filename}`}
                    alt={item.title}
                    className="w-full h-72 sm:h-96 object-cover"
                  />
                ) : (
                  <div className="w-full h-72 sm:h-96 bg-gray-200 flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                )}

                {allUnavailable && (
                  <span className="absolute top-3 right-3 bg-amber-600 text-white text-sm font-semibold px-3 py-1 rounded">
                    Reservado
                  </span>
                )}

                {/* Prev/Next arrows */}
                {photos.length > 1 && (
                  <>
                    {mainPhotoIndex > 0 && (
                      <button
                        onClick={() => setMainPhotoIndex((i) => i - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}
                    {mainPhotoIndex < photos.length - 1 && (
                      <button
                        onClick={() => setMainPhotoIndex((i) => i + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}

                    {/* Dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {photos.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setMainPhotoIndex(index)}
                          className={`w-2.5 h-2.5 rounded-full transition-colors ${
                            index === mainPhotoIndex
                              ? 'bg-white'
                              : 'bg-white/50 hover:bg-white/75'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Counter */}
                    <span className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {mainPhotoIndex + 1} / {photos.length}
                    </span>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {photos.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setMainPhotoIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                        index === mainPhotoIndex
                          ? 'border-amber-600'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={`/api/uploads/${photo.filename}`}
                        alt={`${item.title} - foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="md:w-1/2 p-6">
              <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>

              {(() => {
                const prices = variations
                  .filter((v) => v.status === 'available')
                  .map((v) => v.price ?? item.price);
                const minPrice = prices.length > 0 ? Math.min(...prices) : item.price;
                const maxPrice = prices.length > 0 ? Math.max(...prices) : item.price;
                const hasDifferentPrices = showVariationSelector && minPrice !== maxPrice;

                return (
                  <p className="mt-3 text-3xl font-bold text-amber-700">
                    {hasDifferentPrices
                      ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
                      : formatPrice(minPrice)}
                  </p>
                );
              })()}

              {item.description && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Descrição
                  </h2>
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )}

              {/* Variation selector - multi-select */}
              {showVariationSelector && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Opções
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {variations.map((v: ItemVariation) => {
                      const isAvailable = v.status === 'available';
                      const inCart = cartVariationIds.includes(v.id);
                      const isSelected = selectedVariationIds.has(v.id);

                      return (
                        <button
                          key={v.id}
                          disabled={!isAvailable || inCart}
                          onClick={() => {
                            if (isAvailable && !inCart) toggleVariationSelection(v.id);
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                            !isAvailable
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                              : inCart
                              ? 'bg-green-50 text-green-700 border-green-300 cursor-default'
                              : isSelected
                              ? 'bg-amber-100 text-amber-800 border-amber-400'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400 cursor-pointer'
                          }`}
                        >
                          {v.name}
                          {v.price != null && v.price !== item.price && ` - ${formatPrice(v.price)}`}
                          {inCart && ' ✓'}
                          {v.status === 'reserved' && ' (reservado)'}
                          {v.status === 'sold' && ' (vendido)'}
                        </button>
                      );
                    })}
                  </div>
                  {availableNotInCart.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVariationIds(new Set(availableNotInCart.map((v) => v.id)));
                      }}
                      className="mt-2 text-xs text-amber-700 hover:text-amber-800 font-medium"
                    >
                      Selecionar todas disponíveis
                    </button>
                  )}
                </div>
              )}

              {/* Add to cart - multi-variation */}
              {showVariationSelector && selectedNotInCart.length > 0 && (
                <button
                  onClick={handleAddSelectedToCart}
                  className="mt-6 w-full py-3 px-6 rounded-md font-medium transition-colors bg-amber-600 text-white hover:bg-amber-700"
                >
                  Adicionar {selectedNotInCart.length} {selectedNotInCart.length === 1 ? 'item' : 'itens'} ao carrinho
                </button>
              )}

              {/* Single default variation - simple toggle */}
              {isSingleDefault && variations[0]?.status === 'available' && (
                <button
                  onClick={() => handleToggleSingleCart(variations[0].id)}
                  className={`mt-8 w-full py-3 px-6 rounded-md font-medium transition-colors ${
                    cartVariationIds.includes(variations[0].id)
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  {cartVariationIds.includes(variations[0].id) ? 'Remover do carrinho' : 'Adicionar ao carrinho'}
                </button>
              )}

              {allUnavailable && (
                <div className="mt-8 bg-amber-50 border border-amber-200 rounded-md p-4 text-center">
                  <p className="text-amber-800 font-medium">
                    Este item já está reservado.
                  </p>
                </div>
              )}

              <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-600">
                <p className="font-semibold text-gray-700 mb-2">Regras</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Não realizamos envio dos itens.</li>
                  <li>A retirada deve ser combinada previamente e pode ser feita em Alphaville (Barueri/SP) ou em Itu/SP, conforme disponibilidade.</li>
                  <li>Móveis e itens de grande porte devem ser retirados exclusivamente em Alphaville.</li>
                  <li>Itens reservados e não pagos em até 24 horas serão liberados automaticamente.</li>
                  <li>Ao finalizar a compra, <a href="http://api.whatsapp.com/send?phone=5511950803161" target="_blank" rel="noopener noreferrer" className="text-amber-700 underline hover:text-amber-800">entre em contato pelo WhatsApp</a> para combinar a retirada.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Similar items */}
      {item.category && (() => {
        const similarItems = allItems
          .filter((i) => i.id !== item.id && i.category === item.category)
          .slice(0, 8);
        if (similarItems.length === 0) return null;
        return (
          <section className="max-w-4xl mx-auto px-4 pb-8">
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Itens semelhantes</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {similarItems.map((si) => (
                  <div key={si.id} className="flex-shrink-0 w-48">
                    <ItemCard
                      item={si}
                      cartVariationIds={cartVariationIds}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Floating cart bar */}
      {cartVariationIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <p className="text-sm sm:text-base text-gray-700">
              <span className="font-semibold">{cartVariationIds.length}</span>{' '}
              {cartVariationIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
              {allItems.length > 0 && (
                <>
                  {' '}&mdash;{' '}
                  <span className="font-bold text-amber-700">
                    {formatPrice(
                      allItems.reduce((sum, itm) => {
                        const vars = itm.variations || [];
                        const matched = vars.filter((v) => cartVariationIds.includes(v.id));
                        return sum + matched.reduce((s, v) => s + (v.price ?? itm.price), 0);
                      }, 0)
                    )}
                  </span>
                </>
              )}
            </p>
            <Link
              href="/carrinho"
              className="bg-amber-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Ver carrinho
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
