'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Item, ItemVariation } from '@/lib/types';
import { getCart, removeFromCart } from '@/lib/cart';

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface CartEntry {
  item: Item;
  variation: ItemVariation;
}

export default function CartPage() {
  const router = useRouter();
  const [cartVariationIds, setCartVariationIds] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const ids = getCart();
    setCartVariationIds(ids);

    fetch('/api/items?all=true')
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao carregar itens');
        return res.json();
      })
      .then((data: Item[]) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  function handleRemove(variationId: string) {
    removeFromCart(variationId);
    setCartVariationIds((prev) => prev.filter((id) => id !== variationId));
  }

  // Build cart entries: match variation IDs to items
  const cartEntries: CartEntry[] = [];
  for (const vId of cartVariationIds) {
    for (const item of items) {
      const variation = (item.variations || []).find((v) => v.id === vId);
      if (variation) {
        cartEntries.push({ item, variation });
        break;
      }
    }
  }

  const totalPrice = cartEntries.reduce((sum, entry) => sum + (entry.variation.price ?? entry.item.price), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (cartEntries.length === 0) return;
    if (!buyerName.trim() || !buyerContact.trim()) return;

    setSubmitting(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variationIds: cartVariationIds,
          buyerName: buyerName.trim(),
          buyerContact: buyerContact.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.unavailable && data.unavailable.length > 0) {
          setErrorMessage(
            'Alguns itens já foram reservados e não estão mais disponíveis. Remova-os do carrinho e tente novamente.'
          );
        } else {
          setErrorMessage(data.error || 'Erro ao processar a reserva.');
        }
        setSubmitting(false);
        return;
      }

      router.push('/carrinho/confirmacao');
    } catch {
      setErrorMessage('Erro de conexão. Tente novamente.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
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
            Voltar à loja
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Carrinho</h1>

        {cartEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Seu carrinho está vazio.</p>
            <Link
              href="/"
              className="text-amber-700 hover:text-amber-800 font-medium"
            >
              Ver itens disponíveis
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Item list */}
            <div className="space-y-3 mb-8">
              {cartEntries.map((entry) => {
                const { item, variation } = entry;
                const firstPhoto = item.photos?.[0];
                const showVariationName = variation.name !== 'Padrão' || (item.variations || []).length > 1;
                const displayTitle = showVariationName
                  ? `${item.title} - ${variation.name}`
                  : item.title;

                return (
                  <div
                    key={variation.id}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center gap-4"
                  >
                    {firstPhoto ? (
                      <img
                        src={`/api/uploads/${firstPhoto.filename}`}
                        alt={item.title}
                        loading="lazy"
                        className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-gray-400"
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

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 truncate">
                        {displayTitle}
                      </h3>
                      <p className="text-amber-700 font-semibold">
                        {formatPrice(variation.price ?? item.price)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(variation.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Remover"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-8">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Total</span>
                <span className="text-xl font-bold text-amber-700">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>

            {/* Buyer info */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Seus dados
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="buyer-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Seu nome
                  </label>
                  <input
                    id="buyer-name"
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label
                    htmlFor="buyer-contact"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    WhatsApp
                  </label>
                  <input
                    id="buyer-contact"
                    type="tel"
                    required
                    value={buyerContact}
                    onChange={(e) => setBuyerContact(formatPhone(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6 text-sm text-gray-600">
              <p className="font-semibold text-gray-700 mb-2">Regras</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Não realizamos envio dos itens.</li>
                <li>A retirada deve ser combinada previamente e pode ser feita em Alphaville (Barueri/SP) ou em Itu/SP, conforme disponibilidade.</li>
                <li>Móveis e itens de grande porte devem ser retirados exclusivamente em Alphaville.</li>
                <li>Itens reservados e não pagos em até 24 horas serão liberados automaticamente.</li>
                <li>Ao finalizar a compra, <a href="http://api.whatsapp.com/send?phone=5511950803161" target="_blank" rel="noopener noreferrer" className="text-amber-700 underline hover:text-amber-800">entre em contato pelo WhatsApp</a> para combinar a retirada.</li>
              </ul>
            </div>

            {/* Error */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-red-700 text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || cartEntries.length === 0}
              className="w-full bg-amber-600 text-white py-3 px-6 rounded-md font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processando...' : 'Confirmar reserva'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
