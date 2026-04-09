'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { clearCart } from '@/lib/cart';

export default function ConfirmationPage() {
  useEffect(() => {
    clearCart();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          {/* Success icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Reserva confirmada!
          </h1>

          <p className="text-gray-600 mb-6">
            Seus itens foram reservados. Para finalizar a compra, realize o
            pagamento via transferência bancária:
          </p>

          {/* Bank details */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-5 text-left mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Dados bancários
            </h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">Banco:</span> Nubank
              </p>
              <p>
                <span className="font-medium">Titular:</span> Rebeka Romagnoli
              </p>
              <p>
                <span className="font-medium">Chave PIX:</span> 11984617618
              </p>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-6">
            Após o pagamento, entre em contato informando o comprovante.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8">
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-600">
              <p className="font-semibold text-gray-700 mb-2">Regras</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Não realizamos envio dos itens.</li>
                <li>A retirada deve ser combinada previamente e pode ser feita em Alphaville (Barueri/SP) ou em Itu/SP, conforme disponibilidade.</li>
                <li>Móveis e itens de grande porte devem ser retirados exclusivamente em Alphaville.</li>
                <li>Itens reservados e não pagos em até 24 horas serão liberados automaticamente.</li>
                <li>Ao finalizar a compra, <a href="http://api.whatsapp.com/send?phone=5511950803161" target="_blank" rel="noopener noreferrer" className="text-amber-700 underline hover:text-amber-800">entre em contato pelo WhatsApp</a> para combinar a retirada.</li>
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-gray-600">
              <p className="font-semibold text-amber-800 mb-2">Envio e Pagamento</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Envio a combinar, só não enviaremos móveis e itens muito grandes.</li>
                <li>Aceitamos pagamento por cartão, mas será cobrada a taxa do cartão.</li>
              </ul>
            </div>
          </div>

          <Link
            href="/"
            className="inline-block bg-amber-600 text-white px-6 py-3 rounded-md font-medium hover:bg-amber-700 transition-colors"
          >
            Voltar à loja
          </Link>
        </div>
      </div>
    </div>
  );
}
