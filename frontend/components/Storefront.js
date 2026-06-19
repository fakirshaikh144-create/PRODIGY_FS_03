"use client";

import { useEffect, useMemo, useState } from "react";

const initialForm = {
  customerName: "",
  phone: "",
  address: ""
};

export default function Storefront({ initialProducts = [], apiUrl }) {
  const [products, setProducts] = useState(initialProducts);
  const [isLoadingProducts, setIsLoadingProducts] = useState(initialProducts.length === 0);
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [productError, setProductError] = useState("");

  useEffect(() => {
    const storedCart = window.localStorage.getItem("mumbai-fresh-market-cart");
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setIsLoadingProducts(true);
      setProductError("");

      try {
        const response = await fetch(`${apiUrl}/api/products`, {
          cache: "no-store"
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load products.");
        }

        if (isMounted) {
          setProducts(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setProductError(loadError.message || "Unable to load products.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  useEffect(() => {
    window.localStorage.setItem("mumbai-fresh-market-cart", JSON.stringify(cart));
  }, [cart]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  function addToCart(product) {
    setSuccess("");
    setError("");
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.productId === product.id);
      if (existingItem) {
        return currentCart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, product.inventoryCount)
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1
        }
      ];
    });
  }

  function updateQuantity(productId, direction) {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.productId !== productId) {
            return item;
          }

          return {
            ...item,
            quantity: Math.max(item.quantity + direction, 0)
          };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  async function handleCheckout(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (cart.length === 0) {
      setError("Add at least one product to the cart before checkout.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Checkout failed.");
      }

      setSuccess(`Order #${data.orderId} placed successfully.`);
      setCart([]);
      setForm(initialForm);
      window.localStorage.removeItem("mumbai-fresh-market-cart");
    } catch (checkoutError) {
      setError(checkoutError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__inner">
          <section className="hero__copy">
            <span className="eyebrow">Local grocery storefront</span>
            <h1>Mumbai Fresh Market</h1>
            <p>
              Browse pantry staples, giftable treats, and home essentials from a
              neighborhood store with a simple online checkout flow.
            </p>
            <div className="hero__meta">
              <div className="hero__stat">
                <strong>{products.length}</strong>
                Curated products
              </div>
              <div className="hero__stat">
                <strong>{cartCount}</strong>
                Items in cart
              </div>
              <div className="hero__stat">
                <strong>Same day</strong>
                Local delivery
              </div>
            </div>
          </section>

          <aside className="hero__panel">
            <h2>What this site covers</h2>
            <p>
              Product listings, images, pricing, cart management, and order
              creation are all connected to a local MySQL database through an
              Express API.
            </p>
            <ul>
              <li>Next.js 15 frontend</li>
              <li>Express + MySQL backend</li>
              <li>Inventory-aware checkout</li>
            </ul>
          </aside>
        </div>
      </header>

      <main className="storefront">
        <section className="catalog">
          <h2 className="section-title">Shop the store</h2>
          <p className="section-copy">
            Each product comes from the local catalog stored in MySQL.
          </p>

          {isLoadingProducts ? <p className="cart__hint">Loading products...</p> : null}
          {productError ? <p className="error">{productError}</p> : null}
          {!isLoadingProducts && !productError && products.length === 0 ? (
            <p className="cart__hint">No products found in the catalog.</p>
          ) : null}

          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <img
                  src={`${apiUrl}${product.imageUrl}`}
                  alt={product.name}
                />
                <div className="product-card__body">
                  <span className="badge">{product.category}</span>
                  <div className="product-card__row">
                    <h3>{product.name}</h3>
                    <strong className="price">INR {Number(product.price).toFixed(2)}</strong>
                  </div>
                  <p>{product.description}</p>
                  <div className="price-row">
                    <span className="stock">{product.inventoryCount} in stock</span>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => addToCart(product)}
                      disabled={product.inventoryCount < 1}
                    >
                      Add to cart
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="cart">
          <h2 className="section-title">Your cart</h2>
          <p className="cart__hint">Review items and submit the order to the store.</p>

          {cart.length === 0 ? (
            <p className="cart__empty">Your cart is empty.</p>
          ) : (
            <div className="cart__list">
              {cart.map((item) => (
                <div className="cart__item" key={item.productId}>
                  <h4>{item.name}</h4>
                  <p>
                    INR {item.price.toFixed(2)} x {item.quantity}
                  </p>
                  <div className="cart__actions">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => updateQuantity(item.productId, -1)}
                    >
                      Remove one
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => updateQuantity(item.productId, 1)}
                    >
                      Add one
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="cart__summary">
            <strong>Total</strong>
            <strong>INR {totalPrice.toFixed(2)}</strong>
          </div>

          <form className="checkout-form" onSubmit={handleCheckout}>
            <label>
              Full name
              <input
                required
                value={form.customerName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customerName: event.target.value }))
                }
                placeholder="Customer name"
              />
            </label>

            <label>
              Phone number
              <input
                required
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="+91 98765 43210"
              />
            </label>

            <label>
              Delivery address
              <textarea
                required
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
                placeholder="Street, building, and delivery notes"
              />
            </label>

            {error ? <p className="error">{error}</p> : null}
            {success ? <p className="success">{success}</p> : null}

            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? "Placing order..." : "Place order"}
            </button>
          </form>
        </aside>
      </main>
    </div>
  );
}
