import { supabase } from './supabaseClient.js';

const emojiDisplay = document.getElementById('emoji-display');
const correctBanner = document.getElementById('correct-banner');

function applySubmission(row) {
  emojiDisplay.textContent = row.emoji || '';
}

function applyGameState(state) {
  correctBanner.hidden = state.status !== 'correct';
}

supabase
  .channel('tv_submission')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'submission', filter: 'id=eq.1' },
    (payload) => applySubmission(payload.new)
  )
  .subscribe();

supabase
  .channel('tv_game_state')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'game_state', filter: 'id=eq.1' },
    (payload) => applyGameState(payload.new)
  )
  .subscribe();

async function init() {
  const [{ data: sub }, { data: state }] = await Promise.all([
    supabase.from('submission').select('*').eq('id', 1).single(),
    supabase.from('game_state').select('*').eq('id', 1).single(),
  ]);
  if (sub) applySubmission(sub);
  if (state) applyGameState(state);
}

init();
