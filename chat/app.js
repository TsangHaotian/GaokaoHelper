// ===== State =====
const STATE = {
  apiKey: '',
  configured: false,
  loading: false,
  messages: [],
  abortController: null,
  skills: [],
  activeSkill: null,
  // Group chat state
  groupChatEnabled: false,
  groupMembers: [],
  groupRounds: 2,
  groupQuestioner: true,   // "提问者" bot enabled
};

const GROUP_CHAT_NAME = '__group_chat__';

// ===== Storage =====
function storageKey(name) { return 'chat_' + name; }

function saveMessages() {
  if (STATE.activeSkill) {
    try {
      var key = storageKey('msgs_' + STATE.activeSkill.name);
      localStorage.setItem(key, JSON.stringify(STATE.messages));
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

function saveGroupMembers() {
  localStorage.setItem(storageKey('group_members'), JSON.stringify(STATE.groupMembers.map(function(m) { return m.name; })));
}

function loadGroupMembers() {
  try {
    var raw = localStorage.getItem(storageKey('group_members'));
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveGroupSettings() {
  localStorage.setItem(storageKey('group_rounds'), String(STATE.groupRounds));
  localStorage.setItem(storageKey('group_questioner'), STATE.groupQuestioner ? '1' : '0');
}

function loadGroupRounds() {
  try { var v = localStorage.getItem(storageKey('group_rounds')); return v ? parseInt(v, 10) : 2; } catch (e) { return 2; }
}

function loadGroupQuestioner() {
  try { var v = localStorage.getItem(storageKey('group_questioner')); return v !== '0'; } catch (e) { return true; }
}

// ===== DOM Refs =====
const $ = (id) => document.getElementById(id);
const apiKeyInput       = $('apiKeyInput');
const saveKeyBtn        = $('saveKeyBtn');
const editKeyBtn        = $('editKeyBtn');
const statusDot         = $('statusDot');
const statusText        = $('statusText');
const messagesEl        = $('messages');
const chatInput         = $('chatInput');
const sendBtn           = $('sendBtn');
const settingsBtn       = $('settingsBtn');
const settingsModal     = $('settingsModal');
const closeSettingsBtn  = $('closeSettingsBtn');
const skillListEl       = $('skillList');
const statusBadge       = $('statusBadge');
const statusDotFooter   = $('statusDot');
const currentSkillName  = $('currentSkillName');
const menuBtn           = $('menuBtn');
const dropdownMenu      = $('dropdownMenu');
const clearBtn          = $('clearBtn');
const skillInfoName     = $('skillInfoName');
const skillInfoDesc     = $('skillInfoDesc');
const mobileToggle      = $('mobileToggle');
const sidebar           = document.querySelector('.sidebar');
const groupDivider1     = $('groupDivider1');
const groupDivider2     = $('groupDivider2');
const groupMenuMembers  = $('groupMenuMembers');
const groupMenuMemberList = $('groupMenuMemberList');
const groupMenuRoundText = $('groupMenuRoundText');
const questionerCheckbox = $('questionerCheckbox');
const roundDisplay      = $('roundDisplay');
const roundDec          = $('roundDec');
const roundInc          = $('roundInc');
const groupMenuQuestionerSetting = $('groupMenuQuestionerSetting');

const AVATAR_COLORS = ['#1a73e8', '#e67e22', '#2ecc71', '#e74c3c', '#9b59b6', '#1abc9c', '#f39c12', '#3498db'];

const SKILL_REPOS = {
  'zhangxuefeng': 'https://github.com/alchaincyf/zhangxuefeng-skill',
  'ZhangXueFeng-skill-main': 'https://github.com/a18515373115-droid/ZhangXueFeng-skill',
};

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
  // Add "群聊" as the third item
  var items = STATE.skills.map(function(s) {
    var initial = s.label.charAt(0).toUpperCase();
    var isActive = STATE.activeSkill && STATE.activeSkill.name === s.name && !STATE.groupChatEnabled;
    return (
      '<div class="skill-item' + (isActive ? ' active' : '') + '" data-skill="' + s.name + '">' +
        '<div class="skill-avatar" style="background:' + s.color + '">' + initial + '</div>' +
        '<div class="skill-info">' +
          '<div class="skill-name">' + s.label + '</div>' +
          '<div class="skill-desc">' + s.name + '</div>' +
        '</div>' +
      '</div>'
    );
  });

  // Add group chat item
  var groupActive = STATE.activeSkill && STATE.activeSkill.name === GROUP_CHAT_NAME;
  items.push(
    '<div class="skill-item' + (groupActive ? ' active' : '') + '" data-skill="' + GROUP_CHAT_NAME + '">' +
      '<div class="skill-avatar" style="background:#8e44ad">群</div>' +
      '<div class="skill-info">' +
        '<div class="skill-name">AI 群聊</div>' +
        '<div class="skill-desc">多人同时回答</div>' +
      '</div>' +
    '</div>'
  );

  skillListEl.innerHTML = items.join('');

  skillListEl.querySelectorAll('.skill-item').forEach(function(el) {
    el.addEventListener('click', function() {
      selectSkill(this.dataset.skill);
    });
  });
}

// ===== Group Chat Settings (Dropdown) =====
function updateGroupDropdownVisibility() {
  var isGroup = STATE.groupChatEnabled;
  document.querySelectorAll('.group-only').forEach(function(el) {
    el.classList.toggle('visible', isGroup);
  });
  document.querySelectorAll('.normal-only').forEach(function(el) {
    if (el) el.classList.toggle('visible', !isGroup);
  });
  var nd1 = document.getElementById('normalDivider1');
  if (nd1) nd1.classList.toggle('visible', !isGroup);
  var nd2 = document.getElementById('normalDivider2');
  if (nd2) nd2.classList.toggle('visible', !isGroup);
}

function renderGroupMemberCheckboxes() {
  groupMenuMemberList.innerHTML = '';
  STATE.skills.forEach(function(skill) {
    var checked = STATE.groupMembers.some(function(m) { return m.name === skill.name; });
    var label = document.createElement('label');
    label.className = 'group-member-check-item';
    label.innerHTML =
      '<input type="checkbox" class="group-member-cb-sm" data-name="' + skill.name + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="group-menu-member-tag-sm" style="background:' + skill.color + '">' + skill.label.charAt(0).toUpperCase() + '</span>' +
      '<span>' + skill.label + '</span>';
    groupMenuMemberList.appendChild(label);

    label.querySelector('.group-member-cb-sm').addEventListener('change', function(e) {
      var name = e.target.dataset.name;
      if (e.target.checked) {
        var s = STATE.skills.find(function(sk) { return sk.name === name; });
        if (s && !STATE.groupMembers.some(function(m) { return m.name === name; })) {
          STATE.groupMembers.push({ name: s.name, label: s.label, prompt: s.prompt, color: s.color });
        }
      } else {
        STATE.groupMembers = STATE.groupMembers.filter(function(m) { return m.name !== name; });
      }
      saveGroupMembers();
    });
  });
}

function updateGroupMenuText() {
  groupMenuRoundText.textContent = '讨论轮数：' + STATE.groupRounds;
  roundDisplay.textContent = STATE.groupRounds;
  questionerCheckbox.checked = STATE.groupQuestioner;
}

// ===== Skill Selection =====
function selectSkill(name) {
  saveMessages();

  if (name === GROUP_CHAT_NAME) {
    STATE.groupChatEnabled = true;
    STATE.activeSkill = { name: GROUP_CHAT_NAME, label: 'AI 群聊', prompt: '' };
    currentSkillName.textContent = 'AI 群聊';
    skillInfoName.textContent = 'AI 群聊';
    skillInfoDesc.textContent = '多人同时回答';
    
    STATE.messages = loadMessages(GROUP_CHAT_NAME);
    renderSkillList();
    updateGroupDropdownVisibility();
    renderGroupMemberCheckboxes();
    updateGroupMenuText();
    updateUIForConfigured(STATE.configured);
    renderAllMessages();
    saveActiveSkill();
    return;
  }

  STATE.groupChatEnabled = false;
  updateGroupDropdownVisibility();
  const skill = STATE.skills.find(s => s.name === name);
  if (!skill) return;
  STATE.activeSkill = { name: skill.name, label: skill.label, prompt: skill.prompt || '' };
  currentSkillName.textContent = skill.label;
  skillInfoName.textContent = skill.label;
  var repoUrl = SKILL_REPOS[skill.name];
  skillInfoDesc.textContent = repoUrl || '无';
  skillInfoDesc.style.cursor = repoUrl ? 'pointer' : 'default';
  if (repoUrl) {
    skillInfoDesc.onclick = function() { window.open(repoUrl, '_blank'); dropdownMenu.classList.remove('open'); };
  } else {
    skillInfoDesc.onclick = null;
  }
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

var WELCOME_TEXTS = {
  'zhangxuefeng': '老铁来了啊！坐坐坐！\n我是张雪峰，考研名（逝）师，高考志愿填报第一人。\n家里什么条件？孩子考了多少分？什么省的？想学什么？\n把你的问题砸过来，我给你整得明明白白的！',
  'ZhangXueFeng-skill-main': '来了啊老弟！\n我是张雪峰V2.0，升级版的嘴替。\n有啥问题尽管扔过来，我给你分析得透透的！\n先问一嘴：你啥家庭条件啊？这个必须先搞清楚。',
};

function addWelcomeMessage() {
  if (!STATE.activeSkill) return;

  if (STATE.groupChatEnabled) {
    var members = STATE.groupMembers.length > 0 ? STATE.groupMembers : STATE.skills;
    var names = members.map(function(m) { return m.label; }).join('、');
    var div = document.createElement('div');
    div.className = 'message bot';
    div.innerHTML =
      '<div class="msg-avatar"><span class="avatar-bot" style="background:#8e44ad">群</span></div>' +
      '<div class="bubble"><p>群聊已开启！当前参与角色：<strong>' + names + '</strong></p><p>发送消息后，所有角色将同时回答。</p></div>';
    messagesEl.appendChild(div);
    return;
  }

  var label = STATE.activeSkill.label;
  var initial = label.charAt(0).toUpperCase();
  var skill = STATE.skills.find(function(s) { return s.name === STATE.activeSkill.name; });
  var color = skill ? skill.color : '#1a73e8';
  var text = WELCOME_TEXTS[STATE.activeSkill.name] || (STATE.configured ? '来吧，有什么问题直接问！' : '请先配置 API Key 后开始聊天。');
  var div = document.createElement('div');
  div.className = 'message bot';
  var paragraphs = text.split('\n').map(function(p) { return '<p>' + p + '</p>'; }).join('');
  div.innerHTML =
    '<div class="msg-avatar"><span class="avatar-bot" style="background:' + color + '">' + initial + '</span></div>' +
    '<div class="bubble">' + paragraphs + '</div>';
  messagesEl.appendChild(div);
}

function renderAllMessages() {
  messagesEl.innerHTML = '';
  if (STATE.messages.length === 0) {
    addWelcomeMessage();
    return;
  }
  for (var i = 0; i < STATE.messages.length; i++) {
    renderMessageDOM(STATE.messages[i].role, STATE.messages[i].content, STATE.messages[i]._skillLabel, STATE.messages[i]._isQuestioner);
  }
  var msgs = messagesEl.querySelectorAll('.message');
  for (var j = 0; j < msgs.length; j++) {
    msgs[j].style.animation = 'none';
  }
  scrollToBottom();
}

function renderMessageDOM(role, content, skillLabel, isQuestioner) {
  const div = document.createElement('div');
  div.className = 'message ' + (role === 'user' ? 'user' : 'bot');

  if (role === 'user') {
    div.innerHTML = '<div class="msg-avatar"><span class="avatar-user">我</span></div><div class="bubble">' + renderMarkdown(content) + '</div>';
  } else if (STATE.groupChatEnabled && skillLabel) {
    // Questioner
    if (isQuestioner) {
      div.className += ' bubble-questioner';
      div.innerHTML =
        '<div class="msg-avatar"><span class="avatar-bot" style="background:#bbb;font-size:11px;">?</span></div>' +
        '<div class="bubble"><div class="bubble-skill-label" style="color:#999">提问者</div>' + renderMarkdown(content) + '</div>';
    } else {
      var groupSkill = STATE.groupMembers.find(function(m) { return m.label === skillLabel; }) || STATE.skills.find(function(s) { return s.label === skillLabel; });
      var gColor = groupSkill ? groupSkill.color : '#8e44ad';
      var gInitial = skillLabel.charAt(0).toUpperCase();
      div.innerHTML =
        '<div class="msg-avatar"><span class="avatar-bot" style="background:' + gColor + ';font-size:11px;">' + gInitial + '</span></div>' +
        '<div class="bubble"><div class="bubble-skill-label" style="color:' + gColor + '">' + skillLabel + '</div>' + renderMarkdown(content) + '</div>';
    }
  } else {
    var label = STATE.activeSkill ? STATE.activeSkill.label : 'AI';
    var initial = label.charAt(0).toUpperCase();
    var skill = STATE.skills.find(function(s) { return s.name === (STATE.activeSkill ? STATE.activeSkill.name : null); });
    var color = skill ? skill.color : '#1a73e8';
    div.innerHTML = '<div class="msg-avatar"><span class="avatar-bot" style="background:' + color + '">' + initial + '</span></div><div class="bubble">' + renderMarkdown(content) + '</div>';
  }

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
  statusBadge.textContent = configured ? 'API 已就绪' : '未配置 API';
  statusDotFooter.className = 'status-dot' + (configured ? ' active' : '');
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

  if (STATE.abortController) STATE.abortController.abort();
  STATE.abortController = new AbortController();

  try {
    if (STATE.groupChatEnabled) {
      await sendGroupMessage(text);
    } else {
      await sendSingleMessage(text);
    }
  } catch (err) {
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

async function sendSingleMessage(text) {
  showTypingIndicator();
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
      } catch (e) { /* skip */ }
    }
  }
  if (renderTimeout) clearTimeout(renderTimeout);
  var finalBubble = botDiv.querySelector('.bubble');
  if (finalBubble) finalBubble.innerHTML = renderMarkdown(fullContent);
  var lastMsg = STATE.messages[STATE.messages.length - 1];
  if (lastMsg) lastMsg.content = fullContent;
  saveMessages();
  scrollToBottom();
}

async function sendGroupMessage(text) {
  var members = STATE.groupMembers.length > 0 ? STATE.groupMembers : STATE.skills.map(function(s) { return { name: s.name, label: s.label, prompt: s.prompt, color: s.color }; });
  var rounds = STATE.groupRounds;
  var withQuestioner = STATE.groupQuestioner && rounds > 0;
  var allResults = [];

  // Stores the conversation so far for context in subsequent rounds
  var conversation = [];

  function createStreamBubble(color, initial, labelText, isQuestioner) {
    var div = document.createElement('div');
    div.className = 'message bot' + (isQuestioner ? ' bubble-questioner' : '');
    div.innerHTML =
      '<div class="msg-avatar"><span class="avatar-bot" style="background:' + color + ';font-size:11px;">' + initial + '</span></div>' +
      '<div class="bubble"><div class="bubble-skill-label" style="color:' + (isQuestioner ? '#999' : color) + '">' + labelText + '</div></div>';
    messagesEl.appendChild(div);
    var bubbleEl = div.querySelector('.bubble');
    scrollToBottom();
    return { div: div, bubbleEl: bubbleEl };
  }

  async function callMemberStream(member, promptText, bubbleObj) {
    var resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + STATE.apiKey },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: member.prompt || '' },
          { role: 'user', content: promptText },
        ],
        stream: true,
        max_tokens: 4096,
        temperature: 1.0,
      }),
      signal: STATE.abortController.signal,
    });
    if (!resp.ok) {
      var errData = await resp.json().catch(function() { return {}; });
      if (bubbleObj && bubbleObj.bubbleEl) bubbleObj.bubbleEl.innerHTML = renderMarkdown('[错误] ' + (errData.error ? errData.error.message : 'HTTP ' + resp.status));
      return '[错误] ' + (errData.error ? errData.error.message : 'HTTP ' + resp.status);
    }
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
            if (bubbleObj && bubbleObj.bubbleEl && !renderTimeout) {
              renderTimeout = setTimeout(function() {
                var labelText = member.label || (member === qMember ? '提问者' : '');
                var c = member === qMember ? '#999' : member.color;
                bubbleObj.bubbleEl.innerHTML = (labelText ? '<div class="bubble-skill-label" style="color:' + c + '">' + labelText + '</div>' : '') + renderMarkdown(fullContent);
                renderTimeout = null;
              }, 50);
            }
          }
        } catch (e) { /* skip */ }
      }
    }
    if (renderTimeout) clearTimeout(renderTimeout);
    if (bubbleObj && bubbleObj.bubbleEl) {
      var labelText = member.label || (member === qMember ? '提问者' : '');
      var c = member === qMember ? '#999' : member.color;
      bubbleObj.bubbleEl.innerHTML = (labelText ? '<div class="bubble-skill-label" style="color:' + c + '">' + labelText + '</div>' : '') + renderMarkdown(fullContent);
    }
    return fullContent;
  }

  var qMember = { name: 'questioner', label: '提问者', prompt: '', color: '#bbb' };

  // Round 0: User question -> each member answers
  for (var mi = 0; mi < members.length; mi++) {
    var bObj = createStreamBubble(members[mi].color, members[mi].label.charAt(0).toUpperCase(), members[mi].label, false);
    var answer = await callMemberStream(members[mi], text, bObj);
    conversation.push(members[mi].label + '：' + answer);
    allResults.push({ label: members[mi].label, content: answer, isQuestioner: false });
  }

  // Subsequent rounds
  for (var round = 1; round <= rounds; round++) {
    if (withQuestioner) {
      var questionerPrompt = '你是群聊主持人。请根据以下对话历史，提出一个引导性的问题来促进讨论深入。问题要简短有针对性，直接问。\n\n对话历史：\n' + conversation.join('\n') + '\n\n请提出你的问题：';
      var qObj = createStreamBubble('#bbb', '?', '提问者', true);
      var qAnswer = await callMemberStream(qMember, questionerPrompt, qObj);
      conversation.push('提问者：' + qAnswer);
      allResults.push({ label: '提问者', content: qAnswer, isQuestioner: true });

      for (var mj = 0; mj < members.length; mj++) {
        var bObj2 = createStreamBubble(members[mj].color, members[mj].label.charAt(0).toUpperCase(), members[mj].label, false);
        var a = await callMemberStream(members[mj], qAnswer, bObj2);
        conversation.push(members[mj].label + '：' + a);
        allResults.push({ label: members[mj].label, content: a, isQuestioner: false });
      }
    } else {
      var lastAnswer = conversation[conversation.length - 1] || text;
      var lastLabel = lastAnswer.split('：')[0] || '上一位';
      for (var mk = 0; mk < members.length; mk++) {
        var bObj3 = createStreamBubble(members[mk].color, members[mk].label.charAt(0).toUpperCase(), members[mk].label, false);
        var a2 = await callMemberStream(members[mk], lastLabel + '刚才说：' + (conversation[conversation.length - 1] || text) + '\n\n你对这个观点怎么看？有什么补充或不同意见？', bObj3);
        conversation.push(members[mk].label + '：' + a2);
        allResults.push({ label: members[mk].label, content: a2, isQuestioner: false });
      }
    }
  }

  // Save all results
  allResults.forEach(function(r) {
    STATE.messages.push({ role: 'assistant', content: r.content, _skillLabel: r.label, _isQuestioner: r.isQuestioner || false });
  });
  saveMessages();
  scrollToBottom();
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

  // Load group settings
  STATE.groupRounds = loadGroupRounds();
  STATE.groupQuestioner = loadGroupQuestioner();

  // Restore group members
  var savedMembers = loadGroupMembers();
  if (savedMembers.length > 0) {
    STATE.groupMembers = savedMembers.map(function(n) {
      var s = STATE.skills.find(function(sk) { return sk.name === n; });
      return s ? { name: s.name, label: s.label, prompt: s.prompt, color: s.color } : null;
    }).filter(function(m) { return m; });
  } else {
    STATE.groupMembers = STATE.skills.map(function(s) { return { name: s.name, label: s.label, prompt: s.prompt, color: s.color }; });
  }

  // Restore last active skill
  var savedSkillName = loadActiveSkillName();
  var targetSkill = null;
  if (savedSkillName === GROUP_CHAT_NAME) {
    STATE.groupChatEnabled = true;
    STATE.activeSkill = { name: GROUP_CHAT_NAME, label: 'AI 群聊', prompt: '' };
    STATE.messages = loadMessages(GROUP_CHAT_NAME);
    currentSkillName.textContent = 'AI 群聊';
  } else if (savedSkillName) {
    targetSkill = STATE.skills.find(function(s) { return s.name === savedSkillName; });
  }
  if (!targetSkill && STATE.skills.length > 0 && !STATE.groupChatEnabled) {
    targetSkill = STATE.skills[0];
  }
  if (targetSkill) {
    STATE.activeSkill = { name: targetSkill.name, label: targetSkill.label, prompt: targetSkill.prompt || '' };
    STATE.messages = loadMessages(targetSkill.name);
    currentSkillName.textContent = targetSkill.label;
    skillInfoName.textContent = targetSkill.label;
    var repoInit = SKILL_REPOS[targetSkill.name];
    skillInfoDesc.textContent = repoInit || '无';
    skillInfoDesc.style.cursor = repoInit ? 'pointer' : 'default';
    if (repoInit) {
      skillInfoDesc.onclick = function() { window.open(repoInit, '_blank'); dropdownMenu.classList.remove('open'); };
    } else {
      skillInfoDesc.onclick = null;
    }
  }

  renderSkillList();
  updateGroupDropdownVisibility();
  renderGroupMemberCheckboxes();
  updateGroupMenuText();
  updateUIForConfigured(STATE.configured);
  renderAllMessages();

  // Settings (always opens the normal modal; group settings are in the ... menu)
  settingsBtn.addEventListener('click', function() {
    closeSidebar();
    settingsModal.classList.add('open');
  });
  closeSettingsBtn.addEventListener('click', function() { settingsModal.classList.remove('open'); });
  settingsModal.addEventListener('click', function(e) {
    if (e.target === settingsModal) settingsModal.classList.remove('open');
  });

  // Group chat settings in dropdown
  function toggleQuestioner() {
    STATE.groupQuestioner = questionerCheckbox.checked;
    saveGroupSettings();
    updateGroupMenuText();
  }

  // Sync checkbox on change
  questionerCheckbox.addEventListener('change', toggleQuestioner);

  var roundChangeTimer = null;
  function setRounds(val) {
    if (val < 0) val = 0;
    if (val > 10) val = 10;
    STATE.groupRounds = val;
    saveGroupSettings();
    updateGroupMenuText();
    // Keep menu open for further adjustments
  }

  roundDec.addEventListener('click', function(e) { e.stopPropagation(); setRounds(STATE.groupRounds - 1); });
  roundInc.addEventListener('click', function(e) { e.stopPropagation(); setRounds(STATE.groupRounds + 1); });
  groupMenuQuestionerSetting.addEventListener('click', toggleQuestioner);

  saveKeyBtn.addEventListener('click', function() { saveApiKey(); if (STATE.configured) settingsModal.classList.remove('open'); });
  editKeyBtn.addEventListener('click', function() {
    apiKeyInput.disabled = false; apiKeyInput.focus();
    saveKeyBtn.style.display = 'inline-block'; editKeyBtn.style.display = 'none';
    setStatus('inactive', '未设置');
  });

  // Menu toggle
  menuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    dropdownMenu.classList.toggle('open');
  });
  document.addEventListener('click', function(e) {
    if (!dropdownMenu.contains(e.target) && e.target !== menuBtn) {
      dropdownMenu.classList.remove('open');
    }
  });

  // Clear
  clearBtn.addEventListener('click', function() {
    clearMessages();
    saveMessages();
    addWelcomeMessage();
    dropdownMenu.classList.remove('open');
  });

  // Backdrop for mobile sidebar
  var backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.addEventListener('click', closeSidebar);
  document.body.appendChild(backdrop);

  function openSidebar() { sidebar.classList.add('open'); backdrop.classList.add('open'); }
  function closeSidebar() { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }

  mobileToggle.addEventListener('click', function() {
    if (sidebar.classList.contains('open')) { closeSidebar(); } else { openSidebar(); }
  });

  skillListEl.addEventListener('click', function(e) {
    var item = e.target.closest('.skill-item');
    if (item) closeSidebar();
  });

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('input', autoResize);
  chatInput.addEventListener('keydown', onInputKeydown);
  if (STATE.configured) chatInput.focus();
}

// ===== Disclaimer =====
var disclaimerModal = document.getElementById('disclaimerModal');
var disclaimerAccept = document.getElementById('disclaimerAccept');
var disclaimerReject = document.getElementById('disclaimerReject');
var disclaimerCountdown = document.getElementById('disclaimerCountdown');

function checkDisclaimer() {
  if (localStorage.getItem('disclaimer_accepted')) { init(); return; }
  disclaimerModal.classList.add('open');
  var seconds = 10;
  disclaimerAccept.disabled = true;
  disclaimerCountdown.textContent = seconds;
  var timer = setInterval(function() {
    seconds--;
    disclaimerCountdown.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(timer);
      disclaimerAccept.disabled = false;
      disclaimerCountdown.textContent = '0';
    }
  }, 1000);
  disclaimerAccept.addEventListener('click', function() {
    localStorage.setItem('disclaimer_accepted', 'true');
    disclaimerModal.classList.remove('open');
    init();
  });
  disclaimerReject.addEventListener('click', function() {
    document.body.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;padding:20px;text-align:center;background:#f5f5f5;">' +
      '<h1 style="font-size:22px;margin-bottom:16px;color:#333;">已拒绝使用</h1>' +
      '<p style="font-size:14px;color:#666;margin-bottom:8px;">您已拒绝免责声明，无法使用本工具。</p>' +
      '<p style="font-size:14px;color:#666;">请关闭此页面。</p>' +
      '</div>';
  });
}

checkDisclaimer();
