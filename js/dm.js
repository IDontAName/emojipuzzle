import { supabase } from './supabaseClient.js';

const statusPill = document.getElementById('status-pill');
const randomizeToggle = document.getElementById('randomize-toggle');
const listSelect = document.getElementById('list-select');
const manualPhraseRow = document.getElementById('manual-phrase-row');
const manualPhraseInput = document.getElementById('manual-phrase');
const sendPhraseBtn = document.getElementById('send-phrase-btn');
const randomPhraseRow = document.getElementById('random-phrase-row');
const nextPhraseBtn = document.getElementById('next-phrase-btn');
const resetUsedBtn = document.getElementById('reset-used-btn');
const currentPhraseDisplay = document.getElementById('current-phrase-display');
const liveSubmission = document.getElementById('live-submission');
const markCorrectBtn = document.getElementById('mark-correct-btn');
const nextRoundBtn = document.getElementById('next-round-btn');

const listFileNameInput = document.getElementById('list-file-name');
const listFileInput = document.getElementById('list-file-input');
const uploadListBtn = document.getElementById('upload-list-btn');
const uploadError = document.getElementById('upload-error');
const phrasesContainer = document.getElementById('phrases-container');

function setPhraseModeUI(randomizeEnabled) {
  manualPhraseRow.classList.toggle('hidden', randomizeEnabled);
  randomPhraseRow.classList.toggle('hidden', !randomizeEnabled);
}

function applyGameState(state) {
  statusPill.textContent = state.status;
  currentPhraseDisplay.textContent = state.phrase || '—';
  randomizeToggle.checked = state.randomize_enabled;
  setPhraseModeUI(state.randomize_enabled);
  if (state.active_list_id) listSelect.value = state.active_list_id;
}

function applySubmission(row) {
  liveSubmission.textContent = row.emoji || '—';
}

async function loadLists() {
  const { data, error } = await supabase
    .from('phrase_lists')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return;

  const previousValue = listSelect.value;
  listSelect.innerHTML = '';
  data.forEach((list) => {
    const opt = document.createElement('option');
    opt.value = list.id;
    opt.textContent = list.name;
    listSelect.appendChild(opt);
  });
  if (previousValue && data.some((l) => l.id === previousValue)) {
    listSelect.value = previousValue;
  }
}

async function loadPhrases() {
  const listId = listSelect.value;
  phrasesContainer.innerHTML = '';
  if (!listId) return;

  const { data, error } = await supabase
    .from('phrases')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: true });
  if (error) return;

  data.forEach((phrase) => {
    const row = document.createElement('div');
    row.className = 'phrase-list-row' + (phrase.used ? ' used' : '');
    const span = document.createElement('span');
    span.textContent = phrase.text;
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      await supabase.from('phrases').delete().eq('id', phrase.id);
      loadPhrases();
    });
    row.appendChild(span);
    row.appendChild(delBtn);
    phrasesContainer.appendChild(row);
  });
}

async function saveConfig() {
  await supabase
    .from('game_state')
    .update({
      randomize_enabled: randomizeToggle.checked,
      active_list_id: listSelect.value || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
}

async function sendPhrase(text) {
  await supabase
    .from('game_state')
    .update({ phrase: text, status: 'active', updated_at: new Date().toISOString() })
    .eq('id', 1);
  await supabase
    .from('submission')
    .upsert({ id: 1, emoji: '', updated_at: new Date().toISOString() });
}

randomizeToggle.addEventListener('change', () => {
  setPhraseModeUI(randomizeToggle.checked);
  saveConfig();
});

listSelect.addEventListener('change', () => {
  saveConfig();
  loadPhrases();
});

sendPhraseBtn.addEventListener('click', () => {
  const text = manualPhraseInput.value.trim();
  if (!text) return;
  sendPhrase(text);
  manualPhraseInput.value = '';
});

nextPhraseBtn.addEventListener('click', async () => {
  const listId = listSelect.value;
  if (!listId) {
    alert('Create or select a phrase list first.');
    return;
  }
  const { data, error } = await supabase
    .from('phrases')
    .select('*')
    .eq('list_id', listId)
    .eq('used', false);
  if (error) return;
  if (!data.length) {
    alert('All phrases in this list have been used. Add more, or reset the "used" flags.');
    return;
  }
  const picked = data[Math.floor(Math.random() * data.length)];
  await supabase.from('phrases').update({ used: true }).eq('id', picked.id);
  await sendPhrase(picked.text);
  loadPhrases();
});

resetUsedBtn.addEventListener('click', async () => {
  const listId = listSelect.value;
  if (!listId) return;
  await supabase.from('phrases').update({ used: false }).eq('list_id', listId);
  loadPhrases();
});

uploadListBtn.addEventListener('click', async () => {
  uploadError.textContent = '';

  const file = listFileInput.files[0];
  if (!file) {
    uploadError.textContent = 'Choose a .txt file first.';
    return;
  }

  const text = await file.text();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) {
    uploadError.textContent = 'That file has no lines in it.';
    return;
  }

  const name = listFileNameInput.value.trim() || file.name.replace(/\.txt$/i, '');

  const { data: list, error: listError } = await supabase
    .from('phrase_lists')
    .insert({ name })
    .select()
    .single();
  if (listError) {
    uploadError.textContent = 'Failed to create list: ' + listError.message;
    return;
  }

  const { error: phraseError } = await supabase
    .from('phrases')
    .insert(lines.map((phraseText) => ({ list_id: list.id, text: phraseText })));
  if (phraseError) {
    uploadError.textContent = 'Failed to add phrases: ' + phraseError.message;
    return;
  }

  listFileNameInput.value = '';
  listFileInput.value = '';
  await loadLists();
  listSelect.value = list.id;
  loadPhrases();
});

markCorrectBtn.addEventListener('click', async () => {
  await supabase
    .from('game_state')
    .update({ status: 'correct', updated_at: new Date().toISOString() })
    .eq('id', 1);
});

nextRoundBtn.addEventListener('click', async () => {
  await supabase
    .from('game_state')
    .update({ phrase: null, status: 'idle', updated_at: new Date().toISOString() })
    .eq('id', 1);
  await supabase
    .from('submission')
    .upsert({ id: 1, emoji: '', updated_at: new Date().toISOString() });
});

async function initDashboard() {
  await loadLists();

  const { data: state } = await supabase.from('game_state').select('*').eq('id', 1).single();
  if (state) applyGameState(state);

  await loadPhrases();

  const { data: sub } = await supabase.from('submission').select('*').eq('id', 1).single();
  if (sub) applySubmission(sub);

  supabase
    .channel('dm_game_state')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_state', filter: 'id=eq.1' },
      (payload) => applyGameState(payload.new)
    )
    .subscribe();

  supabase
    .channel('dm_submission')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'submission', filter: 'id=eq.1' },
      (payload) => applySubmission(payload.new)
    )
    .subscribe();
}

initDashboard();
