const dataUrl = 'https://raw.githubusercontent.com/lomsadze123/audiophile-ecommerce-website/refs/heads/master/public/data.json';
const assetBase = 'https://raw.githubusercontent.com/lomsadze123/audiophile-ecommerce-website/refs/heads/master/public';
const cartKey = 'audiophile_cart';
const cacheKey = 'audiophile_products_cache';

function img(path) {
  if (!path) return '';
  return path.replace('./assets', assetBase + '/assets');
}

async function getProducts() {
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error('ვერ ჩაიტვირთა მონაცემები (სტატუსი ' + res.status + ')');
  const data = await res.json();
  sessionStorage.setItem(cacheKey, JSON.stringify(data));
  return data;
}

async function getProductBySlug(slug) {
  const data = await getProducts();
  return data.find(p => p.slug === slug) || null;
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(cartKey)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(cartKey, JSON.stringify(items));
  updateCartBadge();
}

function addToCart(product, qty) {
  const items = getCart();
  const found = items.find(i => i.slug === product.slug);
  if (found) {
    found.qty += qty;
  } else {
    items.push({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: img(product.image.desktop),
      qty: qty
    });
  }
  saveCart(items);
}

function removeFromCart(slug) {
  saveCart(getCart().filter(i => i.slug !== slug));
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

function money(n) {
  return n.toLocaleString('en-US') + ' ₾';
}

function updateCartBadge() {
  const badges = document.querySelectorAll('[data-cart-count]');
  const count = cartCount();
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
}

const categoryLabels = {
  headphones: 'ყურსასმენები',
  speakers: 'დინამიკები',
  earphones: 'ჩასაყრელები'
};

function getCategoryFromUrl() {
  const params = new URLSearchParams(location.search);
  const cat = params.get('cat');
  return categoryLabels[cat] ? cat : 'headphones';
}

function markActiveCategory(cat) {
  document.querySelectorAll('#category-nav a').forEach(a => {
    a.classList.toggle('is-active', a.dataset.cat === cat);
  });
}

function buildProductRow(p) {
  const row = document.createElement('article');
  row.className = 'product-row';
  row.innerHTML =
    '<div class="product-media"><img src="' + img(p.categoryImage.desktop) + '" alt="' + p.name + '" /></div>' +
    '<div class="product-copy">' +
    (p.new ? '<span class="badge">ახალი პროდუქტი</span>' : '') +
    '<h2>' + p.name + '</h2>' +
    '<p>' + p.description + '</p>' +
    '<div class="price">' + money(p.price) + '</div>' +
    '<a href="product.html?slug=' + encodeURIComponent(p.slug) + '" class="btn" style="margin-top:24px;display:inline-block;">იხილეთ პროდუქტი</a>' +
    '</div>';
  return row;
}

async function initCategoryPage() {
  const cat = getCategoryFromUrl();
  document.getElementById('category-title').textContent = categoryLabels[cat];
  markActiveCategory(cat);

  const list = document.getElementById('product-list');
  try {
    const products = await getProducts();
    const filtered = products.filter(p => p.category === cat);
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<p class="state-msg">ამ კატეგორიაში პროდუქტები ვერ მოიძებნა.</p>';
      return;
    }
    filtered.forEach(p => list.appendChild(buildProductRow(p)));
  } catch (err) {
    list.innerHTML = '<p class="state-msg">მონაცემების ჩატვირთვა ვერ მოხერხდა: ' + err.message + '</p>';
  }
}

let qty = 1;

function getSlugFromUrl() {
  return new URLSearchParams(location.search).get('slug');
}

function renderProductDetail(p) {
  const el = document.getElementById('product-detail');
  el.innerHTML =
    '<div class="product-detail">' +
    '<img src="' + img(p.image.desktop) + '" alt="' + p.name + '" />' +
    '<div>' +
    (p.new ? '<span class="badge">ახალი პროდუქტი</span>' : '') +
    '<h1>' + p.name + '</h1>' +
    '<p class="desc">' + p.description + '</p>' +
    '<div class="price">' + money(p.price) + '</div>' +
    '<div class="qty-cart">' +
    '<div class="qty-control">' +
    '<button type="button" id="qty-minus" aria-label="რაოდენობის შემცირება">-</button>' +
    '<span id="qty-value">1</span>' +
    '<button type="button" id="qty-plus" aria-label="რაოდენობის გაზრდა">+</button>' +
    '</div>' +
    '<button type="button" id="add-to-cart" class="btn">კალათაში დამატება</button>' +
    '</div></div></div>';

  qty = 1;
  document.getElementById('qty-minus').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    document.getElementById('qty-value').textContent = qty;
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    qty = Math.min(99, qty + 1);
    document.getElementById('qty-value').textContent = qty;
  });
  document.getElementById('add-to-cart').addEventListener('click', e => {
    addToCart(p, qty);
    const btn = e.currentTarget;
    const old = btn.textContent;
    btn.textContent = 'დამატებულია ✓';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = old;
      btn.disabled = false;
    }, 1200);
  });
}

function renderFeaturesAndIncludes(p) {
  const includes = p.includes.map(i =>
    '<li><span class="qty">' + i.quantity + 'x</span><span class="item">' + i.item + '</span></li>'
  ).join('');
  return (
    '<section class="features-includes">' +
    '<div class="features"><h2>მახასიათებლები</h2><p>' + p.features + '</p></div>' +
    '<div class="includes"><h2>კომპლექტში შედის</h2><ul class="includes-list">' + includes + '</ul></div>' +
    '</section>'
  );
}

function renderGallery(p) {
  return (
    '<section class="gallery-block"><div class="gallery-grid">' +
    '<img src="' + img(p.gallery.first.desktop) + '" alt="" />' +
    '<img src="' + img(p.gallery.second.desktop) + '" alt="" />' +
    '<img class="gallery-hero" src="' + img(p.gallery.third.desktop) + '" alt="' + p.name + ' გალერეა" />' +
    '</div></section>'
  );
}

function renderAlsoLike(p) {
  const cards = (p.others || []).map(o =>
    '<div><img src="' + img(o.image.desktop) + '" alt="' + o.name + '" /><h3>' + o.name + '</h3>' +
    '<a href="product.html?slug=' + encodeURIComponent(o.slug) + '" class="btn">იხილეთ პროდუქტი</a></div>'
  ).join('');
  return (
    '<section class="also-like"><h2 style="text-align:center;">შესაძლოა ასევე მოგეწონოთ</h2>' +
    '<div class="also-like-grid">' + cards + '</div></section>'
  );
}

async function initProductPage() {
  const slug = getSlugFromUrl();
  const detail = document.getElementById('product-detail');
  const sections = document.getElementById('detail-sections');

  if (!slug) {
    detail.innerHTML = '<p class="state-msg">პროდუქტი ვერ მოიძებნა.</p>';
    return;
  }

  try {
    const product = await getProductBySlug(slug);
    if (!product) {
      detail.innerHTML = '<p class="state-msg">პროდუქტი ვერ მოიძებნა.</p>';
      return;
    }
    document.title = product.name + ' — Audiophile';
    renderProductDetail(product);
    sections.innerHTML = renderFeaturesAndIncludes(product) + renderGallery(product) + renderAlsoLike(product);
  } catch (err) {
    detail.innerHTML = '<p class="state-msg">მონაცემების ჩატვირთვა ვერ მოხერხდა: ' + err.message + '</p>';
  }
}

const shippingFee = 50;
const vatRate = 0.2;

function renderCartSummary() {
  const items = getCart();
  const itemsEl = document.getElementById('cart-items');
  const linesEl = document.getElementById('cart-summary-lines');
  const submitBtn = document.querySelector('#checkout-form button[type="submit"]');

  if (!items.length) {
    itemsEl.innerHTML = '<p class="empty-cart">კალათა ცარიელია — დაამატეთ პროდუქტი შესყიდვამდე.</p>';
    linesEl.innerHTML = '';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }
  if (submitBtn) submitBtn.disabled = false;

  itemsEl.innerHTML = items.map(item =>
    '<div class="cart-item"><img src="' + item.image + '" alt="' + item.name + '" />' +
    '<div class="info"><div class="name">' + item.name + '</div><div class="price">' + money(item.price) + '</div></div>' +
    '<span class="qty">x' + item.qty + '</span>' +
    '<button type="button" class="remove-btn" data-remove="' + item.slug + '">წაშლა</button></div>'
  ).join('');

  itemsEl.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.remove);
      renderCartSummary();
    });
  });

  const subtotal = cartTotal();
  const vat = Math.round(subtotal * vatRate);
  const total = subtotal + shippingFee;

  linesEl.innerHTML =
    '<div class="summary-line"><span>ჯამი</span><span>' + money(subtotal) + '</span></div>' +
    '<div class="summary-line"><span>მიწოდება</span><span>' + money(shippingFee) + '</span></div>' +
    '<div class="summary-line"><span>დღგ (ჩათვლილი)</span><span>' + money(vat) + '</span></div>' +
    '<div class="summary-line total"><span>სულ ჯამი</span><span>' + money(total) + '</span></div>';
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
  radios.forEach(r => r.addEventListener('change', update));
  update();
}

function markInvalid(id, bad) {
  document.getElementById(id).closest('.form-field').classList.toggle('invalid', bad);
}

function validateForm() {
  let ok = true;
  const val = id => document.getElementById(id).value.trim();

  ['fullname', 'address', 'city', 'zip', 'country'].forEach(id => {
    const good = val(id).length > 0;
    markInvalid(id, !good);
    if (!good) ok = false;
  });

  const emailGood = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'));
  markInvalid('email', !emailGood);
  if (!emailGood) ok = false;

  const phoneGood = /^[+]?[\d\s-]{7,}$/.test(val('phone'));
  markInvalid('phone', !phoneGood);
  if (!phoneGood) ok = false;

  const isEmoney = document.getElementById('pay-emoney').checked;
  if (isEmoney) {
    const numGood = /^\d{9}$/.test(val('emoney-number'));
    const pinGood = /^\d{4}$/.test(val('emoney-pin'));
    markInvalid('emoney-number', !numGood);
    markInvalid('emoney-pin', !pinGood);
    if (!numGood) ok = false;
    if (!pinGood) ok = false;
  } else {
    markInvalid('emoney-number', false);
    markInvalid('emoney-pin', false);
  }

  return ok;
}

function showConfirmation() {
  const items = getCart();
  const modalItems = document.getElementById('modal-cart-items');
  const total = cartTotal() + shippingFee;
  const preview = items.slice(0, 2);
  const extra = items.length - preview.length;

  modalItems.innerHTML = preview.map(item =>
    '<div class="cart-item"><img src="' + item.image + '" alt="' + item.name + '" />' +
    '<div class="info"><div class="name">' + item.name + '</div><div class="price">' + money(item.price) + '</div></div>' +
    '<span class="qty">x' + item.qty + '</span></div>'
  ).join('') + (extra > 0 ? '<div class="cart-item"><span class="name">+ კიდევ ' + extra + ' პროდუქტი</span></div>' : '');

  document.getElementById('modal-total').textContent = money(total);
  document.getElementById('confirm-modal').classList.add('is-open');
}

function initCheckoutForm() {
  const form = document.getElementById('checkout-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!getCart().length) return;
    if (!validateForm()) {
      const bad = form.querySelector('.form-field.invalid input');
      if (bad) bad.focus();
      return;
    }
    showConfirmation();
    clearCart();
    form.reset();
    renderCartSummary();
    initPaymentToggle();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  updateCartBadge();

  if (document.getElementById('category-title')) initCategoryPage();
  if (document.getElementById('product-detail')) initProductPage();
  if (document.getElementById('checkout-form')) {
    renderCartSummary();
    initPaymentToggle();
    initCheckoutForm();
  }
});
