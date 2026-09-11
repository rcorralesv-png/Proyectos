// Trusted, static line icons for the vanilla DOM builders. No user content is interpolated.
const paths = {
  shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  package: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v8M7.5 5.5l9 5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  branch: '<path d="M6 6v12M6 14c9 0 12-3 12-8"/><circle cx="6" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="4" r="2"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
  clipboard: '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/>',
  laptop: '<rect x="4" y="3" width="16" height="13" rx="2"/><path d="m4 16-2 4h20l-2-4"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 0-10 6 6 0 0 1 11-1 5.5 5.5 0 0 1 0 11H7Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 0 0 18 18 18 0 0 0 0-18Z"/>',
  alert: '<path d="m12 3 10 18H2L12 3ZM12 9v5M12 17h.01"/>',
};
const names = {
  '🔍': 'search', '✅': 'check', '📦': 'package', '🔬': 'code',
  '🔐': 'lock', '🔒': 'lock', '🔑': 'lock', '👁️': 'eye', '🌿': 'branch',
  '🔀': 'branch', '⚙️': 'terminal', '🤖': 'terminal', '⬛': 'terminal',
  '🚀': 'upload', '📋': 'clipboard', '📏': 'clipboard', '🚦': 'shield',
  '💻': 'laptop', '☁️': 'cloud', '🌐': 'globe', '💥': 'alert', '🕸️': 'code',
  '⚡': 'branch', '🧪': 'check', '🛡️': 'shield',
};

export function renderIcon(symbol) {
  const path = paths[names[symbol] || symbol] || paths.shield;
  return `<svg class="hsw-line-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
