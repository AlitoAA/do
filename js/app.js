/**
 * AuDHD Life Dashboard - Main Application Controller
 * Handles routing, modal lifecycle, timers, shortcuts, confetti, and user interactions.
 */

class DashboardApp {
  constructor() {
    this.currentView = 'dashboard';
    this.activeTasksFilter = 'active';
    this.focusTaskId = null;
    this.focusTimerInterval = null;
    this.focusTimerSeconds = 25 * 60;
    this.focusTimerIsRunning = false;
    this.focusTimerIsCountUp = false;
    this.activeUnstickTaskId = null;

    this.store = window.appStore;
    this.engine = new window.AuDHDEngine(this.store);
    this.audio = window.soundSynth;
    this.ui = new window.UIComponents(this.store, this.engine, this.audio);
  }

  init() {
    // Apply sound settings
    this.audio.setSettings(this.store.getState().settings);

    // Apply visual sensory theme and animation mode
    this.applySensoryTheme();

    // Subscribe to store updates to re-render
    this.store.subscribe(() => {
      this.renderCurrentView();
      this.updateHeaderStats();
    });

    // Initial render
    this.renderCurrentView();
    this.updateHeaderStats();

    // Setup global keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Setup live date/time ticking
    this.startHeaderClock();

    // Confetti canvas init
    this.initConfetti();
  }

  // ==================== THEME & SENSORY MODES ====================

  applySensoryTheme() {
    const settings = this.store.getState().settings;
    document.documentElement.setAttribute('data-theme', settings.sensoryMode || 'calm');
    document.documentElement.setAttribute('data-motion', settings.animationIntensity || 'normal');
  }

  updateSensoryMode(mode) {
    this.store.updateSettings({ sensoryMode: mode });
    this.applySensoryTheme();
    this.showToast(`Sensory theme changed to ${mode}`);
  }

  updateAnimationIntensity(intensity) {
    this.store.updateSettings({ animationIntensity: intensity });
    this.applySensoryTheme();
    this.showToast(`Animation intensity set to ${intensity}`);
  }

  updateSoundToggle(enabled) {
    this.store.updateSettings({ soundEnabled: enabled });
    this.audio.setSettings(this.store.getState().settings);
    this.showToast(`Sound FX ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  updateSoundVolume(volume) {
    this.store.updateSettings({ soundVolume: Number(volume) });
    this.audio.setSettings(this.store.getState().settings);
    const label = document.getElementById('sound-vol-label');
    if (label) label.textContent = `${volume}%`;
  }

  updateSetting(key, val) {
    this.store.updateSettings({ [key]: val });
  }

  updateProfile(key, val) {
    this.store.updateProfile({ [key]: val });
    this.renderCurrentView();
  }

  // ==================== ROUTING & VIEW SWITCHING ====================

  switchView(viewName) {
    this.currentView = viewName;

    // Update desktop sidebar navigation active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-view') === viewName);
    });

    // Update mobile bottom nav active state
    document.querySelectorAll('.mobile-nav-btn').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-view') === viewName);
    });

    // Close mobile sidebar if open
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) sidebar.classList.remove('open');

    this.audio.play('woosh');
    this.renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderCurrentView() {
    const container = document.getElementById('main-view-container');
    if (!container) return;

    switch (this.currentView) {
      case 'dashboard':
        container.innerHTML = this.ui.renderDashboard();
        break;
      case 'tasks':
        container.innerHTML = this.ui.renderTasksView();
        break;
      case 'calendar':
        container.innerHTML = this.ui.renderCalendarView();
        break;
      case 'projects':
        container.innerHTML = this.ui.renderProjectsView();
        break;
      case 'journal':
        container.innerHTML = this.ui.renderJournalView();
        break;
      case 'skills':
        container.innerHTML = this.ui.renderSkillsView();
        break;
      case 'inbox':
        container.innerHTML = this.ui.renderInboxView();
        break;
      case 'settings':
        container.innerHTML = this.ui.renderSettingsView();
        break;
      default:
        container.innerHTML = this.ui.renderDashboard();
    }
  }

  updateHeaderStats() {
    const state = this.store.getState();
    const profile = state.userProfile;
    const progress = this.store.getLevelProgress(profile.xp);

    const levelEl = document.getElementById('header-level-badge');
    if (levelEl) levelEl.textContent = `Lvl ${progress.level}`;

    const xpEl = document.getElementById('header-xp-badge');
    if (xpEl) xpEl.textContent = `${progress.totalXp} XP`;

    const bareBtn = document.getElementById('header-bare-min-btn');
    if (bareBtn) {
      bareBtn.classList.toggle('active', profile.bareMinimumMode);
    }

    const capPill = document.getElementById('header-capacity-label');
    if (capPill) {
      const capLabels = {
        low: '🪫 Low Battery (0-20%)',
        limited: '🔋 Limited (20-40%)',
        normal: '⚡ Normal (40-70%)',
        high: '🚀 High Energy (70-90%)',
        hyperfocus: '🔮 Hyperfocus (90-100%)'
      };
      capPill.textContent = capLabels[profile.currentCapacity] || '⚡ Normal';
    }
  }

  startHeaderClock() {
    const update = () => {
      const dateEl = document.getElementById('header-current-date');
      const greetEl = document.getElementById('header-current-greeting');
      if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);
      }
      if (greetEl) {
        const state = this.store.getState();
        const todayStr = this.store.getTodayString();
        const doneToday = state.tasks.filter(t => t.completed && t.completedAt && t.completedAt.startsWith(todayStr)).length;
        if (doneToday > 0) {
          greetEl.textContent = `✨ You've done ${doneToday} ${doneToday === 1 ? 'thing' : 'things'} today.`;
        } else {
          greetEl.textContent = `Gentle day. One step at a time.`;
        }
      }
    };
    update();
    setInterval(update, 60000);
  }

  // ==================== TASK ACTIONS ====================

  toggleTaskComplete(taskId) {
    const task = this.store.getState().tasks.find(t => t.id === taskId);
    if (!task) return;

    const willComplete = !task.completed;
    const res = this.store.completeTask(taskId, willComplete);

    if (willComplete) {
      this.audio.play('complete');
      if (res && res.earnedXp > 0) {
        this.showXpToast(res.earnedXp);
      }
      // Trigger small confetti
      this.triggerConfetti(0.3);
    } else {
      this.audio.play('click');
    }
  }

  deleteTask(taskId) {
    const deleted = this.store.deleteTask(taskId);
    if (deleted) {
      this.audio.play('click');
      this.showToast(`Task "${deleted.title}" deleted`, 'info', true);
    }
  }

  setTasksFilter(filter) {
    this.activeTasksFilter = filter;
    this.renderCurrentView();
  }

  // ==================== "WHAT SHOULD I DO?" ORACLE ====================

  refreshOracle(mode = 'smart', excludeId = null) {
    this.audio.play('click');
    const container = document.querySelector('.hero-oracle-card');
    if (!container) return;

    const oracle = this.engine.recommendTask(mode, excludeId ? [excludeId] : []);
    this.renderCurrentView();
  }

  // ==================== "I'M STUCK" UNSTICK ENGINE ====================

  openUnstickModal(taskId) {
    this.activeUnstickTaskId = taskId;
    const task = this.store.getState().tasks.find(t => t.id === taskId);
    const solutions = this.engine.getUnstickSolutions(task);

    const body = document.getElementById('unstick-modal-body');
    if (body) {
      body.innerHTML = `
        <div style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 12px; margin-bottom: 8px;">
          <strong style="color: var(--text-accent);">Task:</strong> ${task ? this.ui.escapeHtml(task.title) : 'Active task'}
        </div>
        <p style="font-size: 0.88rem; color: var(--text-secondary);">
          Being stuck is normal. It means the brain perceives friction or sensory overwhelm. Pick a gentle unstick method:
        </p>
        <div class="unstick-options-list">
          ${solutions.map(s => `
            <div class="unstick-card" onclick="app.executeUnstickSolution('${s.id}', '${taskId}')">
              <div>
                <div style="font-size: 0.95rem; font-weight: 700; margin-bottom: 2px;">${s.title}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${s.desc}</div>
              </div>
              <button class="btn-primary" style="font-size: 0.78rem; padding: 6px 12px;">${s.actionLabel}</button>
            </div>
          `).join('')}
        </div>
      `;
    }

    this.openModal('modal-unstick');
  }

  executeUnstickSolution(solutionId, taskId) {
    this.closeModal('modal-unstick');
    const task = this.store.getState().tasks.find(t => t.id === taskId);

    if (solutionId === 'two_minute') {
      this.startFocusMode(taskId, 2);
      this.showToast('2-Minute Sprint started! Permission to stop when timer rings.');
    } else if (solutionId === 'breakdown') {
      const subtasks = this.engine.generateAutoSubtasks(task ? task.title : 'Task');
      this.store.updateTask(taskId, { subtasks });
      this.audio.play('stuck');
      this.showToast('🪄 Task broken down into 3 bite-sized steps!');
      this.renderCurrentView();
    } else if (solutionId === 'park_someday') {
      this.store.updateTask(taskId, { isSomeday: true });
      this.audio.play('calm');
      this.showToast('🛋️ Task safely parked in Someday / Maybe. Zero guilt.');
      this.renderCurrentView();
    } else if (solutionId === 'sensory_adjust') {
      this.showToast('🎧 Grab water, put on headphones, or stretch. You got this!');
    } else if (solutionId === 'whats_blocking') {
      this.openJournalEditor("What is making this task feel heavy right now?");
    }
  }

  // ==================== COMEBACK ACTIONS ====================

  handleComebackAction(actionType) {
    this.engine.executeComebackAction(actionType);
    this.audio.play('levelup');
    this.triggerConfetti(0.5);
    this.showToast('🌅 Re-orientation complete! Welcome back.');
    this.renderCurrentView();
  }

  // ==================== FOCUS MODE HUD & TIMERS ====================

  startFocusMode(taskId, initialMinutes = null) {
    this.focusTaskId = taskId;
    const task = this.store.getState().tasks.find(t => t.id === taskId);

    const titleEl = document.getElementById('focus-task-title');
    const descEl = document.getElementById('focus-task-desc');
    const firstStepEl = document.getElementById('focus-first-step-text');
    const subtasksEl = document.getElementById('focus-subtasks-container');

    if (titleEl) titleEl.textContent = task ? task.title : 'Focus Session';
    if (descEl) descEl.textContent = task && task.description ? task.description : 'Take your time. Just touch the work.';
    if (firstStepEl) {
      firstStepEl.textContent = (task && task.firstStep) ? task.firstStep : 'Step 1: Open or look at the materials.';
    }

    if (subtasksEl && task && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      subtasksEl.innerHTML = task.subtasks.map(st => `
        <div class="subtask-item-row ${st.completed ? 'is-done' : ''}" style="padding: 8px 12px; background: var(--bg-card); border-radius: var(--radius-md); cursor: pointer;" onclick="app.toggleFocusSubtask('${task.id}', '${st.id}')">
          <div class="subtask-check">${st.completed ? '✓' : ''}</div>
          <span style="font-size: 0.9rem;">${this.ui.escapeHtml(st.title)}</span>
        </div>
      `).join('');
      subtasksEl.style.display = 'flex';
    } else if (subtasksEl) {
      subtasksEl.style.display = 'none';
    }

    const mins = initialMinutes || (task ? task.estimatedMinutes || 15 : 15);
    this.setFocusTimerPreset(mins);

    const overlay = document.getElementById('focus-modal-overlay');
    if (overlay) overlay.classList.add('active');

    this.audio.play('start');
  }

  toggleFocusSubtask(taskId, subtaskId) {
    const task = this.store.getState().tasks.find(t => t.id === taskId);
    if (!task) return;
    const st = task.subtasks.find(s => s.id === subtaskId);
    if (st) {
      st.completed = !st.completed;
      this.store.save();
      this.startFocusMode(taskId); // re-render focus mode
    }
  }

  closeFocusMode() {
    this.stopFocusTimer();
    const overlay = document.getElementById('focus-modal-overlay');
    if (overlay) overlay.classList.remove('active');
    this.focusTaskId = null;
    this.renderCurrentView();
  }

  completeFocusTask() {
    if (this.focusTaskId) {
      this.toggleTaskComplete(this.focusTaskId);
    }
    this.closeFocusMode();
  }

  setFocusTimerPreset(minutes) {
    this.stopFocusTimer();
    if (minutes === 'countup') {
      this.focusTimerIsCountUp = true;
      this.focusTimerSeconds = 0;
    } else {
      this.focusTimerIsCountUp = false;
      this.focusTimerSeconds = Number(minutes) * 60;
    }
    this.updateTimerDisplay();
  }

  toggleFocusTimer() {
    if (this.focusTimerIsRunning) {
      this.stopFocusTimer();
    } else {
      this.startFocusTimer();
    }
  }

  startFocusTimer() {
    this.focusTimerIsRunning = true;
    const btn = document.getElementById('focus-timer-toggle-btn');
    if (btn) btn.textContent = '⏸ Pause';

    this.focusTimerInterval = setInterval(() => {
      if (this.focusTimerIsCountUp) {
        this.focusTimerSeconds++;
      } else {
        if (this.focusTimerSeconds > 0) {
          this.focusTimerSeconds--;
        } else {
          this.stopFocusTimer();
          this.audio.play('timer');
          this.showToast('⏱️ Focus Sprint completed! Great effort.');
        }
      }
      this.updateTimerDisplay();
    }, 1000);
  }

  stopFocusTimer() {
    this.focusTimerIsRunning = false;
    clearInterval(this.focusTimerInterval);
    const btn = document.getElementById('focus-timer-toggle-btn');
    if (btn) btn.textContent = '▶ Start';
  }

  updateTimerDisplay() {
    const el = document.getElementById('focus-timer-digits');
    if (!el) return;

    const mins = Math.floor(this.focusTimerSeconds / 60);
    const secs = this.focusTimerSeconds % 60;
    el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // ==================== CAPACITY & BARE MINIMUM ====================

  setCapacity(capacity) {
    this.store.setCapacity(capacity);
    this.audio.play('click');
    this.showToast(`Capacity set to: ${capacity.toUpperCase()}`);
    this.renderCurrentView();
  }

  toggleBareMinimum() {
    const isNow = this.store.toggleBareMinimumMode();
    this.audio.play(isNow ? 'calm' : 'click');
    this.showToast(isNow ? '🪫 Bare Minimum Mode activated' : 'Standard view restored');
    this.renderCurrentView();
  }

  // ==================== ROUTINES ====================

  toggleRoutineItem(routineId, itemId) {
    this.audio.play('click');
    this.store.toggleRoutineItem(routineId, itemId);
    this.renderCurrentView();
  }

  setRoutineTier(routineId, tier) {
    this.store.setRoutineTier(routineId, tier);
    this.renderCurrentView();
  }

  // ==================== BRAIN DUMP & IMPULSE IDEAS ====================

  quickAddIdea() {
    const input = document.getElementById('quick-idea-input');
    if (!input || !input.value.trim()) return;

    this.store.addNewIdea(input.value.trim());
    input.value = '';
    this.audio.play('xp');
    this.showToast('💡 Idea safely preserved in Idea Vault!');
    this.renderCurrentView();
  }

  submitFullBrainDump() {
    const textarea = document.getElementById('brain-dump-full-text');
    if (!textarea || !textarea.value.trim()) return;

    const added = this.store.addBrainDump(textarea.value);
    textarea.value = '';
    this.audio.play('woosh');
    this.showToast(`📥 Offloaded ${added.length} items to Inbox!`);
    this.renderCurrentView();
  }

  convertBrainDumpToTask(id) {
    this.store.convertBrainDumpToTask(id);
    this.audio.play('complete');
    this.showToast('Converted to task!');
    this.renderCurrentView();
  }

  convertBrainDumpToIdea(id) {
    const item = this.store.getState().brainDump.find(b => b.id === id);
    if (item) {
      this.store.addNewIdea(item.text);
      this.store.deleteBrainDump(id);
      this.showToast('Moved to Idea Vault!');
      this.renderCurrentView();
    }
  }

  deleteBrainDump(id) {
    this.store.deleteBrainDump(id);
    this.renderCurrentView();
  }

  convertIdeaToProject(id) {
    this.store.convertIdeaToProject(id);
    this.showToast('📁 Idea turned into a Project!');
    this.switchView('projects');
  }

  deleteIdea(id) {
    this.store.deleteIdea(id);
    this.renderCurrentView();
  }

  // ==================== PROJECT CREATION ====================

  openProjectEditor() {
    const title = prompt('Project title (e.g. Apartment Reset, Learn Guitar):');
    if (!title || !title.trim()) return;

    const desc = prompt('Short description / vision (optional):', '') || '';
    const category = prompt('Category (Work, Home, Creativity, Health, Learning, Life Admin):', 'Work') || 'Work';

    this.store.addProject({
      title: title.trim(),
      description: desc.trim(),
      category: category.trim(),
      color: '#6366f1',
      icon: '📁'
    });

    this.audio.play('complete');
    this.showToast(`Project "${title}" created!`);
    this.renderCurrentView();
  }

  // ==================== QUICK ADD (NLP) ====================

  submitQuickAdd() {
    const input = document.getElementById('global-quick-add-input');
    if (!input || !input.value.trim()) return;

    const parsed = this.engine.parseQuickAddText(input.value);
    if (parsed) {
      this.store.addTask(parsed);
      input.value = '';
      this.audio.play('complete');
      this.showToast(`Created task "${parsed.title}"`);
      this.renderCurrentView();
    }
  }

  // ==================== TASK EDITOR MODAL ====================

  openTaskEditor(taskId = null, defaultDate = null, defaultProjectId = null) {
    const modal = document.getElementById('modal-task-editor');
    const form = document.getElementById('task-editor-form');
    if (!modal || !form) return;

    const isEdit = Boolean(taskId);
    document.getElementById('task-editor-modal-title').textContent = isEdit ? 'Edit Task' : 'Create New Task';

    let task = null;
    if (isEdit) {
      task = this.store.getState().tasks.find(t => t.id === taskId);
    }

    document.getElementById('task-edit-id').value = task ? task.id : '';
    document.getElementById('task-edit-title').value = task ? task.title : '';
    document.getElementById('task-edit-desc').value = task ? task.description : '';
    document.getElementById('task-edit-category').value = task ? task.category : 'Life Admin';
    document.getElementById('task-edit-priority').value = task ? task.priority : 'normal';
    document.getElementById('task-edit-energy').value = task ? task.energyLevel : 'normal';
    document.getElementById('task-edit-mins').value = task ? task.estimatedMinutes : 10;
    document.getElementById('task-edit-deadlinetype').value = task ? task.deadlineType : 'none';
    document.getElementById('task-edit-deadlinedate').value = task ? (task.deadlineDate || '') : (defaultDate || '');
    document.getElementById('task-edit-deadlinetime').value = task ? (task.deadlineTime || '') : '';
    document.getElementById('task-edit-firststep').value = task ? (task.firstStep || '') : '';
    document.getElementById('task-edit-someday').checked = task ? Boolean(task.isSomeday) : false;
    document.getElementById('task-edit-icon').value = task ? (task.icon || '📝') : '📝';

    this.openModal('modal-task-editor');
  }

  saveTaskEditorForm() {
    const id = document.getElementById('task-edit-id').value;
    const title = document.getElementById('task-edit-title').value.trim();
    if (!title) {
      alert('Please enter a task title');
      return;
    }

    const taskData = {
      title,
      description: document.getElementById('task-edit-desc').value.trim(),
      category: document.getElementById('task-edit-category').value,
      priority: document.getElementById('task-edit-priority').value,
      energyLevel: document.getElementById('task-edit-energy').value,
      estimatedMinutes: Number(document.getElementById('task-edit-mins').value) || 10,
      deadlineType: document.getElementById('task-edit-deadlinetype').value,
      deadlineDate: document.getElementById('task-edit-deadlinedate').value || null,
      deadlineTime: document.getElementById('task-edit-deadlinetime').value || null,
      firstStep: document.getElementById('task-edit-firststep').value.trim(),
      isSomeday: document.getElementById('task-edit-someday').checked,
      icon: document.getElementById('task-edit-icon').value.trim() || '📝'
    };

    if (id) {
      this.store.updateTask(id, taskData);
      this.showToast('Task updated');
    } else {
      this.store.addTask(taskData);
      this.showToast('Task created');
    }

    this.closeModal('modal-task-editor');
    this.renderCurrentView();
  }

  // ==================== RESCHEDULING ====================

  openRescheduleModal(taskId) {
    const task = this.store.getState().tasks.find(t => t.id === taskId);
    if (!task) return;

    const body = document.getElementById('reschedule-modal-body');
    if (body) {
      body.innerHTML = `
        <div style="font-size: 0.9rem; margin-bottom: 12px;">
          <strong>Reschedule:</strong> ${this.ui.escapeHtml(task.title)}
        </div>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px;">
          Rescheduling is an act of calibration, never a failure. Pick a comfortable new target:
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button class="btn-secondary" onclick="app.quickReschedule('${taskId}', 'today')">🎯 Later Today</button>
          <button class="btn-secondary" onclick="app.quickReschedule('${taskId}', 'tomorrow')">🌅 Tomorrow</button>
          <button class="btn-secondary" onclick="app.quickReschedule('${taskId}', 'weekend')">🛋️ This Weekend</button>
          <button class="btn-secondary" onclick="app.quickReschedule('${taskId}', 'next_week')">📅 Next Week</button>
          <button class="btn-secondary" onclick="app.quickReschedule('${taskId}', 'someday')">📦 Move to Someday</button>
          <button class="btn-secondary" onclick="app.quickReschedule('${taskId}', 'clear')">🚫 Clear Deadline</button>
        </div>
      `;
    }
    this.openModal('modal-reschedule');
  }

  quickReschedule(taskId, option) {
    this.closeModal('modal-reschedule');
    const today = new Date();
    let targetDate = null;

    if (option === 'today') {
      targetDate = today.toISOString().split('T')[0];
    } else if (option === 'tomorrow') {
      targetDate = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    } else if (option === 'weekend') {
      const daysUntilSat = (6 - today.getDay() + 7) % 7 || 7;
      targetDate = new Date(today.getTime() + daysUntilSat * 86400000).toISOString().split('T')[0];
    } else if (option === 'next_week') {
      targetDate = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0];
    } else if (option === 'someday') {
      this.store.updateTask(taskId, { isSomeday: true, deadlineDate: null });
      this.showToast('Moved to Someday / Maybe');
      this.renderCurrentView();
      return;
    }

    this.store.rescheduleTask(taskId, targetDate);
    this.audio.play('click');
    this.showToast('Task rescheduled smoothly');
    this.renderCurrentView();
  }

  // ==================== JOURNAL MODAL ====================

  openJournalEditor(promptText = null) {
    document.getElementById('journal-edit-title').value = '';
    document.getElementById('journal-edit-content').value = '';
    document.getElementById('journal-edit-mood').value = 'calm';
    document.getElementById('journal-edit-energy').value = '3';
    document.getElementById('journal-edit-prompt').value = promptText || '';
    this.openModal('modal-journal-editor');
  }

  saveJournalEntryForm() {
    const title = document.getElementById('journal-edit-title').value.trim() || 'Reflection';
    const content = document.getElementById('journal-edit-content').value.trim();
    const mood = document.getElementById('journal-edit-mood').value;
    const energy = Number(document.getElementById('journal-edit-energy').value) || 3;
    const prompt = document.getElementById('journal-edit-prompt').value.trim() || null;

    if (!content) {
      alert('Please write a brief note.');
      return;
    }

    this.store.addJournalEntry({ title, content, mood, energy, prompt });
    this.closeModal('modal-journal-editor');
    this.audio.play('xp');
    this.showToast('📓 Reflection saved!');
    this.renderCurrentView();
  }

  deleteJournalEntry(id) {
    this.store.deleteJournalEntry(id);
    this.showToast('Journal entry deleted', 'info', true);
    this.renderCurrentView();
  }

  // ==================== TIME FIT MODAL ====================

  openTimeFitModal() {
    const mins = prompt('How many free minutes do you have right now? (e.g. 5, 10, 15, 30)', '10');
    if (!mins || isNaN(mins)) return;

    const numMins = parseInt(mins, 10);
    const fitTasks = this.store.getState().tasks.filter(t => !t.completed && !t.isSomeday && (t.estimatedMinutes || 10) <= numMins);

    alert(`Found ${fitTasks.length} tasks that fit within ${numMins} minutes!`);
  }

  // ==================== MODAL HELPERS ====================

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
    const palette = document.getElementById('command-palette');
    if (palette) palette.classList.remove('active');
  }

  // ==================== TOAST NOTIFICATIONS & XP ====================

  showToast(msg, type = 'info', allowUndo = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `
      <span>${this.ui.escapeHtml(msg)}</span>
      ${allowUndo ? `<span class="toast-undo-btn" onclick="app.executeUndo()">Undo</span>` : ''}
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  showXpToast(amount) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-msg toast-xp';
    toast.innerHTML = `
      <span>✨ <strong>+${amount} XP Gained!</strong> Progress happened.</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  executeUndo() {
    const desc = this.store.popUndo();
    if (desc) {
      this.audio.play('woosh');
      this.showToast(`Undid: ${desc}`);
      this.renderCurrentView();
    }
  }

  // ==================== CANVAS CONFETTI ====================

  initConfetti() {
    this.confettiCanvas = document.getElementById('confetti-canvas');
    if (this.confettiCanvas) {
      this.confettiCtx = this.confettiCanvas.getContext('2d');
      this.confettiParticles = [];
      window.addEventListener('resize', () => this.resizeConfetti());
      this.resizeConfetti();
    }
  }

  resizeConfetti() {
    if (this.confettiCanvas) {
      this.confettiCanvas.width = window.innerWidth;
      this.confettiCanvas.height = window.innerHeight;
    }
  }

  triggerConfetti(intensity = 0.5) {
    if (this.store.getState().settings.animationIntensity === 'none') return;
    if (!this.confettiCtx) return;

    const count = Math.floor(40 * intensity);
    const colors = ['#38bdf8', '#fbbf24', '#a855f7', '#4ade80', '#fb7185'];

    for (let i = 0; i < count; i++) {
      this.confettiParticles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight * 0.4 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 10,
        vy: -Math.random() * 8 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    if (!this.confettiAnimating) {
      this.confettiAnimating = true;
      this.animateConfetti();
    }
  }

  animateConfetti() {
    if (!this.confettiCtx || this.confettiParticles.length === 0) {
      this.confettiAnimating = false;
      if (this.confettiCtx) this.confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      return;
    }

    this.confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.rotation += p.vRot;
      p.opacity -= 0.015;

      if (p.opacity <= 0 || p.y > window.innerHeight) {
        this.confettiParticles.splice(i, 1);
        continue;
      }

      this.confettiCtx.save();
      this.confettiCtx.translate(p.x, p.y);
      this.confettiCtx.rotate((p.rotation * Math.PI) / 180);
      this.confettiCtx.fillStyle = p.color;
      this.confettiCtx.globalAlpha = p.opacity;
      this.confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.confettiCtx.restore();
    }

    requestAnimationFrame(() => this.animateConfetti());
  }

  // ==================== COMMAND PALETTE & KEYBOARD SHORTCUTS ====================

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore in input/textarea unless it is Escape or Enter
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

      if (e.key === 'Escape') {
        this.closeAllModals();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggleCommandPalette();
        return;
      }

      if (!isInput) {
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          this.openTaskEditor();
        } else if (e.key === 'j' || e.key === 'J') {
          e.preventDefault();
          this.openJournalEditor();
        } else if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          this.switchView('dashboard');
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          this.openModal('modal-brain-dump');
        } else if (e.key === '/') {
          e.preventDefault();
          this.toggleCommandPalette();
        }
      }
    });
  }

  toggleCommandPalette() {
    const palette = document.getElementById('command-palette');
    if (!palette) return;

    const isActive = palette.classList.toggle('active');
    if (isActive) {
      const input = document.getElementById('palette-search-input');
      if (input) {
        input.value = '';
        input.focus();
        this.filterPaletteResults('');
      }
    }
  }

  filterPaletteResults(query) {
    const container = document.getElementById('palette-results-list');
    if (!container) return;

    const q = (query || '').toLowerCase().trim();
    const state = this.store.getState();

    const items = [
      { type: 'action', title: 'Create New Task', icon: '📝', action: () => this.openTaskEditor() },
      { type: 'action', title: 'Rapid Brain Dump', icon: '🧠', action: () => this.openModal('modal-brain-dump') },
      { type: 'action', title: 'Write Journal Reflection', icon: '📓', action: () => this.openJournalEditor() },
      { type: 'action', title: 'Toggle Bare Minimum Mode', icon: '🪫', action: () => this.toggleBareMinimum() },
      { type: 'action', title: 'Switch to Low Battery Mode', icon: '🔋', action: () => this.setCapacity('low') },
      { type: 'action', title: 'Switch to High Energy Mode', icon: '🚀', action: () => this.setCapacity('high') },
      { type: 'nav', title: 'Go to Today Dashboard', icon: '🏠', action: () => this.switchView('dashboard') },
      { type: 'nav', title: 'Go to All Tasks', icon: '📋', action: () => this.switchView('tasks') },
      { type: 'nav', title: 'Go to Calendar Planner', icon: '📅', action: () => this.switchView('calendar') },
      { type: 'nav', title: 'Go to RPG Character Sheet', icon: '🎮', action: () => this.switchView('skills') }
    ];

    // Add matching tasks
    state.tasks.forEach(t => {
      if (!t.completed && t.title.toLowerCase().includes(q)) {
        items.push({
          type: 'task',
          title: `Task: ${t.title}`,
          icon: '🎯',
          action: () => this.startFocusMode(t.id)
        });
      }
    });

    const filtered = items.filter(i => i.title.toLowerCase().includes(q));

    container.innerHTML = filtered.map((item, idx) => `
      <div class="palette-item ${idx === 0 ? 'selected' : ''}" onclick="app.executePaletteItem(${idx})">
        <span>${item.icon}</span>
        <span>${this.ui.escapeHtml(item.title)}</span>
      </div>
    `).join('');

    this.currentPaletteItems = filtered;
  }

  executePaletteItem(index) {
    if (this.currentPaletteItems && this.currentPaletteItems[index]) {
      this.closeAllModals();
      this.currentPaletteItems[index].action();
    }
  }

  // ==================== DATA BACKUP & RESTORE ====================

  downloadBackupJson() {
    const json = this.store.exportDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audhd_dashboard_backup_${this.store.getTodayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('JSON backup exported successfully!');
  }

  downloadTasksCsv() {
    const csv = this.store.exportTasksCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audhd_tasks_${this.store.getTodayString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Tasks CSV exported successfully!');
  }

  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = this.store.importDataJson(e.target.result);
      if (res.success) {
        this.showToast('Data imported successfully!');
        this.renderCurrentView();
      } else {
        alert(`Import failed: ${res.error}`);
      }
    };
    reader.readAsText(file);
  }

  resetDemoData() {
    if (confirm('Reset to initial sample demo data? Your current items will be replaced with fresh AuDHD demo tasks.')) {
      this.store.resetToDemoData();
      this.audio.play('levelup');
      this.showToast('Reset to demo data complete!');
      this.renderCurrentView();
    }
  }
}

// Instantiate global app
window.app = new DashboardApp();
window.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
