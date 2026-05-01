const nodemailer = require('nodemailer');
require('dotenv').config();

// Transporter Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Email au propriétaire : nouvelle réservation ─────────
async function emailNouvelleReservation(reservation) {
  const { reference, nom, telephone, email, date_arrivee, date_depart, nb_personnes, message, prix_total, created_at } = reservation;

  const html = `
  <!DOCTYPE html>
  <html lang="fr">
  <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
  <body style="margin:0;padding:0;background:#f0f9ff;font-family:'Segoe UI',system-ui,sans-serif;">
    <div style="max-width:560px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);">

      <div style="background:linear-gradient(135deg,#075985,#0369a1);padding:28px 24px;text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:8px;">🏠</div>
        <h1 style="color:white;margin:0;font-size:1.3rem;font-weight:800;">Nouvelle demande de réservation</h1>
        <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:.9rem;">Appartement Aokas – Béjaïa</p>
      </div>

      <div style="padding:24px;">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
          <span style="font-size:1.4rem;">🔖</span>
          <div>
            <div style="font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Référence</div>
            <div style="font-size:1.1rem;font-weight:800;color:#0369a1;letter-spacing:1px;">${reference}</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:.88rem;width:42%;">👤 Nom complet</td>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${nom}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:.88rem;">📞 Téléphone</td>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">
              <a href="tel:${telephone}" style="color:#0369a1;text-decoration:none;">${telephone}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:.88rem;">✉️ Email</td>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${email || '—'}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:.88rem;">📅 Arrivée</td>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${formatDate(date_arrivee)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:.88rem;">📅 Départ</td>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${formatDate(date_depart)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:.88rem;">👥 Personnes</td>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">${nb_personnes}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#64748b;font-size:.88rem;">💬 Message</td>
            <td style="padding:10px 0;font-style:italic;">${message || '—'}</td>
          </tr>
        </table>

        <div style="background:linear-gradient(135deg,#075985,#0369a1);border-radius:12px;padding:16px;margin-top:20px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:rgba(255,255,255,.8);font-size:.9rem;">Prix total estimé</span>
          <span style="color:white;font-size:1.4rem;font-weight:800;">${prix_total.toLocaleString('fr-DZ')} DZD</span>
        </div>

        <div style="margin-top:20px;display:flex;gap:12px;">
          <a href="https://wa.me/${telephone.replace(/\D/g,'')}"
             style="flex:1;background:#25D366;color:white;text-align:center;padding:13px;border-radius:10px;text-decoration:none;font-weight:700;font-size:.9rem;">
            💬 WhatsApp
          </a>
          <a href="tel:${telephone}"
             style="flex:1;background:#0369a1;color:white;text-align:center;padding:13px;border-radius:10px;text-decoration:none;font-weight:700;font-size:.9rem;">
            📞 Appeler
          </a>
        </div>

        <p style="color:#94a3b8;font-size:.78rem;text-align:center;margin-top:20px;">
          Reçu le ${created_at} · Appartement Aokas, Béjaïa
        </p>
      </div>
    </div>
  </body>
  </html>`;

  await transporter.sendMail({
    from: `"Réservation Aokas" <${process.env.EMAIL_USER}>`,
    to:   process.env.OWNER_EMAIL,
    subject: `🏠 Nouvelle réservation ${reference} – ${nom}`,
    html,
  });
}

// ─── Email au client : confirmation de réception ──────────
async function emailConfirmationClient(reservation) {
  if (!reservation.email) return; // pas d'email, on skip

  const { reference, nom, date_arrivee, date_depart, nb_personnes, prix_total } = reservation;

  const html = `
  <!DOCTYPE html>
  <html lang="fr">
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#f0f9ff;font-family:'Segoe UI',system-ui,sans-serif;">
    <div style="max-width:500px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);">
      <div style="background:linear-gradient(135deg,#075985,#0369a1);padding:28px 24px;text-align:center;">
        <div style="font-size:3rem;">🎉</div>
        <h1 style="color:white;margin:8px 0 4px;font-size:1.3rem;font-weight:800;">Demande bien reçue !</h1>
        <p style="color:rgba(255,255,255,.8);margin:0;font-size:.9rem;">Appartement Aokas – Béjaïa</p>
      </div>
      <div style="padding:24px;">
        <p style="color:#1e293b;">Bonjour <strong>${nom}</strong>,</p>
        <p style="color:#475569;font-size:.92rem;line-height:1.6;">
          Votre demande de réservation a bien été enregistrée. Nous vous contacterons dans les <strong>24 heures</strong> pour confirmer votre séjour.
        </p>

        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin:20px 0;text-align:center;">
          <div style="font-size:.75rem;color:#64748b;text-transform:uppercase;margin-bottom:6px;">Votre référence</div>
          <div style="font-size:1.3rem;font-weight:800;color:#0369a1;letter-spacing:2px;">${reference}</div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:.9rem;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Arrivée</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${formatDate(date_arrivee)}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Départ</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${formatDate(date_depart)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Personnes</td><td style="padding:8px 0;">${nb_personnes}</td></tr>
        </table>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin-top:20px;font-size:.88rem;color:#166534;">
          ℹ️ En cas de question, contactez-nous directement par WhatsApp ou téléphone.
        </div>
      </div>
    </div>
  </body>
  </html>`;

  await transporter.sendMail({
    from: `"Appartement Aokas" <${process.env.EMAIL_USER}>`,
    to:   reservation.email,
    subject: `✅ Demande reçue – Réf. ${reference}`,
    html,
  });
}

async function emailChangementStatut(reservation, statut) {
  if (!reservation.email) return;
  const { reference, nom, date_arrivee, date_depart, nb_personnes, telephone } = reservation;
  const conf    = statut === 'confirmee';
  const ico     = conf ? '✅' : '❌';
  const titre   = conf ? 'Réservation confirmée !' : 'Réservation annulée';
  const couleur = conf ? '#10b981' : '#ef4444';
  const msgBody = conf
    ? 'Votre réservation est <strong>confirmée</strong>. Nous avons hâte de vous accueillir à Aokas !'
    : 'Votre réservation a été <strong>annulée</strong>. Contactez-nous pour plus d\'informations.';

  const html = `
  <!DOCTYPE html>
  <html lang="fr">
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#f0f9ff;font-family:'Segoe UI',system-ui,sans-serif;">
    <div style="max-width:500px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);">
      <div style="background:${couleur};padding:28px 24px;text-align:center;">
        <div style="font-size:3rem;">${ico}</div>
        <h1 style="color:white;margin:8px 0 4px;font-size:1.3rem;font-weight:800;">${titre}</h1>
        <p style="color:rgba(255,255,255,.8);margin:0;font-size:.9rem;">Appartement Aokas – Béjaïa</p>
      </div>
      <div style="padding:24px;">
        <p style="color:#1e293b;">Bonjour <strong>${nom}</strong>,</p>
        <p style="color:#475569;font-size:.92rem;line-height:1.6;">${msgBody}</p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin:20px 0;text-align:center;">
          <div style="font-size:.75rem;color:#64748b;text-transform:uppercase;margin-bottom:6px;">Référence</div>
          <div style="font-size:1.3rem;font-weight:800;color:#0369a1;letter-spacing:2px;">${reference}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:.9rem;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Arrivée</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${formatDate(date_arrivee)}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Départ</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${formatDate(date_depart)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Personnes</td><td style="padding:8px 0;">${nb_personnes}</td></tr>
        </table>
      </div>
    </div>
  </body>
  </html>`;

  await transporter.sendMail({
    from:    `"Appartement Aokas" <${process.env.EMAIL_USER}>`,
    to:      reservation.email,
    subject: `${ico} ${titre} – Réf. ${reference}`,
    html,
  });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-DZ', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

module.exports = { emailNouvelleReservation, emailConfirmationClient, emailChangementStatut };
