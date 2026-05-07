// ===== State =====
const STATE = {
  apiKey: '',
  configured: false,
  loading: false,
  messages: [],
  abortController: null,
  skills: [],
  activeSkill: null,
};

// ===== Storage =====
function storageKey(name) { return 'chat_' + name; }

function saveMessages() {
  if (STATE.activeSkill) {
    try {
      var key = storageKey('msgs_' + STATE.activeSkill.name);
      var data = JSON.stringify(STATE.messages);
      localStorage.setItem(key, data);
      console.log('Saved', STATE.messages.length, 'messages for', STATE.activeSkill.name);
    } catch (e) { console.warn('save failed:', e); }
  }
}

function loadMessages(skillName) {
  try {
    var raw = localStorage.getItem(storageKey('msgs_' + skillName));
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveActiveSkill() {
  if (STATE.activeSkill) {
    localStorage.setItem(storageKey('active_skill'), STATE.activeSkill.name);
  }
}

function loadActiveSkillName() {
  return localStorage.getItem(storageKey('active_skill')) || null;
}

// ===== DOM Refs =====
const $ = (id) => document.getElementById(id);
const apiKeyInput      = $('apiKeyInput');
const saveKeyBtn       = $('saveKeyBtn');
const editKeyBtn       = $('editKeyBtn');
const statusDot        = $('statusDot');
const statusText       = $('statusText');
const messagesEl       = $('messages');
const chatInput        = $('chatInput');
const sendBtn          = $('sendBtn');
const settingsBtn      = $('settingsBtn');
const settingsModal    = $('settingsModal');
const closeSettingsBtn = $('closeSettingsBtn');
const skillListEl      = $('skillList');
const statusBadge      = $('statusBadge');
const currentSkillName = $('currentSkillName');
const clearBtn         = $('clearBtn');

const AVATAR_COLORS = ['#1a73e8', '#e67e22', '#2ecc71', '#e74c3c', '#9b59b6', '#1abc9c', '#f39c12', '#3498db'];

// ===== Scan Skills =====
async function scanSkills() {
  try {
    const listResp = await fetch('skill/index.json?t=' + Date.now());
    if (!listResp.ok) throw new Error('no index');
    const entries = await listResp.json();
    STATE.skills = [];
    let idx = 0;
    for (const entry of entries) {
      const name = typeof entry === 'string' ? entry : entry.name;
      const label = typeof entry === 'string' ? name : (entry.label || name);
      const sr = await fetch('skill/' + name + '/SKILL.md?t=' + Date.now());
      if (sr.ok) {
        const text = await sr.text();
        STATE.skills.push({ name, label, prompt: text, color: AVATAR_COLORS[idx % AVATAR_COLORS.length] });
        idx++;
      }
    }
  } catch (e) {
    console.warn('scanSkills failed:', e);
  }
  if (STATE.skills.length === 0) {
    STATE.skills.push({ name: 'default', label: '默认', color: '#999' });
  }
}

// ===== Skill Contact List =====
function renderSkillList() {
  skillListEl.innerHTML = STATE.skills.map(s => {
    const initial = s.label.charAt(0).toUpperCase();
    const isActive = STATE.activeSkill && STATE.activeSkill.name === s.name;
    return (
      '<div class="skill-item' + (isActive ? ' active' : '') + '" data-skill="' + s.name + '">' +
        '<div class="skill-avatar" style="background:' + s.color + '">' + initial + '</div>' +
        '<div class="skill-info">' +
          '<div class="skill-name">' + s.label + '</div>' +
          '<div class="skill-desc">' + (s.prompt ? s.name : '无角色') + '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  skillListEl.querySelectorAll('.skill-item').forEach(el => {
    el.addEventListener('click', function() {
      selectSkill(this.dataset.skill);
    });
  });
}

function selectSkill(name) {
  // Save current skill's messages
  saveMessages();

  const skill = STATE.skills.find(s => s.name === name);
  if (!skill) return;
  STATE.activeSkill = { name: skill.name, label: skill.label, prompt: skill.prompt || '' };
  currentSkillName.textContent = skill.label;
  // Load saved messages for this skill
  STATE.messages = loadMessages(skill.name);
  renderSkillList();
  updateUIForConfigured(STATE.configured);
  renderAllMessages();
  saveActiveSkill();
}

// ===== Messages =====
function clearMessages() {
  messagesEl.innerHTML = '';
  STATE.messages = [];
}

function addWelcomeMessage() {
  if (!STATE.activeSkill) return;
  const label = STATE.activeSkill.label;
  const initial = label.charAt(0).toUpperCase();
  const skill = STATE.skills.find(s => s.name === STATE.activeSkill.name);
  const color = skill ? skill.color : '#1a73e8';

  const div = document.createElement('div');
  div.className = 'message bot';
  div.innerHTML =
    '<div class="msg-avatar"><span class="avatar-bot" style="background:' + color + '">' + initial + '</span></div>' +
    '<div class="bubble">' +
      '<p>' + (STATE.configured ? '你好！有什么可以帮你的？' : '请先配置 API Key 后开始聊天。') + '</p>' +
    '</div>';
  messagesEl.appendChild(div);
}

function renderAllMessages() {
  messagesEl.innerHTML = '';
  if (STATE.messages.length === 0) {
    addWelcomeMessage();
    return;
  }
  for (var i = 0; i < STATE.messages.length; i++) {
    renderMessageDOM(STATE.messages[i].role, STATE.messages[i].content);
  }
  // Remove animation for batch render
  var msgs = messagesEl.querySelectorAll('.message');
  for (var j = 0; j < msgs.length; j++) {
    msgs[j].style.animation = 'none';
  }
  scrollToBottom();
}

function renderMessageDOM(role, content) {
  const div = document.createElement('div');
  div.className = 'message ' + (role === 'user' ? 'user' : 'bot');

  const label = STATE.activeSkill ? STATE.activeSkill.label : 'AI';
  const initial = label.charAt(0).toUpperCase();
  const skill = STATE.skills.find(s => s.name === (STATE.activeSkill ? STATE.activeSkill.name : null));
  const color = skill ? skill.color : '#1a73e8';

  div.innerHTML = role === 'user'
    ? '<div class="msg-avatar"><span class="avatar-user">我</span></div><div class="bubble">' + renderMarkdown(content) + '</div>'
    : '<div class="msg-avatar"><span class="avatar-bot" style="background:' + color + '">' + initial + '</span></div><div class="bubble">' + renderMarkdown(content) + '</div>';

  messagesEl.appendChild(div);
  scrollToBottom();
}

// ===== API Key =====
function loadSavedKey() {
  const saved = localStorage.getItem('deepseek_api_key');
  if (saved) {
    STATE.apiKey = saved;
    STATE.configured = true;
    apiKeyInput.value = saved;
  }
}

function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) { setStatus('error', '请输入 API Key'); return; }
  if (key.indexOf('sk-') !== 0) { setStatus('error', 'Key 格式不正确，应以 sk- 开头'); return; }
  STATE.apiKey = key;
  STATE.configured = true;
  localStorage.setItem('deepseek_api_key', key);
  updateUIForConfigured(true);
  setStatus('active', '已就绪');
}

function updateUIForConfigured(configured) {
  editKeyBtn.style.display = configured ? 'inline-block' : 'none';
  saveKeyBtn.style.display = configured ? 'none' : 'inline-block';
  apiKeyInput.disabled = configured;
  chatInput.disabled = !(configured && STATE.activeSkill);
  sendBtn.disabled = !(configured && STATE.activeSkill);
  statusBadge.textContent = configured ? '● API 已就绪' : '● 未配置 API';
  statusBadge.className = 'status-badge' + (configured ? ' active' : '');
}

function setStatus(type, text) {
  statusDot.className = 'status-dot';
  if (type === 'active') statusDot.classList.add('active');
  else if (type === 'error') statusDot.classList.add('error');
  statusText.textContent = text;
}

// ===== Markdown =====
function renderMarkdown(text) {
  var html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(_, lang, code) {
    return '<pre><code>' + code.trim() + '</code></pre>';
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  var blocks = html.split(/\n\n+/);
  html = blocks.map(function(block) {
    block = block.trim();
    if (!block) return '';
    if (block.indexOf('<pre>') === 0 || block.indexOf('<ul>') === 0 || block.indexOf('<ol>') === 0) return block;
    if (/^[\-\*]\s/.test(block)) {
      var items = block.split('\n').filter(function(l) { return /^[\-\*]\s/.test(l); });
      return '<ul>' + items.map(function(i) { return '<li>' + i.replace(/^[\-\*]\s/, '') + '</li>'; }).join('') + '</ul>';
    }
    if (/^\d+\.\s/.test(block)) {
      var items = block.split('\n').filter(function(l) { return /^\d+\.\s/.test(l); });
      return '<ol>' + items.map(function(i) { return '<li>' + i.replace(/^\d+\.\s/, '') + '</li>'; }).join('') + '</ol>';
    }
    var lines = block.split('\n').filter(function(l) { return l.trim(); });
    return lines.map(function(l) { return '<p>' + l + '</p>'; }).join('');
  }).join('');
  return html;
}

// ===== Send =====
async function sendMessage() {
  var text = chatInput.value.trim();
  if (!text || STATE.loading || !STATE.configured || !STATE.activeSkill) return;

  chatInput.value = '';
  chatInput.style.height = 'auto';

  STATE.messages.push({ role: 'user', content: text });
  renderMessageDOM('user', text);
  saveMessages();

  STATE.loading = true;
  sendBtn.disabled = true;
  showTypingIndicator();

  if (STATE.abortController) STATE.abortController.abort();
  STATE.abortController = new AbortController();

  try {
    var systemPrompt = STATE.activeSkill.prompt || '';
    var resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + STATE.apiKey },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...STATE.messages,
        ],
        stream: true,
        max_tokens: 4096,
        temperature: 1.0,
      }),
      signal: STATE.abortController.signal,
    });

    if (!resp.ok) {
      var errData = await resp.json().catch(function() { return {}; });
      throw new Error(errData.error ? errData.error.message : 'HTTP ' + resp.status);
    }

    removeTypingIndicator();
    STATE.messages.push({ role: 'assistant', content: '' });

    var label = STATE.activeSkill.label;
    var initial = label.charAt(0).toUpperCase();
    var skill = STATE.skills.find(function(s) { return s.name === STATE.activeSkill.name; });
    var color = skill ? skill.color : '#1a73e8';

    var botDiv = document.createElement('div');
    botDiv.className = 'message bot';
    botDiv.innerHTML = '<div class="msg-avatar"><span class="avatar-bot" style="background:' + color + '">' + initial + '</span></div><div class="bubble"></div>';
    messagesEl.appendChild(botDiv);

    var reader = resp.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '', fullContent = '', renderTimeout = null;

    while (true) {
      var r = await reader.read();
      if (r.done) break;
      buffer += decoder.decode(r.value, { stream: true });
      var lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (var i = 0; i < lines.length; i++) {
        var trimmed = lines[i].trim();
        if (!trimmed || trimmed.indexOf('data: ') !== 0) continue;
        var data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          var parsed = JSON.parse(data);
          var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta ? (parsed.choices[0].delta.content || '') : '';
          if (delta) {
            fullContent += delta;
            if (!renderTimeout) {
              renderTimeout = setTimeout(function() {
                var bubble = botDiv.querySelector('.bubble');
                if (bubble) bubble.innerHTML = renderMarkdown(fullContent);
                renderTimeout = null;
              }, 50);
            }
          }
        } catch (e) { /* skip malformed lines */ }
      }
    }
    if (renderTimeout) clearTimeout(renderTimeout);
    var finalBubble = botDiv.querySelector('.bubble');
    if (finalBubble) finalBubble.innerHTML = renderMarkdown(fullContent);
    var lastMsg = STATE.messages[STATE.messages.length - 1];
    if (lastMsg) lastMsg.content = fullContent;
    saveMessages();
    scrollToBottom();

  } catch (err) {
    removeTypingIndicator();
    if (err.name !== 'AbortError') {
      renderMessageDOM('bot', '出错：' + err.message);
      saveMessages();
    }
  } finally {
    STATE.loading = false;
    sendBtn.disabled = !STATE.configured;
    STATE.abortController = null;
  }
}

// ===== Typing =====
function showTypingIndicator() {
  var label = STATE.activeSkill.label;
  var initial = label.charAt(0).toUpperCase();
  var skill = STATE.skills.find(function(s) { return s.name === STATE.activeSkill.name; });
  var color = skill ? skill.color : '#1a73e8';

  var div = document.createElement('div');
  div.className = 'message bot typing';
  div.innerHTML =
    '<div class="msg-avatar"><span class="avatar-bot" style="background:' + color + '">' + initial + '</span></div>' +
    '<div class="bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
  messagesEl.appendChild(div);
  scrollToBottom();
}

function removeTypingIndicator() {
  var el = messagesEl.querySelector('.typing');
  if (el) el.remove();
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ===== Input =====
function autoResize() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
}

function onInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

// ===== Init =====
async function init() {
  await scanSkills();
  loadSavedKey();

  // Restore last active skill, or default to first
  var savedSkillName = loadActiveSkillName();
  var targetSkill = null;
  if (savedSkillName) {
    targetSkill = STATE.skills.find(function(s) { return s.name === savedSkillName; });
  }
  if (!targetSkill && STATE.skills.length > 0) {
    targetSkill = STATE.skills[0];
  }
  if (targetSkill) {
    STATE.activeSkill = { name: targetSkill.name, label: targetSkill.label, prompt: targetSkill.prompt || '' };
    STATE.messages = loadMessages(targetSkill.name);
    currentSkillName.textContent = targetSkill.label;
  }

  renderSkillList();
  updateUIForConfigured(STATE.configured);
  renderAllMessages();

  // Settings
  settingsBtn.addEventListener('click', function() { settingsModal.classList.add('open'); });
  closeSettingsBtn.addEventListener('click', function() { settingsModal.classList.remove('open'); });
  settingsModal.addEventListener('click', function(e) {
    if (e.target === settingsModal) settingsModal.classList.remove('open');
  });

  saveKeyBtn.addEventListener('click', function() { saveApiKey(); if (STATE.configured) settingsModal.classList.remove('open'); });
  editKeyBtn.addEventListener('click', function() {
    apiKeyInput.disabled = false; apiKeyInput.focus();
    saveKeyBtn.style.display = 'inline-block'; editKeyBtn.style.display = 'none';
    setStatus('inactive', '未设置');
  });

  // Clear
  clearBtn.addEventListener('click', function() {
    clearMessages();
    saveMessages();
    addWelcomeMessage();
  });

  // Chat
  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('input', autoResize);
  chatInput.addEventListener('keydown', onInputKeydown);
  if (STATE.configured) chatInput.focus();
}

init();
