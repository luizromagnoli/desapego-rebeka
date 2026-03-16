'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Item, ItemPhoto } from '@/lib/types';

function getHeaders(): HeadersInit {
  const pw = sessionStorage.getItem('adminPassword') ?? '';
  return { 'x-admin-password': pw };
}

export default function EditarItemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [existingPhotos, setExistingPhotos] = useState<ItemPhoto[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Erro ao carregar item');
      const item: Item = await res.json();
      setTitle(item.title);
      setDescription(item.description);
      setPrice(String(item.price));
      setExistingPhotos(
        [...item.photos].sort((a, b) => a.sort_order - b.sort_order)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;
    const fileList = Array.from(selected);
    setNewFiles((prev) => [...prev, ...fileList]);

    const urls = fileList.map((f) => URL.createObjectURL(f));
    setNewPreviews((prev) => [...prev, ...urls]);
  }

  function removeNewFile(index: number) {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleRemoveExistingPhoto(photo: ItemPhoto) {
    try {
      const res = await fetch(`/api/items/${id}/photos/${photo.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Erro ao remover foto');
      setExistingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao remover foto');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Título é obrigatório');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Preço deve ser maior que zero');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('price', price);
      newFiles.forEach((file) => formData.append('files', file));

      const res = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erro ao salvar alterações');
      }

      router.push('/admin/itens');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-gray-500">Carregando...</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Editar item</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded p-6 max-w-2xl"
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Título
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Descrição
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Preço (R$)
          </label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Existing photos */}
        {existingPhotos.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotos atuais
            </label>
            <div className="flex flex-wrap gap-3">
              {existingPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={`/api/uploads/${photo.filename}`}
                    alt="Foto do item"
                    className="w-20 h-20 object-cover rounded border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingPhoto(photo)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New photos */}
        <div className="mb-6">
          <label
            htmlFor="photos"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Adicionar fotos
          </label>
          <input
            id="photos"
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFilesChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {newPreviews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {newPreviews.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={`Nova foto ${i + 1}`}
                    className="w-20 h-20 object-cover rounded border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white rounded px-5 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/itens')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
