// Erfassen, Bearbeiten, Duplikatprüfung und Offline-Listenimport.
/* ---------- ERFASSEN ---------- */
document.querySelectorAll('#mainCatRow .cat-choice').forEach(el=>{
  el.addEventListener('click', ()=>{
    document.querySelectorAll('#mainCatRow .cat-choice').forEach(x=>{ x.classList.remove('selected'); x.setAttribute('aria-pressed','false'); });
    el.classList.add('selected');
    el.setAttribute('aria-pressed','true');
    selectedCat = el.dataset.cat;
  });
});

document.querySelectorAll('#batchCatRow .cat-choice').forEach(el=>{
  el.addEventListener('click', ()=>{
    document.querySelectorAll('#batchCatRow .cat-choice').forEach(x=>{ x.classList.remove('selected'); x.setAttribute('aria-pressed','false'); });
    el.classList.add('selected');
    el.setAttribute('aria-pressed','true');
    selectedBatchCat = el.dataset.cat;
  });
});

function normalizeTermForComparison(term){
  return String(term ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

// Case/spacing-insensitive comparison; the original capitalization is preserved in the card.
function hasDuplicateTerm(term, exceptId = null, sourceCards = cards){
  const normalized = normalizeTermForComparison(term);
  return sourceCards.some(c => normalizeTermForComparison(c.term) === normalized && c.id !== exceptId);
}

function showSaveToast(message, success){
  const toast = document.getElementById('saveToast');
  toast.textContent = message;
  toast.style.color = success ? 'var(--teal)' : 'var(--danger)';
  toast.setAttribute('aria-hidden','false');
  toast.classList.add('show');
  clearTimeout(showSaveToast.timeoutId);
  showSaveToast.timeoutId = setTimeout(()=>{
    toast.classList.remove('show');
    toast.setAttribute('aria-hidden','true');
  }, 3000);
}

document.getElementById('saveBtn').addEventListener('click', async ()=>{
  const term = document.getElementById('f-term').value.trim();
  const def = document.getElementById('f-def').value.trim();
  const note = document.getElementById('f-note').value.trim();
  if(!term || !def){
    const missing = !term && !def
      ? 'Bitte Begriff und Definition eingeben.'
      : (!term ? 'Bitte einen Begriff eingeben.' : 'Bitte eine Definition eingeben.');
    showSaveToast(missing, false);
    document.getElementById(term ? 'f-def' : 'f-term').focus();
    return;
  }
  if(hasDuplicateTerm(term)){
    showSaveToast('⚠️ Dieses Wort ist bereits vorhanden.', false);
    document.getElementById('f-term').focus();
    return;
  }
  const card = {
    id: uid(),
    term, definition: def, note,
    category: selectedCat,
    box: 1,
    nextReview: Date.now(),
    createdAt: Date.now()
  };
  if(!persistCards([card, ...cards])){
    showStorageError();
    return;
  }
  document.getElementById('f-term').value = '';
  document.getElementById('f-def').value = '';
  document.getElementById('f-note').value = '';
  document.getElementById('f-term').focus();
  showSaveToast('✓ Gespeichert — direkt weiter erfassen', true);
  renderHeaderStat();
  renderRecent();
});

function editFormHtml(c){
  return `
    <div class="edit-form" data-editid="${c.id}">
      <input type="text" class="edit-term" value="${escapeAttr(c.term)}" placeholder="Begriff">
      <textarea class="edit-def" placeholder="Definition">${escapeHtml(c.definition)}</textarea>
      <textarea class="edit-note" placeholder="Zusatzinfo (optional)">${escapeHtml(c.note||'')}</textarea>
      <div class="cat-row edit-cat-row" role="group" aria-label="Kategorie">
        <button type="button" class="cat-choice ${c.category==='englisch'?'selected':''}" data-cat="englisch" aria-pressed="${c.category==='englisch'}">Englisch</button>
        <button type="button" class="cat-choice ${c.category==='spanisch'?'selected':''}" data-cat="spanisch" aria-pressed="${c.category==='spanisch'}">Spanisch</button>
        <button type="button" class="cat-choice ${c.category==='isaqb'?'selected':''}" data-cat="isaqb" aria-pressed="${c.category==='isaqb'}">iSAQB</button>
        <button type="button" class="cat-choice ${c.category==='sonstiges'?'selected':''}" data-cat="sonstiges" aria-pressed="${c.category==='sonstiges'}">Sonstiges</button>
      </div>
      <div class="edit-warning" role="status" aria-live="polite" style="display:none;"></div>
      <div class="edit-actions">
        <button class="btn btn-primary edit-save-btn" data-id="${c.id}" type="button">Speichern</button>
        <button class="btn btn-ghost edit-cancel-btn" data-id="${c.id}" type="button">Abbrechen</button>
      </div>
    </div>
  `;
}

function attachEditHandlers(scopeEl){
  scopeEl.querySelectorAll('.edit-form').forEach(form=>{
    form.querySelectorAll('.cat-choice').forEach(el=>{
      el.addEventListener('click', ()=>{
        form.querySelectorAll('.cat-choice').forEach(x=>{ x.classList.remove('selected'); x.setAttribute('aria-pressed','false'); });
        el.classList.add('selected');
        el.setAttribute('aria-pressed','true');
      });
    });
    form.querySelector('.edit-save-btn').addEventListener('click', function(){
      const id = this.dataset.id;
      const term = form.querySelector('.edit-term').value.trim();
      const definition = form.querySelector('.edit-def').value.trim();
      const note = form.querySelector('.edit-note').value.trim();
      const catEl = form.querySelector('.cat-choice.selected');
      const category = catEl ? catEl.dataset.cat : 'sonstiges';
      const warnEl = form.querySelector('.edit-warning');
      if(!term || !definition){
        warnEl.style.display = 'block';
        warnEl.textContent = 'Begriff und Definition dürfen nicht leer sein.';
        return;
      }
      if(hasDuplicateTerm(term, id)){
        warnEl.style.display = 'block';
        warnEl.textContent = 'Dieses Wort ist bereits vorhanden.';
        return;
      }
      const nextCards = cards.map(c => c.id === id
        ? { ...c, term, definition, note, category }
        : c);
      if(!persistCards(nextCards)){
        warnEl.style.display = 'block';
        warnEl.textContent = 'Speichern fehlgeschlagen. Bitte erneut versuchen.';
        return;
      }
      editingCardId = null;
      renderRecent(); renderOverview(); renderHeaderStat(); renderDueSummary();
      announceAppStatus('Karte erfolgreich gespeichert.');
    });
    form.querySelector('.edit-cancel-btn').addEventListener('click', ()=>{
      editingCardId = null;
      renderRecent(); renderOverview();
    });
  });
}

function renderRecent(){
  const list = document.getElementById('recentList');
  const recent = cards.slice(0,5);
  if(recent.length===0){
    list.innerHTML = '<div class="loading">Noch keine Karten erfasst.</div>';
    return;
  }
  list.innerHTML = recent.map(c=>{
    if(c.id === editingCardId) return editFormHtml(c);
    return `
    <div class="mini-card">
      <span class="tab-dot" style="background:var(${CAT_COLOR_VAR[c.category]})"></span>
      <span class="term">${escapeHtml(c.term)}</span>
      <span class="def">${escapeHtml(c.definition)}</span>
      <button class="mini-edit" data-id="${c.id}" title="Bearbeiten">✏️</button>
      <button class="mini-del" data-id="${c.id}" title="Löschen">✕</button>
    </div>
  `;
  }).join('');
  list.querySelectorAll('.mini-del').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const nextCards = cards.filter(c=>c.id !== id);
      if(nextCards.length === cards.length) return;
      if(!persistCards(nextCards)){
        showStorageError();
        return;
      }
      removeCardsFromDailyStats([id]);
      renderRecent(); renderHeaderStat(); renderOverview(); renderDueSummary();
      announceAppStatus('Karte gelöscht.');
    });
  });
  list.querySelectorAll('.mini-edit').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      editingCardId = btn.dataset.id;
      renderRecent(); renderOverview();
    });
  });
  attachEditHandlers(list);
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function escapeAttr(s){
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

/* ---------- OFFLINE-IMPORT (KEINE KI- ODER NETZWERK-AUFRUFE) ---------- */
/*
  Zukunfts-Hinweis: Sollte später eine optionale KI-Anbindung ergänzt werden,
  gehört der Provider-Aufruf hinter einen eigenen Server-Endpunkt. Niemals einen
  geheimen API-Schlüssel in diese statische HTML-Datei eintragen.
*/
document.getElementById('batchParseBtn').addEventListener('click', ()=>{
  const rawText = document.getElementById('batch-text').value;
  const status = document.getElementById('batchStatus');
  const lines = rawText.split(/\r?\n/);
  const entries = [];
  const problems = [];

  lines.forEach((line, index)=>{
    if(!line.trim()) return;
    const parts = line.split('|').map(part => part.trim());
    if(parts.length < 2 || parts.length > 3 || !parts[0] || !parts[1]){
      problems.push(`Zeile ${index + 1}`);
      return;
    }
    entries.push({ term: parts[0], definition: parts[1], note: parts[2] || '' });
  });

  status.style.display = 'block';
  if(entries.length === 0){
    status.style.color = 'var(--danger)';
    status.textContent = problems.length
      ? `Keine gültigen Zeilen gefunden. Bitte Format prüfen: Begriff | Definition | Zusatzinfo. Ungültig: ${problems.join(', ')}.`
      : 'Bitte zuerst eine Liste einfügen.';
    document.getElementById('batchResults').innerHTML = '';
    return;
  }

  renderBatchResults(entries);
  status.style.color = problems.length ? 'var(--clay)' : 'var(--teal)';
  status.textContent = problems.length
    ? `${entries.length} gültige Zeilen gefunden. ${problems.length} ungültige Zeile(n) übersprungen: ${problems.join(', ')}. Bitte Einträge prüfen.`
    : `${entries.length} Zeile(n) erkannt. Prüfe die Einträge, bearbeite sie bei Bedarf und wähle aus, was gespeichert werden soll.`;
});

function renderBatchResults(entries){
  const el = document.getElementById('batchResults');
  el.innerHTML = `
    <div class="import-toolbar reset-confirm-text">${entries.length} Einträge — Häkchen entfernen, um Einträge auszuschließen. Begriffe, Definitionen und Zusatzinfos sind vor dem Speichern editierbar.</div>
    ${entries.map((entry,i)=>`
      <div class="import-row" data-idx="${i}">
        <input type="checkbox" class="import-check" checked aria-label="Eintrag ${i+1} importieren">
        <div class="import-fields">
          <input type="text" class="import-term" value="${escapeAttr(entry.term || '')}" placeholder="Begriff" aria-label="Begriff">
          <input type="text" class="import-def" value="${escapeAttr(entry.definition || '')}" placeholder="Definition" aria-label="Definition">
          <input type="text" class="import-note" value="${escapeAttr(entry.note || '')}" placeholder="Zusatzinfo (optional)" aria-label="Zusatzinfo (optional)">
        </div>
      </div>
    `).join('')}
    <button class="btn btn-primary btn-block" id="batchSaveBtn" type="button">Ausgewählte Karten speichern</button>
  `;
  document.getElementById('batchSaveBtn').addEventListener('click', saveBatchResults);
}

function saveBatchResults(){
  const rows = document.querySelectorAll('#batchResults .import-row');
  let added = 0;
  let skippedDuplicates = 0;
  let skippedInvalid = 0;
  const nextCards = [...cards];

  rows.forEach(row=>{
    if(!row.querySelector('.import-check').checked) return;
    const term = row.querySelector('.import-term').value.trim();
    const definition = row.querySelector('.import-def').value.trim();
    const note = row.querySelector('.import-note').value.trim();
    if(!term || !definition){
      skippedInvalid++;
      return;
    }
    if(hasDuplicateTerm(term, null, nextCards)){
      skippedDuplicates++;
      return;
    }

    nextCards.unshift({
      id: uid(),
      term, definition, note,
      category: selectedBatchCat,
      box: 1,
      nextReview: Date.now(),
      createdAt: Date.now()
    });
    added++;
  });

  const status = document.getElementById('batchStatus');
  status.style.display = 'block';
  if(added === 0){
    status.style.color = 'var(--danger)';
    status.textContent = `Keine Karten gespeichert. ${skippedDuplicates} Duplikat(e), ${skippedInvalid} unvollständige(r) Eintrag/Einträge. Korrigiere die Einträge und versuche es erneut.`;
    return;
  }

  if(!persistCards(nextCards)){
    status.style.color = 'var(--danger)';
    status.textContent = 'Speichern fehlgeschlagen. Deine Karten wurden nicht übernommen; die Liste bleibt zum erneuten Versuch erhalten.';
    return;
  }

  document.getElementById('batchResults').innerHTML = '';
  document.getElementById('batch-text').value = '';
  status.style.color = (skippedDuplicates || skippedInvalid) ? 'var(--clay)' : 'var(--teal)';
  status.textContent = `✓ ${added} Karte(n) gespeichert; ${skippedDuplicates} Duplikat(e) und ${skippedInvalid} unvollständige(r) Eintrag/Einträge übersprungen.`;
  renderHeaderStat();
  renderRecent();
  renderDueSummary();
}
