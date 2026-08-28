// ===== API Provider Config =====
const API_PROVIDERS = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
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
    label: 'GLM-4.7-Flash',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4.7-flash',
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
const ANALYSIS_NAME = '__analysis__';

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

  // Add analysis item at the top
  var analysisActive = STATE.activeSkill && STATE.activeSkill.name === ANALYSIS_NAME;
  items.unshift(
    '<div class="skill-item' + (analysisActive ? ' active' : '') + '" data-skill="' + ANALYSIS_NAME + '">' +
      '<div class="skill-avatar" style="background:#e67e22">录</div>' +
      '<div class="skill-info">' +
        '<div class="skill-name">数据录入</div>' +
        '<div class="skill-desc">录入成绩与目标院校</div>' +
      '</div>' +
    '</div>'
  );

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

function showInputArea() {
  var inputArea = document.querySelector('.input-area');
  if (inputArea) inputArea.style.display = '';
  menuBtn.style.display = '';
  // Reset messages styles when leaving analysis mode
  messagesEl.style.overflow = '';
  messagesEl.style.flex = '';
  messagesEl.style.minHeight = '';
}

// ===== Skill Selection =====
function selectSkill(name) {
  saveMessages();
  // Save entry data before leaving data entry mode
  if (STATE.activeSkill && STATE.activeSkill.name !== name && STATE.activeSkill.name === ANALYSIS_NAME) {
    saveEntryData();
  }

  if (name === ANALYSIS_NAME) {
    STATE.groupChatEnabled = false;
    STATE.activeSkill = { name: ANALYSIS_NAME, label: '数据录入', prompt: '' };
    currentSkillName.textContent = '数据录入';
    STATE.messages = [];
    renderSkillList();
    updateGroupDropdownVisibility();
    updateUIForConfigured(STATE.configured);
    renderAnalysisForm();
    saveActiveSkill();
    return;
  }

  if (name === GROUP_CHAT_NAME) {
    STATE.groupChatEnabled = true;
    STATE.activeSkill = { name: GROUP_CHAT_NAME, label: 'AI 群聊', prompt: '' };
    currentSkillName.textContent = 'AI 群聊';
    skillInfoName.textContent = 'AI 群聊';
    skillInfoDesc.textContent = '多人同时回答';
    showInputArea();
    
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
  showInputArea();
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
  'data-analyst': '你好，我是数据分析师。\n我不凭感觉给建议，一切靠数据说话。\n当用户开启联网搜索时，系统会调用 GLM-4.7-Flash 获取最新数据提供给我分析。\n你想了解什么方向？我帮你找数据、做分析。',
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

// ===== 数据录入 =====
var analysisExamType = 'xingaokao'; // xingaokao | wenli | old
var analysisTargetSchools = []; // [{name, major, years: [{year, score, rank, enroll}]}]
var analysisCurrentSchoolIdx = 0;

// Persisted entry data for injection into AI conversations
var savedEntryData = null; // { examType, scores:{}, rank, province, schools:[] }

function saveEntryData() {
  // Collect scores from DOM if available
  var scores = {};
  document.querySelectorAll('.score-input').forEach(function(inp) {
    if (inp.value) scores[inp.dataset.subject] = inp.value;
  });
  var rank = (document.getElementById('analysisRankInput') || {}).value || '';
  var province = (document.getElementById('analysisProvinceInput') || {}).value || '';
  // Sync current school name/major from DOM before saving
  var curSchool = analysisTargetSchools[analysisCurrentSchoolIdx];
  if (curSchool) {
    var nameInp = document.querySelector('.school-name-input');
    var majorInp = document.querySelector('.school-major-input');
    if (nameInp) curSchool.name = nameInp.value;
    if (majorInp) curSchool.major = majorInp.value;
  }
  savedEntryData = {
    examType: analysisExamType,
    scores: scores,
    rank: rank,
    province: province,
    schools: JSON.parse(JSON.stringify(analysisTargetSchools)),
  };
  try {
    localStorage.setItem(storageKey('entry_data'), JSON.stringify(savedEntryData));
  } catch (e) { /* ignore */ }
}

function loadEntryData() {
  try {
    var raw = localStorage.getItem(storageKey('entry_data'));
    if (raw) savedEntryData = JSON.parse(raw);
    else savedEntryData = null;
  } catch (e) { savedEntryData = null; }
}

function buildDataContextPrompt() {
  // Ensure data is loaded from storage
  if (!savedEntryData) loadEntryData();
  if (!savedEntryData) return '';

  var d = savedEntryData;
  var hasScores = Object.keys(d.scores).length > 0;
  var hasSchools = d.schools && d.schools.length > 0 && d.schools.some(function(s) { return s.name; });
  if (!hasScores && !d.rank && !hasSchools) return '';

  var lines = [];
  lines.push('【用户录入的高考数据 — 请优先采信以下数据】');

  var examLabels = { xingaokao: '新高考（3+1+2）', wenli: '文理分科', old: '纯文理（3+综合）' };
  lines.push('考试类型：' + (examLabels[d.examType] || d.examType));

  if (hasScores) {
    var scoreParts = [];
    if (d.scores.yuwen) scoreParts.push('语文：' + d.scores.yuwen + '分');
    if (d.scores.shuxue) scoreParts.push('数学：' + d.scores.shuxue + '分');
    if (d.scores.waiyu) scoreParts.push('外语：' + d.scores.waiyu + '分');
    if (d.examType === 'xingaokao') {
      if (d.scores.wuli_xgk) scoreParts.push('物理：' + d.scores.wuli_xgk + '分');
      if (d.scores.lishi_xgk) scoreParts.push('历史：' + d.scores.lishi_xgk + '分');
      ['zhengzhi','dili','huaxue','shengwu'].forEach(function(k) {
        if (d.scores[k]) scoreParts.push({zhengzhi:'思想政治',dili:'地理',huaxue:'化学',shengwu:'生物学'}[k] + '：' + d.scores[k] + '分');
      });
    } else if (d.examType === 'wenli') {
      if (d.scores.lizong) scoreParts.push('理科综合：' + d.scores.lizong + '分');
      if (d.scores.wenzong) scoreParts.push('文科综合：' + d.scores.wenzong + '分');
    } else {
      if (d.scores.zonghe) scoreParts.push('综合：' + d.scores.zonghe + '分');
    }
    lines.push('各科成绩：' + scoreParts.join('，'));
  }

  if (d.rank) lines.push('全省排名：' + d.rank);
  if (d.province) lines.push('省份：' + d.province);

  if (hasSchools) {
    lines.push('');
    lines.push('目标院校：');
    d.schools.forEach(function(s, idx) {
      if (!s.name) return;
      lines.push((idx + 1) + '. ' + s.name + (s.major ? ' — ' + s.major : ''));
      if (s.years && s.years.some(function(y) { return y.score || y.rank || y.enroll; })) {
        s.years.forEach(function(y) {
          var parts = [];
          if (y.score) parts.push('最低分' + y.score);
          if (y.rank) parts.push('最低排名' + y.rank);
          if (y.enroll) parts.push('录取' + y.enroll + '人');
          if (parts.length) lines.push('   ' + (y.year || '') + '年：' + parts.join('，'));
        });
      }
    });
  }

  lines.push('');
  lines.push('【数据使用规则】');
  lines.push('1. 以上数据由用户自行录入，请默认信任这些数据的准确性，基于这些数据进行分析和回答。');
  lines.push('2. 除非存在明显的逻辑错误（如单科成绩超过满分、排名超过全省总人数），否则不要质疑数据。');
  lines.push('3. 如果发现明显错误，应礼貌指出并询问用户是否需要更正。');
  lines.push('4. 不要编造用户没有录入的数据，对于不确定的信息如实告知。');

  return lines.join('\n');
}

function getDefaultPrevYears() {
  var currentYear = new Date().getFullYear();
  if (currentYear < 2000) currentYear = 2026;
  return [
    { year: String(currentYear - 1), score: '', rank: '', enroll: '' },
    { year: String(currentYear - 2), score: '', rank: '', enroll: '' },
    { year: String(currentYear - 3), score: '', rank: '', enroll: '' },
  ];
}

function getCurrentYears() {
  var school = analysisTargetSchools[analysisCurrentSchoolIdx];
  return school ? school.years : [];
}

function initTargetSchools() {
  analysisTargetSchools = [{ name: '', major: '', years: getDefaultPrevYears() }];
  analysisCurrentSchoolIdx = 0;
}

function syncCurrentSchoolFromForm() {
  var school = analysisTargetSchools[analysisCurrentSchoolIdx];
  if (!school) return;
  var nameInput = document.querySelector('.school-name-input');
  var majorInput = document.querySelector('.school-major-input');
  if (nameInput) school.name = nameInput.value;
  if (majorInput) school.major = majorInput.value;
  // years are already synced via prev-year-input events
  saveEntryData();
}

function renderTargetSchoolSelector(cardBody) {
  var selHtml = '<div class="school-selector-bar">' +
    '<select class="school-selector" id="schoolSelector">' +
      analysisTargetSchools.map(function(s, i) {
        var label = s.name || ('院校 ' + (i + 1));
        return '<option value="' + i + '"' + (i === analysisCurrentSchoolIdx ? ' selected' : '') + '>' + label + '</option>';
      }).join('') +
    '</select>' +
    '<span class="school-page-num">' + (analysisCurrentSchoolIdx + 1) + ' / ' + analysisTargetSchools.length + '</span>' +
  '</div>';
  cardBody.insertAdjacentHTML('beforeend', selHtml);
}

function renderTargetSchoolForm(cardBody) {
  var school = analysisTargetSchools[analysisCurrentSchoolIdx];
  var nameVal = school ? school.name : '';
  var majorVal = school ? school.major : '';
  var formHtml =
    '<div class="analysis-subject-grid">' +
      '<div class="analysis-subject-item analysis-subject-full"><label class="analysis-subject-label">院校名称</label><input class="analysis-subject-input analysis-input school-name-input" type="text" placeholder="例如：北京大学" value="' + nameVal.replace(/"/g, '&quot;') + '"></div>' +
      '<div class="analysis-subject-item analysis-subject-full"><label class="analysis-subject-label">目标专业</label><input class="analysis-subject-input analysis-input school-major-input" type="text" placeholder="例如：计算机科学与技术" value="' + majorVal.replace(/"/g, '&quot;') + '"></div>' +
    '</div>' +
    '<div class="analysis-section-divider"></div>' +
    '<div class="analysis-section-title">往年录取数据</div>' +
    '<div id="analysisPrevYearsContainer"></div>' +
    '<div style="display:flex;gap:8px;margin-top:8px;">' +
      '<button class="btn btn-outline" id="analysisAddYearBtn" style="flex:1;font-size:12px;padding:6px;">+ 添加一年</button>' +
    '</div>';
  cardBody.insertAdjacentHTML('beforeend', formHtml);
}

function renderTargetSchoolNav(cardBody) {
  var navHtml = '<div class="school-nav-bar">' +
    '<button class="school-nav-btn" id="schoolPrevBtn" ' + (analysisCurrentSchoolIdx <= 0 ? 'disabled' : '') + '>◀ 上一所</button>' +
    '<button class="school-nav-btn school-add-btn" id="schoolAddBtn">+ 添加院校</button>' +
    '<button class="school-nav-btn" id="schoolNextBtn" ' + (analysisCurrentSchoolIdx >= analysisTargetSchools.length - 1 ? 'disabled' : '') + '>下一所 ▶</button>' +
    '<button class="school-nav-btn school-del-btn" id="schoolDelBtn">删除</button>' +
  '</div>';
  cardBody.insertAdjacentHTML('beforeend', navHtml);
}

function renderPrevYearRows() {
  var container = document.getElementById('analysisPrevYearsContainer');
  if (!container) return;
  var school = analysisTargetSchools[analysisCurrentSchoolIdx];
  var years = school ? school.years : [];
  container.innerHTML = years.map(function(row, idx) {
    return '<div class="prev-year-row">' +
      '<div class="prev-year-row-header">' +
        '<span class="prev-year-label">' + row.year + '年</span>' +
        (years.length > 1 ? '<button class="prev-year-del-btn" data-idx="' + idx + '">✕</button>' : '') +
      '</div>' +
      '<div class="prev-year-fields">' +
        '<div class="prev-year-field"><label class="analysis-subject-label">最低分</label><input class="analysis-subject-input analysis-input prev-year-input" data-idx="' + idx + '" data-field="score" type="number" placeholder="分数" value="' + row.score + '"></div>' +
        '<div class="prev-year-field"><label class="analysis-subject-label">最低排名</label><input class="analysis-subject-input analysis-input prev-year-input" data-idx="' + idx + '" data-field="rank" type="number" placeholder="位次" value="' + row.rank + '"></div>' +
        '<div class="prev-year-field"><label class="analysis-subject-label">录取人数</label><input class="analysis-subject-input analysis-input prev-year-input" data-idx="' + idx + '" data-field="enroll" type="number" placeholder="人数" value="' + row.enroll + '"></div>' +
      '</div>' +
    '</div>';
  }).join('');

  // Bind input changes
  container.querySelectorAll('.prev-year-input').forEach(function(input) {
    input.addEventListener('input', function() {
      var idx = parseInt(this.dataset.idx, 10);
      var field = this.dataset.field;
      var school = analysisTargetSchools[analysisCurrentSchoolIdx];
      if (school && school.years[idx]) school.years[idx][field] = this.value;
    });
  });

  // Bind delete buttons
  container.querySelectorAll('.prev-year-del-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(this.dataset.idx, 10);
      var school = analysisTargetSchools[analysisCurrentSchoolIdx];
      if (school) {
        school.years.splice(idx, 1);
        renderPrevYearRows();
        saveEntryData();
      }
    });
  });
}

function renderSchoolCard(cardEl) {
  var body = cardEl.querySelector('.analysis-card-body');
  body.innerHTML = '';

  renderTargetSchoolSelector(body);
  renderTargetSchoolForm(body);
  renderTargetSchoolNav(body);

  // Bind selector
  var sel = document.getElementById('schoolSelector');
  if (sel) {
    sel.addEventListener('change', function() {
      syncCurrentSchoolFromForm();
      analysisCurrentSchoolIdx = parseInt(this.value, 10);
      renderSchoolCard(cardEl);
    });
  }

  // Bind prev/next/add/del
  var prevBtn = document.getElementById('schoolPrevBtn');
  var nextBtn = document.getElementById('schoolNextBtn');
  var addBtn = document.getElementById('schoolAddBtn');
  var delBtn = document.getElementById('schoolDelBtn');
  var addYearBtn = document.getElementById('analysisAddYearBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      if (analysisCurrentSchoolIdx > 0) {
        syncCurrentSchoolFromForm();
        analysisCurrentSchoolIdx--;
        renderSchoolCard(cardEl);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (analysisCurrentSchoolIdx < analysisTargetSchools.length - 1) {
        syncCurrentSchoolFromForm();
        analysisCurrentSchoolIdx++;
        renderSchoolCard(cardEl);
      }
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', function() {
      syncCurrentSchoolFromForm();
      analysisTargetSchools.push({ name: '', major: '', years: getDefaultPrevYears() });
      analysisCurrentSchoolIdx = analysisTargetSchools.length - 1;
      renderSchoolCard(cardEl);
    });
  }

  if (delBtn) {
    delBtn.addEventListener('click', function() {
      if (analysisTargetSchools.length <= 1) return;
      syncCurrentSchoolFromForm();
      analysisTargetSchools.splice(analysisCurrentSchoolIdx, 1);
      if (analysisCurrentSchoolIdx >= analysisTargetSchools.length) {
        analysisCurrentSchoolIdx = analysisTargetSchools.length - 1;
      }
      renderSchoolCard(cardEl);
    });
  }

  if (addYearBtn) {
    addYearBtn.addEventListener('click', function() {
      var school = analysisTargetSchools[analysisCurrentSchoolIdx];
      if (!school) return;
      var lastYear = school.years.length > 0 ? parseInt(school.years[school.years.length - 1].year, 10) : new Date().getFullYear();
      school.years.push({ year: String(lastYear - 1), score: '', rank: '', enroll: '' });
      renderPrevYearRows();
    });
  }

  renderPrevYearRows();
  saveEntryData();
}

function renderAnalysisForm() {
  messagesEl.innerHTML = '';
  messagesEl.style.overflow = '';
  messagesEl.style.flex = '';
  messagesEl.style.minHeight = '';

  // hide input area and menu — pure data entry
  document.querySelector('.input-area').style.display = 'none';
  menuBtn.style.display = 'none';

  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'flex:1;overflow-y:auto;padding:20px;display:flex;flex-flow:row wrap;align-items:flex-start;align-content:flex-start;justify-content:center;gap:20px;background:var(--bg-chat);';

  wrapper.innerHTML =
    '<div class="analysis-card analysis-card-scroll">' +
      '<div class="analysis-card-header">📊 高考成绩录入</div>' +
      '<div class="analysis-card-body">' +
        '<div class="analysis-section-title">考试类型</div>' +
        '<div class="analysis-exam-type">' +
          '<button class="analysis-exam-type-btn active" data-type="xingaokao">新高考<br><small>3+1+2</small></button>' +
          '<button class="analysis-exam-type-btn" data-type="wenli">文理分科<br><small>旧高考</small></button>' +
          '<button class="analysis-exam-type-btn" data-type="old">纯文理<br><small>3+综合</small></button>' +
        '</div>' +
        '<div id="analysisFormBody"></div>' +
      '</div>' +
    '</div>' +
    '<div class="analysis-card analysis-card-scroll" id="targetSchoolCard">' +
      '<div class="analysis-card-header">🎯 目标院校</div>' +
      '<div class="analysis-card-body"></div>' +
    '</div>';

  messagesEl.appendChild(wrapper);

  // Restore entry data before rendering
  loadEntryData();
  if (savedEntryData) {
    analysisExamType = savedEntryData.examType || analysisExamType;
    analysisTargetSchools = JSON.parse(JSON.stringify(savedEntryData.schools)) || [{ name: '', major: '', years: getDefaultPrevYears() }];
    analysisCurrentSchoolIdx = 0;
  } else {
    initTargetSchools();
  }

  // Make active exam type button match restored value
  wrapper.querySelectorAll('.analysis-exam-type-btn').forEach(function(btn) {
    if (btn.dataset.type === analysisExamType) btn.classList.add('active');
    else btn.classList.remove('active');
    btn.addEventListener('click', function() {
      wrapper.querySelectorAll('.analysis-exam-type-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      analysisExamType = btn.dataset.type;
      renderAnalysisFormBody(wrapper);
      saveEntryData();
    });
  });

  renderAnalysisFormBody(wrapper);

  // Restore score/rank/province values from saved data
  if (savedEntryData) {
    Object.keys(savedEntryData.scores).forEach(function(subj) {
      var inp = wrapper.querySelector('.score-input[data-subject="' + subj + '"]');
      if (inp) inp.value = savedEntryData.scores[subj];
    });
    if (savedEntryData.rank) {
      var rankInp = document.getElementById('analysisRankInput');
      if (rankInp) rankInp.value = savedEntryData.rank;
    }
    if (savedEntryData.province) {
      var provInp = document.getElementById('analysisProvinceInput');
      if (provInp) provInp.value = savedEntryData.province;
    }
  }

  var schoolCard = document.getElementById('targetSchoolCard');
  if (schoolCard) renderSchoolCard(schoolCard);

  var tip = document.createElement('div');
  tip.style.cssText = 'width:100%;flex-shrink:0;font-size:11px;color:var(--text-muted);text-align:center;line-height:1.6;padding:8px 20px 0;';
  tip.textContent = '查大学招生数据推荐用手机夸克App里的"高考"频道——各院校历年的录取分数、位次、招生人数都能查到，数据更新也比较及时，关键是里面没有任何广告弹窗，用着清爽。声明：这不是广告，纯粹是自己用过觉得好用才推荐。';
  wrapper.appendChild(tip);

  // Auto-save entry data on any input change
  wrapper.addEventListener('input', function() { saveEntryData(); });
}

function renderAnalysisFormBody(container) {
  var body = document.getElementById('analysisFormBody');
  if (!body) return;

  var html = '';

  // 语数英 - always shown
  html += '<div class="analysis-section-title">必考科目</div>' +
    '<div class="analysis-subject-grid">' +
      '<div class="analysis-subject-item"><label class="analysis-subject-label">语文</label><input class="analysis-subject-input analysis-input score-input" data-subject="yuwen" type="number" placeholder="分数" min="0" max="150"></div>' +
      '<div class="analysis-subject-item"><label class="analysis-subject-label">数学</label><input class="analysis-subject-input analysis-input score-input" data-subject="shuxue" type="number" placeholder="分数" min="0" max="150"></div>' +
      '<div class="analysis-subject-item analysis-subject-full"><label class="analysis-subject-label">外语</label><input class="analysis-subject-input analysis-input score-input" data-subject="waiyu" type="number" placeholder="分数" min="0" max="150"></div>' +
    '</div>';

  if (analysisExamType === 'xingaokao') {
    // 3+1+2: 首选1门 (物理/历史) + 再选2门
    html += '<div class="analysis-section-divider"></div>' +
      '<div class="analysis-section-title">首选科目（1门）</div>' +
      '<div class="analysis-subject-grid">' +
        '<div class="analysis-subject-item"><label class="analysis-subject-label">物理</label><input class="analysis-subject-input analysis-input score-input" data-subject="wuli_xgk" type="number" placeholder="分数" min="0" max="100"></div>' +
        '<div class="analysis-subject-item"><label class="analysis-subject-label">历史</label><input class="analysis-subject-input analysis-input score-input" data-subject="lishi_xgk" type="number" placeholder="分数" min="0" max="100"></div>' +
      '</div>' +
      '<div class="analysis-section-title">再选科目（2门，赋分制）</div>' +
      '<div class="analysis-subject-grid">' +
        '<div class="analysis-subject-item"><label class="analysis-subject-label">思想政治</label><input class="analysis-subject-input analysis-input score-input" data-subject="zhengzhi" type="number" placeholder="分数" min="0" max="100"></div>' +
        '<div class="analysis-subject-item"><label class="analysis-subject-label">地理</label><input class="analysis-subject-input analysis-input score-input" data-subject="dili" type="number" placeholder="分数" min="0" max="100"></div>' +
        '<div class="analysis-subject-item"><label class="analysis-subject-label">化学</label><input class="analysis-subject-input analysis-input score-input" data-subject="huaxue" type="number" placeholder="分数" min="0" max="100"></div>' +
        '<div class="analysis-subject-item"><label class="analysis-subject-label">生物学</label><input class="analysis-subject-input analysis-input score-input" data-subject="shengwu" type="number" placeholder="分数" min="0" max="100"></div>' +
      '</div>';
  } else if (analysisExamType === 'wenli') {
    // 文理分科: 理综/文综
    html += '<div class="analysis-section-divider"></div>' +
      '<div class="analysis-section-title">综合科目</div>' +
      '<div class="analysis-subject-grid">' +
        '<div class="analysis-subject-item"><label class="analysis-subject-label">理科综合</label><input class="analysis-subject-input analysis-input score-input" data-subject="lizong" type="number" placeholder="分数" min="0" max="300"></div>' +
        '<div class="analysis-subject-item"><label class="analysis-subject-label">文科综合</label><input class="analysis-subject-input analysis-input score-input" data-subject="wenzong" type="number" placeholder="分数" min="0" max="300"></div>' +
      '</div>';
  } else {
    // old: 纯文理大综合
    html += '<div class="analysis-section-divider"></div>' +
      '<div class="analysis-section-title">综合科目</div>' +
      '<div class="analysis-subject-grid analysis-subject-full">' +
        '<div class="analysis-subject-item"><label class="analysis-subject-label">综合</label><input class="analysis-subject-input analysis-input score-input" data-subject="zonghe" type="number" placeholder="综合科目分数" min="0" max="300"></div>' +
      '</div>';
  }

  // 排名
  html += '<div class="analysis-section-divider"></div>' +
    '<div class="analysis-section-title">排名信息</div>' +
    '<div class="analysis-subject-grid">' +
      '<div class="analysis-subject-item analysis-subject-full"><label class="analysis-subject-label">全省排名</label><input class="analysis-rank-input analysis-input" id="analysisRankInput" type="number" placeholder="请输入你的全省排名（位次）" min="1"></div>' +
      '<div class="analysis-subject-item analysis-subject-full"><label class="analysis-subject-label">省份</label><input class="analysis-rank-input analysis-input" id="analysisProvinceInput" type="text" placeholder="请输入所在省份" style="margin-top:10px;"></div>' +
    '</div>';

  html += '<div class="analysis-section-divider"></div>';

  body.innerHTML = html;
}

function renderAnalysisModelDropdown(dropdownEl) {
  var keys = Object.keys(API_PROVIDERS);
  dropdownEl.innerHTML = keys.map(function(k) {
    var cfg = API_PROVIDERS[k];
    var active = k === STATE.apiProvider;
    var dot = active ? '<span class="model-check">✓</span>' : '<span class="model-dot" style="background:' + (k === 'deepseek' ? '#007aff' : k === 'moonshot' ? '#ff9500' : k === 'minimax' ? '#34c759' : '#8e44ad') + '"></span>';
    return '<div class="model-dropdown-item' + (active ? ' active' : '') + '" data-provider="' + k + '">' +
      dot +
      '<span class="model-name">' + cfg.label + '</span>' +
      '<span class="model-badge">' + cfg.model + '</span>' +
    '</div>';
  }).join('');

  dropdownEl.querySelectorAll('.model-dropdown-item').forEach(function(el) {
    el.addEventListener('click', function() {
      var provider = this.dataset.provider;
      switchProvider(provider);
      dropdownEl.classList.remove('open');
      document.querySelectorAll('.model-dropdown').forEach(function(d) { d.classList.remove('open'); });
    });
  });
}

function renderAllMessages() {
  messagesEl.innerHTML = '';
  if (STATE.messages.length === 0) {
    addWelcomeMessage();
    return;
  }
  for (var i = 0; i < STATE.messages.length; i++) {
    var isSearch = STATE.messages[i]._isSearch ? 'search' : STATE.messages[i]._isQuestioner;
    renderMessageDOM(STATE.messages[i].role, STATE.messages[i].content, STATE.messages[i]._skillLabel, isSearch);
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
  } else if (isQuestioner === 'search') {
    div.innerHTML =
      '<div class="msg-avatar"><span class="avatar-bot" style="background:#007aff;font-size:14px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">🔍</span></div>' +
      '<div class="bubble"><div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div>' + renderMarkdown(content) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div></div>';
  } else if (STATE.groupChatEnabled && skillLabel) {
    // Questioner
    if (isQuestioner) {
      div.className += ' bubble-questioner';
      div.innerHTML =
        '<div class="msg-avatar"><span class="avatar-bot" ' + avatarHtml(null, {size:32}) + '</span></div>' +
        '<div class="bubble"><div class="bubble-skill-label" style="color:#999">提问者</div>' + renderMarkdown(content) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div></div>';
    } else {
      var groupSkill = STATE.groupMembers.find(function(m) { return m.label === skillLabel; }) || STATE.skills.find(function(s) { return s.label === skillLabel; });
      div.innerHTML =
        '<div class="msg-avatar"><span class="avatar-bot" ' + avatarHtml(groupSkill, {size:32}) + '</span></div>' +
        '<div class="bubble"><div class="bubble-skill-label" style="color:' + (groupSkill ? groupSkill.color : '#8e44ad') + '">' + skillLabel + '</div>' + renderMarkdown(content) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div></div>';
    }
  } else {
    var skill = STATE.skills.find(function(s) { return s.name === (STATE.activeSkill ? STATE.activeSkill.name : null); });
    div.innerHTML = '<div class="msg-avatar"><span class="avatar-bot" ' + avatarHtml(skill || STATE.activeSkill, {size:32}) + '</span></div><div class="bubble">' + renderMarkdown(content) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div></div>';
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

  // Step 1: If webSearch enabled, show 联网小助手 streaming search results
  var searchResults = '';
  if (STATE.webSearch) {
    console.log('[webSearch] 开始搜索，provider:', STATE.apiProvider);
    var glmKey = localStorage.getItem('api_key_glm_free');

    var searchDiv = document.createElement('div');
    searchDiv.className = 'message bot';
    searchDiv.innerHTML = '<div class="msg-avatar"><span class="avatar-bot" style="background:#007aff;font-size:14px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">🔍</span></div><div class="bubble"><div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div><p style="color:var(--text-muted);font-style:italic;">正在搜索...</p></div>';
    messagesEl.appendChild(searchDiv);
    scrollToBottom();

    if (glmKey) {
      try {
        console.log('[webSearch] 开始请求 GLM...');
        var sr = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + glmKey },
          body: JSON.stringify({
            model: 'glm-4.7-flash',
            messages: [{ role: 'user', content: text }],
            stream: true,
            tools: [{type: 'web_search', web_search: {search_query: text}}],
          }),
          signal: STATE.abortController.signal,
        });
        if (sr.ok) {
          var bubbleEl = searchDiv.querySelector('.bubble');
          var reader = sr.body.getReader();
          var decoder = new TextDecoder();
          var buf = '';
          var searchContent = '';
          while (true) {
            var r = await reader.read();
            if (r.done) break;
            buf += decoder.decode(r.value, { stream: true });
            var lines = buf.split('\n');
            buf = lines.pop() || '';
            for (var li = 0; li < lines.length; li++) {
              var trimmed = lines[li].trim();
              if (!trimmed || trimmed.indexOf('data: ') !== 0) continue;
              var data = trimmed.slice(6);
              if (data === '[DONE]') continue;
              try {
                var parsed = JSON.parse(data);
                var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta ? (parsed.choices[0].delta.content || '') : '';
                if (delta) {
                  searchContent += delta;
                  if (bubbleEl) bubbleEl.innerHTML = '<div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div>' + renderMarkdown(searchContent) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div>';
                  scrollToBottom();
                }
              } catch (e) { /* skip */ }
            }
          }
          searchResults = searchContent;
          if (bubbleEl) bubbleEl.innerHTML = '<div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div>' + renderMarkdown(searchContent) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div><div style="margin-top:8px;padding-top:6px;border-top:0.5px solid var(--border);font-size:11px;color:var(--text-muted);line-height:1.4;">💡 如果不需要联网搜索，请关闭输入框下方的联网按钮，可减少等待时间，提升对话流畅度。</div>';
          console.log('[webSearch] 搜索结果:', searchResults);
        } else {
          var srErr = await sr.json().catch(function() { return {}; });
          searchDiv.querySelector('.bubble').innerHTML = '<div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div><p style="color:#ff6b81;font-style:italic;">搜索失败：' + (srErr.error ? srErr.error.message : 'HTTP ' + sr.status) + '</p>';
        }
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        searchDiv.querySelector('.bubble').innerHTML = '<div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div><p style="color:#ff6b81;font-style:italic;">搜索请求失败</p>';
      }
    } else {
      searchDiv.querySelector('.bubble').innerHTML = '<div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div><p style="color:#ff6b81;font-style:italic;">未配置 GLM API Key</p>';
    }
  }

  // Step 2: Build the actual request for the user's chosen model
  if (!STATE.configured) throw new Error('请先配置 API Key');

  // Data context always goes FIRST in system messages (overrides any skill example data)
  var dataCtx = buildDataContextPrompt();
  var dataSystemMsg = dataCtx ? [{ role: 'system', content: '【重要 — 用户真实数据，优先级最高】\n以下数据是用户本人在系统内录入的真实高考数据。无论技能描述或示例中提到了什么数据，都必须以本数据为准。如果技能示例数据与以下数据冲突，忽略示例数据。\n\n' + dataCtx }] : [];

  var body = {
    model: cfg.model,
    messages: [
      ...dataSystemMsg,
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...(searchResults ? [{ role: 'system', content: '【AI 规则 - 已开启联网搜索】\n1. 你本身不具备联网能力，以下信息是系统调用 GLM-4.7-Flash 联网搜索 API 获取到的。\n2. 请仔细阅读搜索结果，确保回答与用户问题一致。\n3. 如果搜索结果与用户问题不匹配（可能因关键词问题导致），不要直接附和，应告知用户注意。\n4. 基于搜索结果回答即可，不需要扮演有联网能力的角色。\n\n【搜索结果】\n' + searchResults }] : []),
      ...(STATE.webSearch && !searchResults ? [{ role: 'system', content: '【AI 规则 - 联网搜索无结果】\n已调用 GLM-4.7-Flash 联网搜索 API 但未获取到有效结果，请如实告知用户搜索不到相关信息，不要自行编造。' }] : []),
      ...(!STATE.webSearch ? [{ role: 'system', content: '【AI 规则 - 未开启联网搜索】\n1. 你只能基于自身训练知识回答。\n2. 对于大学录取分数线、各省录取分数线等具体数据，必须声明"此为本人知识范围内的信息，建议开启联网搜索获取最新数据"。\n3. 严禁编造任何大学录取数据或省份录取分数线。\n4. 对于不确定的信息，如实告知用户。' }] : []),
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
          if (bubble) bubble.innerHTML = renderMarkdown(fullContent) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div>';
          scrollToBottom();
        }
      } catch (e) { /* skip */ }
    }
  }
  if (renderTimeout) clearTimeout(renderTimeout);
  var finalBubble = botDiv.querySelector('.bubble');
  if (finalBubble) finalBubble.innerHTML = renderMarkdown(fullContent) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div>';
  var lastMsg = STATE.messages[STATE.messages.length - 1];
  if (lastMsg) lastMsg.content = fullContent;
  // Save search assistant message before main AI message
  if (searchResults) {
    STATE.messages.push({ role: 'assistant', content: searchResults, _isSearch: true });
  }
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

  // If webSearch enabled, show 联网小助手 streaming search
  var searchResults = '';
  if (STATE.webSearch) {
    var glmKey = localStorage.getItem('api_key_glm_free');
    var searchDiv = document.createElement('div');
    searchDiv.className = 'message bot';
    searchDiv.innerHTML = '<div class="msg-avatar"><span class="avatar-bot" style="background:#007aff;font-size:14px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">🔍</span></div><div class="bubble"><div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div><p style="color:var(--text-muted);font-style:italic;">正在搜索...</p></div>';
    messagesEl.appendChild(searchDiv);
    scrollToBottom();
    if (glmKey) {
      try {
        var sr = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + glmKey },
          body: JSON.stringify({
            model: 'glm-4.7-flash',
            messages: [{ role: 'user', content: text }],
            stream: true,
            tools: [{type: 'web_search', web_search: {search_query: text}}],
          }),
          signal: STATE.abortController.signal,
        });
        if (sr.ok) {
          var bubbleEl = searchDiv.querySelector('.bubble');
          var reader = sr.body.getReader();
          var decoder = new TextDecoder();
          var buf = '';
          var searchContent = '';
          while (true) {
            var r = await reader.read();
            if (r.done) break;
            buf += decoder.decode(r.value, { stream: true });
            var lines = buf.split('\n');
            buf = lines.pop() || '';
            for (var li = 0; li < lines.length; li++) {
              var trimmed = lines[li].trim();
              if (!trimmed || trimmed.indexOf('data: ') !== 0) continue;
              var data = trimmed.slice(6);
              if (data === '[DONE]') continue;
              try {
                var parsed = JSON.parse(data);
                var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta ? (parsed.choices[0].delta.content || '') : '';
                if (delta) {
                  searchContent += delta;
                  if (bubbleEl) bubbleEl.innerHTML = '<div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div>' + renderMarkdown(searchContent) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div>';
                  scrollToBottom();
                }
              } catch (e) { /* skip */ }
            }
          }
          searchResults = searchContent;
          if (bubbleEl) bubbleEl.innerHTML = '<div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div>' + renderMarkdown(searchContent) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div><div style="margin-top:8px;padding-top:6px;border-top:0.5px solid var(--border);font-size:11px;color:var(--text-muted);line-height:1.4;">💡 如果不需要联网搜索，请关闭输入框下方的联网按钮，可减少等待时间，提升对话流畅度。</div>';
        }
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        searchDiv.querySelector('.bubble').innerHTML = '<div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div><p style="color:#ff6b81;font-style:italic;">搜索请求失败</p>';
      }
    } else {
      searchDiv.querySelector('.bubble').innerHTML = '<div class="bubble-skill-label" style="color:#007aff;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">联网小助手<span style="font-size:10px;color:#999;font-weight:400;">免费·GLM-4.7-Flash</span></div><p style="color:#ff6b81;font-style:italic;">未配置 GLM API Key</p>';
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
    var dataCtx = buildDataContextPrompt();
    var dataSystemMsg = dataCtx ? [{ role: 'system', content: '【重要 — 用户真实数据，优先级最高】\n以下数据是用户本人在系统内录入的真实高考数据。无论技能描述或示例中提到了什么数据，都必须以本数据为准。如果技能示例数据与以下数据冲突，忽略示例数据。\n\n' + dataCtx }] : [];

    var body = {
      model: cfg.model,
      messages: [
        ...dataSystemMsg,
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
              bubbleObj.bubbleEl.innerHTML = (labelText ? '<div class="bubble-skill-label" style="color:' + c + '">' + labelText + '</div>' : '') + renderMarkdown(fullContent) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div>';
              scrollToBottom();
            }
          }
        } catch (e) { /* skip */ }
      }
    }
    if (bubbleObj && bubbleObj.bubbleEl) {
      var labelText = member.label || (member === qMember ? '提问者' : '');
      var c = member === qMember ? '#999' : member.color;
      bubbleObj.bubbleEl.innerHTML = (labelText ? '<div class="bubble-skill-label" style="color:' + c + '">' + labelText + '</div>' : '') + renderMarkdown(fullContent) + '<div class="bubble-ai-tag">回复由 AI 生成，各省份数据可能存在差异，请以官方文件为准，务必自行核对</div>';
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
  if (savedSkillName === ANALYSIS_NAME) {
    STATE.groupChatEnabled = false;
    STATE.activeSkill = { name: ANALYSIS_NAME, label: '数据录入', prompt: '' };
    STATE.messages = [];
    currentSkillName.textContent = '数据录入';
  } else if (savedSkillName === GROUP_CHAT_NAME) {
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
  if (STATE.activeSkill && STATE.activeSkill.name === ANALYSIS_NAME) {
    renderAnalysisForm();
  } else {
    renderAllMessages();
  }

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
    // Close analysis model dropdown if clicking outside
    var analysisModelDropdown = document.getElementById('analysisModelDropdown');
    var analysisModelBtn = document.getElementById('analysisModelSelectBtn');
    if (analysisModelDropdown && analysisModelBtn && !analysisModelBtn.contains(e.target) && !analysisModelDropdown.contains(e.target)) {
      analysisModelDropdown.classList.remove('open');
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
  var seo = document.querySelector('.seo-content');
  if (seo) seo.style.display = 'none';
} catch(e) { console.error("init error:", e); document.querySelector('.app').classList.add('ready'); } }

// ===== Disclaimer =====
var disclaimerModal = document.getElementById('disclaimerModal');
var disclaimerAccept = document.getElementById('disclaimerAccept');
var disclaimerReject = document.getElementById('disclaimerReject');
var disclaimerCountdown = document.getElementById('disclaimerCountdown');
var disclaimerCheck1 = document.getElementById('disclaimerCheck1');
var disclaimerCheck2 = document.getElementById('disclaimerCheck2');

function updateDisclaimerAccept() {
  disclaimerAccept.disabled = !(disclaimerCheck1.checked && disclaimerCheck2.checked);
}

function checkDisclaimer() {
  if (localStorage.getItem('disclaimer_accepted')) { init(); return; }
  disclaimerModal.classList.add('open');
  var seconds = 10;
  disclaimerAccept.disabled = true;
  disclaimerCountdown.textContent = seconds;
  var canEnable = false;
  var timer = setInterval(function() {
    seconds--;
    disclaimerCountdown.textContent = seconds;
    if (seconds <= 0 && !canEnable) {
      clearInterval(timer);
      canEnable = true;
      disclaimerCountdown.textContent = '0';
      disclaimerCheck1.disabled = false;
      disclaimerCheck2.disabled = false;
      updateDisclaimerAccept();
    }
  }, 1000);
  disclaimerCheck1.addEventListener('change', updateDisclaimerAccept);
  disclaimerCheck2.addEventListener('change', updateDisclaimerAccept);
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
