// JSON-Export und validierter Import von Karten und Lernstand.
/* ---------- DATEN SICHERN / IMPORTIEREN ---------- */
let pendingBackupData = null;

function currentBackupDailyStats(){
  // Nur den heutigen Fortschritt exportieren; abgelaufene Tagesstatistiken sind nicht mehr relevant.
  return loadDailyStats();
}

function showBackupStatus(message, isError = false, elementId = 'backupStatus'){
  const el = document.getElementById(elementId);
  el.style.display = 'block';
  el.style.color = isError ? 'var(--danger)' : 'var(--teal)';
  el.textContent = message;
}

function exportBackup(){
  const payload = {
    format: 'mein-karteikasten-backup',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    cards: cards.map(card => ({...card})),
    dailyStats: currentBackupDailyStats()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mein-karteikasten-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url), 1000);
  showBackupStatus(`Backup erstellt: ${cards.length} Karte(n) inklusive Lernfortschritt.`, false, 'exportStatus');
}

function validateBackupPayload(payload){
  if(!payload || typeof payload !== 'object' || Array.isArray(payload)){
    throw new Error('Die Datei enthält kein gültiges Backup-Objekt.');
  }
  if(payload.format !== 'mein-karteikasten-backup' || payload.formatVersion !== 1){
    throw new Error('Unbekanntes Backup-Format oder nicht unterstützte Version. Bitte eine Backup-Datei aus Mein Karteikasten auswählen.');
  }
  if(!Array.isArray(payload.cards)){
    throw new Error('Im Backup fehlt die Kartenliste.');
  }

  const allowedCategories = new Set(['englisch','spanisch','isaqb','sonstiges']);
  const seenIds = new Set();
  const normalizedCards = payload.cards.map((card, index)=>{
    if(!card || typeof card !== 'object' || Array.isArray(card)){
      throw new Error(`Karte ${index + 1} ist ungültig.`);
    }
    if(typeof card.id !== 'string' || !card.id.trim()){
      throw new Error(`Karte ${index + 1} hat keine gültige ID.`);
    }
    if(seenIds.has(card.id)){
      throw new Error(`Die Karten-ID „${card.id}“ kommt mehrfach im Backup vor.`);
    }
    seenIds.add(card.id);
    if(typeof card.term !== 'string' || !card.term.trim() || typeof card.definition !== 'string' || !card.definition.trim()){
      throw new Error(`Karte ${index + 1} benötigt einen Begriff und eine Definition.`);
    }
    if(!allowedCategories.has(card.category)){
      throw new Error(`Karte „${card.term}“ enthält eine unbekannte Kategorie.`);
    }
    if(!Number.isInteger(card.box) || card.box < 1 || card.box > 5){
      throw new Error(`Karte „${card.term}“ hat eine ungültige Lernbox.`);
    }
    if(typeof card.nextReview !== 'number' || !Number.isFinite(card.nextReview)){
      throw new Error(`Karte „${card.term}“ hat kein gültiges Wiederholungsdatum.`);
    }

    let note = typeof card.note === 'string' ? card.note : '';
    if(!note){
      const example = String(card.example || '').trim();
      const mnemonic = String(card.mnemonic || '').trim();
      note = example && mnemonic ? `Beispiel: ${example}\nEselsbrücke: ${mnemonic}` : (example || mnemonic);
    }
    const normalized = {...card, note};
    delete normalized.example;
    delete normalized.mnemonic;
    if(typeof normalized.createdAt !== 'number' || !Number.isFinite(normalized.createdAt)){
      normalized.createdAt = Date.now();
    }
    return normalized;
  });

  // Übernehme nur Tagesstatistiken vom heutigen lokalen Datum und nur IDs aus dem importierten Bestand.
  let dailyStats = {date: todayKey(), cardIds: [], retryIds: []};
  if(payload.dailyStats && typeof payload.dailyStats === 'object' && payload.dailyStats.date === todayKey()
      && Array.isArray(payload.dailyStats.cardIds)){
    const importedIds = new Set(normalizedCards.map(card => card.id));
    const validCardIds = [...new Set(payload.dailyStats.cardIds.filter(id => typeof id === 'string' && importedIds.has(id)))];
    const retryInput = Array.isArray(payload.dailyStats.retryIds) ? payload.dailyStats.retryIds : [];
    const validRetryIds = [...new Set(retryInput.filter(id => typeof id === 'string' && validCardIds.includes(id)))];
    dailyStats = {date: todayKey(), cardIds: validCardIds, retryIds: validRetryIds};
  }
  return {cards: normalizedCards, dailyStats};
}

function applyBackupImport(backup){
  const previousCardsRaw = localStorage.getItem(STORAGE_KEY);
  const previousStatsRaw = localStorage.getItem(DAILY_STATS_KEY);
  try{
    // Roll back both entries if either write fails, to avoid a partial import.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.cards));
    localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(backup.dailyStats));
  }catch(error){
    try{
      if(previousCardsRaw === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, previousCardsRaw);
      if(previousStatsRaw === null) localStorage.removeItem(DAILY_STATS_KEY);
      else localStorage.setItem(DAILY_STATS_KEY, previousStatsRaw);
    }catch(rollbackError){
      console.error('Rollback nach fehlgeschlagenem Import war nicht vollständig möglich.', rollbackError);
    }
    console.error('Backup konnte nicht gespeichert werden.', error);
    showBackupStatus('Import fehlgeschlagen. Der bisherige Stand wurde nach Möglichkeit wiederhergestellt. Prüfe den verfügbaren Browserspeicher.', true);
    return false;
  }

  cards = backup.cards;
  session = {queue: [], index: 0, correctCount: 0, total: 0, againCounts: new Map()};
  pendingBackupData = null;
  document.getElementById('backupFile').value = '';
  document.getElementById('importDataBtn').disabled = true;
  document.getElementById('backupStatus').style.display = 'none';
  resetSessionView();
  renderHeaderStat();
  renderRecent();
  renderDueSummary();
  renderOverview();
  showBackupStatus(`Import erfolgreich: ${cards.length} Karte(n) wurden geladen.`, false);
  return true;
}

document.getElementById('exportDataBtn').addEventListener('click', exportBackup);

document.getElementById('backupFile').addEventListener('change', async event=>{
  pendingBackupData = null;
  document.getElementById('importDataBtn').disabled = true;
  const file = event.target.files && event.target.files[0];
  if(!file){
    document.getElementById('backupStatus').style.display = 'none';
    return;
  }
  if(file.size > 15 * 1024 * 1024){
    showBackupStatus('Die Datei ist größer als 15 MB und wird nicht importiert.', true);
    return;
  }
  try{
    const payload = JSON.parse(await file.text());
    pendingBackupData = validateBackupPayload(payload);
    const count = pendingBackupData.cards.length;
    const currentDayCount = pendingBackupData.dailyStats.cardIds.length;
    showBackupStatus(`Datei „${file.name}“ geprüft: ${count} Karte(n). Übernommen werden auch Boxen und Fälligkeiten${currentDayCount ? ` sowie der heutige Fortschritt für ${currentDayCount} Karte(n)` : ''}. Klicke auf „Backup importieren“, um fortzufahren.`);
    document.getElementById('importDataBtn').disabled = false;
  }catch(error){
    console.error('Backup-Prüfung fehlgeschlagen.', error);
    showBackupStatus(error instanceof SyntaxError ? 'Die Datei ist kein gültiges JSON-Backup.' : error.message, true);
  }
});

document.getElementById('importDataBtn').addEventListener('click', ()=>{
  if(!pendingBackupData) return;
  const cardCount = pendingBackupData.cards.length;
  const confirmed = window.confirm(`Dieses Backup enthält ${cardCount} Karte(n). Es ersetzt alle aktuell gespeicherten Karten auf diesem Gerät und übernimmt den Lernstand aus der Datei. Wenn du deinen bisherigen Stand behalten möchtest, brich ab und exportiere zuerst ein Backup.\n\nMöchtest du fortfahren?`);
  if(!confirmed) return;
  applyBackupImport(pendingBackupData);
});
