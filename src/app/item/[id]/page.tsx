'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Item } from '@/lib/types';
import { getCart, addToCart, removeFromCart } from '@/lib/cart';

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [inCart, setInCart] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (params.id) {
      const cart = getCart();
      setInCart(cart.includes(params.id));
      setCartCount(cart.length);
    }
  }, [params.id]);

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

  function handleToggleCart() {
    if (!item) return;
    if (inCart) {
      removeFromCart(item.id);
      setInCart(false);
      setCartCount((c) => c - 1);
    } else {
      addToCart(item.id);
      setInCart(true);
      setCartCount((c) => c + 1);
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
        <Link
          href="/"
          className="text-amber-700 hover:text-amber-800 font-medium"
        >
          Voltar
        </Link>
      </div>
    );
  }

  const isReserved = item.status === 'reserved';
  const photos = item.photos || [];
  const mainPhoto = photos[mainPhotoIndex];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/"
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
          </Link>
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

                {isReserved && (
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
            </div>

            {/* Details */}
            <div className="md:w-1/2 p-6">
              <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>

              <p className="mt-3 text-3xl font-bold text-amber-700">
                {formatPrice(item.price)}
              </p>

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

              {!isReserved && (
                <button
                  onClick={handleToggleCart}
                  className={`mt-8 w-full py-3 px-6 rounded-md font-medium transition-colors ${
                    inCart
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  {inCart ? 'Remover do carrinho' : 'Adicionar ao carrinho'}
                </button>
              )}

              {isReserved && (
                <div className="mt-8 bg-amber-50 border border-amber-200 rounded-md p-4 text-center">
                  <p className="text-amber-800 font-medium">
                    Este item já está reservado.
                  </p>
                </div>
              )}

              <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Retirada no local</p>
                <p>
                  Não realizamos entregas. O comprador é responsável por retirar
                  os itens no estúdio em Alphaville - Barueri/SP.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <p className="text-sm sm:text-base text-gray-700">
              <span className="font-semibold">{cartCount}</span>{' '}
              {cartCount === 1 ? 'item selecionado' : 'itens selecionados'}
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
