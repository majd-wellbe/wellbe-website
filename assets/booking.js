/* Free trial booking for the website. Same backend and rules as the ad landing page
   (Wellbe W40 Backend, tab LEADS W40). Leads from here carry source "website".
   API contract unchanged: GET ?action=slots, POST {action:'lead'}, POST {action:'book'}. */
var CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbxrCVPkY-h2xqTqeHhhaChdaSAf1KbEsJ_HbRSP-oyg4r-qgF-sgSJtFZ0D0uyhDiOS/exec',
  CAP: 3
};
(function(){
  var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var store={get:function(k){try{return JSON.parse(sessionStorage.getItem(k))}catch(e){return null}},set:function(k,v){try{sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  function track(ev){try{if(window.fbq)fbq('track',ev,{content_name:'website'})}catch(e){}}
  function trackC(ev,p){try{if(window.fbq)fbq('trackCustom',ev,p||{})}catch(e){}}
  function esc(t){return String(t||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  var qs=new URLSearchParams(location.search);
  var source=['utm_source','utm_campaign','utm_content','fbclid','by'].map(function(k){return qs.get(k)?k.replace('utm_','')+'='+qs.get(k).slice(0,60):''}).filter(Boolean);
  source=['website'].concat(source).join(' | ');
  // invite link from a friend: ?d=2026-10-14&h=7&by=Rita
  var invite = (/^\d{4}-\d{2}-\d{2}$/.test(qs.get('d')||'') && /^(7|8|9|10)$/.test(qs.get('h')||'')) ? {date:qs.get('d'),hour:+qs.get('h'),by:(qs.get('by')||'your friend').slice(0,30)} : null;

  /* ---------- API (unchanged contract: GET slots, POST lead, POST book) ---------- */
  function apiGet(){ if(!CONFIG.API_URL) return demoSlots(); return fetch(CONFIG.API_URL+'?action=slots&t='+Date.now()).then(function(r){return r.json()}) }
  function apiPost(b){ if(!CONFIG.API_URL) return demoPost(b); return fetch(CONFIG.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(b)}).then(function(r){return r.json()}) }

  /* ---------- dates ---------- */
  function fmt(ymd){ var d=new Date(ymd+'T12:00:00Z'), o={timeZone:'UTC'};
    return {w:d.toLocaleDateString('en-GB',Object.assign({weekday:'short'},o)),n:d.getUTCDate(),
      long:d.toLocaleDateString('en-GB',Object.assign({weekday:'long',day:'numeric',month:'long'},o)),
      short:d.toLocaleDateString('en-GB',Object.assign({weekday:'short',day:'numeric',month:'short'},o))} }
  function hl(h){ return (h%12||12)+':00 '+(h<12?'AM':'PM') }

  /* ---------- state ---------- */
  var data=null, curDay=null, sel=null, mode='book', busy=false;
  var lead=store.get('wbweb_lead');                  // {id, first, name, phone, email}
  var bookBtn=$('#bookBtn'), stickyBtn=$('#stickyBtn'), sticky=$('#sticky');
  function findSlot(date,hour){ var d=(data||[]).filter(function(x){return x.date===date})[0]; return d&&d.slots.filter(function(s){return s.hour===hour})[0] }
  function dayOpen(d){ return d.slots.some(function(s){return s.type!=='full'}) }

  /* ---------- slots on the page ---------- */
  function showBookErr(msg){ var e=$('#bookErr'); e.innerHTML='<svg class="icon" aria-hidden="true"><use href="../assets/icons.svg#i-alert"/></svg><span>'+esc(msg)+'</span>'; e.hidden=!msg }
  function loadSlots(keepSel){
    apiGet().then(function(res){
      if(!res||!res.ok) throw 0; data=res.days||[]; if(res.cap) CONFIG.CAP=res.cap;
      if(!data.length){ $('#slotArea').innerHTML='<p class="empty">No open times this week. Leave your number below and we\'ll find one with you.</p>'; sel=null; updateCta(); return }
      if(sel && !(findSlot(sel.date,sel.hour)||{type:'full'}).type.match(/instant|request/)) sel=null;
      if(!keepSel && invite && !store.get('wbweb_done')){
        var s=findSlot(invite.date,invite.hour), fn=$('#friendNote');
        if(s && s.type!=='full'){ curDay=invite.date; sel={date:invite.date,hour:invite.hour};
          fn.innerHTML='<svg class="icon" aria-hidden="true"><use href="../assets/icons.svg#i-users"/></svg><span>Joining '+esc(invite.by)+' on '+fmt(invite.date).short+' at '+hl(invite.hour)+'. Tap the button below to book your spot.</span>' }
        else fn.innerHTML='<svg class="icon" aria-hidden="true"><use href="../assets/icons.svg#i-users"/></svg><span>'+esc(invite.by)+'\'s session is full or no longer open. Pick another time.</span>';
        fn.hidden=false;
      }
      if(!curDay || !data.some(function(d){return d.date===curDay})){
        var firstOpen=data.filter(dayOpen)[0]; curDay=(firstOpen||data[0]).date;
      }
      renderSlots(); updateCta();
    }).catch(function(){
      $('#slotArea').innerHTML='<div class="empty">We couldn\'t load the open times.<div style="max-width:220px;margin:12px auto 0"><button class="btn ghost" type="button" id="retry">Try again</button></div></div>';
      $('#retry').onclick=function(){ loadSlots(true) };
    });
  }
  function renderSlots(){
    var days='<div class="days" role="group" aria-label="Choose a day">'+data.map(function(d){var f=fmt(d.date), open=dayOpen(d);
      return '<button type="button" class="day'+(open?'':' none')+'" aria-pressed="'+(d.date===curDay)+'" data-day="'+d.date+'" aria-label="'+f.long+(open?'':', full')+'"><b>'+f.w+'</b><span>'+f.n+'</span></button>'}).join('')+'</div>';
    var day=data.filter(function(d){return d.date===curDay})[0];
    var list='<div class="slots" role="group" aria-label="Choose a time on '+fmt(day.date).long+'">'+day.slots.map(function(s){
      var on=sel&&sel.date===day.date&&sel.hour===s.hour, full=s.type==='full';
      return '<button type="button" class="slot" data-h="'+s.hour+'" aria-pressed="'+on+'" '+(full?'disabled aria-label="'+hl(s.hour)+', full"':'')+'><span class="t">'+hl(s.hour)+'</span>'+(full?'<small>Full</small>':'')+'</button>'
    }).join('')+'</div>';
    if(!dayOpen(day)) list+='<p class="empty">This day is full. Try another day.</p>';
    $('#slotArea').innerHTML=days+list;
    var act=$('.day[aria-pressed=true]'); if(act&&act.scrollIntoView&&act.parentNode.scrollWidth>act.parentNode.clientWidth) act.parentNode.scrollLeft=Math.max(0,act.offsetLeft-16);
  }
  $('#slotArea').addEventListener('click',function(e){
    var d=e.target.closest('[data-day]'); if(d){ curDay=d.dataset.day; renderSlots(); return }
    var b=e.target.closest('.slot'); if(!b||b.disabled) return;
    sel={date:curDay,hour:+b.dataset.h}; showBookErr(''); renderSlots(); updateCta();
    trackC('FormStep',{step:1});
  });
  function selLabel(){ return sel? fmt(sel.date).short+', '+hl(sel.hour) : '' }
  function updateCta(){
    if(store.get('wbweb_done')){ bookBtn.disabled=false; bookBtn.textContent='View my booking'; stickyBtn.textContent='View my booking'; if(typeof syncSticky==='function') syncSticky(); return }
    bookBtn.disabled=!sel; bookBtn.textContent= sel ? 'Book '+selLabel() : 'Pick a time above';
    stickyBtn.textContent= sel ? 'Book '+selLabel() : 'Pick a time';
    if(typeof syncSticky==='function') syncSticky();
  }
  bookBtn.addEventListener('click',onCta);
  stickyBtn.addEventListener('click',function(){ if(sel||store.get('wbweb_done')) onCta(); else $('#book').scrollIntoView({behavior:'smooth',block:'start'}) });
  function onCta(){ var d=store.get('wbweb_done'); if(d) return openDone(d); if(sel){ mode='book'; openSheet() } }
  $('#noTimeBtn').addEventListener('click',function(){ mode='callback'; openSheet() });

  // sticky bar: only when the card's own button is off screen
  var ctaInView=true;
  function syncSticky(){ sticky.classList.toggle('hide', ctaInView || !(sel||store.get('wbweb_done'))) }
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(en){ ctaInView=en[0].isIntersecting; syncSticky() },{threshold:0}).observe($('#cardCta'));
  } else { ctaInView=false }

  /* ---------- sheet ---------- */
  var sheet=$('#sheet'), lastFocus=null;
  function lock(on){ document.body.classList.toggle('locked',on) }
  function openSheet(){
    lastFocus=document.activeElement;
    $('#contactForm').hidden=false; $('#doneArea').hidden=true; $('#pfoot').hidden=false; $('#formErr').hidden=true;
    var cb=mode==='callback';
    $('#chosen').hidden=cb;
    $('#sheetLbl').textContent=cb?'We\'ll find a time':'Last step';
    $('#sheetTitle').textContent=cb?'Leave your number':'Hold your spot';
    $('#contactHelp').textContent=cb?'We\'ll message you on WhatsApp within 24 hours to find a time that works for you.':'We confirm your session on WhatsApp.';
    $('#submitBtn').textContent=cb?'Send my number':'Book my free session';
    $('#chosenWhen').textContent=selLabel();
    if(lead){ if(!$('#name').value&&lead.name) $('#name').value=lead.name; if(!$('#phone').value&&lead.phone) $('#phone').value=lead.phone;
      if(lead.email&&!$('#email').value){ $('#email').value=lead.email; showEmail() } }
    sheet.classList.add('open'); sheet.setAttribute('aria-hidden','false'); lock(true);
    trackC('OpenForm'); trackC('FormStep',{step:2});
    setTimeout(function(){ var f=!$('#name').value?$('#name'):!$('#phone').value?$('#phone'):$('#submitBtn'); f.focus({preventScroll:true}) },320);
  }
  function closeSheet(){
    if(busy) return;
    sheet.classList.remove('open'); sheet.setAttribute('aria-hidden','true'); lock(false);
    if(lastFocus&&lastFocus.focus) lastFocus.focus({preventScroll:true});
  }
  $$('[data-close]',sheet).forEach(function(b){ b.addEventListener('click',closeSheet) });
  $('#changeBtn').addEventListener('click',function(){ closeSheet(); $('#book').scrollIntoView({behavior:'smooth',block:'start'}) });
  addEventListener('keydown',function(e){
    if(!sheet.classList.contains('open')) return;
    if(e.key==='Escape') return closeSheet();
    if(e.key==='Tab'){ // keep focus inside the sheet
      var f=$$('.panel button:not([hidden]):not([disabled]),.panel input:not([hidden]),.panel a[href]',sheet).filter(function(x){return x.offsetParent!==null});
      if(!f.length) return; var a=f[0], z=f[f.length-1];
      if(e.shiftKey&&document.activeElement===a){ e.preventDefault(); z.focus() } else if(!e.shiftKey&&document.activeElement===z){ e.preventDefault(); a.focus() }
    }
  });
  function showEmail(){ $('#fEmail').hidden=false; $('#addEmail').hidden=true }
  $('#addEmail').addEventListener('click',function(){ showEmail(); $('#email').focus() });
  $('#name').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('#phone').focus() } });

  /* ---------- validation ---------- */
  var tried=false;
  function check(){
    var name=$('#name').value.trim(), phone=$('#phone').value.trim(), email=$('#email').value.trim();
    var ok={name:name.length>=2, phone:phone.replace(/\D/g,'').length>=7, email:!email||/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)};
    [['fName','name',ok.name],['fPhone','phone',ok.phone],['fEmail','email',ok.email]].forEach(function(x){
      $('#'+x[0]).classList.toggle('bad',tried&&!x[2]); $('#'+x[1]).setAttribute('aria-invalid',tried&&!x[2]?'true':'false') });
    return ok;
  }
  ['name','phone','email'].forEach(function(id){ $('#'+id).addEventListener('input',function(){ if(tried) check() }) });

  function formErr(msg){ var e=$('#formErr'); e.innerHTML='<svg class="icon" aria-hidden="true"><use href="../assets/icons.svg#i-alert"/></svg><span>'+esc(msg)+'</span>'; e.hidden=false; $('#contactForm').scrollTop=0 }
  function setBusy(on,label){ busy=on; var b=$('#submitBtn'); b.disabled=on; b.innerHTML=on?'<span class="spin" aria-hidden="true"></span>'+esc(label):esc(mode==='callback'?'Send my number':'Book my free session') }

  /* ---------- submit: lead (name + phone + optional injury/email), then book the chosen time ---------- */
  $('#contactForm').addEventListener('submit',function(e){
    e.preventDefault(); if(busy) return;
    tried=true; var ok=check();
    if(!ok.name||!ok.phone||!ok.email){ ( !ok.name?$('#name'):!ok.phone?$('#phone'):$('#email') ).focus(); return }
    if(mode==='book'&&!sel){ closeSheet(); return }
    $('#formErr').hidden=true;
    var name=$('#name').value.trim(), phone=$('#phone').value.trim(), email=$('#email').value.trim(), inj=$('#injuries').value.trim();
    setBusy(true, mode==='callback'?'Sending…':'Booking…');
    apiPost({action:'lead',name:name,phone:phone,email:email,source:source,injuries:inj}).then(function(res){
      if(!res||!res.ok) throw new Error(res&&res.error||'Something went wrong. Please try again.');
      lead={id:res.leadId,first:name.split(' ')[0],name:name,phone:phone,email:email}; store.set('wbweb_lead',lead); track('Lead');
      // same phone already booked: show that booking instead of a second one
      if(res.booked){ var o={type:res.type==='Instant'?'Instant':'Request',date:res.date,label:res.time,already:true}; return finish(o) }
      if(mode==='callback') return finish({type:'Callback'});
      return apiPost({action:'book',leadId:res.leadId,date:sel.date,hour:sel.hour}).then(function(b){
        if(!b||!b.ok){
          if(b&&b.already){ setBusy(false); return formErr(b.error||'You already have a trial booked.') }
          // time filled up: back to the times, details are kept
          setBusy(false); closeSheet(); sel=null; showBookErr((b&&b.error)||'That time just filled up. Please pick another.');
          $('#book').scrollIntoView({behavior:'smooth',block:'start'}); loadSlots(true); updateCta(); return;
        }
        track('Schedule');
        finish({type:b.type==='Request'?'Request':'Instant',date:b.date,hour:b.hour});
      });
    }).catch(function(err){
      setBusy(false);
      formErr(err&&err.message&&err.message.length<160&&!/fetch|network|JSON/i.test(err.message)?err.message:'Connection problem. Please check your internet and try again.');
    });
  });
  function finish(o){ setBusy(false); store.set('wbweb_done',o); showBooked(o); openDone(o) }

  /* ---------- done ---------- */
  var TOWELS='<div class="towels" role="img" aria-label="A small 15 by 15 centimetre towel is too small. Bring a towel of at least 30 by 50 centimetres.">'+
    '<figure><svg viewBox="0 0 70 160" width="70" height="160" aria-hidden="true"><g transform="translate(12,108)">'+
      '<rect width="45" height="45" rx="4" fill="var(--towel)" stroke="var(--towel-edge)" stroke-width="1.5"/><rect y="6" width="45" height="3" fill="var(--towel-edge)"/><rect y="36" width="45" height="3" fill="var(--towel-edge)"/>'+
      '<path d="M-6 -6L51 51M51 -6L-6 51" stroke="var(--crimson)" stroke-width="6" stroke-linecap="round"/></g></svg>'+
      '<figcaption><b class="no">Too small</b>15 x 15 cm</figcaption></figure>'+
    '<figure><svg viewBox="0 0 120 160" width="120" height="160" aria-hidden="true"><g transform="translate(15,4)">'+
      '<rect width="90" height="150" rx="6" fill="var(--towel)" stroke="var(--towel-edge)" stroke-width="1.5"/><rect y="12" width="90" height="5" fill="var(--towel-edge)"/><rect y="133" width="90" height="5" fill="var(--towel-edge)"/>'+
      '<circle cx="72" cy="22" r="17" fill="var(--mint-deep)"/><path d="M64 22.5l5.5 5.5 11-11" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>'+
      '<figcaption><b class="yes">Bring this</b>30 x 50 cm</figcaption></figure></div>';
  var MAPS='https://www.google.com/maps/search/?api=1&query=Wellbe+Health+Center+Bsalim';
  function hourOf(o){ if(o.hour!==undefined&&o.hour!==null&&o.hour!=='') return +o.hour;
    var m=String(o.label||'').match(/^(\d{1,2})/), x=m?+m[1]:7; if(/pm/i.test(o.label)&&x<12)x+=12; return x }
  function inviteLink(o){ return location.origin+location.pathname+'?d='+o.date+'&h='+o.hour+'&by='+encodeURIComponent(lead&&lead.first||'')+'&utm_source=friend_invite' }
  function showBooked(o){
    var n=$('#bookedNote');
    if(o.type==='Callback') n.innerHTML='<svg class="icon" aria-hidden="true"><use href="../assets/icons.svg#i-check"/></svg><span>Got it. We\'ll message you on WhatsApp within 24 hours.</span>';
    else n.innerHTML='<svg class="icon" aria-hidden="true"><use href="../assets/icons.svg#i-check"/></svg><span>You\'re booked for '+fmt(o.date).short+', '+hl(hourOf(o))+'.</span>';
    n.hidden=false; updateCta();
  }
  function openDone(o){
    var nm=lead&&lead.first?lead.first:'', h='<div class="done">';
    var booked=(o.type==='Instant'||o.type==='Request');
    if(booked){
      o.hour=hourOf(o);
      if(o.type==='Instant'){
        h+='<div class="ring ok"><svg aria-hidden="true"><use href="../assets/icons.svg#i-check"/></svg></div><span class="status ok">Spot held</span>'+
           '<h2>'+(o.already?'You\'re already booked':'You\'re in'+(nm?', '+esc(nm):'')+'!')+'</h2>'+
           '<div class="when">'+fmt(o.date).long+'<br>'+hl(o.hour)+'</div>'+
           '<p>Romy will message you on WhatsApp within 24 hours to confirm and welcome you.</p>';
      } else {
        h+='<div class="ring wait"><svg aria-hidden="true"><use href="../assets/icons.svg#i-clock"/></svg></div><span class="status wait">Request sent</span>'+
           '<h2>'+(o.already?'Your request is in':'Request received'+(nm?', '+esc(nm):''))+'</h2>'+
           '<div class="when">'+fmt(o.date).long+'<br>'+hl(o.hour)+'</div>'+
           '<p>Your spot is held. We\'ll reach out to you within 24 hours on WhatsApp to confirm and welcome you.</p>';
      }
    } else {
      h+='<div class="ring wait"><svg aria-hidden="true"><use href="../assets/icons.svg#i-clock"/></svg></div><h2>We\'ll reach out'+(nm?', '+esc(nm):'')+'</h2><p>We\'ll message you on WhatsApp within 24 hours to find a time that works for you.</p>';
    }
    if(booked){
      var link=inviteLink(o), msg='I booked a free training session at Wellbe on '+fmt(o.date).short+' at '+hl(o.hour)+'. Join me, it\'s free: '+link;
      h+='<div class="panelbox"><h3>Train with a friend</h3><p>Send a friend this link. They pick the same session and book in a few seconds.</p>'+
         '<div class="share"><a class="btn wa" href="https://wa.me/?text='+encodeURIComponent(msg)+'" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="../assets/icons.svg#i-wa"/></svg>Invite on WhatsApp</a>'+
         '<button class="btn ghost" type="button" id="copyLink">Copy invite link</button><div class="copied" id="copied" aria-live="polite"></div></div></div>';
    }
    h+='<div class="panelbox"><h3>Bring with you</h3><ul>'+
       ['Comfortable clothes and training shoes','A water bottle','A towel, at least 30 x 50 cm'].map(function(t){return '<li><svg aria-hidden="true"><use href="../assets/icons.svg#i-check"/></svg>'+t+'</li>'}).join('')+'</ul>'+TOWELS+'</div>'+
       '<div class="panelbox"><h3>Find us</h3><p style="margin-bottom:12px">Wellbe Health Center, Bsalim</p>'+
       '<a class="btn ghost" href="'+MAPS+'" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="../assets/icons.svg#i-pin"/></svg>Open in Google Maps</a></div>'+
       '<div class="offerbox"><div class="big">Your first session is <b>free</b></div><p>Liked it? Ask Romy which package fits you after your session. No pressure, no payment on the day.</p></div>'+
       '<p style="margin-top:16px;font-size:15px">Questions? <a href="https://wa.me/96176511048" target="_blank" rel="noopener" style="color:var(--mint-deep);font-weight:700">WhatsApp us</a></p>'+
       '<button class="btn ghost" type="button" id="doneClose" style="margin-top:12px">Done</button></div>';
    var da=$('#doneArea'); da.innerHTML=h; da.hidden=false; da.scrollTop=0;
    $('#contactForm').hidden=true; $('#pfoot').hidden=true; $('#sheetLbl').textContent='All done';
    if(!sheet.classList.contains('open')){ lastFocus=document.activeElement; sheet.classList.add('open'); sheet.setAttribute('aria-hidden','false'); lock(true) }
    $('#doneClose').onclick=closeSheet;
    var cp=$('#copyLink'); if(cp) cp.onclick=function(){ var l=inviteLink(o);
      var ok=function(){ $('#copied').textContent='Link copied. Paste it to your friend.' };
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(l).then(ok).catch(function(){ $('#copied').textContent=l });
      else $('#copied').textContent=l; };
    setTimeout(function(){ var t=$('#doneArea h2'); if(t){ t.setAttribute('tabindex','-1'); t.focus({preventScroll:true}) } },320);
  }

  /* ---------- start ---------- */
  var prior=store.get('wbweb_done'); if(prior) showBooked(prior);
  loadSlots(false);
  if(invite && !prior) setTimeout(function(){ $('#book').scrollIntoView({behavior:'smooth',block:'start'}) },300);

  /* ---------- demo mode (API_URL empty): fake slots, nothing is saved ---------- */
  function demoSlots(){ return new Promise(function(res){ setTimeout(function(){
    var days=[], t=new Date(); t.setHours(12);
    for(var i=1;days.length<5;i++){ var d=new Date(t.getTime()+i*864e5), w=d.getDay(); if(w===0||w===6) continue;
      var ymd=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2), k=days.length;
      var pat=[[1,0,3,0],[0,2,0,0],[2,0,0,1],[3,3,3,3],[3,1,0,0]][k];
      days.push({date:ymd,slots:[7,8,9,10].map(function(h,j){return {hour:h,type:pat[j]>=3?'full':'instant'}})}) }
    res({ok:true,days:days,cap:3}) },450) }) }
  function demoPost(b){ return new Promise(function(res){ setTimeout(function(){
    if(b.action==='lead') res({ok:true,leadId:'DEMO-1',booked:false});
    else if(b.action==='answers') res({ok:true});
    else res({ok:true,type:'Instant',date:b.date,hour:b.hour}) },500) }) }
})();
