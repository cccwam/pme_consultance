/* ============================================
   PME CONSULTANCE — Provenance des demandes de devis
   1. Indique d'où vient le visiteur (paramètres utm, gclid, site référent)
      dans chaque demande envoyée par les formulaires du site.
   2. Envoie l'événement GA4 « generate_lead » quand une demande part.

   Respect du consentement (assets/cookies-banner.js) :
   - Sans consentement « Mesure d'audience » : rien n'est stocké. Seule la
     page en cours est lue (son adresse et le site référent).
   - Avec consentement : la provenance de la première page vue est gardée
     pour la durée de l'onglet (sessionStorage), afin de suivre un visiteur
     arrivé sur une page et qui demande un devis sur une autre.
   - L'événement GA4 ne part que si la balise Google a été activée,
     c'est-à-dire après consentement.
   ============================================ */

(function(){
  'use strict';

  var KEY = 'pmc_provenance_v1';
  var PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid'];

  function lireParams(){
    var o = {};
    try{
      var q = new URLSearchParams(window.location.search);
      PARAMS.forEach(function(k){
        var v = q.get(k);
        if(v){ o[k] = String(v).slice(0, 100); }
      });
    }catch(e){}
    return o;
  }

  function referentExterne(){
    try{
      if(!document.referrer){ return ''; }
      var host = new URL(document.referrer).hostname;
      return host === window.location.hostname ? '' : host;
    }catch(e){ return ''; }
  }

  function consentementMesure(){
    try{
      return !!(window.PMCCookies && window.PMCCookies.hasConsentFor('mesure'));
    }catch(e){ return false; }
  }

  // Provenance de la page en cours (null si navigation interne sans paramètres)
  var params = lireParams();
  var referent = referentExterne();
  var pageCourante = (Object.keys(params).length || referent)
    ? { params: params, referent: referent, arrivee: window.location.pathname }
    : null;

  function memoriser(){
    if(!pageCourante || !consentementMesure()){ return; }
    try{
      if(!window.sessionStorage.getItem(KEY)){
        window.sessionStorage.setItem(KEY, JSON.stringify(pageCourante));
      }
    }catch(e){ /* navigateur restreint : on se contente de la page en cours */ }
  }

  function premiereVisite(){
    if(!consentementMesure()){ return null; }
    try{
      return JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
    }catch(e){ return null; }
  }

  function decrire(t){
    if(!t){ return 'Accès direct ou navigation interne (page : ' + window.location.pathname + ')'; }
    var p = t.params || {};
    var morceaux;
    if(p.utm_source){
      morceaux = [p.utm_source, p.utm_medium || '-', p.utm_campaign || '-'];
      if(p.utm_content){ morceaux.push(p.utm_content); }
      if(p.utm_term){ morceaux.push('terme : ' + p.utm_term); }
      morceaux = morceaux.join(' / ');
    }else if(p.gclid){
      morceaux = 'google / cpc (Google Ads, sans paramètres utm)';
    }else{
      morceaux = 'site référent : ' + t.referent;
    }
    return morceaux + ' — page d\'arrivée : ' + (t.arrivee || window.location.pathname);
  }

  window.PMCLeadSource = {
    // Texte lisible, ajouté au message de la demande et à la colonne « provenance »
    decrire: function(){
      return decrire(premiereVisite() || pageCourante);
    },
    // Événement GA4 « generate_lead », seulement si la balise a été autorisée
    suivre: function(formulaire, montantHt){
      try{
        if(typeof window.gtag !== 'function'){ return; }
        var ev = { form_name: formulaire };
        if(typeof montantHt === 'number' && montantHt > 0){
          ev.value = montantHt;
          ev.currency = 'EUR';
        }
        window.gtag('event', 'generate_lead', ev);
      }catch(e){}
    },
    // Ajoute la provenance à la fin d'un message saisi par le visiteur
    completerMessage: function(message){
      var ligne = 'Provenance : ' + this.decrire();
      return message ? (message + '\n\n— ' + ligne) : ligne;
    }
  };

  memoriser();
  window.addEventListener('pmcConsentUpdated', memoriser);
})();
