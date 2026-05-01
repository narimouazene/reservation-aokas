require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = process.env.MONGODB_URI ? require('./db-mongo') : require('./db');
const { emailNouvelleReservation, emailConfirmationClient, emailChangementStatut } = require('./mailer');
const { lireSettings, ecrireSettings } = require('./settings');

const app = express();

app.use(cors());
app.use(express.json());

// ─── Servir le frontend ────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Calcul du prix (même logique que le frontend) ────────
function calculerTotal(dateArrivee, dateDepart) {
  const s = lireSettings();
  let total = 0, nuits = 0;
  let cur = new Date(dateArrivee);
  const fin = new Date(dateDepart);
  while (cur < fin) {
    const m = cur.getMonth() + 1;
    total += (m === 7 || m === 8) ? s.prix_haute : s.prix_basse;
    nuits++;
    cur = new Date(cur.getTime() + 86400000);
  }
  return { total, nuits };
}

function genRef() {
  return 'AOK-' + Date.now().toString(36).toUpperCase().slice(-6);
}

function adminCheck(req, res) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== process.env.ADMIN_KEY) {
    res.status(401).json({ erreur: 'Accès non autorisé.' });
    return false;
  }
  return true;
}

// ════════════════════════════════════════════════
// API PUBLIQUE
// ════════════════════════════════════════════════

// POST /api/reservations ─ Soumettre une réservation
app.post('/api/reservations', async (req, res) => {
  try {
    const { nom, telephone, email, date_arrivee, date_depart, nb_personnes, message } = req.body;

    // Validation
    const erreurs = [];
    if (!nom       || nom.trim().length < 3)  erreurs.push('Nom invalide.');
    if (!telephone || telephone.replace(/\D/g,'').length < 8) erreurs.push('Téléphone invalide.');
    if (!date_arrivee) erreurs.push('Date d\'arrivée manquante.');
    if (!date_depart)  erreurs.push('Date de départ manquante.');
    if (date_depart <= date_arrivee) erreurs.push('La date de départ doit être après l\'arrivée.');
    if (erreurs.length) return res.status(400).json({ erreurs });

    // Vérifier durée minimum
    const { nuits: nuitsCheck } = calculerTotal(date_arrivee, date_depart);
    const s = lireSettings();
    if (nuitsCheck < s.min_nuits) {
      return res.status(400).json({ erreurs: [`Séjour minimum : ${s.min_nuits} nuit${s.min_nuits > 1 ? 's' : ''}.`] });
    }

    // Vérifier disponibilité
    const conflits = db.verifierDisponibilite({ date_arrivee, date_depart });
    if (conflits.length > 0) {
      return res.status(409).json({
        erreur: 'Ces dates sont déjà réservées.',
        conflits,
      });
    }

    // Calculer le prix
    const { total: prix_total, nuits } = calculerTotal(date_arrivee, date_depart);
    const reference = genRef();

    // Sauvegarder en base
    db.creerReservation({
      reference,
      nom:          nom.trim(),
      telephone:    telephone.trim(),
      email:        (email || '').trim(),
      date_arrivee,
      date_depart,
      nb_personnes: parseInt(nb_personnes) || 1,
      message:      (message || '').trim(),
      prix_total,
    });

    const reservation = db.toutesReservations().find(r => r.reference === reference);

    // Envoyer les emails (sans bloquer la réponse si ça échoue)
    Promise.all([
      emailNouvelleReservation(reservation),
      emailConfirmationClient(reservation),
    ]).catch(err => console.warn('Email non envoyé :', err.message));

    res.status(201).json({
      reference,
      nuits,
      prix_total,
      message: 'Réservation enregistrée avec succès.',
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// GET /api/dates-reservees ─ dates confirmées (pour le calendrier client)
app.get('/api/dates-reservees', async (req, res) => {
  try {
    const toutes = await db.toutesReservations();
    const confirmees = toutes.filter(r => r.statut === 'confirmee');
    res.json(confirmees.map(r => ({ debut: r.date_arrivee, fin: r.date_depart })));
  } catch { res.json([]); }
});

// GET /api/disponible?debut=YYYY-MM-DD&fin=YYYY-MM-DD
app.get('/api/disponible', async (req, res) => {
  const { debut, fin } = req.query;
  if (!debut || !fin) return res.status(400).json({ erreur: 'Paramètres manquants.' });
  try {
    const conflits = await db.verifierDisponibilite({ date_arrivee: debut, date_depart: fin });
    res.json({ disponible: conflits.length === 0, conflits });
  } catch { res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// ════════════════════════════════════════════════
// API ADMIN (protégée par ADMIN_KEY)
// ════════════════════════════════════════════════

// GET /api/admin/reservations
app.get('/api/admin/reservations', async (req, res) => {
  if (!adminCheck(req, res)) return;
  try { res.json(await db.toutesReservations()); }
  catch { res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// GET /api/admin/stats
app.get('/api/admin/stats', async (req, res) => {
  if (!adminCheck(req, res)) return;
  try { res.json(await db.statistiques()); }
  catch { res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// PATCH /api/admin/reservations/:id  ─ Changer le statut
app.patch('/api/admin/reservations/:id', async (req, res) => {
  if (!adminCheck(req, res)) return;
  const { statut } = req.body;
  const valides = ['en_attente', 'confirmee', 'annulee'];
  if (!valides.includes(statut)) return res.status(400).json({ erreur: 'Statut invalide.' });
  try {
    const r = await db.reservationParId(Number(req.params.id));
    if (!r) return res.status(404).json({ erreur: 'Réservation introuvable.' });
    await db.mettreAJourStatut(r.id, statut);
    if (statut === 'confirmee' || statut === 'annulee') {
      const updated = await db.reservationParId(r.id);
      emailChangementStatut(updated, statut)
        .catch(err => console.warn('Email statut non envoyé :', err.message));
    }
    res.json({ succes: true, id: r.id, statut });
  } catch { res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// DELETE /api/admin/reservations/:id  ─ Supprimer
app.delete('/api/admin/reservations/:id', async (req, res) => {
  if (!adminCheck(req, res)) return;
  try {
    const r = await db.reservationParId(Number(req.params.id));
    if (!r) return res.status(404).json({ erreur: 'Réservation introuvable.' });
    await db.supprimerReservation(r.id);
    res.json({ succes: true });
  } catch { res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// GET /api/settings ─ Paramètres publics (pour le frontend)
app.get('/api/settings', (req, res) => {
  res.json(lireSettings());
});

// GET /api/admin/settings
app.get('/api/admin/settings', (req, res) => {
  if (!adminCheck(req, res)) return;
  res.json(lireSettings());
});

// PUT /api/admin/settings
app.put('/api/admin/settings', (req, res) => {
  if (!adminCheck(req, res)) return;
  const champs = ['nom_appartement','adresse','whatsapp','telephone','prix_haute','prix_basse','max_personnes','min_nuits'];
  const data = {};
  champs.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  if (data.prix_haute)    data.prix_haute    = Number(data.prix_haute);
  if (data.prix_basse)    data.prix_basse    = Number(data.prix_basse);
  if (data.max_personnes) data.max_personnes = Number(data.max_personnes);
  if (data.min_nuits)     data.min_nuits     = Number(data.min_nuits);
  const updated = ecrireSettings(data);
  res.json({ succes: true, settings: updated });
});

// ─── Fallback → renvoie index.html pour les routes frontend ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Serveur lancé sur http://localhost:${PORT}`);
  console.log(`📋 Admin panel  : http://localhost:${PORT}/admin.html`);
  console.log(`🔑 Clé admin    : ${process.env.ADMIN_KEY}\n`);
});
