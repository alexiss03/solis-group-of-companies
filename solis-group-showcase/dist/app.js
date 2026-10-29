'use strict';
let projects = [];
let selectedCategory = 'All';
const categories = ['All', 'Style & Design', 'Technology', 'Living & Wellbeing', 'Commerce', 'Culture & Community', 'Travel & Experiences'];
const search = document.querySelector('#search');
const availability = document.querySelector('#availability');
const statusFilter = document.querySelector('#project-status');
const statusClasses = {'Published':'published', 'In development':'development', 'Concept':'concept'};
function statusBadge(p) {
 return `<span class="project-status project-status--${statusClasses[p.status]}"><span aria-hidden="true" class="status-dot"></span>${escapeHTML(p.status)}</span>`;
}
const dialog = document.querySelector('#details');
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function projectMark(p, context = 'card') {
 if (!p.logo) return `<span class="monogram ${context === 'dialog' ? 'dialog-mark' : ''}" aria-hidden="true">${escapeHTML(p.mark)}</span>`;
 return `<span class="project-logo project-logo--${p.logoLayout === 'wide' ? 'wide' : 'square'} project-logo--${context}"><img src="assets/${escapeHTML(p.logo)}" alt="${escapeHTML(p.name)} logo" data-project-logo="${p.id}" decoding="async"><span class="logo-fallback" hidden aria-hidden="true">${escapeHTML(p.mark)}</span></span>`;
}
function openProject(id) {
 const p = projects.find(project => project.id === Number(id));
 if (!p) return;
 document.querySelector('#dialog-content').innerHTML = `${p.image ? `<img class="dialog-image" src="assets/${escapeHTML(p.image)}" alt="Imagery from the ${escapeHTML(p.name)} project">` : ''}${projectMark(p, 'dialog')}<div class="dialog-status">${statusBadge(p)}</div><p class="dialog-category">${escapeHTML(p.category)}</p><h2 class="dialog-title" id="dialog-title">${escapeHTML(p.name)}</h2><p class="dialog-desc">${escapeHTML(p.description)}</p>${p.orderUrl ? `<a class="button request-button" href="${escapeHTML(p.orderUrl)}" target="_blank" rel="noopener noreferrer">Order or request a service <span>↗</span></a>` : ''}<p class="dialog-source"><span>CODEX PROJECT</span>${escapeHTML(p.source)}</p>${p.url ? `<a class="button" href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer">Explore the website <span>↗</span></a><p class="dialog-note">Opens the linked project website in a new tab. Its existing access settings apply.</p>` : `<p class="dialog-note">This project is included in the portfolio. A published website link is not currently available.</p>`}`;
 dialog.setAttribute('aria-labelledby', 'dialog-title');
 dialog.showModal();
 document.body.style.overflow = 'hidden';
}
function renderFilters() {
 document.querySelector('#filters').innerHTML = categories.map(category => `<button class="filter" aria-pressed="${category === selectedCategory}" data-filter="${escapeHTML(category)}">${category === 'All' ? 'All projects' : escapeHTML(category)}<span>${category === 'All' ? projects.length : projects.filter(p => p.category === category).length}</span></button>`).join('');
}
function render() {
 const term = search.value.trim().toLocaleLowerCase();
 const filtered = projects.filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && (statusFilter.value === 'all' || p.status === statusFilter.value) && (!term || [p.name,p.source,p.category,p.description,p.status].join(' ').toLocaleLowerCase().includes(term)) && (availability.value === 'all' || (availability.value === 'website' ? !!p.url : !p.url)));
 document.querySelector('#project-grid').innerHTML = filtered.map(p => `<button class="project-card" data-id="${p.id}" data-category="${escapeHTML(p.category)}" aria-label="View ${escapeHTML(p.name)} details"><span class="card-top">${projectMark(p)}<span class="card-arrow" aria-hidden="true">↗</span></span><span class="card-heading-meta"><span class="card-category">${escapeHTML(p.category)}</span>${statusBadge(p)}</span><h3>${escapeHTML(p.name)}</h3><p class="card-desc">${escapeHTML(p.description)}</p><span class="card-bottom"><span class="source" title="Codex project: ${escapeHTML(p.source)}">${escapeHTML(p.source)}</span><span class="availability ${p.url ? 'live' : ''}">${p.url ? 'Website available' : 'Project workspace'}</span></span></button>`).join('');
 document.querySelector('#result-count').textContent = `${filtered.length} of ${projects.length} projects${selectedCategory !== 'All' ? ' · ' + selectedCategory : ''}${statusFilter.value !== 'all' ? ' · ' + statusFilter.value : ''}`;
 document.querySelector('#empty').hidden = filtered.length !== 0;
 document.querySelector('#clear').hidden = selectedCategory === 'All' && !term && availability.value === 'all' && statusFilter.value === 'all';
}
function reset() {selectedCategory = 'All'; search.value = ''; availability.value = 'all'; statusFilter.value = 'all'; renderFilters(); render();}
document.querySelector('#filters').addEventListener('click', event => {const button = event.target.closest('[data-filter]'); if(button){selectedCategory = button.dataset.filter; renderFilters(); render();}});
document.addEventListener('click', event => {const card = event.target.closest('[data-id]'); if(card)openProject(card.dataset.id);});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {document.body.style.overflow = '';});
dialog.addEventListener('click', event => {if(event.target === dialog){const rect = dialog.getBoundingClientRect();if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();}});
search.addEventListener('input', render);
availability.addEventListener('change', render);
statusFilter.addEventListener('change', render);
document.querySelector('#clear').addEventListener('click', reset);
document.querySelector('#empty-reset').addEventListener('click', reset);
document.addEventListener('keydown', event => {if(event.key === '/' && !dialog.open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();search.focus();}});
document.addEventListener('error', event => {
 const image = event.target;
 if (image instanceof HTMLImageElement && image.hasAttribute('data-project-logo')) {
  image.hidden = true;
  image.nextElementSibling.hidden = false;
 }
}, true);
async function init(){
 try {
 const response = await fetch('projects.json');
 if(!response.ok) throw new Error('Portfolio could not load');
 projects = await response.json();
 for (const option of statusFilter.options) {
  if (option.value !== 'all') option.textContent = `${option.value} (${projects.filter(p => p.status === option.value).length})`;
 }
 const names = ['House of Solis','Lakbay','The Wedding Architect','ÉDIT'];
 document.querySelector('#featured-grid').innerHTML = names.map((name,i) => {const p=projects.find(p=>p.name===name);return `<button class="featured-card" data-id="${p.id}" aria-label="Explore ${escapeHTML(p.name)}"><div class="feature-picture"><img src="assets/${escapeHTML(p.image)}" alt="Imagery from ${escapeHTML(p.name)}" loading="lazy"><span class="feature-index">0${i+1} / THE COLLECTIVE</span>${p.logo ? `<span class="feature-logo">${projectMark(p, 'featured')}</span>` : ''}</div><span class="feature-meta">${escapeHTML(p.category)}</span><div class="feature-title"><h3>${escapeHTML(p.name)}</h3><span aria-hidden="true">↗</span></div><p class="feature-desc">${escapeHTML(p.description)}</p></button>`;}).join('');
 renderFilters();render();
 } catch(error){document.querySelector('#result-count').textContent='The portfolio could not load. Please refresh to try again.';}
}
init();
