/* Validation du numéro de téléphone — formulaires de demande de devis PME CONSULTANCE
   Exige un indicatif pays (+33, 0033…) suivi d'un nombre de chiffres cohérent.
   API : PMCPhone.check(valeur) -> {ok, e164, message} ; PMCPhone.attach(input) */
(function(){
  var MSG_FORMAT = "Numéro invalide. Indiquez l'indicatif pays suivi de votre numéro, ex. : +33 6 12 34 56 78.";
  var RULES = {
    '33':  {min:9, max:9, first:/^[1-9]/, label:'France (+33) : 9 chiffres après l\'indicatif, ex. +33 6 12 34 56 78.'},
    '32':  {min:8, max:9, first:/^[1-9]/, label:'Belgique (+32) : 8 ou 9 chiffres après l\'indicatif.'},
    '41':  {min:9, max:9, first:/^[1-9]/, label:'Suisse (+41) : 9 chiffres après l\'indicatif.'},
    '352': {min:6, max:9, first:/^[1-9]/, label:'Luxembourg (+352) : 6 à 9 chiffres après l\'indicatif.'},
    '49':  {min:6, max:13, first:/^[1-9]/, label:'Allemagne (+49) : 6 à 13 chiffres après l\'indicatif.'},
    '44':  {min:9, max:10, first:/^[1-9]/, label:'Royaume-Uni (+44) : 9 ou 10 chiffres après l\'indicatif.'},
    '34':  {min:9, max:9, first:/^[6-9]/, label:'Espagne (+34) : 9 chiffres après l\'indicatif.'},
    '39':  {min:6, max:11, first:/^[0-9]/, label:'Italie (+39) : 6 à 11 chiffres après l\'indicatif.'},
    '351': {min:9, max:9, first:/^[1-9]/, label:'Portugal (+351) : 9 chiffres après l\'indicatif.'},
    '212': {min:9, max:9, first:/^[5-8]/, label:'Maroc (+212) : 9 chiffres après l\'indicatif.'},
    '213': {min:8, max:9, first:/^[1-9]/, label:'Algérie (+213) : 8 ou 9 chiffres après l\'indicatif.'},
    '216': {min:8, max:8, first:/^[2-9]/, label:'Tunisie (+216) : 8 chiffres après l\'indicatif.'},
    '262': {min:9, max:9, first:/^[1-9]/, label:'La Réunion / Mayotte (+262) : 9 chiffres après l\'indicatif.'},
    '590': {min:9, max:9, first:/^[1-9]/, label:'Guadeloupe (+590) : 9 chiffres après l\'indicatif.'},
    '594': {min:9, max:9, first:/^[1-9]/, label:'Guyane (+594) : 9 chiffres après l\'indicatif.'},
    '596': {min:9, max:9, first:/^[1-9]/, label:'Martinique (+596) : 9 chiffres après l\'indicatif.'},
    '1':   {min:10, max:10, first:/^[2-9]/, label:'USA / Canada (+1) : 10 chiffres après l\'indicatif.'}
  };
  // Suites artificielles : 6 chiffres qui se suivent (345678, 987654) ou, pour un n° à 9 chiffres,
  // paires en progression ou identiques après le 1er chiffre (7 03 04 05 06, 6 12 12 12 12).
  function isSequence(n){
    for(var i=0;i+6<=n.length;i++){
      var up=true,down=true;
      for(var j=i+1;j<i+6;j++){ var a=+n.charAt(j-1),b=+n.charAt(j); if(b!==a+1) up=false; if(b!==a-1) down=false; }
      if(up||down) return true;
    }
    if(n.length===9){
      var p=[+n.substr(1,2),+n.substr(3,2),+n.substr(5,2),+n.substr(7,2)], k, same=true, inc=true, dec=true;
      for(k=1;k<4;k++){ if(p[k]!==p[k-1]) same=false; if(p[k]!==p[k-1]+1) inc=false; if(p[k]!==p[k-1]-1) dec=false; }
      if(same||inc||dec) return true;
    }
    return false;
  }
  function fail(m){return {ok:false,e164:'',message:m||MSG_FORMAT};}
  function check(raw){
    var v=String(raw||'').trim();
    if(!v) return fail('Merci de renseigner votre numéro de téléphone.');
    if(/[^\d\s+().\-]/.test(v)) return fail(MSG_FORMAT);
    var d=v.replace(/[^\d+]/g,'');
    if(d.indexOf('00')===0) d='+'+d.slice(2);
    if(d.charAt(0)!=='+' || d.lastIndexOf('+')>0){
      return fail("Le numéro doit commencer par l'indicatif du pays (ex. +33 pour la France), sans le 0 initial : +33 6 12 34 56 78.");
    }
    d=d.slice(1);
    if(!/^\d+$/.test(d)) return fail(MSG_FORMAT);
    d=d.replace(/^(33|32|41|352|49|44|34|39|351|212|213|216|262|590|594|596)0(?=\d)/,'$1'); // "+33 (0)6…" -> "+336…"
    if(d.charAt(0)==='0') return fail(MSG_FORMAT);
    var cc=null, keys=['352','351','212','213','216','262','590','594','596','33','32','41','49','44','34','39','1'];
    for(var i=0;i<keys.length;i++){ if(d.indexOf(keys[i])===0){cc=keys[i];break;} }
    var national, rule;
    if(cc){ national=d.slice(cc.length); rule=RULES[cc]; }
    else { // autre pays : E.164 générique (indicatif 1 à 3 chiffres, 8 à 15 chiffres au total)
      if(d.length<8||d.length>15) return fail("Numéro international invalide : 8 à 15 chiffres au total, indicatif pays compris.");
      national=d.slice(3);
      rule={min:5,max:12,first:/^[1-9]/};
    }
    if(national.length<rule.min||national.length>rule.max||!rule.first.test(national)){
      return fail(rule.label||MSG_FORMAT);
    }
    if(/(\d)\1{5,}/.test(national)||/^(\d)\1+$/.test(national)||/^(0123456|1234567|12345678|123456789)/.test(national)){
      return fail("Ce numéro ne semble pas valide. Merci d'indiquer un numéro réel, joignable pour votre devis.");
    }
    if(isSequence(national)||(cc==='33'&&national==='612345678')){
      return fail("Ce numéro ne semble pas valide. Merci d'indiquer un numéro réel, joignable pour votre devis.");
    }
    return {ok:true,e164:'+'+d,message:''};
  }
  function showError(inp,msg){
    var id=inp.id+'-err', el=document.getElementById(id);
    if(!msg){ if(el) el.parentNode.removeChild(el); inp.style.borderColor=''; inp.removeAttribute('aria-invalid'); return; }
    if(!el){
      el=document.createElement('div'); el.id=id; el.setAttribute('role','alert');
      var inGroup=inp.parentNode&&/form-grp/.test(inp.parentNode.className);
      el.style.cssText='color:#c44;font-size:.8rem;line-height:1.4;'+(inGroup?'margin:0':'margin:-8px 0 14px');
      inp.parentNode.insertBefore(el,inp.nextSibling);
    }
    el.textContent=msg; inp.style.borderColor='#c44'; inp.setAttribute('aria-invalid','true');
  }
  function validateInput(inp,focus){
    var r=check(inp.value);
    showError(inp,r.ok?'':r.message);
    if(!r.ok&&focus){try{inp.focus();}catch(e){}}
    if(r.ok) inp.value=r.e164.replace(/^(\+\d{2,3})(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/,'$1 $2 $3 $4 $5 $6'); // mise en forme lisible
    return r;
  }
  function attach(inp){
    if(!inp) return;
    inp.setAttribute('inputmode','tel'); inp.setAttribute('autocomplete','tel');
    inp.setAttribute('placeholder',inp.getAttribute('placeholder')||'+33 6 12 34 56 78');
    inp.addEventListener('blur',function(){ if(inp.value.trim()) validateInput(inp,false); });
    inp.addEventListener('input',function(){ if(document.getElementById(inp.id+'-err')) showError(inp, check(inp.value).ok?'':check(inp.value).message); });
  }
  window.PMCPhone={check:check,validate:validateInput,attach:attach};
  document.addEventListener('DOMContentLoaded',function(){ attach(document.getElementById('telephone')); });
})();
