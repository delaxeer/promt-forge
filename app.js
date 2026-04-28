/* ========================================
   PromptForge — JavaScript + Supabase
   ======================================== */

// ─── Supabase Config ───────────────────
// Замени на свои данные из Supabase Dashboard → Settings → API

const SUPABASE_URL = 'https://pqnpbsyhmlpfmwhhhrts.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxbnBic3lobWxwZm13aGhocnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzAzMjQsImV4cCI6MjA5Mjk0NjMyNH0.3rAnUK0R2jQ9UUBiKQeULllEN1T1gHkORE2imkbAaq8';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Static Data ───────────────────────

const MODELS = {
  photo: [
    { id: 'nana', name: 'Nana Banana 2', sub: 'Реалистичное фото' },
    { id: 'gpt2', name: 'GPT Image 2',   sub: 'Арт и иллюстрации' }
  ],
  video: [
    { id: 'kling', name: 'Kling',  sub: 'Реализм, движение' },
    { id: 'sora2', name: 'Sora 2', sub: 'Кинематограф' }
  ]
};

const MODES = {
  photo: [
    { id: 'create', label: 'Создать',       desc: 'По описанию / референсу' },
    { id: 'edit',   label: 'Редактировать',  desc: 'Изменить что-то на фото' }
  ],
  video: [
    { id: 'create', label: 'Создать',       desc: 'По описанию / референсу' },
    { id: 'edit',   label: 'На основе фото', desc: 'Видео из исходного кадра' }
  ]
};

// Дефолтные шаблоны — вставляются в БД при первом запуске
const DEFAULT_TEMPLATES = [
  { category: 'photo', model: 'nana', mode: 'create', name: 'Реалистичное фото', template: 'Shot on [camera], [lens], [lighting]. [Subject] with [mood/expression]. [Environment/background]. [Style details]. Photorealistic, ultra-detailed, 8K.', author: 'system' },
  { category: 'photo', model: 'nana', mode: 'edit', name: 'Редактирование фото', template: 'Take this photo and [change/replace/add/remove what]. Keep [what to preserve: lighting / background / pose / style]. Photorealistic result, seamless edit, same quality.', author: 'system' },
  { category: 'photo', model: 'gpt2', mode: 'create', name: 'Генеративный арт', template: '[Subject/concept], [art style], [color palette], [mood/atmosphere], [composition], [lighting style]. Highly detailed, professional digital artwork.', author: 'system' },
  { category: 'photo', model: 'gpt2', mode: 'edit', name: 'Редактирование арта', template: 'Edit this image: [describe the change]. Preserve [what should stay]. [Style/quality notes]. Seamless, professional result.', author: 'system' },
  { category: 'video', model: 'kling', mode: 'create', name: 'Реалистичное видео', template: '[Scene description]. Camera [movement type]. [Lighting conditions]. [Subject action]. [Duration] seconds. Photorealistic, 4K, smooth cinematic motion.', author: 'system' },
  { category: 'video', model: 'kling', mode: 'edit', name: 'Анимация из фото', template: 'Animate this photo: [describe motion/action]. Camera [movement]. [Mood/atmosphere]. [Duration] seconds. Smooth realistic animation, preserve original style.', author: 'system' },
  { category: 'video', model: 'sora2', mode: 'create', name: 'Кинематограф', template: 'Cinematic scene: [scene]. [Camera movement] shot. [Lighting], [emotional tone]. [Duration] seconds. Film grain, anamorphic lens, Hollywood quality.', author: 'system' },
  { category: 'video', model: 'sora2', mode: 'edit', name: 'Видео из кадра', template: 'Starting from this image, [describe what happens]. [Camera movement]. [Mood]. [Duration] seconds. Cinematic quality, preserve original composition and style.', author: 'system' }
];


// ─── State ─────────────────────────────

let state = {
  category: 'photo',
  model: 'nana',
  mode: 'create',
  selectedTemplateId: null,
  templates: [],
  imageBase64: null,
  imageType: null
};


// ─── DOM ───────────────────────────────

const $ = (sel) => document.querySelector(sel);
const dom = {
  categoryTabs: $('#categoryTabs'),
  modelGrid: $('#modelGrid'),
  modeGrid: $('#modeGrid'),
  templateList: $('#templateList'),
  uploadZone: $('#uploadZone'),
  fileInput: $('#fileInput'),
  uploadPlaceholder: $('#uploadPlaceholder'),
  previewContainer: $('#previewContainer'),
  previewImage: $('#previewImage'),
  removeBtn: $('#removeBtn'),
  photoBadge: $('#photoBadge'),
  inputTitle: $('#inputTitle'),
  taskInput: $('#taskInput'),
  generateBtn: $('#generateBtn'),
  resultSection: $('#resultSection'),
  resultModel: $('#resultModel'),
  resultBody: $('#resultBody'),
  copyBtn: $('#copyBtn'),
  // Modal
  modalOverlay: $('#modalOverlay'),
  openModalBtn: $('#openModalBtn'),
  closeModalBtn: $('#closeModalBtn'),
  modalModelRow: $('#modalModelRow'),
  modalName: $('#modalName'),
  modalTemplate: $('#modalTemplate'),
  modalAuthor: $('#modalAuthor'),
  saveTemplateBtn: $('#saveTemplateBtn'),
  modalMessage: $('#modalMessage')
};


// ─── Supabase: Load Templates ──────────

async function loadTemplates() {
  dom.templateList.innerHTML = '<div class="template-loading">Загрузка шаблонов...</div>';

  const { data, error } = await sb
    .from('templates')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Supabase error:', error);
    dom.templateList.innerHTML = '<div class="template-loading">Ошибка загрузки шаблонов</div>';
    return;
  }

  // Если база пустая — вставляем дефолтные
  if (!data || data.length === 0) {
    await seedDefaults();
    return;
  }

  state.templates = data;
  state.selectedTemplateId = null;
  renderTemplates();
}

async function seedDefaults() {
  const { error } = await sb.from('templates').insert(DEFAULT_TEMPLATES);
  if (error) {
    console.error('Seed error:', error);
    dom.templateList.innerHTML = '<div class="template-loading">Ошибка инициализации</div>';
    return;
  }
  // Перезагружаем
  await loadTemplates();
}


// ─── Render ────────────────────────────

function renderModels() {
  const models = MODELS[state.category];
  dom.modelGrid.innerHTML = models.map(m => `
    <div class="model-card ${m.id === state.model ? 'active' : ''}" data-model="${m.id}">
      <div class="model-name">${m.name}</div>
      <div class="model-sub">${m.sub}</div>
    </div>
  `).join('');

  dom.modelGrid.querySelectorAll('.model-card').forEach(card => {
    card.addEventListener('click', () => {
      state.model = card.dataset.model;
      state.selectedTemplateId = null;
      hideResult();
      renderModels();
      renderTemplates();
    });
  });
}

function renderModes() {
  const modes = MODES[state.category];
  dom.modeGrid.innerHTML = modes.map(m => `
    <div class="mode-card ${m.id === state.mode ? 'active' : ''}" data-mode="${m.id}">
      <div class="mode-label">${m.label}</div>
      <div class="mode-desc">${m.desc}</div>
    </div>
  `).join('');

  dom.modeGrid.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      state.mode = card.dataset.mode;
      state.selectedTemplateId = null;
      hideResult();
      renderModes();
      renderTemplates();
      updateInputUI();
    });
  });
}

function renderTemplates() {
  const filtered = state.templates.filter(
    t => t.category === state.category && t.model === state.model && t.mode === state.mode
  );

  if (filtered.length === 0) {
    dom.templateList.innerHTML = '<div class="template-empty">Нет шаблонов для этой комбинации. Добавь свой!</div>';
    return;
  }

  dom.templateList.innerHTML = filtered.map(t => `
    <div class="template-card ${state.selectedTemplateId === t.id ? 'active' : ''}" data-id="${t.id}">
      <div class="template-card-top">
        <div class="template-card-name">${escapeHtml(t.name)}</div>
        <div class="template-author-tag ${t.author === 'system' ? 'system' : ''}">${t.author === 'system' ? 'встроенный' : escapeHtml(t.author)}</div>
      </div>
      <div class="template-card-text">${escapeHtml(t.template)}</div>
    </div>
  `).join('');

  dom.templateList.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedTemplateId = card.dataset.id;
      renderTemplates();
    });
  });
}

function updateInputUI() {
  const isEdit = state.mode === 'edit';
  dom.photoBadge.textContent = isEdit ? 'обязательно' : 'необязательно';
  dom.photoBadge.classList.toggle('required', isEdit);
  dom.inputTitle.textContent = isEdit ? 'Исходное фото + что изменить' : 'Референс + задача';
  dom.taskInput.placeholder = isEdit ? 'Опиши что нужно изменить на фото...' : 'Опиши что нужно создать...';
}

function renderAll() {
  renderModels();
  renderModes();
  renderTemplates();
  updateInputUI();
}


// ─── Category Tabs ─────────────────────

dom.categoryTabs.querySelectorAll('.cat-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    state.category = tab.dataset.cat;
    state.model = MODELS[state.category][0].id;
    state.mode = 'create';
    state.selectedTemplateId = null;
    dom.categoryTabs.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    hideResult();
    renderAll();
  });
});


// ─── Image Handling ────────────────────

function setImage(base64, type) {
  state.imageBase64 = base64;
  state.imageType = type || 'image/png';
  dom.previewImage.src = `data:${state.imageType};base64,${base64}`;
  dom.previewContainer.classList.add('visible');
  dom.uploadPlaceholder.style.display = 'none';
  dom.uploadZone.classList.add('has-image');
}

function removeImage() {
  state.imageBase64 = null;
  state.imageType = null;
  dom.previewImage.src = '';
  dom.previewContainer.classList.remove('visible');
  dom.uploadPlaceholder.style.display = '';
  dom.uploadZone.classList.remove('has-image');
  dom.fileInput.value = '';
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = (ev) => setImage(ev.target.result.split(',')[1], file.type);
  reader.readAsDataURL(file);
}

dom.fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) readFile(e.target.files[0]);
});

dom.removeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  removeImage();
});

dom.uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dom.uploadZone.classList.add('drag-over');
});
dom.uploadZone.addEventListener('dragleave', () => dom.uploadZone.classList.remove('drag-over'));
dom.uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dom.uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) readFile(file);
});

document.addEventListener('paste', (e) => {
  // Не перехватываем paste в модалке
  if (dom.modalOverlay.classList.contains('open')) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      readFile(item.getAsFile());
      break;
    }
  }
});


// ─── Generate ──────────────────────────

dom.generateBtn.addEventListener('click', generate);

async function generate() {
  const task = dom.taskInput.value.trim();
  const isEdit = state.mode === 'edit';

  if (!state.selectedTemplateId) {
    shake(dom.templateList);
    return;
  }
  if (isEdit && !state.imageBase64) {
    shake(dom.uploadZone);
    return;
  }
  if (!task && !state.imageBase64) {
    shake(dom.taskInput);
    return;
  }

  const tpl = state.templates.find(t => t.id === state.selectedTemplateId);
  if (!tpl) return;

  const modelInfo = MODELS[state.category].find(m => m.id === state.model);
  dom.generateBtn.disabled = true;
  dom.generateBtn.classList.add('loading');

  const systemPrompt = `You are an expert prompt engineer for AI image and video generation.
Adapt the given template to the user's request.
Rules:
- Fill ALL [placeholder] fields with specific vivid details
- If a photo is provided, analyze its colors, style, composition, mood, lighting and use in the prompt
- Edit mode: describe precisely what changes and what stays
- Output ONLY the final ready-to-use prompt in English
- No explanations, preamble, or quotes
- Target model: ${modelInfo.name} (${state.category} generation)`;

  const taskText = task || (isEdit ? 'Edit the image as described' : 'Create based on this image');
  const msgText = `Template: ${tpl.template}\n\nTask: ${taskText}\n\nOutput only the final prompt in English.`;

  let userContent;
  if (state.imageBase64) {
    userContent = [
      { type: 'image', source: { type: 'base64', media_type: state.imageType || 'image/png', data: state.imageBase64 } },
      { type: 'text', text: msgText }
    ];
  } else {
    userContent = msgText;
  }

  try {
    const resp = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
        max_tokens: 1000
      })
    });
    const data = await resp.json();
    const text = data.content?.[0]?.text;
    showResult(modelInfo.name, text || 'Не удалось сгенерировать', !text);
  } catch (err) {
    showResult('Ошибка', err.message, true);
  }

  dom.generateBtn.disabled = false;
  dom.generateBtn.classList.remove('loading');
}

function showResult(model, text, isError = false) {
  dom.resultModel.textContent = `Промпт · ${model}`;
  dom.resultBody.textContent = text;
  dom.resultBody.classList.toggle('error', isError);
  dom.resultSection.classList.add('visible');
  dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideResult() {
  dom.resultSection.classList.remove('visible');
}

dom.copyBtn.addEventListener('click', () => {
  const text = dom.resultBody.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    dom.copyBtn.textContent = 'Скопировано!';
    dom.copyBtn.classList.add('copied');
    setTimeout(() => {
      dom.copyBtn.textContent = 'Скопировать';
      dom.copyBtn.classList.remove('copied');
    }, 2000);
  });
});


// ─── Modal: Add Template ───────────────

let modalState = { category: 'photo', model: 'nana', mode: 'create' };

dom.openModalBtn.addEventListener('click', openModal);
dom.closeModalBtn.addEventListener('click', closeModal);
dom.modalOverlay.addEventListener('click', (e) => {
  if (e.target === dom.modalOverlay) closeModal();
});

function openModal() {
  modalState = { category: state.category, model: state.model, mode: state.mode };
  dom.modalName.value = '';
  dom.modalTemplate.value = '';
  dom.modalAuthor.value = '';
  dom.modalMessage.textContent = '';
  dom.modalMessage.className = 'modal-message';
  renderModalOptions();
  dom.modalOverlay.classList.add('open');
}

function closeModal() {
  dom.modalOverlay.classList.remove('open');
}

function renderModalOptions() {
  // Category buttons
  document.querySelectorAll('[data-field="modal-cat"]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === modalState.category);
  });

  // Model buttons
  const models = MODELS[modalState.category];
  dom.modalModelRow.innerHTML = models.map(m =>
    `<button class="modal-option ${m.id === modalState.model ? 'active' : ''}" data-field="modal-model" data-value="${m.id}">${m.name}</button>`
  ).join('');

  // Mode buttons
  document.querySelectorAll('[data-field="modal-mode"]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === modalState.mode);
  });

  // Re-attach listeners
  attachModalOptionListeners();
}

function attachModalOptionListeners() {
  document.querySelectorAll('.modal-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const value = btn.dataset.value;

      if (field === 'modal-cat') {
        modalState.category = value;
        modalState.model = MODELS[value][0].id;
      } else if (field === 'modal-model') {
        modalState.model = value;
      } else if (field === 'modal-mode') {
        modalState.mode = value;
      }

      renderModalOptions();
    });
  });
}

dom.saveTemplateBtn.addEventListener('click', saveTemplate);

async function saveTemplate() {
  const name = dom.modalName.value.trim();
  const template = dom.modalTemplate.value.trim();
  const author = dom.modalAuthor.value.trim() || 'Аноним';

  if (!name) {
    dom.modalMessage.textContent = 'Введи название шаблона';
    dom.modalMessage.className = 'modal-message error';
    return;
  }
  if (!template) {
    dom.modalMessage.textContent = 'Введи текст шаблона';
    dom.modalMessage.className = 'modal-message error';
    return;
  }

  dom.saveTemplateBtn.disabled = true;
  dom.saveTemplateBtn.classList.add('loading');
  dom.modalMessage.textContent = '';

  const { error } = await sb.from('templates').insert({
    category: modalState.category,
    model: modalState.model,
    mode: modalState.mode,
    name,
    template,
    author
  });

  dom.saveTemplateBtn.disabled = false;
  dom.saveTemplateBtn.classList.remove('loading');

  if (error) {
    dom.modalMessage.textContent = 'Ошибка сохранения: ' + error.message;
    dom.modalMessage.className = 'modal-message error';
    return;
  }

  dom.modalMessage.textContent = 'Шаблон сохранён!';
  dom.modalMessage.className = 'modal-message success';

  // Перезагружаем шаблоны
  await loadTemplates();
  renderTemplates();

  setTimeout(() => closeModal(), 1000);
}


// ─── Utils ─────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => el.style.animation = '', 500);
}


// ─── Init ──────────────────────────────

(async () => {
  renderAll();
  await loadTemplates();
  renderTemplates();
})();
