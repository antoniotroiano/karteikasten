// Konfiguration, gemeinsamer Zustand, Speicherung und Tagesfortschritt.
const STORAGE_KEY = 'vocab-cards';
const DAILY_STATS_KEY = 'vocab-daily-stats';
const SESSION_LIMIT = 6;
const DAILY_GOAL_LIMIT = 8;
const BOX_INTERVAL_DAYS = {1:1, 2:3, 3:7, 4:14, 5:30};
const CAT_LABEL = {englisch:'Englisch', spanisch:'Spanisch', isaqb:'iSAQB', sonstiges:'Sonstiges'};
const CAT_COLOR_VAR = {englisch:'--cat-englisch', spanisch:'--cat-spanisch', isaqb:'--cat-isaqb', sonstiges:'--cat-sonstiges'};
const BOX_LABEL = {1:'Box 1 · täglich', 2:'Box 2 · alle 3 Tage', 3:'Box 3 · wöchentlich', 4:'Box 4 · alle 2 Wochen', 5:'Box 5 · gemeistert'};

let cards = [];
let selectedCat = 'englisch';
let selectedBatchCat = 'englisch';
let session = { queue: [], index: 0, correctCount: 0, total: 0 };
let overviewFilter = 'alle';
let selectedLearnCat = 'alle';
let editingCardId = null;

function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function uid(){ return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }
function daysFromNow(d){ return Date.now() + d*24*60*60*1000; }

function todayKey(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function loadDailyStats(){
  try{
    const raw = localStorage.getItem(DAILY_STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if(parsed && parsed.date === todayKey() && Array.isArray(parsed.cardIds)){
      return {
        date: todayKey(),
        cardIds: [...new Set(parsed.cardIds)],
        // Migration from older versions: retryIds did not exist yet.
        retryIds: [...new Set(Array.isArray(parsed.retryIds) ? parsed.retryIds : [])]
      };
    }
  }catch(e){
    console.error('Tagesfortschritt konnte nicht geladen werden', e);
  }
  return { date: todayKey(), cardIds: [], retryIds: [] };
}

function persistDailyStats(stats){
  try{
    localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(stats));
    return true;
  }catch(e){
    console.error('Tagesfortschritt konnte nicht gespeichert werden', e);
    return false;
  }
}

function todayLearnedIds(){
  return new Set(loadDailyStats().cardIds);
}

function todayRetryIds(){
  return new Set(loadDailyStats().retryIds);
}

function cardsDueForToday(scope, now){
  const stats = loadDailyStats();
  const learnedToday = new Set(stats.cardIds);
  const retryIds = new Set(stats.retryIds);
  return scope.filter(c => c.nextReview <= now && (!learnedToday.has(c.id) || retryIds.has(c.id)));
}

function todayLearnedCount(){
  // Ignore stale IDs left behind by older versions or a failed cleanup after deleting a card.
  const currentIds = new Set(cards.map(c => c.id));
  return [...todayLearnedIds()].filter(id => currentIds.has(id)).length;
}

function recordCardRatingToday(cardId, needsRetry){
  const stats = loadDailyStats();
  if(!stats.cardIds.includes(cardId)) stats.cardIds.push(cardId);
  const retryIds = new Set(stats.retryIds);
  if(needsRetry) retryIds.add(cardId);
  else retryIds.delete(cardId);
  stats.retryIds = [...retryIds];
  return persistDailyStats(stats);
}

function removeCardsFromDailyStats(cardIds){
  const removed = new Set(cardIds);
  const stats = loadDailyStats();
  stats.cardIds = stats.cardIds.filter(id => !removed.has(id));
  stats.retryIds = stats.retryIds.filter(id => !removed.has(id));
  return persistDailyStats(stats);
}


function loadCards(){
  let parsed = [];
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    parsed = raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('Laden fehlgeschlagen', e);
    cards = [];
    return;
  }
  if(!Array.isArray(parsed)){
    console.error('Gespeicherte Karten haben ein ungültiges Format.');
    cards = [];
    return;
  }

  let migrationNeeded = false;
  cards = parsed.map(card=>{
    if(!card || typeof card !== 'object') return card;
    const migrated = { ...card };
    if(typeof migrated.note !== 'string'){
      const example = String(migrated.example || '').trim();
      const mnemonic = String(migrated.mnemonic || '').trim();
      migrated.note = example && mnemonic
        ? `Beispiel: ${example}\nEselsbrücke: ${mnemonic}`
        : (example || mnemonic);
      migrationNeeded = true;
    }
    if(Object.prototype.hasOwnProperty.call(migrated, 'example')){
      delete migrated.example;
      migrationNeeded = true;
    }
    if(Object.prototype.hasOwnProperty.call(migrated, 'mnemonic')){
      delete migrated.mnemonic;
      migrationNeeded = true;
    }
    return migrated;
  });

  // Best-effort migration: memory still uses the unified note field if storage is unavailable.
  if(migrationNeeded){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    }catch(e){
      console.warn('Karten wurden in der Sitzung umgestellt, die Migration konnte aber nicht dauerhaft gespeichert werden.', e);
    }
  }
}
function persistCards(nextCards = cards){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCards));
    cards = nextCards;
    return true;
  }catch(e){
    console.error('Speichern fehlgeschlagen', e);
    return false;
  }
}

function showStorageError(){
  window.alert('Speichern fehlgeschlagen. Deine Änderung wurde nicht übernommen. Bitte prüfe den verfügbaren Speicherplatz bzw. die Browser-Speichereinstellungen.');
}

function announceAppStatus(message, type = 'success'){
  const status = document.getElementById('appStatus');
  if(!status) return;
  status.textContent = message;
  status.classList.toggle('error', type === 'error');
  status.hidden = false;
  clearTimeout(announceAppStatus.timeoutId);
  announceAppStatus.timeoutId = setTimeout(()=>{ status.hidden = true; }, 3500);
}

function renderHeaderStat(){
  const due = cards.filter(c => c.nextReview <= Date.now()).length;
  document.getElementById('headerStat').innerHTML =
    `${cards.length} Karten · <b>${due} fällig</b>`;
}
