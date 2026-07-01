import { supabase } from './supabaseClient.js';
import { filterEmojiOnly } from './emoji.js';

const phraseEl = document.getElementById('phrase-text');
const statusEl = document.getElementById('status-text');
const form = document.getElementById('emoji-form');
const input = document.getElementById('emoji-input');

let debounceTimer = null;

function applyGameState(state) {
  phraseEl.textContent = state.phrase || 'Waiting for the DM to send a phrase…';

  if (state.status === 'correct') {
    statusEl.textContent = '✅ Correct! Waiting for the next round…';
    input.disabled = true;
  } else if (state.phrase) {
    statusEl.textContent = 'Encode this phrase in emojis!';
    input.disabled = false;
  } else {
    statusEl.textContent = '';
    input.disabled = true;
  }

  if (!state.phrase || state.status === 'idle') {
    input.value = '';
  }
}

async function submitEmoji(value) {
  await supabase
    .from('submission')
    .upsert({ id: 1, emoji: value, updated_at: new Date().toISOString() });
}

input.addEventListener('input', () => {
  const filtered = filterEmojiOnly(input.value);
  if (filtered !== input.value) input.value = filtered;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => submitEmoji(input.value), 150);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  clearTimeout(debounceTimer);
  submitEmoji(input.value);
});

supabase
  .channel('player_game_state')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'game_state', filter: 'id=eq.1' },
    (payload) => applyGameState(payload.new)
  )
  .subscribe();

async function init() {
  const { data, error } = await supabase.from('game_state').select('*').eq('id', 1).single();
  if (!error) applyGameState(data);
}

init();
