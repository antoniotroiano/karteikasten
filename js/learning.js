// Leitner-System, Warteschlange, Lernrunde und Bewertungen.
function shuffle(list){
  const copy = [...list];
  for(let i=copy.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Wählt fällige Karten aus allen Boxen. Niedrige Boxen werden bevorzugt,
// gleichzeitig bekommt jede vorhandene Box eine Chance, damit das Lernen
// über die Zeit gemischt bleibt. Innerhalb der Boxen erfolgt die Auswahl zufällig.
function selectSessionCards(due, limit){
  if(due.length <= limit) return shuffle(due);

  const byBox = {1:[], 2:[], 3:[], 4:[], 5:[]};
  due.forEach(c => {
    if(byBox[c.box]) byBox[c.box].push(c);
  });

  const selected = [];
  const selectedIds = new Set();

  // Zuerst je eine Karte aus jeder belegten Box: höhere Boxen werden
  // dadurch nicht komplett von vielen Box-1-Karten verdrängt.
  for(let box=1; box<=5 && selected.length<limit; box++){
    if(byBox[box].length){
      const card = byBox[box][Math.floor(Math.random()*byBox[box].length)];
      selected.push(card);
      selectedIds.add(card.id);
    }
  }

  // Die restlichen Plätze werden gewichtet nach Boxpriorität aufgefüllt.
  const remaining = due.filter(c => !selectedIds.has(c.id));
  const boxWeight = {1:5, 2:3.5, 3:2, 4:1.25, 5:0.75};

  while(selected.length < limit && remaining.length){
    const totalWeight = remaining.reduce((sum,c) => sum + (boxWeight[c.box] || 1), 0);
    let pick = Math.random() * totalWeight;
    let chosenIndex = remaining.length - 1;
    for(let i=0; i<remaining.length; i++){
      pick -= (boxWeight[remaining[i].box] || 1);
      if(pick <= 0){
        chosenIndex = i;
        break;
      }
    }
    selected.push(remaining[chosenIndex]);
    remaining.splice(chosenIndex,1);
  }

  return shuffle(selected);
}


/* ---------- LERNEN ---------- */
document.querySelectorAll('#learnCatRow .filter-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    document.querySelectorAll('#learnCatRow .filter-chip').forEach(c=>{ c.classList.remove('active'); c.setAttribute('aria-pressed','false'); });
    chip.classList.add('active');
    chip.setAttribute('aria-pressed','true');
    selectedLearnCat = chip.dataset.learncat;
    renderDueSummary();
  });
});

function cardsInScope(){
  return selectedLearnCat === 'alle' ? cards : cards.filter(c=>c.category === selectedLearnCat);
}

function renderDueSummary(){
  const now = Date.now();
  const scope = cardsInScope();
  const stats = loadDailyStats();
  const learnedToday = new Set(stats.cardIds);
  const retryIds = new Set(stats.retryIds);
  const byCategory = {englisch:0, spanisch:0, isaqb:0, sonstiges:0};
  let total = 0;
  scope.forEach(c=>{
    if(c.nextReview <= now && (!learnedToday.has(c.id) || retryIds.has(c.id))){ byCategory[c.category]++; total++; }
  });
  const el = document.getElementById('dueSummary');
  const chipsHtml = selectedLearnCat === 'alle' ? `
    <div class="due-chip"><span class="n" style="color:var(--cat-englisch)">${byCategory.englisch}</span>Englisch</div>
    <div class="due-chip"><span class="n" style="color:var(--cat-spanisch)">${byCategory.spanisch}</span>Spanisch</div>
    <div class="due-chip"><span class="n" style="color:var(--cat-isaqb)">${byCategory.isaqb}</span>iSAQB</div>
    <div class="due-chip"><span class="n" style="color:var(--cat-sonstiges)">${byCategory.sonstiges}</span>Sonstiges</div>
  ` : '';
  el.innerHTML = `
    <div class="due-chip total"><span class="n">${total}</span>fällig${selectedLearnCat==='alle' ? ' gesamt' : ' · '+CAT_LABEL[selectedLearnCat]}</div>
    ${chipsHtml}
  `;
  renderLearnActions(total, scope.length);
}

function renderLearnActions(dueCount, scopeLength){
  const el = document.getElementById('learnActions');
  const learnedToday = todayLearnedCount();
  const dailyStats = loadDailyStats();
  const learnedIds = new Set(dailyStats.cardIds);
  const retryIds = new Set(dailyStats.retryIds);
  const availableCount = cardsInScope().filter(c => !learnedIds.has(c.id) || retryIds.has(c.id)).length;
  const sessionSize = Math.min(SESSION_LIMIT, dueCount);
  const freeCount = Math.min(SESSION_LIMIT, availableCount);

  if(dueCount > 0){
    if(learnedToday >= DAILY_GOAL_LIMIT){
      el.innerHTML = `
        <div class="empty-state" style="padding:22px 16px;">
          <div class="big" style="font-size:16px;">Tagesziel erreicht 🎉</div>
          <p style="margin-bottom:14px;">Du hast heute bereits ${learnedToday} verschiedene Karten gelernt. Dein Tagesziel von ${DAILY_GOAL_LIMIT} Karten ist erreicht — du kannst trotzdem direkt noch einmal ${sessionSize} Karten lernen.</p>
          <button class="btn btn-primary btn-block" id="startSessionBtn">Noch einmal ${sessionSize} Karten lernen</button>
        </div>`;
    } else {
      el.innerHTML = `<button class="btn btn-primary btn-block" id="startSessionBtn">Sitzung starten · ${sessionSize} Karten</button>`;
    }
  } else if(availableCount > 0){
    el.innerHTML = `
      <div class="empty-state" style="padding:22px 16px;">
        <div class="big" style="font-size:16px;">Für heute nichts fällig 🎉</div>
        <p style="margin-bottom:14px;">Komm später wieder — oder übe freiwillig ein paar Karten, die eigentlich erst später dran wären.</p>
        <button class="btn btn-ghost btn-block" id="freePracticeBtn">Trotzdem ${freeCount} Karten üben</button>
      </div>`;
  } else if(scopeLength > 0){
    el.innerHTML = `
      <div class="empty-state" style="padding:22px 16px;">
        <div class="big" style="font-size:16px;">Alle Karten für heute gelernt 🎉</div>
        <p>Du hast bereits alle vorhandenen Karten mindestens einmal gelernt. Morgen können wieder fällige Karten dazukommen.</p>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="empty-state" style="padding:22px 16px;">
        <div class="big" style="font-size:16px;">Noch keine Karten vorhanden</div>
        <p>Erfasse zuerst ein paar Begriffe im Tab „Erfassen“.</p>
      </div>`;
  }

  const startBtn = document.getElementById('startSessionBtn');
  if(startBtn) startBtn.addEventListener('click', ()=>startSession(false));
  const freeBtn = document.getElementById('freePracticeBtn');
  if(freeBtn) freeBtn.addEventListener('click', ()=>startSession(true));
}

function resetSessionView(){
  document.getElementById('lernenPre').style.display = 'block';
  document.getElementById('sessionArea').style.display = 'none';
  document.getElementById('doneArea').style.display = 'none';
}

function startSession(forceFree){
  const now = Date.now();
  const scope = cardsInScope();
  const dailyStats = loadDailyStats();
  const learnedToday = new Set(dailyStats.cardIds);
  const retryIds = new Set(dailyStats.retryIds);
  const catText = selectedLearnCat === 'alle' ? '' : ' in der Kategorie „' + CAT_LABEL[selectedLearnCat] + '“';

  let available = scope.filter(c => !learnedToday.has(c.id) || retryIds.has(c.id));
  let due = available.filter(c => c.nextReview <= now);

  if(forceFree){
    due = shuffle(available).slice(0, Math.min(SESSION_LIMIT, available.length));
  } else {
    due = selectSessionCards(due, Math.min(SESSION_LIMIT, due.length));
  }

  if(due.length === 0){
    document.getElementById('lernenPre').innerHTML = `
      <div class="empty-state">
        <div class="big">Für heute nichts verfügbar 🎉</div>
        <p>Es gibt derzeit keine weiteren verfügbaren Karten${catText}. Komm später wieder oder nutze die freiwillige Extra-Runde.</p>
      </div>`;
    return;
  }

  session = { queue: due, index: 0, correctCount: 0, total: due.length, againCounts: new Map() };
  document.getElementById('lernenPre').style.display = 'none';
  document.getElementById('doneArea').style.display = 'none';
  document.getElementById('sessionArea').style.display = 'flex';
  showCurrentCard();
}

document.getElementById('abortSessionBtn').addEventListener('click', ()=>{
  resetSessionView();
  renderDueSummary();
});

function showCurrentCard(){
  const flashcard = document.getElementById('flashcard');
  flashcard.classList.remove('flipped');
  document.getElementById('rateRow').style.display = 'none';
  document.getElementById('flipHint').style.display = 'block';

  const c = session.queue[session.index];
  document.getElementById('progressLine').textContent =
    `Karte ${session.index+1} von ${session.queue.length}`;

  const frontTermEl = document.getElementById('frontTerm');
  frontTermEl.textContent = c.term;
  frontTermEl.classList.toggle('compact', c.term.length > 26);
  document.getElementById('frontCatTab').textContent = CAT_LABEL[c.category];
  document.getElementById('frontCatTab').style.background = `var(${CAT_COLOR_VAR[c.category]})`;
  document.getElementById('frontBoxTag').textContent = 'Box ' + c.box;
  flashcard.setAttribute('aria-pressed','false');
  flashcard.setAttribute('aria-label','Karte umdrehen, Antwort anzeigen');
  document.getElementById('frontContent').classList.toggle('is-long', c.term.length > 26);

  const defEl = document.getElementById('backDef');
  const noteEl = document.getElementById('backNote');
  const defIsLong = c.definition.length > 70 || (c.note && c.note.length > 60);
  document.getElementById('backTerm').textContent = c.term;
  defEl.textContent = c.definition;
  defEl.classList.toggle('compact', defIsLong);
  noteEl.textContent = c.note || '';
  noteEl.classList.toggle('compact', defIsLong);
  document.getElementById('backContent').classList.toggle('is-long', defIsLong);
  document.getElementById('backCatTab').textContent = CAT_LABEL[c.category];
  document.getElementById('backCatTab').style.background = `var(${CAT_COLOR_VAR[c.category]})`;

  sizeFlashcardToContent();
}

function sizeFlashcardToContent(){
  const flashcard = document.getElementById('flashcard');
  // Kurz warten, bis DOM-Text gesetzt ist, dann tatsächliche Inhaltshöhe messen
  requestAnimationFrame(()=>{
    const frontNeeded = document.getElementById('frontContent').scrollHeight + 42; // + top/bottom padding
    const backNeeded = document.getElementById('backContent').scrollHeight + 42;
    const needed = Math.max(220, frontNeeded, backNeeded);
    const capped = Math.min(needed, window.innerHeight * 0.7, 520);
    flashcard.style.height = capped + 'px';
  });
}

window.addEventListener('resize', ()=>{
  if(document.getElementById('sessionArea').style.display !== 'none'){
    sizeFlashcardToContent();
  }
});

document.getElementById('flashcard').addEventListener('click', ()=>{
  const flashcard = document.getElementById('flashcard');
  const flipped = flashcard.classList.toggle('flipped');
  flashcard.setAttribute('aria-pressed', String(flipped));
  flashcard.setAttribute('aria-label', flipped ? 'Karte umdrehen, Vorderseite anzeigen' : 'Karte umdrehen, Antwort anzeigen');
  document.getElementById('rateRow').style.display = flipped ? 'flex' : 'none';
  document.getElementById('flipHint').style.display = flipped ? 'none' : 'block';
});

document.getElementById('flashcard').addEventListener('keydown', event=>{
  if(event.key === 'Enter' || event.key === ' '){
    event.preventDefault();
    event.currentTarget.click();
  }
});

document.querySelectorAll('.rate-btn').forEach(btn=>{
  btn.addEventListener('click', async (e)=>{
    e.stopPropagation();
    await rateCurrentCard(btn.dataset.rate);
  });
});

async function rateCurrentCard(rating){
  const current = session.queue[session.index];
  if(!current) return;
  const interval = BOX_INTERVAL_DAYS;
  const updated = { ...current };

  if(rating === 'again'){
    updated.box = 1;
    updated.nextReview = Date.now(); // bleibt heute fällig, bis sie später sicherer gewusst wird
  } else if(rating === 'hard'){
    updated.nextReview = daysFromNow(Math.max(1, interval[updated.box]*0.5));
    session.correctCount++;
  } else if(rating === 'good'){
    updated.box = Math.min(5, updated.box+1);
    updated.nextReview = daysFromNow(interval[updated.box]);
    session.correctCount++;
  } else if(rating === 'easy'){
    updated.box = Math.min(5, updated.box+2);
    updated.nextReview = daysFromNow(interval[updated.box]);
    session.correctCount++;
  } else {
    return;
  }

  const nextCards = cards.map(c => c.id === updated.id ? updated : c);
  if(!persistCards(nextCards)){
    const hint = document.getElementById('flipHint');
    hint.textContent = 'Speichern fehlgeschlagen. Diese Bewertung wurde nicht übernommen. Bitte erneut versuchen.';
    hint.style.display = 'block';
    showStorageError();
    return;
  }

  // All queue occurrences of the card now point at its latest persisted state.
  session.queue = session.queue.map(c => c.id === updated.id ? updated : c);
  if(rating === 'again'){
    if(!recordCardRatingToday(updated.id, true)){
      window.alert('Die Karte wurde gespeichert, aber der Tagesfortschritt konnte nicht gespeichert werden.');
    }
    // Pro Karte höchstens zwei zusätzliche Wiederholungen in derselben Runde.
    // Beim dritten "Nochmal" bleibt sie in Box 1 fällig, wird aber nicht erneut eingereiht.
    const againCount = (session.againCounts.get(updated.id) || 0) + 1;
    session.againCounts.set(updated.id, againCount);
    if(againCount <= 2){
      const reinsertAt = Math.min(session.queue.length, session.index + 3 + Math.floor(Math.random()*3));
      session.queue.splice(reinsertAt, 0, updated);
    }
  } else {
    if(!recordCardRatingToday(updated.id, false)){
      window.alert('Die Karte wurde gespeichert, aber der Tagesfortschritt konnte nicht gespeichert werden.');
    }
  }

  renderHeaderStat();
  renderDueSummary();

  session.index++;
  if(session.index >= session.queue.length){
    finishSession();
  } else {
    showCurrentCard();
  }
}

function finishSession(){
  document.getElementById('sessionArea').style.display = 'none';
  document.getElementById('doneArea').style.display = 'block';
  document.getElementById('doneStats').textContent =
    `${session.total} Karten wiederholt.`;
  renderDueSummary();
}

document.getElementById('backToOverviewBtn').addEventListener('click', ()=>{
  resetSessionView();
  renderDueSummary();
});
