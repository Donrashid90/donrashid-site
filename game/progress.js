/* Device-local cosmetics only. Never grants shop codes or holder access. */
(() => {
  const KEY = 'dr-garage-progress-v1';
  const rewards = [
    {level: 2, id: 'chrome', name: 'Chrome Classic', color: '#aebfc9', detail: 'Brushed silver paint'},
    {level: 5, id: 'sunset', name: 'Sunset Candy', color: '#e87537', detail: 'Sunset orange paint'},
    {level: 8, id: 'purple', name: 'Purple Haze', color: '#9b4bdd', detail: 'Candy-purple paint'},
    {level: 10, id: 'neon', name: 'Neon Nights', color: '#39e8d3', detail: 'Turquoise paint + underglow'},
    {level: 12, id: 'rose', name: 'Rose Boulevard', color: '#ec518f', detail: 'Hot-pink pearl paint'},
    {level: 15, id: 'gold', name: 'Golden Coast', color: '#eac66b', detail: 'Gold paint + golden wire wheels'},
    {level: 18, id: 'ice', name: 'Pacific Ice', color: '#8edaff', detail: 'Ice-blue paint'},
    {level: 20, id: 'crown', name: 'Boulevard Legend', color: '#f5e2a6', detail: 'Championship paint + crown badge'},
  ];
  let state = {completed: 0, missions: 0, selected: 'stock'};
  let saved = true;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    state.completed = Math.max(0, Math.min(20, Math.floor(Number(raw.completed) || 0)));
    state.missions = Math.max(0, Math.min(6, Math.floor(Number(raw.missions) || 0)));
    if (typeof raw.selected === 'string') state.selected = raw.selected;
  } catch { saved = false; }
  const unlocked = (reward) => state.completed >= reward.level;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); saved = true; } catch { saved = false; }
    window.dispatchEvent(new Event('dr-progress'));
  }
  window.DRProgress = {
    rewards,
    get state() { return {...state}; }, get saved() { return saved; }, unlocked,
    complete(level) {
      const before = state.completed;
      state.completed = Math.max(before, Math.min(20, Math.floor(Number(level) || 0)));
      save(); return rewards.filter(r => r.level > before && unlocked(r));
    },
    mission(index) { state.missions = Math.max(state.missions, Math.min(6, index)); save(); },
    select(id) {
      if (id !== 'stock' && !rewards.some(r => r.id === id && unlocked(r))) return false;
      state.selected = id; save(); return true;
    },
    equipped() { return rewards.find(r => r.id === state.selected && unlocked(r)) || null; },
  };
})();
