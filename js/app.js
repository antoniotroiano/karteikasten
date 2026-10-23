// Initialisierung nach dem Laden aller Module.
/* ---------- INIT ---------- */
(async function init(){
  await loadCards();
  renderHeaderStat();
  renderRecent();
  renderDueSummary();
  renderOverview();
})();
