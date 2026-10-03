document.addEventListener('DOMContentLoaded', () => {
  const progress = window.DRProgress;
  const grid = document.getElementById('rewardGrid');
  if (!progress || !grid) return;
  function render() {
    grid.replaceChildren();
    const choices = [{id: 'stock', name: 'District original', color: '#496268', level: 0, detail: 'Original level / holder build'}, ...progress.rewards];
    for (const r of choices) {
      const available = r.level === 0 || progress.unlocked(r);
      const button = document.createElement('button');
      button.type = 'button'; button.disabled = !available; button.className = 'reward-card';
      button.style.setProperty('--paint', r.color);
      button.setAttribute('aria-pressed', String(progress.state.selected === r.id));
      const tier = document.createElement('span'); tier.textContent = r.level ? `LEVEL ${r.level} · ${available ? 'UNLOCKED' : 'LOCKED'}` : 'STANDARD';
      const name = document.createElement('strong'); name.textContent = r.name;
      const detail = document.createElement('small'); detail.textContent = r.detail;
      button.append(tier, name, detail); button.addEventListener('click', () => progress.select(r.id)); grid.append(button);
    }
    document.getElementById('rewardProgress').textContent = `${progress.state.completed} / 20 districts cleared · ${progress.rewards.filter(progress.unlocked).length} / 8 rewards unlocked`;
    document.getElementById('rewardStorage').textContent = progress.saved
      ? 'Cosmetics are saved on this browser and can also be equipped in Lowrider City 3D. Shop rewards are verified separately.'
      : 'Browser storage is unavailable. Cosmetics last only for this visit.';
  }
  window.addEventListener('dr-progress', render); render();
});
