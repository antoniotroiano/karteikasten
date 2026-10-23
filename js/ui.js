// Allgemeine Navigation der Oberfläche.
/* ---------- TABS ---------- */
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>{ b.classList.remove('active'); b.removeAttribute('aria-current'); });
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-current','page');
    document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
    if(btn.dataset.tab === 'lernen'){ resetSessionView(); renderDueSummary(); }
    if(btn.dataset.tab === 'uebersicht'){ renderOverview(); }
  });
});
