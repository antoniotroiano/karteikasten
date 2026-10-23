// Fortschrittsübersicht und Zurücksetzen des Lernstands.
/* ---------- ÜBERSICHT ---------- */
document.querySelectorAll('#filterRow .filter-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    document.querySelectorAll('#filterRow .filter-chip').forEach(c=>{ c.classList.remove('active'); c.setAttribute('aria-pressed','false'); });
    chip.classList.add('active');
    chip.setAttribute('aria-pressed','true');
    overviewFilter = chip.dataset.filter;
    renderOverview();
  });
});

function renderOverview(){
  renderResetArea(false);
  // Box-Visualisierung
  const counts = {1:0,2:0,3:0,4:0,5:0};
  cards.forEach(c=> counts[c.box]++);
  const max = Math.max(1, ...Object.values(counts));
  const viz = document.getElementById('boxesViz');
  viz.innerHTML = [5,4,3,2,1].map(b=>{
    const pct = Math.max(8, (counts[b]/max)*100);
    return `
    <div class="box-row">
      <div class="box-label">${BOX_LABEL[b]}</div>
      <div class="box-track">
        <div class="box-fill" style="width:${pct}%; background:var(--box${b});">${counts[b]}</div>
      </div>
    </div>`;
  }).join('');

  // Liste
  let filtered = overviewFilter==='alle' ? cards : cards.filter(c=>c.category===overviewFilter);
  filtered = [...filtered].sort((a,b)=>a.nextReview-b.nextReview);
  const listEl = document.getElementById('fullList');
  if(filtered.length===0){
    listEl.innerHTML = '<div class="loading">Keine Karten in dieser Kategorie.</div>';
    return;
  }
  listEl.innerHTML = filtered.map(c=>{
    if(c.id === editingCardId) return editFormHtml(c);
    const due = c.nextReview <= Date.now();
    const dateStr = due ? 'fällig' : new Date(c.nextReview).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'});
    return `
    <div class="list-card">
      <span class="tab-dot" style="background:var(${CAT_COLOR_VAR[c.category]})"></span>
      <div class="info">
        <div class="term">${escapeHtml(c.term)}</div>
        <div class="def">${escapeHtml(c.definition)}</div>
      </div>
      <div class="meta">Box ${c.box}<br>${dateStr}</div>
      <button class="mini-edit" data-id="${c.id}" title="Bearbeiten">✏️</button>
      <button class="mini-del" data-id="${c.id}" title="Löschen">✕</button>
    </div>`;
  }).join('');
  listEl.querySelectorAll('.mini-del').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const nextCards = cards.filter(c=>c.id !== id);
      if(nextCards.length === cards.length) return;
      if(!persistCards(nextCards)){
        showStorageError();
        return;
      }
      removeCardsFromDailyStats([id]);
      renderOverview(); renderHeaderStat(); renderRecent(); renderDueSummary();
      announceAppStatus('Karte gelöscht.');
    });
  });
  listEl.querySelectorAll('.mini-edit').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      editingCardId = btn.dataset.id;
      renderOverview(); renderRecent();
    });
  });
  attachEditHandlers(listEl);
}

function renderResetArea(confirming){
  const el = document.getElementById('resetArea');
  if(cards.length === 0){
    el.innerHTML = '';
    return;
  }
  if(!confirming){
    el.innerHTML = `<button class="link-btn danger" id="resetProgressBtn">Lernstand zurücksetzen</button>`;
    document.getElementById('resetProgressBtn').addEventListener('click', ()=> renderResetArea(true));
  } else {
    el.innerHTML = `
      <span class="reset-confirm-text">Sicher? Boxen &amp; Fälligkeit werden zurückgesetzt.</span>
      <button class="link-btn danger" id="resetConfirmBtn">Ja, zurücksetzen</button>
      <button class="link-btn" id="resetCancelBtn">Abbrechen</button>
    `;
    document.getElementById('resetConfirmBtn').addEventListener('click', doResetProgress);
    document.getElementById('resetCancelBtn').addEventListener('click', ()=> renderResetArea(false));
  }
}

function doResetProgress(){
  const nextCards = cards.map(c => ({ ...c, box: 1, nextReview: Date.now() }));
  if(!persistCards(nextCards)){
    showStorageError();
    return;
  }
  renderHeaderStat();
  renderRecent();
  renderDueSummary();
  renderOverview();
}
