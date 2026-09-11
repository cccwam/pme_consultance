/**
 * PME CONSULTANCE — Capture des leads (formulaires devis & contact)
 * Ajoute une ligne dans le classeur Google "Leads" et notifie par email.
 *
 * Mise en place (une fois) :
 * 1. Depuis le classeur Google : Extensions > Apps Script (projet lié au classeur)
 * 2. Remplacer SHEET_ID par l'ID du classeur (visible dans son URL)
 * 3. Autoriser le script (accès Sheets + Gmail)
 * 4. Déployer > Nouveau déploiement > Application Web :
 *    "Exécuter en tant que : moi" / "Qui a accès : tout le monde"
 * 5. Copier l'URL /exec et la coller dans les fichiers HTML du site
 *    (constante APPS_SCRIPT_URL). Pour mettre à jour ce script plus tard :
 *    même déploiement, nouvelle version — l'URL ne change pas.
 */

const SHEET_ID = 'COLLER_VOTRE_ID_CLASSEUR_ICI';
const SHEET_NAME = 'Leads';
const NOTIFY_EMAIL = 'pmeconsultance@gmail.com';

// Colonnes de la feuille "Leads" (hors colonne date). Les champs inconnus
// du payload sont ignorés (liste blanche).
const COLUMNS = [
  'source', 'offre', 'volume', 'options', 'designation_prestation',
  'option_immatriculation_lmnp', 'tarif_estime', 'total_ht', 'tva', 'total_ttc',
  'prenom', 'nom', 'email', 'telephone', 'entreprise', 'societe', 'poste',
  'chiffre_affaires', 'taille', 'missions', 'briques', 'message'
];

const SOURCES = [
  'Accueil — Devis',
  'Indépendants / SCI / LMNP — Devis',
  'PME/ETI — Contact',
  'Facturation Électronique — Contact'
];

const LABELS = {
  source: 'Source', offre: 'Offre', volume: 'Volume', options: 'Options',
  designation_prestation: 'Prestation', option_immatriculation_lmnp: "Option immatriculation LMNP",
  tarif_estime: 'Tarif estimé', total_ht: 'Total HT', tva: 'TVA', total_ttc: 'Total TTC',
  prenom: 'Prénom', nom: 'Nom', email: 'Email', telephone: 'Téléphone',
  entreprise: 'Entreprise', societe: 'Société', poste: 'Poste',
  chiffre_affaires: "Chiffre d'affaires", taille: 'Taille', missions: 'Missions',
  briques: 'Briques', message: 'Message'
};

// Note : les Web Apps Apps Script ne permettent pas de contrôler le code HTTP
// (toujours 200) — le client doit donc lire le corps de la réponse ("ok"/"err").
function textOutput(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);

    // Pot de miel : invisible pour les humains, rempli par les bots.
    if (d.website) return textOutput('ok');

    if (SOURCES.indexOf(d.source) === -1) return textOutput('err');
    if (!d.prenom || !d.nom || !d.email) return textOutput('err');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(d.email))) return textOutput('err');

    var row = [new Date()].concat(COLUMNS.map(function (k) {
      return d[k] != null ? d[k] : '';
    }));
    SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME).appendRow(row);

    var lignes = COLUMNS.map(function (k) {
      var v = d[k];
      return v ? (LABELS[k] + ' : ' + v) : null;
    }).filter(Boolean).join('\n');

    MailApp.sendEmail(
      NOTIFY_EMAIL,
      d._subject || 'Nouveau lead — site pmeconsultance',
      'Nouvelle demande reçue sur le site.\n\n' + lignes
    );

    return textOutput('ok');
  } catch (err) {
    return textOutput('err');
  }
}

function doGet() {
  return textOutput('404');
}
