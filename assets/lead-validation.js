/* Fiabilisation des coordonnées — formulaires de demande de devis PME CONSULTANCE
   Complète phone-validation.js : prénom, nom, email, société / activité.
   Bloque les valeurs d'exemple (Jean-Paul Dupont, Ma Société…), les saisies
   fantaisistes (test, azerty, aaaa…), les emails jetables, et propose la
   correction des fautes de frappe courantes (gmial.com -> gmail.com).
   API : PMCLead.check(type, valeur, ctx) -> {ok, value, message, suggestion}
         PMCLead.validateForm(conteneur) -> {ok, values}   (valide aussi le téléphone)
         PMCLead.attach(input, type) */
(function(){
  var CONTACT = " Si c'est bien votre nom, écrivez-nous à administration@pmeconsultance.fr.";

  function norm(s){
    return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'')
      .toLowerCase().replace(/[’'`]/g,"'").replace(/\s+/g,' ').trim();
  }
  function squash(s){ return norm(s).replace(/[^a-z0-9]/g,''); }

  // Saisies « bidon » (comparées sans accents, espaces ni ponctuation)
  var JUNK = ['test','tests','testing','essai','toto','titi','tata','tutu','tete','azerty','azertyuiop','qwerty',
    'qsdf','qsdfgh','asdf','asdfgh','wxcv','wxcvbn','aze','qsd','abc','abcd','abcdef','xxx','xx','xyz','blabla','bla',
    'fake','faux','nom','prenom','name','firstname','lastname','surname','monnom','monprenom','votrenom','votreprenom',
    'anonyme','anonymous','inconnu','unknown','aucun','personne','nobody','client','prospect','moi','lol',
    'nc','none','null','undefined','johndoe','janedoe','foobar','demo','exemple','example','sample'];
  // Noms d'exemple qu'on ne peut pas accepter en guise de prénom
  var FAKE_SURNAMES = ['dupont','dupond','durand','doe'];
  // Placeholders historiques du site et sociétés d'exemple
  var FAKE_COMPANIES = ['masociete','masocietesas','masocietesarl','societe','societesas','monentreprise','entreprise',
    'nomdevotreactiviteoudevotresci','nomdevotreactivite','nomdelentreprise','nomdelasociete','masci','sci',
    'dupontetdupont','dupondetdupond','dupontdupont','acme','acmecorp','societetest',
    'entreprisetest','test','xxx','abc','aaa','na','nc'];
  var EMPTY_COMPANY = ['aucune','aucun','neant','sans','pasencore','encours','nonapplicable','-','/','.','0'];

  var EMAIL_FAKE_LOCAL = ['test','tests','toto','titi','azerty','qwerty','fake','faux','jpdupont','jeanpauldupont',
    'jpdupond','dupont','dupond','jeandupont','johndoe','janedoe','nom','prenom','nomprenom','prenomnom','votreemail',
    'monemail','email','mail','exemple','example','xxx','abc','aaa','noreply','noreponse','spam'];
  var EMAIL_FAKE_DOMAINS = ['masociete.fr','masociete.com','ma-societe.fr','ma-societe.com','societe.com','societe.fr',
    'monentreprise.fr','monentreprise.com','entreprise.com','mondomaine.fr','mondomaine.com','domaine.fr','domaine.com',
    'domain.com','example.com','example.fr','example.org','example.net','exemple.com','exemple.fr','test.com','test.fr',
    'email.fr','fake.com','xxx.com','abc.com','dupont.fr','dupont.com'];
  var DISPOSABLE = ['yopmail.com','yopmail.fr','yopmail.net','cool.fr.nf','jetable.fr.nf','nospam.ze.tc','nomail.xl.cx',
    'mega.zik.dj','speed.1s.fr','courriel.fr.nf','moncourrier.fr.nf','monemail.fr.nf','monmail.fr.nf','jetable.org',
    'jetable.com','mailinator.com','mailinator.net','guerrillamail.com','guerrillamail.net','guerrillamail.org',
    'guerrillamailblock.com','sharklasers.com','grr.la','10minutemail.com','10minutemail.net','10minutemail.fr',
    'temp-mail.org','temp-mail.io','tempmail.com','tempmail.net','tempmail.plus','tempmailo.com','tempr.email',
    'trashmail.com','trashmail.fr','trashmail.net','trash-mail.com','maildrop.cc','getnada.com','nada.email',
    'dispostable.com','throwawaymail.com','fakeinbox.com','mytemp.email','mohmal.com','emailondeck.com','mailnesia.com',
    'spambox.us','discard.email','mintemail.com','moakt.com','burnermail.io','mailcatch.com','spamgourmet.com',
    'tmail.ws','tmpmail.org','tmpmail.net','minuteinbox.com','emailfake.com','fakemail.net','mail-temp.com',
    'crazymailing.com','inboxkitten.com','harakirimail.com','33mail.com','spam4.me','byom.de','mailpoof.com'];
  // Fournisseurs fréquents : sert à détecter les fautes de frappe (gmial.com, hotmail.fe…)
  var PROVIDERS = ['gmail.com','hotmail.com','hotmail.fr','outlook.com','outlook.fr','live.com','live.fr','msn.com',
    'yahoo.com','yahoo.fr','orange.fr','wanadoo.fr','free.fr','sfr.fr','neuf.fr','bbox.fr','laposte.net','icloud.com',
    'me.com','aol.com','gmx.fr','gmx.com','protonmail.com','proton.me'];
  var PROVIDER_TYPOS = {'gmail.fr':'gmail.com','googlemail.fr':'gmail.com','icloud.fr':'icloud.com','laposte.fr':'laposte.net'};

  function lev(a,b){
    if(Math.abs(a.length-b.length)>2) return 9;
    var p=[],i,j; for(j=0;j<=b.length;j++) p[j]=j;
    for(i=1;i<=a.length;i++){
      var prev=p[0]; p[0]=i;
      for(j=1;j<=b.length;j++){
        var tmp=p[j];
        p[j]=Math.min(p[j]+1,p[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));
        if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) p[j]=Math.min(p[j],prev); // inversion approx.
        prev=tmp;
      }
    }
    return p[b.length];
  }

  function capitalise(v){
    // « jean-paul » / « JEAN-PAUL » -> « Jean-Paul » ; une saisie déjà mixte est conservée
    if(v!==v.toLowerCase()&&v!==v.toUpperCase()) return v;
    return v.toLowerCase().replace(/(^|[\s\-'’])([^\s\-'’])/g,function(m,s,c){return s+c.toUpperCase();});
  }
  function looksJunk(n){ // n = squash(valeur)
    if(JUNK.indexOf(n)!==-1) return true;
    if(/(.)\1{2,}/.test(n)) return true;                     // aaa, xxxx
    if(/^(..?)\1{2,}$/.test(n)) return true;                 // ababab, totototo
    if(n.length>=4&&!/[aeiouy]/.test(n)) return true;        // fdsq, xzcv
    return false;
  }
  function res(ok,value,message,suggestion){ return {ok:ok,value:value||'',message:message||'',suggestion:suggestion||''}; }

  function checkName(type,raw,ctx){
    var lbl=type==='prenom'?'votre prénom':'votre nom';
    var v=String(raw||'').replace(/\s+/g,' ').trim();
    if(!v) return res(false,'','Merci de renseigner '+lbl+'.');
    if(/[0-9@_#$%&*+=<>{}\[\]\\|\/~^!?;:"()]/.test(v)) return res(false,'','Merci d\'indiquer '+lbl+' en lettres uniquement.');
    var n=squash(v);
    if(n.length<2) return res(false,'','Merci d\'indiquer '+lbl+' complet.');
    if(looksJunk(n)) return res(false,'','Merci d\'indiquer '+lbl+' réel : il nous sert à préparer votre devis.');
    if(type==='prenom'&&FAKE_SURNAMES.indexOf(n)!==-1)
      return res(false,'','« '+v+' » ressemble à un nom de famille : merci d\'indiquer votre prénom.');
    if(type==='nom'&&/^(et|and)\s/i.test(norm(v))) return res(false,'','Merci d\'indiquer votre nom de famille.');
    if(ctx){
      var p=squash(ctx.prenom), m=type==='nom'?n:squash(ctx.nom);
      if(type==='nom'&&p&&m&&p===m) return res(false,'','Le prénom et le nom sont identiques : merci de vérifier.');
      if(type==='nom'&&(m==='dupont'||m==='dupond')&&/^(jeanpaul|jp|jean|paul)$/.test(p))
        return res(false,'','Il semble s\'agir du nom d\'exemple.'+CONTACT);
    }
    // Prénom mis en forme (jean-paul -> Jean-Paul) ; nom conservé tel que saisi sauf s'il est tout en minuscules
    return res(true,(type==='prenom'||v===v.toLowerCase())?capitalise(v):v);
  }

  function checkCompany(raw,required){
    var v=String(raw||'').replace(/\s+/g,' ').trim();
    if(!v) return required?res(false,'','Merci d\'indiquer le nom de votre société ou de votre activité.'):res(true,'');
    var n=squash(v);
    if(!required&&(EMPTY_COMPANY.indexOf(norm(v))!==-1||EMPTY_COMPANY.indexOf(n)!==-1)) return res(true,v);
    if(!n||n.length<2) return res(false,'','Merci d\'indiquer le nom complet de votre société ou activité.');
    if(FAKE_COMPANIES.indexOf(n)!==-1||/^(ma|mon|votre)(societe|entreprise|activite|sci)/.test(n))
      return res(false,'','Merci d\'indiquer le nom réel de votre société ou activité (pas l\'exemple).');
    if(EMPTY_COMPANY.indexOf(n)!==-1) return res(false,'','Merci d\'indiquer le nom de votre société ou de votre activité.');
    if(JUNK.indexOf(n)!==-1||/(.)\1{3,}/.test(n)||/^(..?)\1{2,}$/.test(n))
      return res(false,'','Merci d\'indiquer le nom réel de votre société ou activité.');
    return res(true,v);
  }

  function checkEmail(raw){
    var v=String(raw||'').trim().replace(/\s+/g,'');
    if(!v) return res(false,'','Merci de renseigner votre adresse email.');
    v=v.replace(/^mailto:/i,'');
    var m=/^([^@\s]+)@([^@\s]+)$/.exec(v);
    if(!m) return res(false,'','Adresse email incomplète, ex. : prenom.nom@entreprise.fr');
    var local=m[1], dom=m[2].toLowerCase().replace(/\.+$/,'');
    if(!/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/.test(local)||/^\.|\.$|\.\./.test(local))
      return res(false,'','La partie avant le « @ » contient des caractères non valides.');
    var domAscii=dom;
    try{ domAscii=new URL('http://'+dom).hostname; }catch(e){}
    if(!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domAscii)||/(^|\.)-|-(\.|$)/.test(domAscii))
      return res(false,'','Le domaine de l\'adresse email semble incorrect (après le « @ »).');
    var domN=norm(dom), localN=squash(local);
    if(domAscii==='xn--socit-esab.com'||domAscii==='xn--socit-esab.fr') domN='societe.com';
    if(EMAIL_FAKE_DOMAINS.indexOf(domN)!==-1||EMAIL_FAKE_LOCAL.indexOf(localN)!==-1||/^(.)\1+$/.test(localN))
      return res(false,'','Cette adresse ressemble à l\'exemple : merci d\'indiquer votre adresse email réelle, à laquelle nous vous enverrons votre devis.');
    if(DISPOSABLE.indexOf(domAscii)!==-1)
      return res(false,'','Les adresses email temporaires ne permettent pas de recevoir votre devis : merci d\'utiliser votre adresse habituelle.');
    var clean=local+'@'+dom, sug='';
    if(PROVIDER_TYPOS[domAscii]) sug=PROVIDER_TYPOS[domAscii];
    else if(/\.(con|cpm|comm|cm|om|co|fe|ft|rf|fg)$/.test(domAscii)&&PROVIDERS.indexOf(domAscii)===-1){
      var base=domAscii.replace(/\.[a-z]+$/,''), bk=9;
      for(var k=0;k<PROVIDERS.length;k++){
        if(PROVIDERS[k].indexOf(base+'.')===0){ var dk=lev(domAscii,PROVIDERS[k]); if(dk<bk){bk=dk;sug=PROVIDERS[k];} }
      }
    }
    if(!sug&&PROVIDERS.indexOf(domAscii)===-1){
      var best=null,bd=9;
      for(var i=0;i<PROVIDERS.length;i++){ var d=lev(domAscii,PROVIDERS[i]); if(d<bd){bd=d;best=PROVIDERS[i];} }
      if(bd>0&&bd<=2&&domAscii.length>=6) sug=best;
    }
    if(sug) return res(true,clean,'',local+'@'+sug);
    return res(true,clean);
  }

  function check(type,raw,ctx){
    if(type==='prenom'||type==='nom') return checkName(type,raw,ctx);
    if(type==='email') return checkEmail(raw);
    if(type==='societe') return checkCompany(raw,!!(ctx&&ctx.required));
    return res(true,String(raw||'').trim());
  }

  // --- Affichage (même rendu que les erreurs du numéro de téléphone) ---
  function box(inp){
    var id=inp.id+'-err', el=document.getElementById(id);
    if(!el){
      el=document.createElement('div'); el.id=id; el.setAttribute('role','alert');
      var inGroup=inp.parentNode&&/form-grp/.test(inp.parentNode.className);
      el.style.cssText='font-size:.8rem;line-height:1.4;'+(inGroup?'margin:0':'margin:-8px 0 14px');
      inp.parentNode.insertBefore(el,inp.nextSibling);
    }
    return el;
  }
  function clear(inp){
    var el=document.getElementById(inp.id+'-err'); if(el) el.parentNode.removeChild(el);
    inp.style.borderColor=''; inp.removeAttribute('aria-invalid');
  }
  function showError(inp,msg){
    var el=box(inp); delete el.dataset.sug; el.style.color='#c44'; el.textContent=msg;
    inp.style.borderColor='#c44'; inp.setAttribute('aria-invalid','true');
  }
  function showSuggestion(inp,sug){
    var el=box(inp);
    if(el.dataset.sug===sug&&el.querySelector('a')){ inp.style.borderColor='#c9a34a'; return; } // déjà affichée
    el.dataset.sug=sug; el.style.color='#8a6d1f'; el.textContent='Vouliez-vous dire ';
    var a=document.createElement('a'); a.href='#'; a.textContent=sug;
    a.style.cssText='color:inherit;font-weight:600;text-decoration:underline';
    a.addEventListener('mousedown',function(e){ e.preventDefault(); }); // évite le blur du champ avant le clic
    a.addEventListener('click',function(e){ e.preventDefault(); inp.value=sug; clear(inp); inp.dataset.pmcOk=sug; });
    el.appendChild(a); el.appendChild(document.createTextNode(' ? Sinon, cliquez à nouveau pour confirmer votre adresse.'));
    inp.style.borderColor='#c9a34a';
  }

  function typeOf(inp){
    var id=inp.id;
    if(id==='prenom'||id==='nom'||id==='email') return id;
    if(id==='societe'||id==='entreprise') return 'societe';
    return null;
  }
  function ctxFor(inp,scope){
    var root=scope||inp.form||document;
    var gp=root.querySelector('#prenom'), gn=root.querySelector('#nom');
    return {prenom:gp?gp.value:'',nom:gn?gn.value:'',required:inp.required};
  }

  // final=true : soumission (une suggestion d'email bloque une seule fois)
  function validateInput(inp,focus,final,scope){
    var type=typeOf(inp); if(!type) return res(true,inp.value);
    var r=check(type,inp.value,ctxFor(inp,scope));
    if(!r.ok){ showError(inp,r.message); if(focus){try{inp.focus();}catch(e){}} return r; }
    if(r.suggestion&&inp.dataset.pmcOk!==r.value){
      showSuggestion(inp,r.suggestion);
      if(final){ inp.dataset.pmcOk=r.value; if(focus){try{inp.focus();}catch(e){}} return res(false,r.value,'suggestion'); }
      return r;
    }
    clear(inp);
    if(r.value&&inp.value!==r.value) inp.value=r.value;
    return r;
  }

  function attach(inp){
    if(!inp||inp.dataset.pmcLead) return;
    var type=typeOf(inp); if(!type) return;
    inp.dataset.pmcLead='1';
    var ac={prenom:'given-name',nom:'family-name',email:'email',societe:'organization'}[type];
    inp.setAttribute('autocomplete',ac);
    if(type==='email'){ inp.setAttribute('inputmode','email'); inp.setAttribute('autocapitalize','off'); inp.setAttribute('spellcheck','false'); }
    else inp.setAttribute('autocapitalize','words');
    inp.addEventListener('blur',function(){ if(inp.value.trim()) validateInput(inp,false,false); });
    inp.addEventListener('input',function(){
      delete inp.dataset.pmcOk;
      var el=document.getElementById(inp.id+'-err');
      if(el){ var r=check(type,inp.value,ctxFor(inp)); if(r.ok&&!r.suggestion) clear(inp); else if(!r.ok) showError(inp,r.message); }
    });
  }

  // Valide tous les champs de coordonnées d'un conteneur, dans l'ordre d'affichage,
  // et place le curseur sur le premier champ à corriger.
  function validateForm(scope){
    scope=scope||document;
    var inputs=scope.querySelectorAll('#prenom,#nom,#email,#telephone,#societe,#entreprise');
    var ok=true, values={};
    for(var i=0;i<inputs.length;i++){
      var inp=inputs[i], r;
      if(inp.id==='telephone'){
        r=window.PMCPhone?window.PMCPhone.validate(inp,ok):res(!!inp.value.trim(),inp.value.trim());
        values.telephone=r.ok?r.e164:'';
      } else {
        r=validateInput(inp,ok,true,scope);
        values[inp.id]=inp.value.trim();
      }
      if(!r.ok) ok=false;
    }
    return {ok:ok,values:values};
  }

  window.PMCLead={check:check,validate:validateInput,validateForm:validateForm,attach:attach};
  function init(){ ['prenom','nom','email','societe','entreprise'].forEach(function(id){ attach(document.getElementById(id)); }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
