const fs   = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, 'settings.json');

const DEFAUT = {
  nom_appartement: 'Appartement Aokas',
  adresse:         'Aokas, Béjaïa, Algérie',
  whatsapp:        '213559862018',
  telephone:       '0559862018',
  prix_haute:      12000,
  prix_basse:      9000,
  max_personnes:   8,
  min_nuits:       1,
};

function lireSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAUT };
  try { return { ...DEFAUT, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }; }
  catch { return { ...DEFAUT }; }
}

function ecrireSettings(data) {
  const settings = { ...lireSettings(), ...data };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  return settings;
}

module.exports = { lireSettings, ecrireSettings };
