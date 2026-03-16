export function getCart(): string[] {
  if (typeof window === 'undefined') return [];
  const cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
}

export function addToCart(itemId: string) {
  const cart = getCart();
  if (!cart.includes(itemId)) {
    cart.push(itemId);
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}

export function removeFromCart(itemId: string) {
  const cart = getCart().filter(id => id !== itemId);
  localStorage.setItem('cart', JSON.stringify(cart));
}

export function clearCart() {
  localStorage.removeItem('cart');
}

export function isInCart(itemId: string): boolean {
  return getCart().includes(itemId);
}
