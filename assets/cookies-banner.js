/* ============================================
   PME CONSULTANCE — Gestion du consentement cookies
   Conforme aux lignes directrices CNIL du 17 septembre 2020
   et à l'article 82 de la loi Informatique et Libertés

   Principes :
   - Aucun cookie soumis à consentement n'est déposé avant choix explicite
   - "Refuser" aussi simple que "Accepter" (même niveau visuel)
   - Choix mémorisé 6 mois (recommandation CNIL)
   - Possibilité de modifier son choix à tout moment
   - Conservation de la preuve de consentement (date + version)
   ============================================ */

(function(){
  'use strict';

  const STORAGE_KEY = 'pmc_cookie_consent_v1';
  const CONSENT_DURATION_DAYS = 180; // 6 mois - recommandation CNIL
  const POLICY_VERSION = '1.0';

  // ===== Catégories de cookies =====
  const CATEGORIES = {
    necessaire: {
      titre: "Cookies strictement nécessaires",
      desc: "Indispensables au fonctionnement du site (sécurité, navigation, mémorisation des préférences cookies). Ils ne peuvent pas être désactivés.",
      toujoursActif: true,
    },
    mesure: {
      titre: "Mesure d'audience",
      desc: "Permettent de comprendre comment vous utilisez le site pour l'améliorer (statistiques anonymisées). Aucune donnée n'est partagée avec des tiers commerciaux.",
      toujoursActif: false,
    },
    fonctionnels: {
      titre: "Fonctionnalités tierces",
      desc: "Activent des fonctionnalités externes comme la prise de rendez-vous, l'intégration vidéo ou les polices web personnalisées.",
      toujoursActif: false,
    },
  };

  // ===== Lecture / écriture du consentement =====
  function getConsent(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      const data = JSON.parse(raw);
      // Vérification d'expiration et de version
      if(data.expire && Date.now() > data.expire) return null;
      if(data.version !== POLICY_VERSION) return null;
      return data;
    }catch(e){ return null; }
  }

  function setConsent(choices){
    const data = {
      version: POLICY_VERSION,
      date: new Date().toISOString(),
      expire: Date.now() + CONSENT_DURATION_DAYS * 24 * 60 * 60 * 1000,
      choix: choices, // { necessaire:true, mesure:true|false, fonctionnels:true|false }
    };
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }catch(e){ /* navigateur restreint */ }
    appliquerConsentement(choices);
    fermerBanner();
    fermerModal();
    // Notification éventuelle pour analytics
    window.dispatchEvent(new CustomEvent('pmcConsentUpdated',{detail:data}));
  }

  // ===== Application effective du consentement =====
  function appliquerConsentement(choix){
    // Active dynamiquement les scripts <script type="text/plain" data-pmc-categorie="mesure">
    document.querySelectorAll('script[data-pmc-categorie]').forEach(s => {
      const cat = s.dataset.pmcCategorie;
      if(choix[cat] && s.type === 'text/plain'){
        const ns = document.createElement('script');
        if(s.src){ ns.src = s.src; }
        else{ ns.textContent = s.textContent; }
        // Copie des attributs
        Array.from(s.attributes).forEach(a => {
          if(['type','data-pmc-categorie'].indexOf(a.name) === -1){
            ns.setAttribute(a.name, a.value);
          }
        });
        s.parentNode.replaceChild(ns, s);
      }
    });
  }

  // ===== Construction du DOM bandeau + modal =====
  function construireDOM(){
    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'pmc-cookies-overlay';
    overlay.id = 'pmcOverlay';
    document.body.appendChild(overlay);

    // Bandeau principal
    const banner = document.createElement('div');
    banner.className = 'pmc-cookies-banner';
    banner.id = 'pmcBanner';
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-labelledby','pmcBannerTitle');
    banner.setAttribute('aria-describedby','pmcBannerDesc');
    banner.innerHTML = `
      <h3 id="pmcBannerTitle">Nous respectons <em>votre vie privée</em></h3>
      <p id="pmcBannerDesc">
        Ce site dépose uniquement des cookies strictement nécessaires à son fonctionnement.
        Avec votre accord, nous utilisons également des cookies de mesure d'audience anonymisée
        pour améliorer votre expérience. Vous pouvez accepter, refuser ou personnaliser vos choix à tout moment.
        Pour en savoir plus, consultez notre <a href="cookies.html">Politique cookies</a>.
      </p>
      <div class="pmc-cookies-actions">
        <button type="button" class="pmc-cookies-btn pmc-cookies-btn-accept" id="pmcAcceptAll">Tout accepter</button>
        <button type="button" class="pmc-cookies-btn pmc-cookies-btn-refuse" id="pmcRefuseAll">Tout refuser</button>
        <button type="button" class="pmc-cookies-btn pmc-cookies-btn-custom" id="pmcCustomize">Personnaliser mes choix</button>
      </div>
    `;
    document.body.appendChild(banner);

    // Modal personnalisation
    const modal = document.createElement('div');
    modal.className = 'pmc-cookies-modal';
    modal.id = 'pmcModal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-labelledby','pmcModalTitle');
    modal.setAttribute('aria-modal','true');

    let categoriesHTML = '';
    Object.keys(CATEGORIES).forEach(key => {
      const cat = CATEGORIES[key];
      categoriesHTML += `
        <div class="pmc-categorie">
          <div class="pmc-categorie-header">
            <h4>${cat.titre}</h4>
            ${cat.toujoursActif
              ? '<span class="pmc-categorie-toujours">Toujours actif</span>'
              : `<label class="pmc-switch">
                   <input type="checkbox" data-pmc-cat="${key}" />
                   <span class="pmc-slider"></span>
                 </label>`
            }
          </div>
          <p>${cat.desc}</p>
        </div>
      `;
    });

    modal.innerHTML = `
      <div class="pmc-cookies-modal-header">
        <h3 id="pmcModalTitle">Paramétrer mes <em>cookies</em></h3>
        <button type="button" class="pmc-cookies-close" id="pmcModalClose" aria-label="Fermer">✕</button>
      </div>
      <div class="pmc-cookies-modal-body">
        <p class="pmc-cookies-intro">
          Choisissez les catégories de cookies que vous acceptez. Votre choix sera mémorisé pendant 6 mois
          et vous pourrez le modifier à tout moment via le lien "Gérer mes cookies" en bas de page.
        </p>
        ${categoriesHTML}
      </div>
      <div class="pmc-cookies-modal-footer">
        <button type="button" class="pmc-cookies-btn pmc-cookies-btn-refuse" id="pmcModalRefuse">Tout refuser</button>
        <button type="button" class="pmc-cookies-btn pmc-cookies-btn-accept" id="pmcModalSave">Enregistrer mes choix</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Liaisons événements
    document.getElementById('pmcAcceptAll').addEventListener('click', () => {
      setConsent({ necessaire:true, mesure:true, fonctionnels:true });
    });
    document.getElementById('pmcRefuseAll').addEventListener('click', () => {
      setConsent({ necessaire:true, mesure:false, fonctionnels:false });
    });
    document.getElementById('pmcCustomize').addEventListener('click', ouvrirModal);
    document.getElementById('pmcModalClose').addEventListener('click', () => {
      fermerModal();
      // Si pas de choix antérieur, on remontre le bandeau
      if(!getConsent()) ouvrirBanner();
    });
    document.getElementById('pmcModalRefuse').addEventListener('click', () => {
      setConsent({ necessaire:true, mesure:false, fonctionnels:false });
    });
    document.getElementById('pmcModalSave').addEventListener('click', () => {
      const choix = { necessaire:true };
      modal.querySelectorAll('input[data-pmc-cat]').forEach(cb => {
        choix[cb.dataset.pmcCat] = cb.checked;
      });
      setConsent(choix);
    });
    overlay.addEventListener('click', () => {
      // Clic en dehors = ne ferme pas (forcer un choix conscient)
    });
  }

  // ===== Ouverture / fermeture =====
  function ouvrirBanner(){
    document.getElementById('pmcBanner').classList.add('show');
  }
  function fermerBanner(){
    document.getElementById('pmcBanner').classList.remove('show');
    document.getElementById('pmcOverlay').classList.remove('show');
  }
  function ouvrirModal(){
    // Pré-cocher selon le consentement existant
    const consent = getConsent();
    const modal = document.getElementById('pmcModal');
    modal.querySelectorAll('input[data-pmc-cat]').forEach(cb => {
      cb.checked = consent ? !!consent.choix[cb.dataset.pmcCat] : false;
    });
    modal.classList.add('show');
    document.getElementById('pmcOverlay').classList.add('show');
    fermerBanner();
  }
  function fermerModal(){
    document.getElementById('pmcModal').classList.remove('show');
    document.getElementById('pmcOverlay').classList.remove('show');
  }

  // ===== API publique =====
  window.PMCCookies = {
    open: () => {
      ouvrirModal();
    },
    revoke: () => {
      try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
      window.location.reload();
    },
    getConsent: () => getConsent(),
    hasConsentFor: (categorie) => {
      const c = getConsent();
      return c && !!c.choix[categorie];
    },
  };

  // ===== Initialisation =====
  function init(){
    construireDOM();
    const existing = getConsent();
    if(existing){
      // Consentement déjà donné : application directe
      appliquerConsentement(existing.choix);
    }else{
      // Premier passage : on affiche le bandeau
      setTimeout(ouvrirBanner, 400);
    }
    // Liaison automatique des éléments [data-pmc-cookies="open"]
    document.querySelectorAll('[data-pmc-cookies="open"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        ouvrirModal();
      });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
