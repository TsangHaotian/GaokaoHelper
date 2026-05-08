// ===== API Provider Config =====
const API_PROVIDERS = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    keyPrefix: 'sk-',
    isFree: false,
    desc: '在 <a href="https://platform.deepseek.com" target="_blank">platform.deepseek.com</a> 获取 API Key',
  },
  moonshot: {
    label: 'Moonshot 月之暗面',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-128k',
    keyPrefix: 'sk-',
    isFree: false,
    desc: '在 <a href="https://platform.moonshot.cn/console" target="_blank">platform.moonshot.cn</a> 获取 API Key',
  },
  minimax: {
    label: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/v1',
    model: 'M2-her',
    maxTokens: 2048,
    keyPrefix: 'sk-',
    isFree: false,
    desc: '在 <a href="https://platform.minimaxi.com" target="_blank">platform.minimaxi.com</a> 获取 API Key',
    note: '需在设置中填写 MiniMax 的 group_id',
  },
  glm_free: {
    label: 'GLM-4-Flash',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    keyPrefix: '',
    isFree: true,
    desc: '完全免费！在 <a href="https://bigmodel.cn" target="_blank">bigmodel.cn</a> 注册获取 API Key（无需付费）',
  },
  glm47: {
    label: 'GLM-4.7-Flash',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4.7-flash',
    keyPrefix: '',
    isFree: true,
    desc: '完全免费！在 <a href="https://bigmodel.cn" target="_blank">bigmodel.cn</a> 注册获取 API Key（无需付费）',
  },
};

// ===== State =====
const STATE = {
  apiKey: '',
  apiProvider: 'deepseek',
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
  groupQuestioner: true,
  webSearch: false,
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

function saveWebSearch() {
  localStorage.setItem(storageKey('web_search'), STATE.webSearch ? '1' : '0');
}
function loadWebSearch() {
  try { var v = localStorage.getItem(storageKey('web_search')); return v === '1'; } catch (e) { return false; }
}

function saveProvider() {
  localStorage.setItem(storageKey('api_provider'), STATE.apiProvider);
}

function loadProvider() {
  try { return localStorage.getItem(storageKey('api_provider')) || 'deepseek'; } catch (e) { return 'deepseek'; }
}

function getProviderConfig() {
  return API_PROVIDERS[STATE.apiProvider] || API_PROVIDERS.deepseek;
}

// ===== DOM Refs =====
const $ = (id) => document.getElementById(id);
const apiKeyInput       = $('apiKeyInput');
const apiProviderSelect = $('apiProviderSelect');
const apiKeyDesc        = $('apiKeyDesc');
const saveKeyBtn        = $('saveKeyBtn');
const getApiKeyBtn      = $('getApiKeyBtn');
const editKeyBtn        = $('editKeyBtn');
const statusDot         = $('statusDot');
const statusText        = $('statusText');
const messagesEl        = $('messages');
const chatInput         = $('chatInput');
const sendBtn           = $('sendBtn');
const stopBtn           = $('stopBtn');
const settingsBtn       = $('settingsBtn');
const settingsModal     = $('settingsModal');
const closeSettingsBtn  = $('closeSettingsBtn');
const skillListEl       = $('skillList');
const statusBadge       = $('statusBadge');
const statusDotFooter   = $('statusDot');
const currentSkillName  = $('currentSkillName');
const headerSubtitle    = $('headerSubtitle');
const modelSelectBtn    = $('modelSelectBtn');
const modelIndicator    = $('modelIndicator');
const modelDropdown     = $('modelDropdown');
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

function avatarHtml(skill, opts) {
  opts = opts || {};
  var size = opts.size || 32;
  var fontSize = opts.fontSize || (size >= 32 ? 12 : 11);
  if (skill && skill.avatar) {
    return 'style="background-image:url(' + skill.avatar + ');background-size:cover;background-position:center;width:' + size + 'px;height:' + size + 'px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">';
  }
  var initial = skill ? skill.label.charAt(0).toUpperCase() : '?';
  var color = skill ? skill.color : '#bbb';
  return 'style="background:' + color + ';width:' + size + 'px;height:' + size + 'px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:' + fontSize + 'px;font-weight:600;flex-shrink:0;">' + initial;
}

const SKILL_REPOS = {
  'zhangxuefeng': 'https://github.com/alchaincyf/zhangxuefeng-skill',
  'ZhangXueFeng-skill-main': 'https://github.com/a18515373115-droid/ZhangXueFeng-skill',
};

// ===== Scan Skills =====
function updateLoader(progress, text) {
  var bar = document.querySelector('#loader-bar .bar');
  var txt = document.querySelector('#loader-bar .text');
  if (bar) bar.style.width = progress + '%';
  if (txt) txt.textContent = text;
}

async function scanSkills() {
  try {
    const listResp = await fetch('skill/index.json?t=' + Date.now());
    if (!listResp.ok) throw new Error('no index');
    const entries = await listResp.json();
    STATE.skills = [];
    let idx = 0;
    const total = entries.length;
    for (const entry of entries) {
      const name = typeof entry === 'string' ? entry : entry.name;
      const label = typeof entry === 'string' ? name : (entry.label || name);
      updateLoader(Math.round((idx / total) * 80) + 10, '加载角色：' + label);
      const sr = await fetch('skill/' + name + '/SKILL.md?t=' + Date.now());
      if (sr.ok) {
        const text = await sr.text();
        STATE.skills.push({ name, label, prompt: text, color: AVATAR_COLORS[idx % AVATAR_COLORS.length], avatar: entry.avatar || null });
        idx++;
      }
    }
    updateLoader(90, '初始化中...');
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
    var isActive = STATE.activeSkill && STATE.activeSkill.name === s.name && !STATE.groupChatEnabled;
    return (
      '<div class="skill-item' + (isActive ? ' active' : '') + '" data-skill="' + s.name + '">' +
        '<div class="skill-avatar" ' + avatarHtml(s, {size:38, fontSize:15}) + '</div>' +
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

function renderGroupMemberToggles() {
  groupMenuMemberList.innerHTML = '';
  STATE.skills.forEach(function(skill) {
    var checked = STATE.groupMembers.some(function(m) { return m.name === skill.name; });
    var item = document.createElement('div');
    item.className = 'group-member-toggle-item';
    item.innerHTML =
      '<span class="group-menu-member-tag-sm" ' + avatarHtml(skill, {size:26}) + '</span>' +
      '<span class="group-member-toggle-label">' + skill.label + '</span>' +
      '<label class="toggle-switch toggle-switch-sm">' +
        '<input type="checkbox" class="member-toggle-input" data-name="' + skill.name + '"' + (checked ? ' checked' : '') + '>' +
        '<span class="toggle-slider"></span>' +
      '</label>';
    groupMenuMemberList.appendChild(item);

    item.querySelector('.member-toggle-input').addEventListener('change', function(e) {
      var name = e.target.dataset.name;
      if (e.target.checked) {
        var s = STATE.skills.find(function(sk) { return sk.name === name; });
        if (s && !STATE.groupMembers.some(function(m) { return m.name === name; })) {
          var order = { zhangxuefeng: 0, zhangxuefengv2: 1, balancer: 2, questioner: 99 };
          var idx = order[name] !== undefined ? order[name] : 3;
          var insertAt = 0;
          while (insertAt < STATE.groupMembers.length && (order[STATE.groupMembers[insertAt].name] !== undefined ? order[STATE.groupMembers[insertAt].name] : 3) <= idx) {
            insertAt++;
          }
          STATE.groupMembers.splice(insertAt, 0, { name: s.name, label: s.label, prompt: s.prompt, color: s.color });
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
    renderGroupMemberToggles();
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
  'balancer': '哈喽，我是平衡者。\n张雪峰老师给你讲的那些，大体都没错，不过我想带你看看硬币的另一面。\n有什么问题尽管说，我帮你从更多角度琢磨琢磨。',
  'parent': '孩子啊，爸妈来了。\n你这选学校选专业的事儿，爸妈帮不上什么大忙，但有些话想跟你说说。\n你自己是怎么想的？跟爸妈唠唠？',
  'counselor': '你好呀，我是心理辅导员。\n高考完了，各种情绪涌上来了是吧？焦虑、迷茫、害怕选错——这些都很正常。\n如果你愿意，可以跟我说说你现在的心情。',
  'career': '你好，我是职业规划师。\n我不只看你眼前的分数和学校——我更关心的是：10年后你想过什么样的生活？\�有什么关于未来的想法，说说看，我们一起理一理。',
  'data-analyst': '你好，我是数据分析师。\n我不凭感觉给建议，一切靠数据说话。\n不过我的知识有截止日期，最新的数据需要你来提供。\n你可以告诉我你想了解什么方向，我告诉你去哪找数据、怎么分析。',
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

  var skill = STATE.skills.find(function(s) { return s.name === STATE.activeSkill.name; });
  var text = WELCOME_TEXTS[STATE.activeSkill.name] || (STATE.configured ? '来吧，有什么问题直接问！' : '请先配置 API Key 后开始聊天。');
  var div = document.createElement('div');
  div.className = 'message bot';
  var paragraphs = text.split('\n').map(function(p) { return '<p>' + p + '</p>'; }).join('');
  div.innerHTML =
    '<div class="msg-avatar"><span class="avatar-bot" ' + avatarHtml(skill || STATE.activeSkill, {size:32}) + '</span></div>' +
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
        '<div class="msg-avatar"><span class="avatar-bot" ' + avatarHtml(null, {size:32}) + '</span></div>' +
        '<div class="bubble"><div class="bubble-skill-label" style="color:#999">提问者</div>' + renderMarkdown(content) + '</div>';
    } else {
      var groupSkill = STATE.groupMembers.find(function(m) { return m.label === skillLabel; }) || STATE.skills.find(function(s) { return s.label === skillLabel; });
      div.innerHTML =
        '<div class="msg-avatar"><span class="avatar-bot" ' + avatarHtml(groupSkill, {size:32}) + '</span></div>' +
        '<div class="bubble"><div class="bubble-skill-label" style="color:' + (groupSkill ? groupSkill.color : '#8e44ad') + '">' + skillLabel + '</div>' + renderMarkdown(content) + '</div>';
    }
  } else {
    var skill = STATE.skills.find(function(s) { return s.name === (STATE.activeSkill ? STATE.activeSkill.name : null); });
    div.innerHTML = '<div class="msg-avatar"><span class="avatar-bot" ' + avatarHtml(skill || STATE.activeSkill, {size:32}) + '</span></div><div class="bubble">' + renderMarkdown(content) + '</div>';
  }

  messagesEl.appendChild(div);
  scrollToBottom();
}

// ===== API Key =====
function loadSavedKey() {
  STATE.apiProvider = loadProvider();
  apiProviderSelect.value = STATE.apiProvider;
  updateApiKeyDesc();

  const saved = localStorage.getItem('api_key_' + STATE.apiProvider);
  if (saved) {
    STATE.apiKey = saved;
    STATE.configured = true;
    apiKeyInput.value = saved;
  }
}

function updateApiKeyDesc() {
  var cfg = getProviderConfig();
  apiKeyDesc.innerHTML = cfg.desc;
  apiKeyInput.placeholder = cfg.keyPrefix ? (cfg.keyPrefix + '...') : '输入 API Key...';
  headerSubtitle.textContent = cfg.label + (cfg.isFree ? ' · 免费' : '');
  modelIndicator.textContent = cfg.label;
}

function saveApiKey() {
  const key = apiKeyInput.value.trim();
  var cfg = getProviderConfig();
  if (!key) { setStatus('error', '请输入 API Key'); return; }
  if (cfg.keyPrefix && key.indexOf(cfg.keyPrefix) !== 0) {
    setStatus('error', 'Key 格式不正确');
    return;
  }
  STATE.apiKey = key;
  STATE.configured = true;
  localStorage.setItem('api_key_' + STATE.apiProvider, key);
  saveProvider();
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

// ===== Plain text renderer (no markdown) =====
function renderMarkdown(text) {
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  var html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var lines = html.split('\n').filter(function(l) { return l.trim(); });
  return lines.map(function(l) { return '<p>' + l + '</p>'; }).join('');
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
  sendBtn.style.display = 'none';
  stopBtn.style.display = 'flex';

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
    sendBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    sendBtn.disabled = !STATE.configured;
    STATE.abortController = null;
  }
}

async function sendSingleMessage(text) {
  var cfg = getProviderConfig();
  var systemPrompt = STATE.activeSkill.prompt || '';

  // Step 1: If webSearch enabled, do GLM search first (non-streaming)
  var searchResults = '';
  if (STATE.webSearch) {
    console.log('[webSearch] 开始搜索，provider:', STATE.apiProvider);
    var searchDiv = document.createElement('div');
    searchDiv.className = 'message bot';
    searchDiv.innerHTML = '<div class="msg-avatar"><span class="avatar-bot" style="background:#007aff;font-size:11px;">🔍</span></div><div class="bubble"><p style="color:var(--text-muted);font-style:italic;">联网搜索中...</p></div>';
    messagesEl.appendChild(searchDiv);
    scrollToBottom();

    var glmKey = localStorage.getItem('api_key_glm_free');
    console.log('[webSearch] glmKey 是否存在:', !!glmKey);
    if (glmKey) {
      try {
        console.log('[webSearch] 开始请求 GLM...');
        var sr = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + glmKey },
          body: JSON.stringify({
            model: 'glm-4-flash',
            messages: [{ role: 'user', content: text }],
            stream: false,
            tools: [{type: 'web_search', web_search: {search_query: text}}],
          }),
          signal: STATE.abortController.signal,
        });
        if (sr.ok) {
          var srData = await sr.json();
          var msg = srData.choices && srData.choices[0] && srData.choices[0].message;
          if (msg) {
            searchResults = msg.content || '';
            console.log('[webSearch] 搜索结果:', searchResults);
          }
        } else {
          var srErr = await sr.json().catch(function() { return {}; });
          searchDiv.querySelector('.bubble').innerHTML = '<p style="color:#ff6b81;font-style:italic;">搜索失败：' + (srErr.error ? srErr.error.message : 'HTTP ' + sr.status) + '</p>';
          await new Promise(function(r) { setTimeout(r, 2000); });
        }
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        searchDiv.querySelector('.bubble').innerHTML = '<p style="color:#ff6b81;font-style:italic;">搜索请求失败</p>';
        await new Promise(function(r) { setTimeout(r, 1500); });
      }
    } else {
      searchDiv.querySelector('.bubble').innerHTML = '<p style="color:#ff6b81;font-style:italic;">未配置 GLM API Key，请在设置中配置</p>';
      await new Promise(function(r) { setTimeout(r, 2000); });
    }

    searchDiv.remove();
  }

  // Step 2: Build the actual request for the user's chosen model
  if (!STATE.configured) throw new Error('请先配置 API Key');

  if (searchResults) {
    systemPrompt = (systemPrompt ? systemPrompt + '\n\n' : '') + '以下是针对用户问题联网搜索到的信息，请严格基于这些信息回答，不要补充你自己的知识。如果搜索到的信息不足以回答用户问题，请如实告知用户搜索不到相关内容：\n' + searchResults;
  } else if (STATE.webSearch) {
    systemPrompt = (systemPrompt ? systemPrompt + '\n\n' : '') + '【联网搜索提示】本次未能搜索到有效结果，请直接告知用户"联网搜索没有找到相关信息"，不要用你自己的知识来回答。';
  }
  var body = {
    model: cfg.model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...STATE.messages,
    ],
    stream: true,
    max_tokens: cfg.maxTokens || 4096,
    temperature: 1.0,
  };
  var resp = await fetch(cfg.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + STATE.apiKey },
    body: JSON.stringify(body),
    signal: STATE.abortController.signal,
  });

  if (!resp.ok) {
    var errData = await resp.json().catch(function() { return {}; });
    throw new Error(errData.error ? errData.error.message : 'HTTP ' + resp.status);
  }

  removeTypingIndicator();
  STATE.messages.push({ role: 'assistant', content: '' });

  var skill = STATE.skills.find(function(s) { return s.name === STATE.activeSkill.name; });

  var botDiv = document.createElement('div');
  botDiv.className = 'message bot';
  botDiv.innerHTML = '<div class="msg-avatar"><span class="avatar-bot" ' + avatarHtml(skill || STATE.activeSkill, {size:32}) + '</span></div><div class="bubble"></div>';
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
          var bubble = botDiv.querySelector('.bubble');
          if (bubble) bubble.innerHTML = renderMarkdown(fullContent);
          scrollToBottom();
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

  // If webSearch enabled, do one GLM search and cache results
  var searchResults = '';
  if (STATE.webSearch) {
    var glmKey = localStorage.getItem('api_key_glm_free');
    if (glmKey) {
      try {
        var sr = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + glmKey },
          body: JSON.stringify({
            model: 'glm-4-flash',
            messages: [{ role: 'user', content: text }],
            stream: false,
            tools: [{type: 'web_search', web_search: {search_query: text}}],
          }),
          signal: STATE.abortController.signal,
        });
        if (sr.ok) {
          var srData = await sr.json();
          if (srData.choices && srData.choices[0] && srData.choices[0].message) {
            searchResults = srData.choices[0].message.content || '';
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') throw e;
      }
    }
  }

  function createStreamBubble(member, labelText, isQuestioner) {
    var div = document.createElement('div');
    div.className = 'message bot' + (isQuestioner ? ' bubble-questioner' : '');
    div.innerHTML =
      '<div class="msg-avatar"><span class="avatar-bot" ' + avatarHtml(member, {size:32}) + '</span></div>' +
      '<div class="bubble"><div class="bubble-skill-label" style="color:' + (isQuestioner ? '#999' : (member ? member.color : '#8e44ad')) + '">' + labelText + '</div></div>';
    messagesEl.appendChild(div);
    var bubbleEl = div.querySelector('.bubble');
    scrollToBottom();
    return { div: div, bubbleEl: bubbleEl };
  }

  async function callMemberStream(member, promptText, bubbleObj) {
    var cfg = getProviderConfig();
    var memberPrompt = member.prompt || '';
    if (searchResults) {
      memberPrompt = (memberPrompt ? memberPrompt + '\n\n' : '') + '以下是针对讨论主题联网搜索到的信息（供参考）：\n' + searchResults;
    }
    var body = {
      model: cfg.model,
      messages: [
        { role: 'user', content: (memberPrompt ? memberPrompt + '\n\n' : '') + '（群聊模式，请用1-3句话简洁回答，不要长篇大论）\n' + promptText },
      ],
      stream: true,
      max_tokens: cfg.maxTokens || 4096,
      temperature: 1.0,
    };
    var resp = await fetch(cfg.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + STATE.apiKey },
      body: JSON.stringify(body),
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
            if (bubbleObj && bubbleObj.bubbleEl) {
              var labelText = member.label || (member === qMember ? '提问者' : '');
              var c = member === qMember ? '#999' : member.color;
              bubbleObj.bubbleEl.innerHTML = (labelText ? '<div class="bubble-skill-label" style="color:' + c + '">' + labelText + '</div>' : '') + renderMarkdown(fullContent);
              scrollToBottom();
            }
          }
        } catch (e) { /* skip */ }
      }
    }
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
    var bObj = createStreamBubble(members[mi], members[mi].label, false);
    var answer = await callMemberStream(members[mi], text, bObj);
    conversation.push(members[mi].label + '：' + answer);
    allResults.push({ label: members[mi].label, content: answer, isQuestioner: false });
  }

  // Questioner summarizes after round 0, before subsequent rounds
  if (withQuestioner && rounds > 0) {
    var questionerPrompt = '你是群聊主持人。请先总结上述各方的核心观点，然后按以下格式输出追问：\n【AI名称】追问内容\n【AI名称】追问内容\n\n对话历史：\n' + conversation.join('\n') + '\n\n请先总结各方观点，然后按【AI名称】格式对每个AI提出一个追问。';
    var qObj = createStreamBubble(null, '提问者', true);
    var qAnswer = await callMemberStream(qMember, questionerPrompt, qObj);
    conversation.push('提问者：' + qAnswer);
    allResults.push({ label: '提问者', content: qAnswer, isQuestioner: true });
  }

  // Subsequent rounds
  for (var round = 1; round <= rounds; round++) {
    if (withQuestioner) {
      for (var mj = 0; mj < members.length; mj++) {
        var bObj2 = createStreamBubble(members[mj], members[mj].label, false);
        // Extract question for this member from qAnswer
        var memberQuestion = '';
        var lines = qAnswer.split('\n');
        for (var li = 0; li < lines.length; li++) {
          if (lines[li].indexOf('【' + members[mj].label + '】') !== -1) {
            memberQuestion = lines[li];
            break;
          }
        }
        var promptText = memberQuestion ? members[mj].label + '，请回答以下问题：\n' + memberQuestion : qAnswer;
        var a = await callMemberStream(members[mj], promptText, bObj2);
        conversation.push(members[mj].label + '：' + a);
        allResults.push({ label: members[mj].label, content: a, isQuestioner: false });
      }
    } else {
      var lastAnswer = conversation[conversation.length - 1] || text;
      var lastLabel = lastAnswer.split('：')[0] || '上一位';
      for (var mk = 0; mk < members.length; mk++) {
        var bObj3 = createStreamBubble(members[mk], members[mk].label, false);
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
  var skill = STATE.skills.find(function(s) { return s.name === STATE.activeSkill.name; });

  var div = document.createElement('div');
  div.className = 'message bot typing';
  div.innerHTML =
    '<div class="msg-avatar"><span class="avatar-bot" ' + avatarHtml(skill || STATE.activeSkill, {size:32}) + '</span></div>' +
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
async function init() { try {

  await scanSkills();
  loadSavedKey();

  // Load group settings
  STATE.groupRounds = loadGroupRounds();
  STATE.groupQuestioner = loadGroupQuestioner();
  STATE.webSearch = loadWebSearch();

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
  renderGroupMemberToggles();
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

  // Web search toggle button
  var webSearchBtn = document.getElementById('webSearchBtn');
  function updateWebSearchBtn() {
    webSearchBtn.classList.toggle('active', STATE.webSearch);
  }
  updateWebSearchBtn();
  webSearchBtn.addEventListener('click', function() {
    var glmKey = localStorage.getItem('api_key_glm_free');
    if (!glmKey) {
      // No GLM key configured — guide user to set it up
      switchProvider('glm_free');
      settingsModal.classList.add('open');
      return;
    }
    STATE.webSearch = !STATE.webSearch;
    saveWebSearch();
    updateWebSearchBtn();
  });

  function switchProvider(provider) {
    STATE.apiProvider = provider;
    saveProvider();
    apiProviderSelect.value = provider;
    updateApiKeyDesc();
    apiKeyInput.value = '';
    apiKeyInput.disabled = false;
    saveKeyBtn.style.display = 'inline-block';
    editKeyBtn.style.display = 'none';
    STATE.configured = false;
    STATE.apiKey = '';
    updateUIForConfigured(false);
    setStatus('inactive', '未设置');
    var saved = localStorage.getItem('api_key_' + STATE.apiProvider);
    if (saved) {
      STATE.apiKey = saved;
      STATE.configured = true;
      apiKeyInput.value = saved;
      updateUIForConfigured(true);
      setStatus('active', '已就绪');
    }
    renderModelDropdown();
  }

  apiProviderSelect.addEventListener('change', function() {
    switchProvider(apiProviderSelect.value);
  });

  // Model dropdown
  function renderModelDropdown() {
    var keys = Object.keys(API_PROVIDERS);
    modelDropdown.innerHTML = keys.map(function(k) {
      var cfg = API_PROVIDERS[k];
      var active = k === STATE.apiProvider;
      var dot = active ? '<span class="model-check">✓</span>' : '<span class="model-dot" style="background:' + (k === 'deepseek' ? '#007aff' : k === 'moonshot' ? '#ff9500' : k === 'minimax' ? '#34c759' : '#8e44ad') + '"></span>';
      return '<div class="model-dropdown-item' + (active ? ' active' : '') + '" data-provider="' + k + '">' +
        dot +
        '<span class="model-name">' + cfg.label + '</span>' +
        '<span class="model-badge">' + cfg.model + '</span>' +
      '</div>';
    }).join('');

    modelDropdown.querySelectorAll('.model-dropdown-item').forEach(function(el) {
      el.addEventListener('click', function() {
        switchProvider(this.dataset.provider);
        modelDropdown.classList.remove('open');
      });
    });
  }

  modelSelectBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    modelDropdown.classList.toggle('open');
  });

  saveKeyBtn.addEventListener('click', function() { saveApiKey(); if (STATE.configured) settingsModal.classList.remove('open'); });
  editKeyBtn.addEventListener('click', function() {
    apiKeyInput.disabled = false; apiKeyInput.focus();
    saveKeyBtn.style.display = 'inline-block'; editKeyBtn.style.display = 'none';
    setStatus('inactive', '未设置');
  });
  getApiKeyBtn.addEventListener('click', function() {
    var urls = {
      deepseek: 'guide/deepseek.html',
      moonshot: 'guide/moonshot.html',
      minimax: 'guide/minimax.html',
      glm_free: 'guide/glm_free.html',
      glm47: 'guide/glm_free.html',
    };
    var url = urls[STATE.apiProvider] || urls.deepseek;
    window.open(url, '_blank');
  });

  // Menu toggle
  menuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    dropdownMenu.classList.toggle('open');
  });
  document.addEventListener('click', function(e) {
    // Close model dropdown if clicking outside
    if (modelSelectBtn && !modelSelectBtn.contains(e.target) && !modelDropdown.contains(e.target)) {
      modelDropdown.classList.remove('open');
    }
    // Close ... dropdown if clicking outside
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
  stopBtn.addEventListener('click', function() {
    if (STATE.abortController) {
      STATE.abortController.abort();
      STATE.abortController = null;
    }
    STATE.loading = false;
    sendBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    sendBtn.disabled = !STATE.configured;
  });
  chatInput.addEventListener('input', autoResize);
  chatInput.addEventListener('keydown', onInputKeydown);
  if (STATE.configured) chatInput.focus();

  // Initial render for model dropdown
  renderModelDropdown();

  // Auto-show settings modal if no API key configured, or if returning from guide
  if (!STATE.configured || window.location.search.indexOf('openSettings=1') !== -1) {
    setTimeout(function() { settingsModal.classList.add('open'); }, 500);
    // Clean up URL param to prevent re-opening on refresh
    if (window.location.search.indexOf('openSettings=1') !== -1) {
      var url = window.location.pathname + window.location.hash;
      window.history.replaceState(null, '', url);
    }
  }

  updateLoader(100, '加载完成');
  var loaderBar = document.getElementById('loader-bar');
  if (loaderBar) { loaderBar.style.opacity = '0'; setTimeout(function() { loaderBar.remove(); }, 300); }
  document.querySelector('.app').classList.add('ready');
} catch(e) { console.error("init error:", e); document.querySelector('.app').classList.add('ready'); } }

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

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(function(e) {
    console.warn('SW registration failed:', e);
  });
}

checkDisclaimer();
