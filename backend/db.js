const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'reservations.json');

// ─── Lecture / Écriture fichier JSON ──────────────────────
function lire() {
  if (!fs.existsSync(DB_FILE)) return { reservations: [] };
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { reservations: [] }; }
}

function ecrire(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─── API publique ─────────────────────────────────────────
function creerReservation(r) {
  const db = lire();
  r.id = Date.now();
  r.created_at = new Date().toLocaleString('fr-DZ');
  r.statut = 'en_attente';
  db.reservations.unshift(r);
  ecrire(db);
  return r;
}

function toutesReservations() {
  return lire().reservations;
}

function reservationParId(id) {
  return lire().reservations.find(r => r.id === Number(id));
}

function mettreAJourStatut(id, statut) {
  const db = lire();
  const r  = db.reservations.find(r => r.id === Number(id));
  if (r) { r.statut = statut; ecrire(db); }
}

function verifierDisponibilite({ date_arrivee, date_depart }) {
  return lire().reservations.filter(r =>
    r.statut === 'confirmee' &&
    r.date_arrivee < date_depart &&
    r.date_depart  > date_arrivee
  );
}

function supprimerReservation(id) {
  const db = lire();
  db.reservations = db.reservations.filter(r => r.id !== Number(id));
  ecrire(db);
}

function statistiques() {
  const all = lire().reservations;
  return {
    total:       all.length,
    confirmees:  all.filter(r => r.statut === 'confirmee').length,
    en_attente:  all.filter(r => r.statut === 'en_attente').length,
    annulees:    all.filter(r => r.statut === 'annulee').length,
    revenus:     all.filter(r => r.statut === 'confirmee').reduce((s, r) => s + r.prix_total, 0),
  };
}

module.exports = {
  creerReservation,
  toutesReservations,
  reservationParId,
  mettreAJourStatut,
  supprimerReservation,
  verifierDisponibilite,
  statistiques,
};
