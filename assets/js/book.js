// Booking portal: build a detail, show a starting price, hand off to Square.
(() => {
  const D = window.PREMIER;
  const form = document.getElementById('book');
  if (!form) return;
  const $ = s => form.querySelector(s);
  const params = new URLSearchParams(location.search);
  const sizes = [...D.sizes, { id: 'marine', label: 'RV or boat', hint: 'Priced per foot' }];
  const state = {
    size: 'sedan', service: params.get('service') || 'premier',
    option: null, feet: 24, addons: new Set()
  };
  try { const s = localStorage.getItem('pad-size'); if (s && D.sizes.some(z => z.id === s)) state.size = s; } catch (e) {}
  if (state.service === 'marine') state.size = 'marine';

  const icons = {
    sedan: '<path d="M4 30h56M8 30l5-9c1.5-2.5 3-3.5 6-3.5h20c3 0 5 1 7.5 3.5L52 26l6 1.5c2 .5 2 1.5 2 2.5v3H4v-3z"/><circle cx="18" cy="33" r="4"/><circle cx="48" cy="33" r="4"/>',
    medium: '<path d="M4 31h56M6 31v-8l6-8c1-1.5 2.5-2 4.5-2H40c2 0 3.5.5 5 2l6 7 7 1.5c1.5.3 2 1 2 2.5v5H6z"/><circle cx="17" cy="33" r="4.5"/><circle cx="48" cy="33" r="4.5"/>',
    large: '<path d="M2 31h60M4 31V19h28V11h14c2 0 3 .5 4 2l5 7 5 1c1.5.3 2 1 2 2.5V31z"/><path d="M32 19v12"/><circle cx="15" cy="33" r="4.5"/><circle cx="49" cy="33" r="4.5"/>',
    marine: '<path d="M4 26h52l-6 8H12z"/><path d="M14 26V14h22l8 12"/><path d="M2 38c5 0 5-2 10-2s5 2 10 2 5-2 10-2 5 2 10 2 5-2 10-2 5 2 10 2"/>'
  };

  // Vehicle sizes
  $('[data-sizes]').innerHTML = sizes.map(s => `
    <label class="pick"><input type="radio" name="size" value="${s.id}">
      <span class="pick-card"><svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">${icons[s.id]}</svg>
      <b>${s.label}</b><small>${s.hint}</small></span></label>`).join('');

  // Add-ons
  $('[data-addons]').innerHTML = D.addons.map(a => `<label class="chip"><input type="checkbox" value="${a.id}"><span>${a.label}</span></label>`).join('');

  const money = n => '$' + Number(n).toLocaleString();
  const svc = () => D.services.find(s => s.id === state.service);

  function renderServices() {
    const list = D.services.filter(s => state.size === 'marine' ? s.id === 'marine' : s.id !== 'marine');
    if (!list.some(s => s.id === state.service)) state.service = list[0].id;
    $('[data-services]').innerHTML = list.map(s => {
      let p = '';
      if (s.prices) p = money(s.prices[state.size]) + (s.plus || (s.largePlus && state.size === 'large') ? '+' : '');
      else if (s.quote) p = 'Quote';
      else if (s.options && s.options[0].perFoot) p = '$' + s.options[0].perFoot + '/ft+';
      else if (s.options) p = 'from ' + money(s.options[0].price);
      return `<label class="svc-row"><input type="radio" name="service" value="${s.id}" ${s.id === state.service ? 'checked' : ''}>
        <span class="svc-row__body"><b>${s.name}</b><small>${s.summary}</small></span><span class="svc-row__price">${p}</span></label>`;
    }).join('');
  }

  function renderOptions() {
    const s = svc(), box = $('[data-options]');
    if (!s.options) {
      state.option = null;
      box.innerHTML = s.id === 'maintenance'
        ? '<p class="note">Maintenance details are for clients who have had a full detail with us and are on our recurring schedule.</p>'
        : '<p class="note">No options to choose for this service.</p>';
      return;
    }
    if (!s.options.some(o => o.id === state.option)) state.option = s.options[s.id === 'ceramic' ? 1 : 0].id;
    const label = s.id === 'ceramic' ? 'Coating length' : s.id === 'correction' ? 'Correction level' : 'Finish';
    box.innerHTML = `<span class="field-label">${label}</span><div class="seg seg--light" role="radiogroup" aria-label="${label}">` +
      s.options.map(o => `<button type="button" role="radio" aria-checked="${o.id === state.option}" data-opt="${o.id}">${o.label}</button>`).join('') + '</div>' +
      (s.id === 'marine' ? `<div class="field" style="margin-top:18px;max-width:220px"><label for="feet">Length in feet</label><input id="feet" type="number" min="10" max="80" value="${state.feet}"></div>` : '') +
      (s.id === 'correction' ? '<p class="note" style="margin-top:12px">1-step removes light swirls. 2 and 3-step take out deeper scratches, oxidation and water spot etching.</p>' : '') +
      (s.id === 'ceramic' ? '<p class="note" style="margin-top:12px">Includes decontamination and paint correction. 10% off your first coating.</p>' : '');
    box.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => { state.option = b.dataset.opt; renderOptions(); update(); }));
    const feet = box.querySelector('#feet');
    if (feet) feet.addEventListener('input', () => { state.feet = Math.max(0, parseInt(feet.value, 10) || 0); update(); });
  }

  function estimate() {
    const s = svc();
    if (s.quote) return { text: 'Custom quote', note: 'Coating price depends on vehicle size and length. The booking fee holds your spot.' };
    if (s.prices) return { text: money(s.prices[state.size]) + (s.plus || (s.largePlus && state.size === 'large') ? '+' : ''), note: s.note || 'Final price is confirmed after we see the vehicle.' };
    const o = s.options.find(x => x.id === state.option);
    if (o.perFoot) return { text: money(o.perFoot * state.feet), note: `${state.feet} ft at $${o.perFoot} per foot.` };
    return { text: money(o.price) + '+', note: s.note };
  }

  function update() {
    const s = svc(), e = estimate();
    const size = sizes.find(z => z.id === state.size);
    const opt = s.options ? s.options.find(o => o.id === state.option) : null;
    const veh = ['year', 'make', 'model'].map(id => $('#' + id).value.trim()).filter(Boolean).join(' ');
    const addons = D.addons.filter(a => state.addons.has(a.id)).map(a => a.label);
    const rows = [['Vehicle', size.label + (veh ? ' · ' + veh : '')], ['Service', s.name]];
    if (opt) rows.push(['Option', opt.label]);
    if (addons.length) rows.push(['Extras', addons.join(', ')]);
    rows.push(['Location', $('#city').value]);
    if ($('#date').value) rows.push(['Preferred day', new Date($('#date').value + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })]);
    $('[data-summary]').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v.replace(/</g, '&lt;')}</dd>`).join('');
    form.querySelector('[data-total]').textContent = e.text;
    const mt = document.querySelector('[data-mobile-total]'); if (mt) mt.textContent = e.text;
    form.querySelector('[data-total-note]').textContent = addons.length ? 'Extras you selected may add to the final price.' : e.note;
    const q = new URLSearchParams({ service: s.id, size: state.size, vehicle: veh, city: $('#city').value, details: [opt && opt.label, ...addons].filter(Boolean).join(', ') });
    form.querySelector('[data-quote-link]').href = 'contact.html?' + q.toString();
    form.querySelector('[data-options-step]').hidden = false;
  }

  form.addEventListener('change', e => {
    const t = e.target;
    if (t.name === 'size') { state.size = t.value; renderServices(); renderOptions(); try { if (t.value !== 'marine') localStorage.setItem('pad-size', t.value); } catch (er) {} }
    if (t.name === 'service') { state.service = t.value; state.option = null; renderOptions(); }
    if (t.closest('[data-addons]')) t.checked ? state.addons.add(t.value) : state.addons.delete(t.value);
    if (t.id === 'agree' && t.checked) form.querySelector('[data-agree-err]').hidden = true;
    update();
  });
  form.addEventListener('input', e => { if (['year', 'make', 'model'].includes(e.target.id)) update(); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const agree = $('#agree');
    if (!agree.checked) { form.querySelector('[data-agree-err]').hidden = false; agree.focus(); return; }
    window.open(D.squareUrl, '_blank', 'noopener');
  });

  // Init
  $('#date').min = new Date().toISOString().slice(0, 10);
  form.querySelector(`input[name="size"][value="${state.size}"]`).checked = true;
  renderServices(); renderOptions(); update();
})();
