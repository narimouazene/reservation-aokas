const mongoose = require('mongoose');

let connected = false;

async function connect() {
  if (connected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  connected = true;
}

const schema = new mongoose.Schema({
  id:           { type: Number, unique: true },
  reference:    String,
  nom:          String,
  telephone:    String,
  email:        { type: String, default: '' },
  date_arrivee: String,
  date_depart:  String,
  nb_personnes: Number,
  message:      { type: String, default: '' },
  prix_total:   Number,
  statut:       { type: String, default: 'en_attente' },
  created_at:   String,
}, { versionKey: false });

const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', schema);

async function creerReservation(r) {
  await connect();
  r.id         = Date.now();
  r.created_at = new Date().toLocaleString('fr-DZ');
  r.statut     = 'en_attente';
  const doc = await Reservation.create(r);
  return doc.toObject();
}

async function toutesReservations() {
  await connect();
  const docs = await Reservation.find().sort({ id: -1 }).lean();
  return docs;
}

async function reservationParId(id) {
  await connect();
  return await Reservation.findOne({ id: Number(id) }).lean();
}

async function mettreAJourStatut(id, statut) {
  await connect();
  await Reservation.updateOne({ id: Number(id) }, { statut });
}

async function supprimerReservation(id) {
  await connect();
  await Reservation.deleteOne({ id: Number(id) });
}

async function verifierDisponibilite({ date_arrivee, date_depart }) {
  await connect();
  return await Reservation.find({
    statut:       'confirmee',
    date_arrivee: { $lt: date_depart },
    date_depart:  { $gt: date_arrivee },
  }).lean();
}

async function statistiques() {
  await connect();
  const all = await Reservation.find().lean();
  const conf = all.filter(r => r.statut === 'confirmee');
  return {
    total:      all.length,
    confirmees: conf.length,
    en_attente: all.filter(r => r.statut === 'en_attente').length,
    annulees:   all.filter(r => r.statut === 'annulee').length,
    revenus:    conf.reduce((s, r) => s + r.prix_total, 0),
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
