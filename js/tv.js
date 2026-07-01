import { supabase } from './supabaseClient.js';

const stage = document.getElementById('tv-stage');
const emojiDisplay = document.getElementById('emoji-display');
const correctBanner = document.getElementById('correct-banner');

function fitEmojiText() {
  if (!emojiDisplay.textContent) return;

  let lo = 8;
  let hi = 500;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    emojiDisplay.style.fontSize = mid + 'px';
    const fits =
      emojiDisplay.scrollWidth <= stage.clientWidth &&
      emojiDisplay.scrollHeight <= stage.clientHeight;
    if (fits) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  emojiDisplay.style.fontSize = lo + 'px';
}

function applySubmission(row) {
  emojiDisplay.textContent = row.emoji || '';
  fitEmojiText();
}

function applyGameState(state) {
  correctBanner.hidden = state.status !== 'correct';
}

window.addEventListener('resize', fitEmojiText);

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
