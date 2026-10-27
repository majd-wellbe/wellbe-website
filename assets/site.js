/* Wellbe website: menu, sticky call to action, Meta Pixel PageView (same Pixel as the free trial landing page). */
(function(){
  var PIXEL_ID='1458018466274647';
  if(PIXEL_ID&&!window.fbq){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',PIXEL_ID);fbq('track','PageView')}

  var btn=document.getElementById('menuBtn'), dr=document.getElementById('drawer');
  if(btn&&dr){
    btn.addEventListener('click',function(){var o=dr.hidden;dr.hidden=!o;btn.setAttribute('aria-expanded',String(o));btn.setAttribute('aria-label',o?'Close menu':'Open menu')});
    addEventListener('keydown',function(e){if(e.key==='Escape'&&!dr.hidden){dr.hidden=true;btn.setAttribute('aria-expanded','false');btn.focus()}});
  }

  // sticky "Book my free trial" bar on phones: hidden while a page CTA is on screen
  var bar=document.getElementById('sbar'), watch=document.querySelectorAll('[data-cta]');
  if(bar&&watch.length&&'IntersectionObserver' in window){
    var vis=new Set();
    var io=new IntersectionObserver(function(en){en.forEach(function(x){x.isIntersecting?vis.add(x.target):vis.delete(x.target)});bar.classList.toggle('hide',vis.size>0)},{threshold:0});
    watch.forEach(function(w){io.observe(w)});
  } else if(bar){bar.classList.remove('hide')}

  // count clicks on trial and WhatsApp buttons (custom events, do not touch the landing page's Lead/Schedule)
  document.addEventListener('click',function(e){var a=e.target.closest('a');if(!a||!window.fbq)return;
    try{if(/wa\.me/.test(a.href))fbq('trackCustom','WebsiteWhatsApp');else if(/free-trial/.test(a.getAttribute('href')||''))fbq('trackCustom','WebsiteTrialClick')}catch(x){}});
})();
