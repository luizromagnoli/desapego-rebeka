const CART_KEY = 'cart_variations';

export function getCart(): string[] {
  if (typeof window === 'undefined') return [];
  const cart = localStorage.getItem(CART_KEY);
  if (cart) return JSON.parse(cart);
  // Migrate old cart if exists
  const oldCart = localStorage.getItem('cart');
  if (oldCart) {
    localStorage.removeItem('cart');
    // Old cart had item IDs, not variation IDs, so we discard it
  }
  return [];
}

export function addToCart(variationId: string) {
  const cart = getCart();
  if (!cart.includes(variationId)) {
    cart.push(variationId);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }
}

export function removeFromCart(variationId: string) {
  const cart = getCart().filter(id => id !== variationId);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function isInCart(variationId: string): boolean {
  return getCart().includes(variationId);
}
