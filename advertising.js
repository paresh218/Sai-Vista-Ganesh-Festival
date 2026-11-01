(() => {
  const config = window.SaiVistaAdvertising || {};
  const placement = document.getElementById('publicAdvertisement');
  let started = false;
  // A configured consent platform must explicitly permit advertising for this visit.
  function load(event) {
    if (started || !placement || event.detail?.advertisingAllowed !== true || config.enabled !== true ||
        !/^ca-pub-[0-9]{16}$/.test(config.publisherId) || !/^[0-9]{10}$/.test(config.slotId)) return;
    started = true;
    const unit = document.createElement('ins');
    unit.className = 'adsbygoogle';
    unit.style.display = 'block';
    unit.dataset.adClient = config.publisherId;
    unit.dataset.adSlot = config.slotId;
    unit.dataset.adFormat = 'auto';
    unit.dataset.fullWidthResponsive = 'true';
    placement.append(unit);
    placement.hidden = false;
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + config.publisherId;
    script.onerror = () => { placement.hidden = true; };
    document.head.append(script);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }
  window.addEventListener('sai-vista-ad-consent', load);
})();
