// Token Radar's plain dashboard. It reads window.RADAR (written beside dashboard/ by main.ts) and
// renders the ranked board, a filterable table, a per-protocol detail drawer with the model's own
// inputs and the protocol's farm plan. No network: every byte it shows is in data.js.
(function () {
  'use strict';

  var RADAR = window.RADAR;
  if (!RADAR) return;
  var root = document.getElementById('board');
  var view = { q: '', category: 'all', tab: 'pre-token', sort: 'implied', dir: -1, selected: null, watchlistOnly: false };

  var usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function money(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usdFmt.format(n);
  }
  function pct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function ageText(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  // The model in one function: the page recomputes a row from the snapshot figures and checks the
  // number board.json carries, so the page's code and the board's data are visibly the same arithmetic.
  // The multiple is the row's own category multiple (median market-cap/TVL of the snapshot's tokened
  // peers in that category, global median where the category is thin), capped to 0.05..1.5.
  function recompute(row, model) {
    var change = row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d;
    var growth = Math.min(model.growth_cap, Math.max(model.growth_floor, change));
    var growthMult = 1 + (growth / 100) * model.growth_weight;
    var age = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
    var maturity = model.maturity_floor + (Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
    var multiple = row.multiple === null || row.multiple === undefined ? RADAR.global_multiple : row.multiple;
    return Math.max(1, Math.round(row.tvl_usd * multiple * growthMult * maturity));
  }

  // A small element builder: h('tag', { cls, ...attrs, onClick }, ...children). Text is a child,
  // never an attribute; 'cls' sets the class name, 'html' sets inner HTML, 'on*' attaches a listener.
  function h(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      var keys = Object.keys(attrs);
      for (var ki = 0; ki < keys.length; ki++) {
        var k = keys[ki];
        var v = attrs[k];
        if (v === null || v === undefined) continue;
        if (k === 'cls') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v);
      }
    }
    for (var i = 2; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid === null || kid === undefined || kid === false) continue;
      if (Array.isArray(kid)) {
        kid.forEach(function (c) { if (c) node.appendChild(c); });
      } else if (typeof kid === 'string' || typeof kid === 'number') {
        node.appendChild(document.createTextNode(String(kid)));
      } else {
        node.appendChild(kid);
      }
    }
    return node;
  }

  // The farm plan is the board's own: data.js carries every row's farm_steps exactly as board.json
  // does, and the page shows them unchanged. A token-live row's steps are a warning, not a plan.
  function planSteps(row) {
    return (row.farm_steps || []).slice();
  }

  function readFromHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) view.q = params.get('q');
    if (params.get('p')) view.selected = params.get('p');
    if (params.get('category')) view.category = params.get('category');
    if (params.get('wl') === '1') view.watchlistOnly = true;
  }
  function writeToHash() {
    var params = new URLSearchParams();
    if (view.q) params.set('q', view.q);
    if (view.category !== 'all') params.set('category', view.category);
    if (view.watchlistOnly) params.set('wl', '1');
    if (view.selected) params.set('p', view.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function visibleRows() {
    var q = view.q.trim().toLowerCase();
    return RADAR.rows.filter(function (r) {
      if (view.watchlistOnly && RADAR.watchlist.indexOf(r.slug) < 0) return false;
      if (view.category !== 'all' && r.category !== view.category) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function orderedRows(list) {
    var key = view.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -view.dir;
      if (av > bv) return view.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function masthead() {
    return h('header', { cls: 'top' },
      h('div', { cls: 'brand' }, h('span', { cls: 'mark' }), h('span', { cls: 'brand-name' }, 'Token Radar')),
      h('div', { cls: 'top-meta' },
        h('span', null, 'Snapshot ' + RADAR.as_of),
        h('span', null, 'DefiLlama protocol index'),
        h('span', null, RADAR.model_version + ' model')
      )
    );
  }

  function intro() {
    return h('section', { cls: 'lede' },
      h('div', null,
        h('h1', null, RADAR.watchlist_size + ' watchlist protocols, ranked by implied value'),
        h('p', null, 'The watchlist is the floor: every protocol with at least $' + Math.round(RADAR.floor_usd / 1e6) + 'M of TVL and no token on record. The early radar adds ' + RADAR.early_size + ' pre-token protocols below that floor. ' + RADAR.token_live_size + ' watchlist rows are flagged TOKEN LIVE: hand verification found their token already trading, so they carry a warning instead of a farm plan and stay ranked only because the gate requires full watchlist coverage. Implied value is a model, not a promise.')
      ),
      h('div', { cls: 'facts' },
        h('div', { cls: 'fact' }, h('span', null, 'Watchlist covered'), h('b', null, RADAR.watchlist_size + ' / ' + RADAR.watchlist_size)),
        h('div', { cls: 'fact' }, h('span', null, 'Rows scored'), h('b', null, String(RADAR.board_size))),
        h('div', { cls: 'fact' }, h('span', null, 'Early rows below the floor'), h('b', null, String(RADAR.early_size))),
        h('div', { cls: 'fact' }, h('span', null, 'Verified token-live rows'), h('b', null, String(RADAR.token_live_size))),
        h('div', { cls: 'fact' }, h('span', null, 'Live-token protocols set aside'), h('b', null, String(RADAR.live_size)))
      )
    );
  }

  function filters() {
    var categories = Array.from(new Set(RADAR.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var search = h('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: view.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { view.q = search.value; writeToHash(); draw(); });
    var select = h('select', { id: 'category', 'aria-label': 'Filter by category' },
      h('option', { value: 'all' }, 'All categories'),
      categories.map(function (c) { return h('option', { value: c, selected: c === view.category ? 'selected' : null }, c); })
    );
    select.addEventListener('change', function () { view.category = select.value; writeToHash(); draw(); });
    var pre = h('button', { type: 'button', 'aria-pressed': view.tab === 'pre-token' ? 'true' : 'false', onclick: function () { view.tab = 'pre-token'; draw(); } }, 'Board');
    var live = h('button', { type: 'button', 'aria-pressed': view.tab === 'live' ? 'true' : 'false', onclick: function () { view.tab = 'live'; draw(); } }, 'Live token');
    var wl = h('button', { type: 'button', 'aria-pressed': view.watchlistOnly ? 'true' : 'false', onclick: function () { view.watchlistOnly = !view.watchlistOnly; writeToHash(); draw(); } }, view.watchlistOnly ? 'Watchlist only: on' : 'Watchlist only');
    return h('div', { cls: 'controls' },
      h('div', { cls: 'field' }, h('label', { for: 'q' }, 'Search'), search),
      h('div', { cls: 'field' }, h('label', { for: 'category' }, 'Category'), select),
      h('div', { cls: 'field' }, h('span', { cls: 'sub' }, 'Token status'), h('div', { cls: 'tabs' }, pre, live)),
      h('div', { cls: 'field' }, h('span', { cls: 'sub' }, 'Watchlist'), wl),
      h('span', { cls: 'count' }, view.tab === 'pre-token' ? visibleRows().length + ' rows shown' : RADAR.live.length + ' live-token protocols')
    );
  }

  function sortButton(key, label) {
    return h('th', { scope: 'col' },
      h('button', { type: 'button', onclick: function () { if (view.sort === key) view.dir = -view.dir; else { view.sort = key; view.dir = -1; } draw(); } },
        label,
        view.sort === key ? h('span', { 'aria-hidden': 'true' }, view.dir < 0 ? ' v' : ' ^') : null
      )
    );
  }

  function boardView() {
    var list = orderedRows(visibleRows());
    if (list.length === 0) {
      return h('div', { cls: 'panel' }, h('div', { cls: 'empty' },
        h('h2', null, 'No protocol matches that filter'),
        h('p', null, 'Clear the search or pick another category to see the board again.'),
        h('button', { cls: 'button primary', type: 'button', onclick: function () { view.q = ''; view.category = 'all'; writeToHash(); draw(); } }, 'Clear filters')
      ));
    }
    var max = list[0].implied_value_usd || 1;
    var tbody = h('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : pct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = h('tr', {
        'data-selected': view.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { showRow(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showRow(r.slug); } }
      },
        h('td', { cls: 'num' }, String(r.rank)),
        h('td', null, h('div', { cls: 'name' },
          h('b', null, r.name),
          h('span', { cls: 'sub' }, (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain'))
        )),
        h('td', { cls: 'num' }, money(r.tvl_usd)),
        h('td', { cls: 'num ' + growthClass }, growth),
        h('td', { cls: 'num' }, ageText(r.age_days)),
        h('td', null, h('div', { cls: 'implied' },
          h('div', { cls: 'bar', 'aria-hidden': 'true' }, h('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          h('span', { cls: 'num' }, money(r.implied_value_usd))
        )),
        h('td', null, h('span', { cls: 'status' + (r.token_status === 'token_live' ? ' live' : '') }, r.token_status === 'token_live' ? 'TOKEN LIVE' : 'no token on record'))
      );
      tbody.appendChild(tr);
    });
    return h('div', { cls: 'panel' },
      h('div', { cls: 'table-wrap' },
        h('table', null,
          h('caption', { cls: 'sub' }, 'Protocols ranked by implied value, strongest first. Select a row for its model and farm plan. Rows flagged TOKEN LIVE already trade a token: their plan is a warning, not a farm.'),
          h('thead', null, h('tr', null,
            sortButton('implied', 'Rank'),
            sortButton('name', 'Protocol'),
            sortButton('tvl', 'TVL'),
            sortButton('growth', '7d'),
            sortButton('age', 'Age'),
            sortButton('implied', 'Implied value'),
            h('th', { scope: 'col' }, 'Token')
          )),
          tbody
        )
      )
    );
  }

  function liveView() {
    var tbody = h('tbody');
    RADAR.live.forEach(function (r) {
      tbody.appendChild(h('tr', null,
        h('td', { cls: 'num' }, 'live'),
        h('td', null, h('div', { cls: 'name' }, h('b', null, r.name), h('span', { cls: 'sub' }, (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain')))),
        h('td', { cls: 'num' }, money(r.tvl_usd)),
        h('td', { cls: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg') }, pct(r.change_7d)),
        h('td', { cls: 'num' }, money(r.mcap_usd)),
        h('td', null, h('span', { cls: 'status' }, 'already trades'))
      ));
    });
    return h('div', { cls: 'panel' },
      h('div', { cls: 'table-wrap' },
        h('table', null,
          h('caption', { cls: 'sub' }, 'Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking.'),
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Status'), h('th', { scope: 'col' }, 'Protocol'), h('th', { scope: 'col' }, 'TVL'), h('th', { scope: 'col' }, '7d'), h('th', { scope: 'col' }, 'Market cap'), h('th', { scope: 'col' }, 'Token'))),
          tbody
        )
      )
    );
  }

  function modelNote() {
    var m = RADAR.model;
    return h('section', { cls: 'panel model' },
      h('h2', null, 'How implied value is computed'),
      h('p', { cls: 'sub' }, 'Every row is scored by one function of the snapshot figures: no name changes an implied value or a rank. Six watchlist rows are flagged TOKEN LIVE from hand verification (their token already trades; the check is in VERIFICATION.md): the flag changes only their label and farm plan, never their score, and they stay ranked only because the gate requires every watchlist slug to appear.'),
      h('div', { cls: 'formula' },
        'implied = round( tvl_usd x category_multiple x (1 + clamp(change_7d, ' + m.growth_floor + ', ' + m.growth_cap + ') / 100 x ' + m.growth_weight + ') x (' + m.maturity_floor + ' + min(age_days, ' + m.maturity_days + ') / ' + m.maturity_days + ' x ' + m.maturity_range + ') )'
      ),
      h('p', { cls: 'sub' }, 'The category multiple is the median market-cap-to-TVL ratio of the snapshot\'s own tokened protocols in that category (at least ' + m.multiple_min_peers + ' peers; otherwise the global median ' + RADAR.global_multiple + '), capped to ' + m.multiple_min + '..' + m.multiple_max + '. A DEX and a lender at the same TVL are not worth the same token, and the snapshot says by how much. TVL and seven-day growth come from the snapshot. Age is the time since the protocol was first listed, the best record of how long it has run with no token; an unlisted age uses ' + m.unknown_age_days + ' days. The early radar is every pre-token protocol below the watchlist floor, by TVL, and the live-token protocols are set aside with their market caps shown.')
    );
  }

  var dialog = h('dialog', { cls: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { view.selected = null; writeToHash(); });

  function showRow(slug) {
    var row = RADAR.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    view.selected = slug;
    writeToHash();
    dialog.textContent = '';
    var steps = planSteps(row);
    dialog.appendChild(h('div', { cls: 'detail-head' },
      h('div', null,
        h('span', { cls: 'brand-name' }, 'Rank ' + row.rank + ' of ' + RADAR.board_size),
        h('h2', { id: 'detail-title' }, row.name),
        h('p', { cls: 'sub' }, (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain'))
      ),
      h('button', { cls: 'close', type: 'button', 'aria-label': 'Close details', onclick: function () { dialog.close(); } }, 'Close')
    ));
    if (row.token_status === 'token_live') {
      dialog.appendChild(h('div', { cls: 'notice' },
        h('b', null, 'Token already live — do not farm this row for a new token.'),
        h('span', null, 'Hand verification found this protocol’s token trading. It stays ranked only because the gate requires every watchlist slug to appear.')
      ));
    }
    dialog.appendChild(h('section', { cls: 'detail-section' },
      h('h3', null, 'Implied value'),
      h('div', { cls: 'equation' },
        h('div', null, h('span', null, 'TVL'), h('b', { cls: 'num' }, money(row.tvl_usd))),
        h('div', null, h('span', null, 'Category multiple'), h('b', { cls: 'num' }, (Math.round(row.multiple * 1e4) / 1e4) + 'x')),
        h('div', null, h('span', null, 'Seven-day growth'), h('b', { cls: 'num' }, pct(row.change_7d))),
        h('div', null, h('span', null, row.token_status === 'token_live' ? 'Age listed' : 'Age with no token'), h('b', { cls: 'num' }, ageText(row.age_days))),
        h('div', null, h('span', null, 'Growth multiplier'), h('b', { cls: 'num' }, String(row.growth_multiplier))),
        h('div', null, h('span', null, 'Maturity multiplier'), h('b', { cls: 'num' }, String(row.maturity_multiplier))),
        h('div', null, h('span', null, 'Implied value'), h('b', { cls: 'num' }, money(row.implied_value_usd)))
      ),
      h('p', { cls: 'sub' }, 'Model ' + RADAR.model_version + ': the same function scores every protocol. The page recomputes this row as ' + money(recompute(row, RADAR.model)) + (recompute(row, RADAR.model) === row.implied_value_usd ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') + ' This is an estimate, not a price.')
    ));
    dialog.appendChild(h('section', { cls: 'detail-section' },
      h('h3', null, row.token_status === 'token_live' ? 'Token-live notice' : 'Farm plan'),
      h('ol', { cls: 'steps' }, steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return h('li', null, h('b', null, action), h('span', { cls: 'cost' }, tail));
      }))
    ));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function draw() {
    root.textContent = '';
    var shell = h('div', { cls: 'shell' });
    shell.appendChild(masthead());
    shell.appendChild(intro());
    shell.appendChild(filters());
    shell.appendChild(view.tab === 'pre-token' ? boardView() : liveView());
    if (view.tab === 'pre-token') shell.appendChild(modelNote());
    root.appendChild(shell);
    root.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) root.appendChild(dialog);
    if (view.selected) showRow(view.selected);
  }

  readFromHash();
  draw();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
