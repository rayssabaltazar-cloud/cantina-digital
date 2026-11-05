/* Fila Inteligente da Cantina - versão demonstrativa (dados fictícios, localStorage) */
const $ = s => document.querySelector(s);
const KEY = {prod:'fic_products', ord:'fic_orders', ses:'fic_session', cart:'fic_cart', seq:'fic_seq', last:'fic_last'};
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const money = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATS = ['Lanches', 'Salgados', 'Bebidas', 'Doces'];
const STEPS = ['Aguardando', 'Em preparo', 'Pronto', 'Concluído'];
const CLS = {'Aguardando':'wait','Em preparo':'prep','Pronto':'ready','Concluído':'done','Cancelado':'canc'};
const badge = s => `<span class="badge ${CLS[s]}">${s}</span>`;
const isQueue = s => s === 'Aguardando' || s === 'Em preparo';
const isOpen = s => !['Concluído', 'Cancelado'].includes(s);

/* ---------- Dados iniciais (só na primeira visita) ---------- */
const SEED_PRODUCTS = [
  {id:1, name:'X-Salada', desc:'Pão, hambúrguer, queijo, alface e tomate.', cat:'Lanches', price:12, emoji:'🍔', active:true},
  {id:2, name:'Sanduíche natural', desc:'Frango desfiado, cenoura e requeijão.', cat:'Lanches', price:9.5, emoji:'🥪', active:true},
  {id:3, name:'Coxinha', desc:'Massa crocante recheada com frango.', cat:'Salgados', price:6, emoji:'🍗', active:true},
  {id:4, name:'Pão de queijo', desc:'Quentinho, porção com 3 unidades.', cat:'Salgados', price:5, emoji:'🧀', active:true},
  {id:5, name:'Suco natural', desc:'Laranja ou maracujá, 300 ml.', cat:'Bebidas', price:7, emoji:'🥤', active:true},
  {id:6, name:'Refrigerante', desc:'Lata de 350 ml gelada.', cat:'Bebidas', price:5.5, emoji:'🥫', active:true},
  {id:7, name:'Brigadeiro', desc:'Doce de chocolate com granulado.', cat:'Doces', price:3, emoji:'🍫', active:true},
  {id:8, name:'Bolo de chocolate', desc:'Fatia com cobertura cremosa.', cat:'Doces', price:6.5, emoji:'🍰', active:true}
];
const day = h => new Date(Date.now() - h * 3600e3).toISOString();
const SEED_ORDERS = [
  {id:1001, student:'Ana', items:[{id:1, name:'X-Salada', price:12, qty:1}], total:12, pay:'Pix demonstrativo', status:'Concluído', date:day(26)},
  {id:1002, student:'Bruno', items:[{id:3, name:'Coxinha', price:6, qty:2}], total:12, pay:'Dinheiro na retirada', status:'Em preparo', date:day(1)},
  {id:1003, student:'Carla', items:[{id:5, name:'Suco natural', price:7, qty:1}, {id:7, name:'Brigadeiro', price:3, qty:2}], total:13, pay:'Cartão na retirada', status:'Aguardando', date:day(.5)},
  {id:1004, student:'Diego', items:[{id:6, name:'Refrigerante', price:5.5, qty:1}], total:5.5, pay:'Pix demonstrativo', status:'Cancelado', date:day(3)}
];
if (!localStorage.getItem(KEY.prod)) save(KEY.prod, SEED_PRODUCTS);
if (!localStorage.getItem(KEY.ord)) { save(KEY.ord, SEED_ORDERS); save(KEY.seq, 1005); }

/* ---------- Estado ---------- */
let products = load(KEY.prod, []), orders = load(KEY.ord, []), cart = load(KEY.cart, []);
let session = load(KEY.ses, null);
let view = 'home', catFilter = 'Todos', term = '', payChoice = '', loginRole = 'aluno';
const MENUS = {
  aluno: [['home','Início'], ['menu','Cardápio'], ['cart','Carrinho'], ['track','Fila'], ['history','Histórico']],
  admin: [['dash','Dashboard'], ['orders','Pedidos'], ['products','Produtos'], ['admhist','Histórico']]
};

/* ---------- Utilidades ---------- */
function toast(msg, bad) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.className = '', 2800);
}
const mine = () => orders.filter(o => o.student.toLowerCase() === session.name.toLowerCase());
const activeOrder = () => mine().filter(o => isOpen(o.status)).pop();
const cartCount = () => cart.reduce((n, c) => n + c.qty, 0);
// Posição na fila: pedidos "Aguardando"/"Em preparo" com número menor. Cancelados não contam.
const position = o => isQueue(o.status) ? orders.filter(x => isQueue(x.status) && x.id < o.id).length + 1 : 0;
const fmtDate = d => new Date(d).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'});
const itemsText = o => o.items.map(i => `${i.qty}x ${esc(i.name)}`).join(', ');
const cartLines = () => cart.map(c => ({...c, p: products.find(p => p.id === c.id)})).filter(c => c.p && c.p.active);
const cartTotal = () => cartLines().reduce((s, c) => s + c.p.price * c.qty, 0);
const saveOrders = () => save(KEY.ord, orders);

/* ---------- Login / sessão ---------- */
function showLogin() {
  $('#login').hidden = false; $('#app').hidden = true;
}
function startApp() {
  $('#login').hidden = true; $('#app').hidden = false;
  $('#who').textContent = (session.role === 'admin' ? 'Admin: ' : 'Aluno: ') + session.name;
  view = MENUS[session.role][0][0]; render();
}
$('#loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#uName').value.trim(), pass = $('#uPass').value;
  const need = loginRole === 'admin' ? 'admin123' : '123';
  if (!name) return $('#loginErr').textContent = 'Informe seu nome.';
  if (pass !== need) return $('#loginErr').textContent = 'Senha incorreta. Use a senha demonstrativa indicada abaixo.';
  session = {role: loginRole, name}; save(KEY.ses, session);
  $('#loginErr').textContent = ''; $('#uPass').value = ''; startApp();
});

/* ---------- Telas ---------- */
const VIEWS = {
  home() {
    const o = activeOrder(), n = mine().filter(x => x.status !== 'Cancelado').length;
    return `<div class="banner"><h2>Olá, ${esc(session.name)}! 👋</h2><p><b>Seu lanche, sem filas e sem complicação!</b><br>
      A cantina da escola agora organiza os pedidos por fila digital: peça, acompanhe e retire quando estiver pronto.</p>
      <button class="btn green" data-act="nav" data-v="menu">Ver cardápio</button></div>
      <div class="grid"><div class="card stat"><b>${n}</b>Pedidos realizados</div>
      <div class="card"><h3>Pedido em andamento</h3>${o ? `<p>Pedido <b>#${o.id}</b> ${badge(o.status)}</p><p>${itemsText(o)}</p>
        <button class="btn sm" data-act="nav" data-v="track">Acompanhar fila</button>` : '<p class="empty">Nenhum pedido em andamento.</p>'}</div></div>`;
  },
  menu() {
    return `<h2>Cardápio</h2><div class="filters"><input id="search" type="search" placeholder="Pesquisar produto" aria-label="Pesquisar produto" value="${esc(term)}">
      ${['Todos', ...CATS].map(c => `<button class="chip ${c === catFilter ? 'on' : ''}" data-act="cat" data-v="${c}">${c}</button>`).join('')}</div>
      <div class="grid" id="grid"></div>`;
  },
  cart() {
    const L = cartLines();
    if (!L.length) return `<h2>Carrinho</h2><div class="card empty">Seu carrinho está vazio.<br><br><button class="btn" data-act="nav" data-v="menu">Escolher produtos</button></div>`;
    return `<h2>Carrinho</h2><div class="card">${L.map(c => `<div class="row"><span>${c.p.emoji} <b>${esc(c.p.name)}</b> <small>${money(c.p.price)}</small></span>
      <span class="qty"><button data-act="dec" data-id="${c.id}" aria-label="Diminuir">−</button><b>${c.qty}</b><button data-act="inc" data-id="${c.id}" aria-label="Aumentar">+</button>
      <button class="btn red sm" data-act="rm" data-id="${c.id}">Remover</button></span></div>`).join('')}
      <div class="row"><b>Total</b><b class="price">${money(cartTotal())}</b></div></div>
      <div class="card"><h3>Forma de pagamento (demonstrativa)</h3><div class="pay">
      ${['Dinheiro na retirada', 'Pix demonstrativo', 'Cartão na retirada'].map(p => `<label><input type="radio" name="pay" value="${p}" ${payChoice === p ? 'checked' : ''}> ${p}</label>`).join('')}</div>
      <p class="note">Nenhuma cobrança real é feita e nenhum dado financeiro é coletado.</p>
      <button class="btn green big" data-act="confirm">Confirmar pedido</button></div>`;
  },
  confirm() {
    const o = orders.find(x => x.id === load(KEY.last, 0));
    if (!o) return VIEWS.home();
    return `<div class="card"><h2>✅ Pedido recebido!</h2><p>Número do pedido: <b class="price">#${o.id}</b></p>
      ${o.items.map(i => `<div class="row"><span>${i.qty}x ${esc(i.name)}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}
      <div class="row"><b>Total</b><b>${money(o.total)}</b></div><p>Pagamento: ${esc(o.pay)}</p>
      <button class="btn green" data-act="nav" data-v="track">Acompanhar fila</button></div>`;
  },
  track() {
    const o = activeOrder() || mine().pop();
    if (!o) return `<h2>Fila</h2><div class="card empty">Você ainda não fez pedidos.</div>`;
    const idx = STEPS.indexOf(o.status), pos = position(o);
    const state = o.status === 'Cancelado' ? '<p>Este pedido foi cancelado e não ocupa lugar na fila.</p>'
      : `<div class="bar"><i style="width:${idx / 3 * 100}%"></i></div><div class="steps">${STEPS.map((s, i) => `<span class="${i <= idx ? 'on' : ''}">${i <= idx ? '●' : '○'}<br>${s}</span>`).join('')}</div>`;
    return `<h2>Acompanhamento da fila</h2><div class="card"><p>Pedido <b>#${o.id}</b> ${badge(o.status)}</p>
      ${pos ? `<div class="pos">${pos}º</div><p class="empty">posição na fila</p>` : o.status === 'Pronto' ? '<p class="note">🎉 Seu pedido está pronto! Retire no balcão.</p>' : ''}
      ${state}<p>${itemsText(o)}</p></div><p class="hint">A tela atualiza sozinha quando o administrador muda o status (mesmo navegador).</p>`;
  },
  history() {
    const L = mine().slice().reverse();
    return `<h2>Meus pedidos</h2>` + (L.length ? L.map(o => `<div class="card"><div class="row"><b>#${o.id}</b><span>${fmtDate(o.date)}</span>${badge(o.status)}</div>
      <p>${itemsText(o)}</p><b>${money(o.total)}</b> · ${esc(o.pay)}</div>`).join('') : '<div class="card empty">Nenhum pedido ainda.</div>');
  },
  dash() {
    const c = s => orders.filter(o => o.status === s).length;
    const sales = orders.filter(o => o.status === 'Concluído').reduce((s, o) => s + o.total, 0);
    const stats = [['Total de pedidos', orders.length], ['Pedidos ativos', orders.filter(o => isOpen(o.status)).length], ['Em preparo', c('Em preparo')],
      ['Prontos', c('Pronto')], ['Concluídos', c('Concluído')], ['Vendas demonstrativas', money(sales)]];
    const rows = [...STEPS, 'Cancelado'], max = Math.max(1, ...rows.map(c));
    return `<h2>Dashboard</h2><div class="grid">${stats.map(s => `<div class="card stat"><b>${s[1]}</b>${s[0]}</div>`).join('')}</div>
      <div class="card"><h3>Pedidos por status</h3>${rows.map(s => `<div class="chart"><span>${s}</span><i style="width:${c(s) / max * 100}%"></i><b>${c(s)}</b></div>`).join('')}</div>`;
  },
  orders() {
    const L = orders.slice().reverse();
    return `<h2>Gerenciamento de pedidos</h2>` + (L.length ? L.map(o => {
      const acts = {'Aguardando':[['Em preparo','Marcar em preparo']], 'Em preparo':[['Pronto','Marcar pronto']], 'Pronto':[['Concluído','Finalizar']]}[o.status] || [];
      return `<div class="card"><div class="row"><b>#${o.id} · ${esc(o.student)}</b><span>${fmtDate(o.date)}</span>${badge(o.status)}</div>
        <p>${itemsText(o)}</p><p><b>${money(o.total)}</b> · ${esc(o.pay)}</p>
        ${isOpen(o.status) ? acts.map(a => `<button class="btn green sm" data-act="status" data-id="${o.id}" data-v="${a[0]}">${a[1]}</button> `).join('') +
        `<button class="btn red sm" data-act="status" data-id="${o.id}" data-v="Cancelado">Cancelar</button>` : ''}</div>`;
    }).join('') : '<div class="card empty">Nenhum pedido.</div>');
  },
  products() {
    return `<h2>Gerenciamento de produtos</h2><form id="prodForm" class="card form" novalidate>
      <div><label for="pn">Nome</label><input id="pn"></div><div><label for="pd">Descrição</label><input id="pd"></div>
      <div><label for="pp">Preço (R$)</label><input id="pp" type="number" step="0.01" min="0.01"></div>
      <div><label for="pc">Categoria</label><select id="pc">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
      <div><label for="pe">Emoji</label><input id="pe" value="🍽️" maxlength="4"></div><button class="btn green" type="submit">Cadastrar produto</button></form>
      <div class="card">${products.map(p => `<div class="row"><span>${p.emoji} <b>${esc(p.name)}</b> <span class="tag">${p.cat}</span> ${money(p.price)}</span>
      <span><button class="btn ghost sm" data-act="toggle" data-id="${p.id}">${p.active ? 'Desativar' : 'Ativar'}</button>
      <button class="btn red sm" data-act="del" data-id="${p.id}">Excluir</button></span></div>`).join('') || '<p class="empty">Nenhum produto.</p>'}</div>`;
  },
  admhist() {
    const done = orders.filter(o => o.status === 'Concluído'), canc = orders.filter(o => o.status === 'Cancelado');
    const sum = l => l.reduce((s, o) => s + o.total, 0);
    const list = l => l.length ? l.map(o => `<div class="row"><span><b>#${o.id}</b> ${esc(o.student)} · ${itemsText(o)}</span><span>${money(o.total)}</span></div>`).join('') : '<p class="empty">Nada por aqui.</p>';
    return `<h2>Histórico administrativo</h2><div class="grid"><div class="card stat"><b>${money(sum(done))}</b>Vendas concluídas (${done.length})</div>
      <div class="card stat"><b>${money(sum(canc))}</b>Valor cancelado (${canc.length})</div></div>
      <div class="card"><h3>Concluídos</h3>${list(done)}</div><div class="card"><h3>Cancelados</h3>${list(canc)}</div>`;
  }
};

/* Lista de produtos do cardápio (atualizada ao pesquisar sem perder o foco do campo) */
function renderGrid() {
  const g = $('#grid'); if (!g) return;
  const L = products.filter(p => (catFilter === 'Todos' || p.cat === catFilter) && p.name.toLowerCase().includes(term.toLowerCase()));
  g.innerHTML = L.map(p => `<article class="card prod ${p.active ? '' : 'off'}"><div class="em" aria-hidden="true">${p.emoji}</div><h3>${esc(p.name)}</h3>
    <span class="tag">${p.cat}</span><p>${esc(p.desc)}</p><span class="price">${money(p.price)}</span>
    <button class="btn sm" data-act="add" data-id="${p.id}" ${p.active ? '' : 'disabled'}>${p.active ? 'Adicionar ao carrinho' : 'Indisponível'}</button></article>`).join('') || '<p class="empty">Nenhum produto encontrado.</p>';
}

function render() {
  if (!session) return showLogin();
  const menu = MENUS[session.role];
  $('#nav').innerHTML = menu.map(([v, l]) => `<button class="${v === view ? 'on' : ''}" data-act="nav" data-v="${v}">${l}${v === 'cart' && cartCount() ? ` (${cartCount()})` : ''}</button>`).join('');
  $('#view').innerHTML = VIEWS[view]();
  renderGrid();
}

/* ---------- Ações dos botões ---------- */
const ACTIONS = {
  nav: v => { view = v; $('#nav').classList.remove('open'); render(); $('#view').focus(); },
  role: v => {
    loginRole = v; $('#loginErr').textContent = '';
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.v === v));
    $('#loginHint').innerHTML = v === 'admin' ? 'Senha demonstrativa do administrador: <b>admin123</b>' : 'Senha demonstrativa do aluno: <b>123</b>';
  },
  logout: () => { session = null; localStorage.removeItem(KEY.ses); showLogin(); },
  cat: v => { catFilter = v; render(); },
  add: (v, id) => {
    const p = products.find(x => x.id === id);
    if (!p || !p.active) return toast('Produto indisponível.', true);
    const c = cart.find(x => x.id === id); c ? c.qty++ : cart.push({id, qty:1});
    save(KEY.cart, cart); toast(p.name + ' adicionado ao carrinho!'); render();
  },
  inc: (v, id) => { cart.find(x => x.id === id).qty++; save(KEY.cart, cart); render(); },
  dec: (v, id) => { const c = cart.find(x => x.id === id); c.qty--; if (c.qty < 1) cart = cart.filter(x => x !== c); save(KEY.cart, cart); render(); },
  rm: (v, id) => { cart = cart.filter(x => x.id !== id); save(KEY.cart, cart); render(); },
  confirm: () => {
    const L = cartLines(); payChoice = (document.querySelector('input[name=pay]:checked') || {}).value || '';
    if (!L.length) return toast('Carrinho vazio.', true);
    if (!payChoice) return toast('Escolha uma forma de pagamento.', true);
    const id = load(KEY.seq, 1005); save(KEY.seq, id + 1); // número único e crescente
    orders.push({id, student:session.name, items:L.map(c => ({id:c.id, name:c.p.name, price:c.p.price, qty:c.qty})), total:cartTotal(), pay:payChoice, status:'Aguardando', date:new Date().toISOString()});
    saveOrders(); save(KEY.last, id); cart = []; save(KEY.cart, cart); payChoice = ''; view = 'confirm'; render(); toast('Pedido #' + id + ' recebido!');
  },
  status: (v, id) => {
    if (v === 'Cancelado' && !confirm('Cancelar este pedido?')) return;
    orders.find(o => o.id === id).status = v; saveOrders(); render(); toast(`Pedido #${id}: ${v}`);
  },
  toggle: (v, id) => { const p = products.find(x => x.id === id); p.active = !p.active; save(KEY.prod, products); render(); },
  del: (v, id) => {
    if (!confirm('Excluir este produto?')) return;
    products = products.filter(p => p.id !== id); save(KEY.prod, products); render(); toast('Produto excluído.');
  }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  ACTIONS[b.dataset.act](b.dataset.v, Number(b.dataset.id));
});
$('#burger').addEventListener('click', () => {
  const o = $('#nav').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o);
});
document.addEventListener('input', e => { if (e.target.id === 'search') { term = e.target.value; renderGrid(); } });
document.addEventListener('change', e => { if (e.target.name === 'pay') payChoice = e.target.value; });
document.addEventListener('submit', e => {
  if (e.target.id !== 'prodForm') return;
  e.preventDefault();
  const name = $('#pn').value.trim(), price = parseFloat($('#pp').value);
  if (!name || !(price > 0)) return toast('Informe nome e um preço válido.', true);
  products.push({id:Date.now(), name, desc:$('#pd').value.trim() || 'Sem descrição.', cat:$('#pc').value, price, emoji:$('#pe').value.trim() || '🍽️', active:true});
  save(KEY.prod, products); render(); toast('Produto cadastrado!');
});

/* Sincroniza entre abas do mesmo navegador (aluno vê as mudanças do admin) */
window.addEventListener('storage', () => {
  products = load(KEY.prod, []); orders = load(KEY.ord, []); cart = load(KEY.cart, []);
  if (session && ['track', 'history', 'dash', 'orders', 'admhist', 'home'].includes(view)) render();
});

/* Início */
session ? startApp() : showLogin();
