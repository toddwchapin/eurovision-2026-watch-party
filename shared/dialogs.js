document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    const panel = backdrop.querySelector('.modal');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    const heading = panel.querySelector('h3'); heading.id ||= backdrop.id + 'Title'; panel.setAttribute('aria-labelledby', heading.id);
    let prior;
    new MutationObserver(() => {
      if (backdrop.classList.contains('active')) { prior = document.activeElement; panel.querySelector('input,button,select')?.focus(); }
      else if (prior?.isConnected) prior.focus();
    }).observe(backdrop, { attributes: true, attributeFilter: ['class'] });
    backdrop.addEventListener('keydown', e => {
      const items = [...panel.querySelectorAll('input,select,textarea,button,a[href]')].filter(el => !el.disabled && el.getClientRects().length);
      if (e.key === 'Escape') { const close = panel.querySelector('.modal-close'); if (close?.getClientRects().length) close.click(); }
      if (e.key === 'Tab' && items.length) {
        if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
      }
    });
  });
});
