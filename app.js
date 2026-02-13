/* ============================================
   RESUME BUILDER - APPLICATION LOGIC
   ============================================ */

// ====== STATE ======
let state = {
  fullName: '', location: '', phone: '', email: '', linkedin: '', github: '',
  objective: '',
  skillCategories: [],
  projects: [],
  education: [],
  certifications: [],
  softSkills: [],
  template: 'classic',
};
let autoSaveTimer = null;
let idCounter = Date.now();
const uid = () => 'id_' + (idCounter++);

// ====== INITIALIZATION ======
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupAutoSave();
  setupInputListeners();
  renderAll();
  updateProgress();
  // Stagger in the accordion sections
  document.querySelectorAll('.accordion-section').forEach((s, i) => {
    s.style.animationDelay = (i * 0.08) + 's';
    s.classList.add('animate-in');
  });
});

// ====== THEME ======
function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('rb_theme', next);
  showToast(next === 'dark' ? '🌙 Dark mode activated' : '☀️ Light mode activated', 'info');
}
(function initTheme() {
  const saved = localStorage.getItem('rb_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.setAttribute('data-theme', 'dark');
})();

// ====== TOAST NOTIFICATIONS ======
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ====== MODAL ======
function showModal(html) {
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalContent').innerHTML = html;
  overlay.style.display = 'flex';
}
function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modalOverlay').style.display = 'none';
}
function showClearConfirm() {
  showModal(`
    <h3>🗑️ Clear All Data?</h3>
    <p>This will remove all your entered information. This action cannot be undone.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal(event.target.closest('.modal-overlay') ? event : {target:document.getElementById('modalOverlay'),currentTarget:document.getElementById('modalOverlay')})">Cancel</button>
      <button class="btn btn-danger" onclick="clearAllData()">Clear Everything</button>
    </div>
  `);
}
function clearAllData() {
  state = {
    fullName: '', location: '', phone: '', email: '', linkedin: '', github: '', objective: '',
    skillCategories: [], projects: [], education: [], certifications: [], softSkills: [], template: 'classic'
  };
  localStorage.removeItem('rb_data');
  document.querySelectorAll('.form-input, .form-textarea').forEach(el => el.value = '');
  renderAll();
  updateProgress();
  document.getElementById('modalOverlay').style.display = 'none';
  showToast('All data cleared', 'info');
}

// ====== ACCORDION ======
function toggleSection(header) {
  const section = header.closest('.accordion-section');
  const wasActive = section.classList.contains('active');
  // Close others (optional: remove this for multi-open)
  // section.parentElement.querySelectorAll('.accordion-section.active').forEach(s => s.classList.remove('active'));
  section.classList.toggle('active', !wasActive);
}

// ====== INPUT LISTENERS ======
function setupInputListeners() {
  document.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      state[input.dataset.field] = input.value;
      validateField(input);
      updatePreview();
      updateProgress();
      scheduleAutoSave();
    });
  });
}

// ====== VALIDATION ======
function validateField(input) {
  const val = input.value.trim();
  const id = input.id;
  input.classList.remove('error', 'valid');
  const existingMsg = input.parentElement.querySelector('.validation-msg');
  if (existingMsg) existingMsg.remove();
  if (!val) return;
  let valid = true, msg = '';
  if (id === 'email' && val) {
    valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    msg = valid ? 'Valid email' : 'Please enter a valid email address';
  } else if (id === 'phone' && val) {
    valid = /^[\+]?[\d\-\s\(\)]{7,15}$/.test(val);
    msg = valid ? 'Valid phone' : 'Please enter a valid phone number';
  } else if ((id === 'linkedin' || id === 'github') && val) {
    valid = /^(https?:\/\/)?[\w\-\.]+(\.[\w]+)+(\/[\w\-\.\/]*)*\/?$/.test(val);
    msg = valid ? 'Valid URL' : 'Please enter a valid URL';
  }
  input.classList.add(valid ? 'valid' : 'error');
  if (msg) {
    const msgEl = document.createElement('div');
    msgEl.className = `validation-msg ${valid ? 'success' : 'error'}`;
    msgEl.innerHTML = `<i class="fa-solid fa-${valid ? 'circle-check' : 'circle-exclamation'}"></i> ${msg}`;
    input.parentElement.appendChild(msgEl);
  }
}

// ====== CHARACTER COUNTER ======
function updateCharCount(textarea) {
  const count = textarea.value.length;
  const counter = document.getElementById('objectiveCounter');
  counter.textContent = `${count} / 300 characters (150-300 recommended)`;
  counter.className = 'char-counter' + (count > 300 ? ' over' : count > 250 ? ' warn' : '');
}

// ====== SAMPLE OBJECTIVE ======
function showSampleObjective() {
  const samples = [
    "Motivated and detail-oriented software engineer with a strong foundation in full-stack development, data structures, and algorithms. Seeking an entry-level position where I can leverage my technical skills and passion for building scalable, user-centric applications to contribute to innovative projects.",
    "Results-driven computer science graduate with hands-on experience in Python, JavaScript, and cloud technologies. Eager to apply problem-solving abilities and collaborative mindset to develop efficient solutions in a dynamic, growth-oriented environment.",
    "Aspiring data analyst with expertise in SQL, Python, and data visualization tools. Passionate about transforming raw data into actionable insights that drive business decisions and improve operational efficiency."
  ];
  const obj = document.getElementById('objective');
  obj.value = samples[Math.floor(Math.random() * samples.length)];
  state.objective = obj.value;
  updateCharCount(obj);
  updatePreview();
  scheduleAutoSave();
  showToast('Sample objective loaded!', 'success');
}

// ====== SKILL CATEGORIES ======
function addSkillCategory(name = '', skills = []) {
  const id = uid();
  state.skillCategories.push({ id, name, skills });
  renderSkillCategories();
  updatePreview();
  scheduleAutoSave();
  showToast('Skill category added', 'success');
}
function removeSkillCategory(id) {
  state.skillCategories = state.skillCategories.filter(c => c.id !== id);
  renderSkillCategories();
  updatePreview();
  updateProgress();
  scheduleAutoSave();
}
function renderSkillCategories() {
  const container = document.getElementById('skillsContainer');
  container.innerHTML = state.skillCategories.map(cat => `
    <div class="item-card" data-cat-id="${cat.id}">
      <div class="item-card-header">
        <input type="text" class="form-input" placeholder="Category (e.g. Programming)" value="${escHtml(cat.name)}"
          onchange="updateSkillCat('${cat.id}','name',this.value)" style="max-width:220px;font-weight:600">
        <div class="item-card-actions">
          <button class="icon-btn" onclick="removeSkillCategory('${cat.id}')" title="Remove"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="chips-container" id="chips_${cat.id}" onclick="this.querySelector('input').focus()">
        ${cat.skills.map(s => `<span class="chip">${escHtml(s)}<button class="chip-remove" onclick="removeSkill('${cat.id}','${escHtml(s)}')">&times;</button></span>`).join('')}
        <input type="text" class="chip-input" placeholder="Add skill, press Enter" onkeydown="handleSkillChip(event,'${cat.id}')">
      </div>
    </div>
  `).join('');
}
function updateSkillCat(id, field, value) {
  const cat = state.skillCategories.find(c => c.id === id);
  if (cat) { cat[field] = value; updatePreview(); scheduleAutoSave(); }
}
function handleSkillChip(e, catId) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.replace(',', '').trim();
    if (!val) return;
    const cat = state.skillCategories.find(c => c.id === catId);
    if (cat && !cat.skills.includes(val)) {
      cat.skills.push(val);
      e.target.value = '';
      renderSkillCategories();
      updatePreview();
      updateProgress();
      scheduleAutoSave();
    }
  }
}
function removeSkill(catId, skill) {
  const cat = state.skillCategories.find(c => c.id === catId);
  if (cat) {
    cat.skills = cat.skills.filter(s => s !== skill);
    renderSkillCategories();
    updatePreview();
    updateProgress();
    scheduleAutoSave();
  }
}

// ====== PROJECTS ======
function addProject() {
  const id = uid();
  state.projects.push({ id, title: '', technologies: [], bullets: [''], impact: '' });
  renderProjects();
  updatePreview();
  scheduleAutoSave();
  showToast('Project added', 'success');
}
function removeProject(id) {
  state.projects = state.projects.filter(p => p.id !== id);
  renderProjects();
  updatePreview();
  updateProgress();
  scheduleAutoSave();
}
function renderProjects() {
  const container = document.getElementById('projectsContainer');
  container.innerHTML = state.projects.map((proj, idx) => `
    <div class="item-card" data-project-id="${proj.id}">
      <div class="item-card-header">
        <span class="item-card-title">Project ${idx + 1}</span>
        <div class="item-card-actions">
          <button class="icon-btn" onclick="duplicateProject('${proj.id}')" title="Duplicate"><i class="fa-solid fa-copy"></i></button>
          <button class="icon-btn" onclick="removeProject('${proj.id}')" title="Remove"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Project Title</label>
        <input type="text" class="form-input" placeholder="My Awesome Project" value="${escHtml(proj.title)}"
          onchange="updateProject('${proj.id}','title',this.value)">
      </div>
      <div class="form-group">
        <label class="form-label">Technologies Used</label>
        <div class="chips-container" onclick="this.querySelector('input').focus()">
          ${proj.technologies.map(t => `<span class="chip">${escHtml(t)}<button class="chip-remove" onclick="removeProjTech('${proj.id}','${escHtml(t)}')">&times;</button></span>`).join('')}
          <input type="text" class="chip-input" placeholder="Add tech, press Enter" onkeydown="handleProjTechChip(event,'${proj.id}')">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description Bullet Points</label>
        <div class="bullet-list" id="bullets_${proj.id}">
          ${proj.bullets.map((b, bi) => `
          <div class="bullet-item">
            <input type="text" class="form-input" placeholder="Describe a feature or achievement..." value="${escHtml(b)}"
              onchange="updateBullet('${proj.id}',${bi},this.value)">
            <button class="remove-bullet" onclick="removeBullet('${proj.id}',${bi})" ${proj.bullets.length <= 1 ? 'disabled' : ''}><i class="fa-solid fa-minus"></i></button>
          </div>`).join('')}
        </div>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addBullet('${proj.id}')"><i class="fa-solid fa-plus"></i> Add Bullet</button>
      </div>
      <div class="form-group">
        <label class="form-label"><i class="fa-solid fa-star"></i> Impact / Result</label>
        <input type="text" class="form-input" placeholder="e.g. Reduced load time by 40%" value="${escHtml(proj.impact)}"
          onchange="updateProject('${proj.id}','impact',this.value)">
      </div>
    </div>
  `).join('');
}
function updateProject(id, field, value) {
  const p = state.projects.find(x => x.id === id);
  if (p) { p[field] = value; updatePreview(); scheduleAutoSave(); updateProgress(); }
}
function handleProjTechChip(e, projId) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.replace(',', '').trim();
    if (!val) return;
    const p = state.projects.find(x => x.id === projId);
    if (p && !p.technologies.includes(val)) {
      p.technologies.push(val);
      e.target.value = '';
      renderProjects();
      updatePreview();
      scheduleAutoSave();
    }
  }
}
function removeProjTech(projId, tech) {
  const p = state.projects.find(x => x.id === projId);
  if (p) { p.technologies = p.technologies.filter(t => t !== tech); renderProjects(); updatePreview(); scheduleAutoSave(); }
}
function addBullet(projId) {
  const p = state.projects.find(x => x.id === projId);
  if (p) { p.bullets.push(''); renderProjects(); }
}
function removeBullet(projId, idx) {
  const p = state.projects.find(x => x.id === projId);
  if (p && p.bullets.length > 1) { p.bullets.splice(idx, 1); renderProjects(); updatePreview(); scheduleAutoSave(); }
}
function updateBullet(projId, idx, val) {
  const p = state.projects.find(x => x.id === projId);
  if (p) { p.bullets[idx] = val; updatePreview(); scheduleAutoSave(); }
}
function duplicateProject(id) {
  const orig = state.projects.find(x => x.id === id);
  if (orig) {
    const clone = JSON.parse(JSON.stringify(orig));
    clone.id = uid();
    clone.title += ' (Copy)';
    state.projects.push(clone);
    renderProjects();
    updatePreview();
    scheduleAutoSave();
    showToast('Project duplicated', 'success');
  }
}

// ====== EDUCATION ======
function addEducation() {
  const id = uid();
  state.education.push({ id, degree: '', college: '', year: '', cgpa: '', coursework: [] });
  renderEducation();
  updatePreview();
  scheduleAutoSave();
  showToast('Education entry added', 'success');
}
function removeEducation(id) {
  state.education = state.education.filter(e => e.id !== id);
  renderEducation();
  updatePreview();
  updateProgress();
  scheduleAutoSave();
}
function renderEducation() {
  const container = document.getElementById('educationContainer');
  container.innerHTML = state.education.map((edu, idx) => `
    <div class="item-card" data-edu-id="${edu.id}">
      <div class="item-card-header">
        <span class="item-card-title">Education ${idx + 1}</span>
        <div class="item-card-actions">
          <button class="icon-btn" onclick="removeEducation('${edu.id}')" title="Remove"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Degree / Program</label>
        <input type="text" class="form-input" placeholder="B.Tech in Computer Science" value="${escHtml(edu.degree)}"
          onchange="updateEdu('${edu.id}','degree',this.value)">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">College / University</label>
          <input type="text" class="form-input" placeholder="MIT" value="${escHtml(edu.college)}"
            onchange="updateEdu('${edu.id}','college',this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">Graduation Year</label>
          <input type="text" class="form-input" placeholder="2025" value="${escHtml(edu.year)}"
            onchange="updateEdu('${edu.id}','year',this.value)">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">CGPA / Percentage</label>
        <input type="text" class="form-input" placeholder="8.5 / 10" value="${escHtml(edu.cgpa)}"
          onchange="updateEdu('${edu.id}','cgpa',this.value)" style="max-width:180px">
      </div>
      <div class="form-group">
        <label class="form-label">Relevant Coursework</label>
        <div class="chips-container" onclick="this.querySelector('input').focus()">
          ${edu.coursework.map(c => `<span class="chip">${escHtml(c)}<button class="chip-remove" onclick="removeCoursework('${edu.id}','${escHtml(c)}')">&times;</button></span>`).join('')}
          <input type="text" class="chip-input" placeholder="Add coursework, press Enter" onkeydown="handleCourseworkChip(event,'${edu.id}')">
        </div>
      </div>
    </div>
  `).join('');
}
function updateEdu(id, field, val) {
  const e = state.education.find(x => x.id === id);
  if (e) { e[field] = val; updatePreview(); scheduleAutoSave(); updateProgress(); }
}
function handleCourseworkChip(e, eduId) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.replace(',', '').trim();
    if (!val) return;
    const ed = state.education.find(x => x.id === eduId);
    if (ed && !ed.coursework.includes(val)) {
      ed.coursework.push(val);
      e.target.value = '';
      renderEducation();
      updatePreview();
      scheduleAutoSave();
    }
  }
}
function removeCoursework(eduId, cw) {
  const e = state.education.find(x => x.id === eduId);
  if (e) { e.coursework = e.coursework.filter(c => c !== cw); renderEducation(); updatePreview(); scheduleAutoSave(); }
}

// ====== CERTIFICATIONS ======
function addCertification() {
  const id = uid();
  state.certifications.push({ id, name: '', org: '', year: '' });
  renderCertifications();
  updatePreview();
  scheduleAutoSave();
  showToast('Certification added', 'success');
}
function removeCertification(id) {
  state.certifications = state.certifications.filter(c => c.id !== id);
  renderCertifications();
  updatePreview();
  updateProgress();
  scheduleAutoSave();
}
function renderCertifications() {
  const container = document.getElementById('certsContainer');
  container.innerHTML = state.certifications.map((cert, idx) => `
    <div class="item-card" data-cert-id="${cert.id}">
      <div class="item-card-header">
        <span class="item-card-title">Certification ${idx + 1}</span>
        <div class="item-card-actions">
          <button class="icon-btn" onclick="removeCertification('${cert.id}')" title="Remove"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Certification Name</label>
        <input type="text" class="form-input" placeholder="AWS Solutions Architect" value="${escHtml(cert.name)}"
          onchange="updateCert('${cert.id}','name',this.value)">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Issuing Organization</label>
          <input type="text" class="form-input" placeholder="Amazon Web Services" value="${escHtml(cert.org)}"
            onchange="updateCert('${cert.id}','org',this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">Year</label>
          <input type="text" class="form-input" placeholder="2024" value="${escHtml(cert.year)}"
            onchange="updateCert('${cert.id}','year',this.value)">
        </div>
      </div>
    </div>
  `).join('');
}
function updateCert(id, field, val) {
  const c = state.certifications.find(x => x.id === id);
  if (c) { c[field] = val; updatePreview(); scheduleAutoSave(); updateProgress(); }
}

// ====== SOFT SKILLS ======
function handleChipInput(e, type) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.replace(',', '').trim();
    if (!val || state.softSkills.includes(val)) return;
    state.softSkills.push(val);
    e.target.value = '';
    renderSoftSkills();
    updatePreview();
    updateProgress();
    scheduleAutoSave();
  }
}
function removeSoftSkill(skill) {
  state.softSkills = state.softSkills.filter(s => s !== skill);
  renderSoftSkills();
  updatePreview();
  updateProgress();
  scheduleAutoSave();
}
function renderSoftSkills() {
  const container = document.getElementById('softSkillsChips');
  const input = container.querySelector('input');
  container.innerHTML = '';
  state.softSkills.forEach(s => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `${escHtml(s)}<button class="chip-remove" onclick="removeSoftSkill('${escHtml(s)}')">&times;</button>`;
    container.appendChild(chip);
  });
  container.appendChild(input || (() => {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'chip-input';
    inp.id = 'softSkillInput';
    inp.placeholder = 'e.g. Leadership, Communication...';
    inp.onkeydown = (e) => handleChipInput(e, 'softSkills');
    return inp;
  })());
}

// ====== PROGRESS ======
function updateProgress() {
  let filled = 0, total = 10;
  if (state.fullName) filled++;
  if (state.email) filled++;
  if (state.phone) filled++;
  if (state.objective) filled++;
  if (state.skillCategories.some(c => c.skills.length > 0)) filled++;
  if (state.projects.some(p => p.title)) filled++;
  if (state.education.some(e => e.degree)) filled++;
  if (state.certifications.some(c => c.name)) filled++;
  if (state.softSkills.length > 0) filled++;
  if (state.location || state.linkedin || state.github) filled++;
  const pct = Math.round((filled / total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = pct;
  // Update section checks
  const checks = {
    personal: state.fullName && state.email && state.phone,
    objective: state.objective.length >= 50,
    skills: state.skillCategories.some(c => c.skills.length > 0),
    projects: state.projects.some(p => p.title),
    education: state.education.some(e => e.degree),
    certifications: state.certifications.some(c => c.name),
    softskills: state.softSkills.length >= 2,
  };
  Object.entries(checks).forEach(([key, done]) => {
    const el = document.getElementById('check-' + key);
    if (el) el.classList.toggle('completed', !!done);
  });
}

// ====== LOCAL STORAGE ======
function saveData() {
  localStorage.setItem('rb_data', JSON.stringify(state));
  const indicator = document.getElementById('saveIndicator');
  indicator.className = 'save-indicator saved';
  indicator.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Saved!</span>';
  showToast('Progress saved!', 'success');
  setTimeout(() => {
    indicator.className = 'save-indicator';
    indicator.innerHTML = '<i class="fa-solid fa-cloud"></i> <span>Ready</span>';
  }, 2000);
}
function loadData() {
  const saved = localStorage.getItem('rb_data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
      // Fill simple fields
      ['fullName', 'location', 'phone', 'email', 'linkedin', 'github', 'objective'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = state[f] || '';
      });
      if (state.objective) updateCharCount(document.getElementById('objective'));
    } catch (e) { console.error('Load error:', e); }
  }
}
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  const indicator = document.getElementById('saveIndicator');
  indicator.className = 'save-indicator saving';
  indicator.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Saving...</span>';
  autoSaveTimer = setTimeout(() => {
    localStorage.setItem('rb_data', JSON.stringify(state));
    indicator.className = 'save-indicator saved';
    indicator.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Saved</span>';
    setTimeout(() => {
      indicator.className = 'save-indicator';
      indicator.innerHTML = '<i class="fa-solid fa-cloud"></i> <span>Ready</span>';
    }, 2000);
  }, 2000);
}
function setupAutoSave() {
  setInterval(() => {
    localStorage.setItem('rb_data', JSON.stringify(state));
  }, 30000);
}

// ====== RENDER ALL ======
function renderAll() {
  renderSkillCategories();
  renderProjects();
  renderEducation();
  renderCertifications();
  renderSoftSkills();
  updatePreview();
}

// ====== LIVE PREVIEW ======
function updatePreview() {
  const preview = document.getElementById('resumePreview');
  const s = state;
  const hasContent = s.fullName || s.objective || s.skillCategories.length || s.projects.length || s.education.length;
  if (!hasContent) {
    preview.innerHTML = `<div style="text-align:center;color:#aaa;padding:60px 20px;">
      <i class="fa-solid fa-file-lines" style="font-size:48px;margin-bottom:16px;display:block;"></i>
      Start filling the form to see your resume preview here
    </div>`;
    return;
  }
  let html = '';
  // Header
  if (s.fullName) html += `<h1>${escHtml(s.fullName)}</h1>`;
  const contactParts = [];
  if (s.location) contactParts.push(s.location);
  if (s.phone) contactParts.push(s.phone);
  if (s.email) contactParts.push(`<a href="mailto:${escHtml(s.email)}">${escHtml(s.email)}</a>`);
  if (contactParts.length) html += `<div class="contact-line">${contactParts.join(' | ')}</div>`;
  const linkParts = [];
  if (s.linkedin) linkParts.push(`<a href="${escHtml(s.linkedin)}" target="_blank">LinkedIn</a>`);
  if (s.github) linkParts.push(`<a href="${escHtml(s.github)}" target="_blank">GitHub</a>`);
  if (linkParts.length) html += `<div class="contact-line">${linkParts.join(' | ')}</div>`;
  // Objective
  if (s.objective) {
    html += `<div class="section-heading">Career Objective</div>`;
    html += `<div class="objective-text">${escHtml(s.objective)}</div>`;
  }
  // Technical Skills
  const filledSkills = s.skillCategories.filter(c => c.name && c.skills.length);
  if (filledSkills.length) {
    html += `<div class="section-heading">Technical Skills</div>`;
    filledSkills.forEach(cat => {
      html += `<div class="skills-category"><span class="skills-label">${escHtml(cat.name)}: </span>${cat.skills.map(escHtml).join(', ')}</div>`;
    });
  }
  // Projects
  const filledProjects = s.projects.filter(p => p.title);
  if (filledProjects.length) {
    html += `<div class="section-heading">Projects</div>`;
    filledProjects.forEach(p => {
      html += `<div style="margin-bottom:8px">`;
      html += `<div class="project-title">${escHtml(p.title)}</div>`;
      if (p.technologies.length) html += `<div class="project-tech">${p.technologies.map(escHtml).join(', ')}</div>`;
      const bullets = p.bullets.filter(b => b.trim());
      if (bullets.length) {
        html += `<ul class="project-bullets">`;
        bullets.forEach(b => html += `<li>${escHtml(b)}</li>`);
        html += `</ul>`;
      }
      if (p.impact) html += `<div style="font-size:10px;color:#2563EB;font-weight:500;">★ ${escHtml(p.impact)}</div>`;
      html += `</div>`;
    });
  }
  // Education
  const filledEdu = s.education.filter(e => e.degree);
  if (filledEdu.length) {
    html += `<div class="section-heading">Education</div>`;
    filledEdu.forEach(e => {
      html += `<div class="edu-row"><span class="edu-degree">${escHtml(e.degree)}</span><span class="edu-year">${escHtml(e.year)}</span></div>`;
      if (e.college) html += `<div class="edu-college">${escHtml(e.college)}${e.cgpa ? ' — CGPA: ' + escHtml(e.cgpa) : ''}</div>`;
      if (e.coursework.length) html += `<div style="font-size:9px;color:#666;margin-top:2px">Coursework: ${e.coursework.map(escHtml).join(', ')}</div>`;
    });
  }
  // Certifications
  const filledCerts = s.certifications.filter(c => c.name);
  if (filledCerts.length) {
    html += `<div class="section-heading">Certifications</div>`;
    filledCerts.forEach(c => {
      html += `<div class="cert-item">${escHtml(c.name)}${c.org ? ' — ' + escHtml(c.org) : ''}${c.year ? ' (' + escHtml(c.year) + ')' : ''}</div>`;
    });
  }
  // Soft Skills
  if (s.softSkills.length) {
    html += `<div class="section-heading">Soft Skills</div>`;
    html += `<div class="soft-skills-list" style="display:block">${s.softSkills.map(escHtml).join(', ')}</div>`;
  }
  preview.innerHTML = html;
}

// ====== TEMPLATE SWITCHING ======
function switchTemplate(tpl, btn) {
  state.template = tpl;
  const preview = document.getElementById('resumePreview');
  preview.className = 'resume-preview ' + (tpl === 'classic' ? '' : tpl);
  document.querySelectorAll('.template-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  scheduleAutoSave();
}

// ====== MOBILE PREVIEW ======
function toggleMobilePreview() {
  const panel = document.getElementById('previewPanel');
  const btn = document.getElementById('mobilePreviewBtn');
  const closeBtn = panel.querySelector('.close-preview-btn');
  panel.classList.toggle('mobile-show');
  if (panel.classList.contains('mobile-show')) {
    btn.innerHTML = '<i class="fa-solid fa-pen"></i> Edit';
    closeBtn.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-eye"></i> Preview';
    closeBtn.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// ====== EXPORT MODAL ======
function showExportModal() {
  showModal(`
    <h3>📄 Export Resume</h3>
    <div class="export-options">
      <div class="form-group">
        <label class="form-label">Filename</label>
        <input type="text" class="form-input" id="exportFilename" value="${state.fullName ? state.fullName.replace(/\s+/g, '_') + '_Resume' : 'My_Resume'}" placeholder="my_resume">
      </div>
      <div class="form-group">
        <label class="form-label">Paper Size (PDF Only)</label>
        <select class="form-select" id="exportPaperSize">
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
        </select>
      </div>
    </div>
    <div class="modal-actions" style="margin-top:20px; flex-wrap: wrap; gap: 10px;">
      <button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
      <div style="display:flex; gap:10px; flex:1; justify-content:flex-end;">
        <button class="btn btn-secondary" onclick="generateDOCX()"><i class="fa-solid fa-file-word"></i> DOCX</button>
        <button class="btn btn-primary" onclick="generatePDF()"><i class="fa-solid fa-file-pdf"></i> PDF</button>
      </div>
    </div>
  `);
}

// ====== DOCX GENERATION ======
function generateDOCX() {
  const filename = (document.getElementById('exportFilename')?.value || 'Resume') + '.docx';
  // Clone the preview content to modify it for export without touching the DOM
  const preview = document.getElementById('resumePreview');
  const clone = preview.cloneNode(true);

  // Clean up interactions or icons if necessary
  // For now, we take the innerHTML as is, but we add inline styles for better Word compatibility
  const content = clone.innerHTML;

  const styles = `
    body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.15; color: #000; }
    h1 { font-size: 24pt; font-weight: bold; color: #000; margin-bottom: 6pt; text-align: center; }
    .contact-line { text-align: center; font-size: 10pt; color: #444; margin-bottom: 4pt; }
    .contact-line a { text-decoration: none; color: #444; }
    
    .section-heading { 
      font-size: 14pt; 
      font-weight: bold; 
      color: #2563EB; 
      border-bottom: 1.5pt solid #2563EB; 
      margin-top: 14pt; 
      margin-bottom: 8pt; 
      text-transform: uppercase;
    }
    
    /* Project / Experience */
    .project-title { font-weight: bold; font-size: 11pt; margin-top: 6pt; }
    .project-tech { font-style: italic; color: #444; font-size: 10pt; margin-bottom: 2pt; }
    
    /* Education */
    .edu-row { display: flex; justify-content: space-between; margin-top: 6pt; }
    .edu-degree { font-weight: bold; }
    .edu-year { text-align: right; }
    .edu-college { font-style: italic; }
    
    /* Certs */
    .cert-item { margin-bottom: 2pt; }
    
    /* Lists */
    ul { margin: 0; padding-left: 24pt; }
    li { margin-bottom: 2pt; }
    
    /* Soft Skills */
    .soft-skills-list { margin-top: 4pt; }
    .soft-skill-tag { display: inline; margin-right: 8pt; }
  `;

  const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>${styles}</style>
      </head>
      <body>
        ${content}
      </body>
    </html>`;

  try {
    if (typeof htmlDocx === 'undefined') {
      throw new Error('DOCX library not loaded');
    }
    // Convert to blob
    const blob = htmlDocx.asBlob(html, {
      orientation: 'portrait',
      margins: { top: 720, right: 720, bottom: 720, left: 720 } // ~0.5 inch (twips)
    });
    saveAs(blob, filename);

    document.getElementById('modalOverlay').style.display = 'none';
    showToast('DOCX downloaded! (Formatting may vary)', 'success');
  } catch (e) {
    console.error(e);
    showToast('Error generating DOCX. Please try again.', 'error');
  }
}

// ====== PDF GENERATION ======
async function generatePDF() {
  const btn = document.querySelector('.modal-actions .btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Generating...';
  const filename = (document.getElementById('exportFilename')?.value || 'Resume') + '.pdf';
  const paperSize = document.getElementById('exportPaperSize')?.value || 'a4';
  const element = document.getElementById('resumePreview');
  const opt = {
    margin: 0,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: paperSize, orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };
  try {
    await html2pdf().set(opt).from(element).save();
    document.getElementById('modalOverlay').style.display = 'none';
    showToast('PDF downloaded successfully! 🎉', 'success');
  } catch (err) {
    console.error('PDF generation error:', err);
    showToast('Failed to generate PDF. Please try again.', 'error');
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download PDF';
}

// ====== JSON EXPORT / IMPORT ======
function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (state.fullName || 'resume') + '_data.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSON exported!', 'success');
}
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      state = { ...state, ...data };
      ['fullName', 'location', 'phone', 'email', 'linkedin', 'github', 'objective'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = state[f] || '';
      });
      if (state.objective) updateCharCount(document.getElementById('objective'));
      renderAll();
      updateProgress();
      showToast('Data imported successfully!', 'success');
    } catch (err) {
      showToast('Invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ====== SAMPLE DATA ======
function loadSampleData() {
  state.fullName = 'Alex Johnson';
  state.location = 'San Francisco, CA';
  state.phone = '+1-555-123-4567';
  state.email = 'alex.johnson@email.com';
  state.linkedin = 'https://linkedin.com/in/alexjohnson';
  state.github = 'https://github.com/alexjohnson';
  state.objective = 'Results-driven software engineer with 2+ years of experience building scalable web applications. Proficient in modern JavaScript frameworks, cloud services, and agile methodologies. Passionate about clean code, user experience, and continuous learning. Seeking a challenging role to leverage my full-stack skills.';
  state.skillCategories = [
    { id: uid(), name: 'Programming', skills: ['JavaScript', 'TypeScript', 'Python', 'Java', 'SQL'] },
    { id: uid(), name: 'Frameworks', skills: ['React', 'Node.js', 'Express', 'Next.js', 'Django'] },
    { id: uid(), name: 'Tools & Cloud', skills: ['Git', 'Docker', 'AWS', 'MongoDB', 'PostgreSQL'] },
  ];
  state.projects = [
    { id: uid(), title: 'E-Commerce Platform', technologies: ['React', 'Node.js', 'MongoDB', 'Stripe'], bullets: ['Built a full-stack e-commerce platform with user auth, product catalog, and payment processing', 'Implemented real-time inventory tracking using WebSockets', 'Achieved 95+ Lighthouse performance score with lazy loading and code splitting'], impact: 'Served 5,000+ users with 99.9% uptime' },
    { id: uid(), title: 'AI-Powered Task Manager', technologies: ['Python', 'FastAPI', 'GPT-4', 'React'], bullets: ['Developed an intelligent task management app with AI-powered priority suggestions', 'Integrated OpenAI API for natural language task parsing and scheduling', 'Designed responsive UI with drag-and-drop functionality'], impact: 'Reduced task planning time by 60% for beta users' },
  ];
  state.education = [
    { id: uid(), degree: 'B.S. Computer Science', college: 'University of California, Berkeley', year: '2023', cgpa: '3.8 / 4.0', coursework: ['Data Structures', 'Algorithms', 'Machine Learning', 'Database Systems'] }
  ];
  state.certifications = [
    { id: uid(), name: 'AWS Solutions Architect Associate', org: 'Amazon Web Services', year: '2024' },
    { id: uid(), name: 'Meta Front-End Developer', org: 'Meta / Coursera', year: '2023' },
  ];
  state.softSkills = ['Leadership', 'Communication', 'Problem-Solving', 'Teamwork', 'Adaptability', 'Time Management'];
  // Fill fields
  ['fullName', 'location', 'phone', 'email', 'linkedin', 'github', 'objective'].forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = state[f];
  });
  updateCharCount(document.getElementById('objective'));
  renderAll();
  updateProgress();
  scheduleAutoSave();
  showToast('Sample data loaded! 🎉', 'success');
}

// ====== UTILITIES ======
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
