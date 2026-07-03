const DATA_URL =
  'https://raw.githubusercontent.com/lomsadze123/audiophile-ecommerce-website/refs/heads/master/public/data.json';

const CART_KEY = 'audiophile_cart';
const CACHE_KEY = 'audiophile_products_cache';

function productImage(slug, w = 600, h = 600) {
  return `https://picsum.photos/seed/${encodeURIComponent(slug)}/${w}/${h}`;
}

async function getProducts() {
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
    }
  }
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`ვერ ჩაიტვირთა მონაცემები (სტატუსი ${response.status})`);
  }
  const products = await response.json();
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(products));
  return products;
}

async function getProductBySlug(slug) {
  const products = await getProducts();
  return products.find((p) => p.slug === slug) || null;
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product, qty) {
  const cart = getCart();
  const existing = cart.find((i) => i.slug === product.slug);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: productImage(product.slug, 120, 120),
      qty,
    });
  }
  saveCart(cart);
}

function removeFromCart(slug) {
  saveCart(getCart().filter((i) => i.slug !== slug));
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
}

function formatPrice(n) {
  return `${n.toLocaleString('en-US')} ₾`;
}

function updateCartBadge() {
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    const count = cartCount();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}


const CATEGORY_LABELS = {
  headphones: 'ყურსასმენები',
  speakers: 'დინამიკები',
  earphones: 'ჩასაყრელები',
};

function getCategoryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  return CATEGORY_LABELS[cat] ? cat : 'headphones';
}

function renderCategoryNav(activeCat) {
  document.querySelectorAll('#category-nav a').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.cat === activeCat);
  });
}

function renderProductRow(product) {
  const row = document.createElement('article');
  row.className = 'product-row';
  row.innerHTML = `
    <div class="product-media">
      <img src="${productImage(product.slug, 600, 450)}" alt="${product.name}" />
    </div>
    <div class="product-copy">
      ${product.new ? '<span class="badge">ახალი პროდუქტი</span>' : ''}
      <h2>${product.name}</h2>
      <p>${product.description}</p>
      <div class="price">${formatPrice(product.price)}</div>
      <a href="product.html?slug=${encodeURIComponent(product.slug)}" class="btn" style="margin-top:24px;display:inline-block;">
        იხილეთ პროდუქტი
      </a>
    </div>
  `;
  return row;
}

async function initCategoryPage() {
  const cat = getCategoryFromUrl();
  document.getElementById('category-title').textContent = CATEGORY_LABELS[cat];
  renderCategoryNav(cat);

  const listEl = document.getElementById('product-list');

  try {
    const products = await getProducts();
    const filtered = products.filter((p) => p.category === cat);

    listEl.innerHTML = '';
    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="state-msg">ამ კატეგორიაში პროდუქტები ვერ მოიძებნა.</p>';
      return;
    }
    filtered.forEach((product) => listEl.appendChild(renderProductRow(product)));
  } catch (err) {
    listEl.innerHTML = `<p class="state-msg">მონაცემების ჩატვირთვა ვერ მოხერხდა: ${err.message}</p>`;
  }
}


let currentQty = 1;

function getSlugFromUrl() {
  return new URLSearchParams(window.location.search).get('slug');
}

function renderProductDetail(product) {
  const el = document.getElementById('product-detail');
  el.innerHTML = `
    <div class="product-detail">
      <img src="${productImage(product.slug, 600, 600)}" alt="${product.name}" />
      <div>
        ${product.new ? '<span class="badge">ახალი პროდუქტი</span>' : ''}
        <h1>${product.name}</h1>
        <p class="desc">${product.description}</p>
        <div class="price">${formatPrice(product.price)}</div>
        <div class="qty-cart">
          <div class="qty-control">
            <button type="button" id="qty-minus" aria-label="რაოდენობის შემცირება">-</button>
            <span id="qty-value">1</span>
            <button type="button" id="qty-plus" aria-label="რაოდენობის გაზრდა">+</button>
          </div>
          <button type="button" id="add-to-cart" class="btn">კალათაში დამატება</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('qty-minus').addEventListener('click', () => {
    currentQty = Math.max(1, currentQty - 1);
    document.getElementById('qty-value').textContent = currentQty;
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    currentQty = Math.min(99, currentQty + 1);
    document.getElementById('qty-value').textContent = currentQty;
  });
  document.getElementById('add-to-cart').addEventListener('click', (e) => {
    addToCart(product, currentQty);
    const btn = e.currentTarget;
    const originalText = btn.textContent;
    btn.textContent = 'დამატებულია ✓';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1200);
  });
}

function renderIncludesFeatures(product) {
  const includesHtml = product.includes
    .map(
      (i) => `
      <li><span class="qty">${i.quantity}x</span><span class="item">${i.item}</span></li>
    `
    )
    .join('');

  return `
    <section class="features-includes">
      <div class="features">
        <h2>მახასიათებლები</h2>
        <p>${product.features}</p>
      </div>
      <div class="includes">
        <h2>კომპლექტში შედის</h2>
        <ul class="includes-list">${includesHtml}</ul>
      </div>
    </section>
  `;
}

function renderGallery(product) {
  return `
    <section class="gallery-block">
      <div class="gallery-grid">
        <img src="${productImage(product.slug + '-g1', 300, 280)}" alt="" />
        <img src="${productImage(product.slug + '-g2', 300, 280)}" alt="" />
        <img class="gallery-hero" src="${productImage(product.slug + '-g3', 500, 590)}" alt="${product.name} გალერეა" />
      </div>
    </section>
  `;
}

function renderAlsoLike(product) {
  const items = (product.others || [])
    .map(
      (o) => `
      <div>
        <img src="${productImage(o.slug, 350, 260)}" alt="${o.name}" />
        <h3>${o.name}</h3>
        <a href="product.html?slug=${encodeURIComponent(o.slug)}" class="btn">იხილეთ პროდუქტი</a>
      </div>
    `
    )
    .join('');

  return `
    <section class="also-like">
      <h2 style="text-align:center;">შესაძლოა ასევე მოგეწონოთ</h2>
      <div class="also-like-grid">${items}</div>
    </section>
  `;
}

async function initProductPage() {
  const slug = getSlugFromUrl();
  const detailEl = document.getElementById('product-detail');
  const sectionsEl = document.getElementById('detail-sections');

  if (!slug) {
    detailEl.innerHTML = '<p class="state-msg">პროდუქტი ვერ მოიძებნა.</p>';
    return;
  }

  try {
    const product = await getProductBySlug(slug);
    if (!product) {
      detailEl.innerHTML = '<p class="state-msg">პროდუქტი ვერ მოიძებნა.</p>';
      return;
    }
    document.title = `${product.name} — Audiophile`;
    renderProductDetail(product);
    sectionsEl.innerHTML =
      renderIncludesFeatures(product) + renderGallery(product) + renderAlsoLike(product);
  } catch (err) {
    detailEl.innerHTML = `<p class="state-msg">მონაცემების ჩატვირთვა ვერ მოხერხდა: ${err.message}</p>`;
  }
}


const SHIPPING_FEE = 50;
const VAT_RATE = 0.2;

function renderCartSummary() {
  const cart = getCart();
  const itemsEl = document.getElementById('cart-items');
  const linesEl = document.getElementById('cart-summary-lines');
  const submitBtn = document.querySelector('#checkout-form button[type="submit"]');

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="empty-cart">კალათა ცარიელია — დაამატეთ პროდუქტი შესყიდვამდე.</p>';
    linesEl.innerHTML = '';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }
  if (submitBtn) submitBtn.disabled = false;

  itemsEl.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" />
        <div class="info">
          <div class="name">${item.name}</div>
          <div class="price">${formatPrice(item.price)}</div>
        </div>
        <span class="qty">x${item.qty}</span>
        <button type="button" class="remove-btn" data-remove="${item.slug}">წაშლა</button>
      </div>
    `
    )
    .join('');

  itemsEl.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.remove);
      renderCartSummary();
    });
  });

  const subtotal = cartTotal();
  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + SHIPPING_FEE;

  linesEl.innerHTML = `
    <div class="summary-line"><span>ჯამი</span><span>${formatPrice(subtotal)}</span></div>
    <div class="summary-line"><span>მიწოდება</span><span>${formatPrice(SHIPPING_FEE)}</span></div>
    <div class="summary-line"><span>დღგ (ჩათვლილი)</span><span>${formatPrice(vat)}</span></div>
    <div class="summary-line total"><span>სულ ჯამი</span><span>${formatPrice(total)}</span></div>
  `;
}

function initPaymentToggle() {
  const emoneyFields = document.getElementById('emoney-fields');
  const cashNote = document.getElementById('cash-note');
  const radios = document.querySelectorAll('input[name="payment"]');

  function update() {
    const isEmoney = document.getElementById('pay-emoney').checked;
    emoneyFields.style.display = isEmoney ? 'grid' : 'none';
    cashNote.style.display = isEmoney ? 'none' : 'flex';
  }
  radios.forEach((r) => r.addEventListener('change', update));
  update();
}

function setFieldError(id, hasError) {
  const field = document.getElementById(id).closest('.form-field');
  field.classList.toggle('invalid', hasError);
}

function validateForm() {
  let valid = true;
  const val = (id) => document.getElementById(id).value.trim();

  const requiredTextFields = ['fullname', 'address', 'city', 'zip', 'country'];
  requiredTextFields.forEach((id) => {
    const ok = val(id).length > 0;
    setFieldError(id, !ok);
    if (!ok) valid = false;
  });

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'));
  setFieldError('email', !emailOk);
  if (!emailOk) valid = false;

  const phoneOk = /^[+]?[\d\s-]{7,}$/.test(val('phone'));
  setFieldError('phone', !phoneOk);
  if (!phoneOk) valid = false;

  const isEmoney = document.getElementById('pay-emoney').checked;
  if (isEmoney) {
    const numOk = /^\d{9}$/.test(val('emoney-number'));
    const pinOk = /^\d{4}$/.test(val('emoney-pin'));
    setFieldError('emoney-number', !numOk);
    setFieldError('emoney-pin', !pinOk);
    if (!numOk) valid = false;
    if (!pinOk) valid = false;
  } else {
    setFieldError('emoney-number', false);
    setFieldError('emoney-pin', false);
  }

  return valid;
}

function showConfirmationModal() {
  const cart = getCart();
  const modalItemsEl = document.getElementById('modal-cart-items');
  const total = cartTotal() + SHIPPING_FEE;

  const preview = cart.slice(0, 2);
  const extra = cart.length - preview.length;

  modalItemsEl.innerHTML =
    preview
      .map(
        (item) => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" />
        <div class="info">
          <div class="name">${item.name}</div>
          <div class="price">${formatPrice(item.price)}</div>
        </div>
        <span class="qty">x${item.qty}</span>
      </div>
    `
      )
      .join('') +
    (extra > 0 ? `<div class="cart-item"><span class="name">+ კიდევ ${extra} პროდუქტი</span></div>` : '');

  document.getElementById('modal-total').textContent = formatPrice(total);
  document.getElementById('confirm-modal').classList.add('is-open');
}

function initCheckoutForm() {
  const form = document.getElementById('checkout-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (getCart().length === 0) return;
    if (!validateForm()) {
      const firstInvalid = form.querySelector('.form-field.invalid input');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    showConfirmationModal();
    clearCart();
    form.reset();
    renderCartSummary();
    initPaymentToggle();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  updateCartBadge();

  if (document.getElementById('category-title')) {
    initCategoryPage();
  }

  if (document.getElementById('product-detail')) {
    initProductPage();
  }

  if (document.getElementById('checkout-form')) {
    renderCartSummary();
    initPaymentToggle();
    initCheckoutForm();
  }
});