import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";

const ShopContext = createContext(null);

export function ShopProvider({ children }) {
  const { isAuthenticated, role } = useAuth();

  // Wishlist State
  const [wishlist, setWishlist] = useState({ products: [] });
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState(null);

  // Cart State
  const [cart, setCart] = useState({ items: [] });
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);

  const isCustomer = isAuthenticated && role === "customer";

  // Fetch Wishlist from Backend API
  const fetchWishlist = useCallback(async () => {
    if (!isCustomer) {
      setWishlist({ products: [] });
      return;
    }

    try {
      setWishlistLoading(true);
      setWishlistError(null);
      const res = await api.get("/wishlist");
      if (res && res.wishlist) {
        setWishlist(res.wishlist);
      } else {
        setWishlist({ products: [] });
      }
    } catch (err) {
      console.error("Failed to fetch wishlist:", err);
      setWishlistError(err.message || "Failed to load wishlist");
    } finally {
      setWishlistLoading(false);
    }
  }, [isCustomer]);

  // Fetch Cart from Backend API
  const fetchCart = useCallback(async () => {
    if (!isCustomer) {
      setCart({ items: [] });
      return;
    }

    try {
      setCartLoading(true);
      setCartError(null);
      const res = await api.get("/cart");
      if (res && res.cart) {
        setCart(res.cart);
      } else {
        setCart({ items: [] });
      }
    } catch (err) {
      console.error("Failed to fetch cart:", err);
      setCartError(err.message || "Failed to load cart");
    } finally {
      setCartLoading(false);
    }
  }, [isCustomer]);

  // Sync on auth change
  useEffect(() => {
    if (isCustomer) {
      fetchWishlist();
      fetchCart();
    } else {
      setWishlist({ products: [] });
      setCart({ items: [] });
    }
  }, [isCustomer, fetchWishlist, fetchCart]);

  // Add Product to Wishlist
  const addToWishlist = useCallback(
    async (productId) => {
      if (!isCustomer) {
        throw new Error("Please sign in to save items to your wishlist");
      }

      setWishlistError(null);
      try {
        const res = await api.post(`/wishlist/${productId}`);
        if (res && res.wishlist) {
          setWishlist(res.wishlist);
        } else {
          await fetchWishlist();
        }
        return res;
      } catch (err) {
        const message = err.message || "Could not add product to wishlist";
        setWishlistError(message);
        throw err;
      }
    },
    [isCustomer, fetchWishlist]
  );

  // Remove Product from Wishlist
  const removeFromWishlist = useCallback(
    async (productId) => {
      if (!isCustomer) return;

      setWishlistError(null);
      try {
        const res = await api.delete(`/wishlist/${productId}`);
        if (res && res.wishlist) {
          setWishlist(res.wishlist);
        } else {
          await fetchWishlist();
        }
        return res;
      } catch (err) {
        const message = err.message || "Could not remove product from wishlist";
        setWishlistError(message);
        throw err;
      }
    },
    [isCustomer, fetchWishlist]
  );

  // Check if product is in Wishlist
  const isInWishlist = useCallback(
    (productId) => {
      if (!wishlist?.products || !productId) return false;
      return wishlist.products.some((p) => {
        const id = typeof p === "object" ? p._id : p;
        return id?.toString() === productId.toString();
      });
    },
    [wishlist]
  );

  // Add Item to Cart
  const addToCart = useCallback(
    async (productId, variantId, quantity = 1) => {
      if (!isCustomer) {
        throw new Error("Please sign in as a customer to add items to your cart");
      }

      if (!productId || !variantId) {
        throw new Error("Please select an available variant before adding to cart");
      }

      if (!quantity || quantity < 1) {
        throw new Error("Quantity must be at least 1");
      }

      setCartError(null);
      try {
        const res = await api.post("/cart", {
          productId,
          variantId,
          quantity: Number(quantity),
        });

        if (res && res.cart) {
          setCart(res.cart);
        } else {
          await fetchCart();
        }
        return res;
      } catch (err) {
        const message = err.message || "Could not add product to cart";
        setCartError(message);
        throw err;
      }
    },
    [isCustomer, fetchCart]
  );

  // Update Cart Item Quantity
  const updateCartItem = useCallback(
    async (itemId, quantity) => {
      if (!isCustomer) return;

      if (!quantity || quantity < 1) {
        throw new Error("Quantity must be at least 1");
      }

      setCartError(null);
      try {
        const res = await api.put(`/cart/items/${itemId}`, {
          quantity: Number(quantity),
        });

        if (res && res.cart) {
          setCart(res.cart);
        } else {
          await fetchCart();
        }
        return res;
      } catch (err) {
        const message = err.message || "Could not update cart quantity";
        setCartError(message);
        throw err;
      }
    },
    [isCustomer, fetchCart]
  );

  // Remove Item from Cart
  const removeCartItem = useCallback(
    async (itemId) => {
      if (!isCustomer) return;

      setCartError(null);
      try {
        const res = await api.delete(`/cart/items/${itemId}`);

        if (res && res.cart) {
          setCart(res.cart);
        } else {
          await fetchCart();
        }
        return res;
      } catch (err) {
        const message = err.message || "Could not remove item from cart";
        setCartError(message);
        throw err;
      }
    },
    [isCustomer, fetchCart]
  );

  // Clear all items from cart sequentially
  const clearCart = useCallback(async () => {
    if (!isCustomer || !cart?.items?.length) return;

    setCartLoading(true);
    setCartError(null);
    try {
      for (const item of cart.items) {
        if (item._id) {
          await api.delete(`/cart/items/${item._id}`);
        }
      }
      setCart({ items: [] });
    } catch (err) {
      console.error("Error clearing cart:", err);
      setCartError(err.message || "Could not completely clear cart");
      await fetchCart();
    } finally {
      setCartLoading(false);
    }
  }, [isCustomer, cart?.items, fetchCart]);

  // Derived counts and totals
  const wishlistCount = useMemo(() => {
    return Array.isArray(wishlist?.products) ? wishlist.products.length : 0;
  }, [wishlist?.products]);

  const cartCount = useMemo(() => {
    if (!Array.isArray(cart?.items)) return 0;
    return cart.items.reduce((total, item) => total + (item.quantity || 0), 0);
  }, [cart?.items]);

  const cartSubtotal = useMemo(() => {
    if (!Array.isArray(cart?.items)) return 0;
    return cart.items.reduce((total, item) => {
      const unitPrice =
        item.variantId?.price !== undefined
          ? item.variantId.price
          : item.productId?.basePrice || 0;
      const discount = item.productId?.discountPercentage || 0;
      const finalPrice = discount > 0 ? unitPrice * (1 - discount / 100) : unitPrice;
      return total + finalPrice * (item.quantity || 0);
    }, 0);
  }, [cart?.items]);

  const value = {
    wishlist,
    wishlistCount,
    wishlistLoading,
    wishlistError,
    fetchWishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    cart,
    cartCount,
    cartSubtotal,
    cartLoading,
    cartError,
    fetchCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}
