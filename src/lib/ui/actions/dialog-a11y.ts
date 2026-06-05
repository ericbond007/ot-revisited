// #1226 — modal a11y. A Svelte action applied to a modal's card element to give
// it proper dialog semantics + keyboard behavior, without rewriting each modal:
//   - role="dialog" + aria-modal="true"
//   - aria-labelledby wired to the card's first heading (id auto-assigned)
//   - focus moved into the card on mount, restored to the opener on destroy
//   - Tab/Shift+Tab trapped within the card
//   - Escape calls onClose (omit onClose for forced-choice modals)
//
// Usage: <div class="panel modal-body" use:dialogA11y={{ onClose: onclose }}>

export interface DialogA11yParams {
  /** Called on Escape. Omit for modals that must not be dismissed (forced choice). */
  onClose?: () => void;
}

let uid = 0;

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function dialogA11y(node: HTMLElement, params: DialogA11yParams = {}) {
  let onClose = params.onClose;
  const opener = document.activeElement as HTMLElement | null;

  if (!node.getAttribute('role')) node.setAttribute('role', 'dialog');
  node.setAttribute('aria-modal', 'true');
  if (!node.hasAttribute('tabindex')) node.tabIndex = -1;

  // Label the dialog from its first heading, if not already labelled.
  if (!node.hasAttribute('aria-labelledby') && !node.hasAttribute('aria-label')) {
    const heading = node.querySelector('h1, h2, h3, h4');
    if (heading) {
      if (!heading.id) heading.id = `dlg-title-${++uid}`;
      node.setAttribute('aria-labelledby', heading.id);
    }
  }

  const visibleFocusables = (): HTMLElement[] =>
    Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );

  // Move focus into the dialog after it mounts.
  queueMicrotask(() => {
    if (!node.contains(document.activeElement)) {
      (visibleFocusables()[0] ?? node).focus();
    }
  });

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (onClose) {
        e.stopPropagation();
        onClose();
      }
      return;
    }
    if (e.key !== 'Tab') return;
    const f = visibleFocusables();
    if (f.length === 0) {
      e.preventDefault();
      node.focus();
      return;
    }
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement as HTMLElement;
    if (e.shiftKey && (active === first || !node.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  node.addEventListener('keydown', onKeydown);

  return {
    update(next: DialogA11yParams) {
      onClose = next.onClose;
    },
    destroy() {
      node.removeEventListener('keydown', onKeydown);
      opener?.focus?.();
    }
  };
}
