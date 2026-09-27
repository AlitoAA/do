/**
 * AuDHD Life Dashboard - UI Component Renderers
 * Highly modular, accessible, and reactive template builders.
 */

class UIComponents {
  constructor(store, engine, audio) {
    this.store = store;
    this.engine = engine;
    this.audio = audio;
  }

  // ==================== ICONS & AVATAR HELPER ====================

  renderTaskIcon(task) {
    if (task.iconType === 'url' && task.icon && task.icon.startsWith('http')) {
      return `<img src="${this.escapeHtml(task.icon)}" alt="" class="task-img-avatar" onerror="this.outerHTML='<span>📝</span>'">`;
    }
    return `<span class="task-icon-render">${task.icon || '📝'}</span>`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==================== DASHBOARD VIEW ====================

  renderDashboard() {
    const state = this.store.getState();
    const profile = state.userProfile;
    const todayStr = this.store.getTodayString();
    const isBareMin = profile.bareMinimumMode;
    const capacity = profile.currentCapacity;

    // Filter tasks for Today
    const activeTasks = state.tasks.filter(t => !t.completed && !t.isSomeday && !t.isInbox);
    const completedToday = state.tasks.filter(t => t.completed && t.completedAt && t.completedAt.startsWith(todayStr));

    // Grouping
    const mustDo = [];
    const shouldDo = [];
    const couldDo = [];
    const quickWins = [];

    activeTasks.forEach(task => {
      const dl = this.engine.getDeadlineState(task);
      const isTiny = (task.estimatedMinutes || 10) <= 5;

      if (task.deadlineType === 'hard' || dl.status === 'urgent' || dl.status === 'due_now' || dl.isOverdue) {
        mustDo.push(task);
      } else if (isTiny && quickWins.length < 4) {
        quickWins.push(task);
      } else if (task.softTargetDate === todayStr || task.priority === 'high') {
        shouldDo.push(task);
      } else {
        couldDo.push(task);
      }
    });

    // Oracle recommendation
    const oracle = this.engine.recommendTask('smart');

    // Comeback Banner check
    const comeback = this.engine.checkComebackStatus();
    let comebackHtml = '';
    if (comeback.isComeback) {
      comebackHtml = `
        <div class="comeback-banner">
          <div class="comeback-title">
            <span>🌅</span>
            <span>Welcome back! Everything is safe and waiting.</span>
          </div>
          <p class="comeback-text">
            No shame, no broken streaks. Your brain needed rest or space. Let's gently get you re-oriented with a fresh, stress-free view.
          </p>
          <div class="comeback-options-grid">
            <button class="comeback-btn" onclick="app.handleComebackAction('essentials_only')">
              <strong>🎯 Essentials Only</strong>
              <small style="color:var(--text-muted)">Park older non-urgent tasks into Someday</small>
            </button>
            <button class="comeback-btn" onclick="app.handleComebackAction('gentle_reschedule')">
              <strong>📅 Gentle Reschedule</strong>
              <small style="color:var(--text-muted)">Spread overdue tasks across this week</small>
            </button>
            <button class="comeback-btn" onclick="app.handleComebackAction('clean_slate')">
              <strong>✨ Fresh Slate (+100 XP)</strong>
              <small style="color:var(--text-muted)">Release old backlog with zero guilt</small>
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="view-content">
        ${comebackHtml}

        <!-- Virtual Companion Message Bubble -->
        ${state.settings.companionEnabled ? `
          <div class="companion-bubble-widget">
            <div class="companion-avatar-wrap">
              <span class="companion-avatar-icon">${this.getCompanionIcon(profile.equippedCompanion)}</span>
            </div>
            <div class="companion-dialogue">
              ${this.engine.getCompanionMessage('greeting')}
            </div>
            <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.78rem;" onclick="app.openModal('modal-brain-dump')">
              🧠 Brain Dump
            </button>
          </div>
        ` : ''}

        <!-- "What Should I Do?" Hero Oracle Widget -->
        <div class="hero-oracle-card">
          <div class="hero-oracle-header">
            <div class="oracle-badge">
              <span>🎯</span>
              <span>Focus Oracle</span>
            </div>
            <div class="oracle-modes">
              <button class="oracle-mode-btn active" onclick="app.refreshOracle('smart')">Smart Fit</button>
              <button class="oracle-mode-btn" onclick="app.refreshOracle('quick')">⚡ 2–5m Win</button>
              <button class="oracle-mode-btn" onclick="app.refreshOracle('urgent')">🔥 Urgent First</button>
              <button class="oracle-mode-btn" onclick="app.refreshOracle('random')">🎲 Surprise Me</button>
            </div>
          </div>

          ${oracle && oracle.task ? `
            <div class="oracle-task-box">
              <div class="oracle-task-title-row">
                ${this.renderTaskIcon(oracle.task)}
                <div class="oracle-task-info">
                  <div class="oracle-task-title">${this.escapeHtml(oracle.task.title)}</div>
                  <div class="oracle-task-meta">
                    <span class="meta-chip">⏱️ ~${oracle.task.estimatedMinutes || 10}m</span>
                    <span class="meta-chip">🔋 ${oracle.task.energyLevel} capacity</span>
                    <span class="meta-chip">📁 ${oracle.task.category}</span>
                    <span class="meta-chip badge-xp">+${oracle.task.xp} XP</span>
                  </div>
                </div>
              </div>

              <div class="oracle-task-reason">
                <span>💡</span>
                <span><strong>Suggested because:</strong> ${oracle.reason}</span>
              </div>

              <div class="oracle-actions-row">
                <button class="btn-primary" onclick="app.startFocusMode('${oracle.task.id}')">
                  <span>🚀</span>
                  <span>Start Focus</span>
                </button>
                <button class="btn-secondary" onclick="app.refreshOracle('smart', '${oracle.task.id}')">
                  <span>🎲</span>
                  <span>Pick Something Else</span>
                </button>
                <button class="btn-secondary" onclick="app.openUnstickModal('${oracle.task.id}')">
                  <span>🪄</span>
                  <span>Make It Smaller</span>
                </button>
              </div>
            </div>
          ` : `
            <div style="text-align: center; padding: 24px; color: var(--text-muted);">
              <p style="font-size: 1.1rem; margin-bottom: 8px;">✨ Nothing pressing on your radar!</p>
              <p style="font-size: 0.88rem;">Enjoy the open mental space, or quick-add an easy win below.</p>
            </div>
          `}
        </div>

        <!-- Main Dashboard Grid -->
        <div class="dashboard-sections-grid">
          <!-- Left Column: Tasks -->
          <div class="tasks-main-column">
            <!-- Must Do Section -->
            ${mustDo.length > 0 ? `
              <div class="task-section">
                <div class="task-section-header">
                  <div class="section-title-wrap">
                    <span style="color: var(--color-danger)">🔥</span>
                    <span class="section-title">Must Do / Hard Deadlines</span>
                  </div>
                  <span class="section-count">${mustDo.length}</span>
                </div>
                ${mustDo.map(t => this.renderTaskCard(t)).join('')}
              </div>
            ` : ''}

            <!-- Quick Wins Section -->
            ${quickWins.length > 0 && !isBareMin ? `
              <div class="task-section">
                <div class="task-section-header">
                  <div class="section-title-wrap">
                    <span style="color: #fbbf24">⚡</span>
                    <span class="section-title">Quick Wins (≤ 5 min)</span>
                  </div>
                  <span class="section-count">${quickWins.length}</span>
                </div>
                ${quickWins.map(t => this.renderTaskCard(t)).join('')}
              </div>
            ` : ''}

            <!-- Should Do Section -->
            ${shouldDo.length > 0 && !isBareMin ? `
              <div class="task-section">
                <div class="task-section-header">
                  <div class="section-title-wrap">
                    <span style="color: var(--accent-color)">🎯</span>
                    <span class="section-title">Targeted for Today</span>
                  </div>
                  <span class="section-count">${shouldDo.length}</span>
                </div>
                ${shouldDo.map(t => this.renderTaskCard(t)).join('')}
              </div>
            ` : ''}

            <!-- Could Do Section -->
            ${couldDo.length > 0 && !isBareMin ? `
              <div class="task-section">
                <div class="task-section-header">
                  <div class="section-title-wrap">
                    <span style="color: var(--text-muted)">🌿</span>
                    <span class="section-title">Flexible / Could Do</span>
                  </div>
                  <span class="section-count">${couldDo.length}</span>
                </div>
                ${couldDo.slice(0, 4).map(t => this.renderTaskCard(t)).join('')}
                ${couldDo.length > 4 ? `
                  <button class="btn-secondary" style="width: 100%; justify-content: center;" onclick="app.switchView('tasks')">
                    View ${couldDo.length - 4} more in All Tasks →
                  </button>
                ` : ''}
              </div>
            ` : ''}

            <!-- Bare Minimum Empty Fallback -->
            ${isBareMin && mustDo.length === 0 ? `
              <div class="task-section" style="text-align: center; padding: 30px; background: var(--bg-card); border-radius: var(--radius-lg);">
                <p style="font-size: 1.1rem; color: #fbbf24; font-weight: 600;">🪫 Bare Minimum Mode Active</p>
                <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 4px;">
                  All hard deadlines are clear! Rest and gentle self-maintenance are your only priorities today.
                </p>
              </div>
            ` : ''}

            <!-- Completed Today Section -->
            ${completedToday.length > 0 ? `
              <div class="task-section">
                <div class="task-section-header">
                  <div class="section-title-wrap">
                    <span style="color: var(--color-success)">✨</span>
                    <span class="section-title">Done Today (Progress Showcase)</span>
                  </div>
                  <span class="section-count">${completedToday.length}</span>
                </div>
                ${completedToday.map(t => this.renderTaskCard(t)).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Right Column: Side Widgets -->
          <div class="side-widgets-column">
            <!-- Daily Routines Widget -->
            <div class="widget-card">
              <div class="widget-header">
                <span class="widget-title">☀️ Daily Routines</span>
              </div>
              ${state.routines.map(r => this.renderRoutineWidget(r)).join('')}
            </div>

            <!-- RPG Level & XP Summary -->
            ${state.settings.xpEnabled ? `
              <div class="widget-card">
                <div class="widget-header">
                  <span class="widget-title">🎮 Level & Progression</span>
                  <button class="btn-secondary" style="padding: 2px 8px; font-size: 0.72rem;" onclick="app.switchView('skills')">
                    Skill Tree →
                  </button>
                </div>
                ${this.renderXpSummaryWidget()}
              </div>
            ` : ''}

            <!-- Quick Impulse / Idea Vault Widget -->
            <div class="widget-card">
              <div class="widget-header">
                <span class="widget-title">💡 Impulse & Idea Vault</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${state.newIdeas.length} held</span>
              </div>
              <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">
                Got a random shiny impulse? Drop it here to clear working memory without turning it into a burdensome commitment.
              </p>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="quick-idea-input" class="form-input" style="flex:1; padding: 6px 10px; font-size: 0.82rem;" placeholder="e.g. Build a terrarium..." onkeydown="if(event.key==='Enter') app.quickAddIdea()">
                <button class="btn-primary" style="padding: 6px 12px; font-size: 0.82rem;" onclick="app.quickAddIdea()">Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==================== TASK CARD RENDERER ====================

  renderTaskCard(task) {
    const dl = this.engine.getDeadlineState(task);
    const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
    const completedSubtasks = hasSubtasks ? task.subtasks.filter(s => s.completed).length : 0;

    let cardClasses = ['task-card'];
    if (task.completed) cardClasses.push('is-completed');
    if (dl.status === 'urgent' || dl.status === 'due_now') cardClasses.push('is-urgent');
    if (dl.isOverdue) cardClasses.push('is-overdue');

    return `
      <div class="${cardClasses.join(' ')}" id="task-card-${task.id}">
        <div class="task-card-main-row">
          <button class="task-checkbox-btn" onclick="app.toggleTaskComplete('${task.id}')" aria-label="Toggle Complete" title="Mark Complete">
            ✓
          </button>
          <div class="task-content-area">
            <div class="task-header-line">
              ${this.renderTaskIcon(task)}
              <span class="task-card-title">${this.escapeHtml(task.title)}</span>
            </div>

            ${task.description ? `<p class="task-card-desc">${this.escapeHtml(task.description)}</p>` : ''}

            <!-- Badges Row -->
            <div class="task-card-badges-row">
              ${dl.status !== 'none' ? `
                <span class="badge ${dl.badgeClass}">
                  ${dl.isOverdue ? '⚠️' : '⏱️'} ${dl.label}
                </span>
              ` : ''}

              <span class="badge badge-category">📁 ${task.category}</span>
              <span class="badge" style="background: var(--bg-secondary); color: var(--text-muted);">
                ⌛ ~${task.estimatedMinutes || 10}m
              </span>
              <span class="badge badge-xp">+${task.xp || 20} XP</span>

              ${task.recurrence && task.recurrence.enabled ? `
                <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #a78bfa;">
                  🔄 Recurring
                </span>
              ` : ''}

              ${task.avoidedCount > 0 ? `
                <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24;">
                  ✨ +${Math.min(task.avoidedCount * 10, 30)} Comeback XP
                </span>
              ` : ''}
            </div>

            <!-- Subtask progress if any -->
            ${hasSubtasks ? `
              <div class="subtasks-preview-box" style="margin-top: 8px;">
                <div style="font-size: 0.76rem; font-weight: 600; color: var(--text-muted);">
                  Subtasks: ${completedSubtasks}/${task.subtasks.length}
                </div>
                ${task.subtasks.slice(0, 3).map(st => `
                  <div class="subtask-item-row ${st.completed ? 'is-done' : ''}">
                    <div class="subtask-check">${st.completed ? '✓' : ''}</div>
                    <span>${this.escapeHtml(st.title)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Micro Action Bar -->
            ${!task.completed ? `
              <div class="task-card-actions">
                <button class="task-action-btn btn-start" onclick="app.startFocusMode('${task.id}')">
                  <span>🚀</span> <span>Start</span>
                </button>
                <button class="task-action-btn btn-stuck" onclick="app.openUnstickModal('${task.id}')">
                  <span>🪄</span> <span>I'm Stuck</span>
                </button>
                <button class="task-action-btn" onclick="app.openRescheduleModal('${task.id}')">
                  <span>📅</span> <span>Reschedule</span>
                </button>
                <button class="task-action-btn" onclick="app.openTaskEditor('${task.id}')">
                  <span>✏️</span> <span>Edit</span>
                </button>
              </div>
            ` : `
              <div class="task-card-actions">
                <button class="task-action-btn" onclick="app.openTaskEditor('${task.id}')">
                  <span>✏️</span> <span>Details</span>
                </button>
                <button class="task-action-btn" onclick="app.deleteTask('${task.id}')">
                  <span>🗑️</span> <span>Delete</span>
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // ==================== ALL TASKS VIEW ====================

  renderTasksView() {
    const state = this.store.getState();
    const tasks = state.tasks;
    const currentFilter = app.activeTasksFilter || 'all';

    let filtered = tasks.filter(t => {
      if (currentFilter === 'someday') return t.isSomeday;
      if (currentFilter === 'inbox') return t.isInbox;
      if (currentFilter === 'completed') return t.completed;
      if (t.isSomeday || t.isInbox) return false;
      if (currentFilter === 'active') return !t.completed;
      if (currentFilter === 'hard_deadlines') return !t.completed && t.deadlineType === 'hard';
      if (currentFilter === 'low_energy') return !t.completed && t.energyLevel === 'low';
      return !t.completed;
    });

    return `
      <div class="view-content">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px;">
          <div>
            <h1 style="font-size: 1.4rem; font-weight: 700;">📋 Task Library & Vault</h1>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Organized, calm, and searchable.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary" onclick="app.openTimeFitModal()">
              <span>⏱️</span> <span>Time-Fit Filter</span>
            </button>
            <button class="btn-primary" onclick="app.openTaskEditor()">
              <span>+</span> <span>New Task</span>
            </button>
          </div>
        </div>

        <!-- Filter Pill Bar -->
        <div style="display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0;">
          <button class="oracle-mode-btn ${currentFilter === 'active' || currentFilter === 'all' ? 'active' : ''}" onclick="app.setTasksFilter('active')">
            Active Tasks (${tasks.filter(t => !t.completed && !t.isSomeday).length})
          </button>
          <button class="oracle-mode-btn ${currentFilter === 'hard_deadlines' ? 'active' : ''}" onclick="app.setTasksFilter('hard_deadlines')">
            🔥 Hard Deadlines
          </button>
          <button class="oracle-mode-btn ${currentFilter === 'low_energy' ? 'active' : ''}" onclick="app.setTasksFilter('low_energy')">
            🪫 Low Energy Friendly
          </button>
          <button class="oracle-mode-btn ${currentFilter === 'someday' ? 'active' : ''}" onclick="app.setTasksFilter('someday')">
            🛋️ Someday / Maybe (${tasks.filter(t => t.isSomeday).length})
          </button>
          <button class="oracle-mode-btn ${currentFilter === 'completed' ? 'active' : ''}" onclick="app.setTasksFilter('completed')">
            ✓ Completed Archive
          </button>
        </div>

        <!-- Tasks List -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${filtered.length > 0 ? (
            filtered.map(t => this.renderTaskCard(t)).join('')
          ) : `
            <div style="text-align: center; padding: 40px; background: var(--bg-primary); border-radius: var(--radius-xl); border: 1px solid var(--border-subtle);">
              <p style="font-size: 1.2rem; margin-bottom: 6px;">✨ Clear Horizon</p>
              <p style="font-size: 0.88rem; color: var(--text-muted);">No tasks in this view right now. Take a deep breath!</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ==================== CALENDAR / 7-DAY PLANNER VIEW ====================

  renderCalendarView() {
    const state = this.store.getState();
    const tasks = state.tasks.filter(t => !t.completed && !t.isSomeday);
    const today = new Date();

    // Generate next 7 days
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayTasks = tasks.filter(t => t.deadlineDate === dateStr || t.softTargetDate === dateStr);
      days.push({ dateStr, dayName, dayNum: d.getDate(), tasks: dayTasks, isToday: i === 0 });
    }

    return `
      <div class="view-content">
        <div>
          <h1 style="font-size: 1.4rem; font-weight: 700;">📅 7-Day Gentle Visual Planner</h1>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Visual density indicator helps prevent overload without harsh deadlines.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
          ${days.map(d => `
            <div style="background: var(--bg-primary); border: 1px solid ${d.isToday ? 'var(--accent-color)' : 'var(--border-subtle)'}; border-radius: var(--radius-lg); padding: 14px; display: flex; flex-direction: column; gap: 10px; min-height: 220px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">
                <span style="font-weight: 700; color: ${d.isToday ? 'var(--accent-color)' : 'var(--text-primary)'}">${d.dayName} ${d.dayNum}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">${d.tasks.length} items</span>
              </div>

              ${d.tasks.length > 5 ? `
                <div style="font-size: 0.72rem; color: #fbbf24; background: rgba(245, 158, 11, 0.15); padding: 3px 6px; border-radius: 4px;">
                  ⚠️ Full load (${d.tasks.length})
                </div>
              ` : ''}

              <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
                ${d.tasks.map(t => `
                  <div style="font-size: 0.78rem; padding: 6px 8px; background: var(--bg-secondary); border-radius: var(--radius-sm); border-left: 3px solid ${t.deadlineType === 'hard' ? '#f43f5e' : 'var(--accent-color)'}; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="app.openTaskEditor('${t.id}')">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(t.title)}</span>
                    <span style="font-size: 0.68rem; color: var(--text-muted);">~${t.estimatedMinutes}m</span>
                  </div>
                `).join('')}

                ${d.tasks.length === 0 ? `
                  <div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; margin-top: auto; margin-bottom: auto;">
                    Open space 🌿
                  </div>
                ` : ''}
              </div>

              <button class="btn-secondary" style="width: 100%; font-size: 0.72rem; padding: 4px; justify-content: center;" onclick="app.openTaskEditor(null, '${d.dateStr}')">
                + Schedule
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ==================== PROJECTS & ROUTINES VIEW ====================

  renderProjectsView() {
    const state = this.store.getState();
    const projects = state.projects;
    const tasks = state.tasks;

    return `
      <div class="view-content">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 style="font-size: 1.4rem; font-weight: 700;">📁 Projects & Habit Routines</h1>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Multi-step goals without high-pressure commitment.</p>
          </div>
          <button class="btn-primary" onclick="app.openProjectEditor()">
            <span>+</span> <span>New Project</span>
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
          ${projects.map(p => {
            const pTasks = tasks.filter(t => t.projectId === p.id);
            const pDone = pTasks.filter(t => t.completed).length;
            const pct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;

            return `
              <div class="widget-card" style="border-top: 4px solid ${p.color || 'var(--accent-color)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <h3 style="font-size: 1.1rem; font-weight: 700;">${p.icon || '📁'} ${this.escapeHtml(p.title)}</h3>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">${this.escapeHtml(p.description)}</p>
                  </div>
                  <span class="badge badge-category">${p.category}</span>
                </div>

                <div class="xp-progress-bar-container">
                  <div class="xp-progress-labels">
                    <span>Progress: ${pDone}/${pTasks.length} tasks</span>
                    <span>${pct}%</span>
                  </div>
                  <div class="xp-progress-track">
                    <div class="xp-progress-fill" style="width: ${pct}%;"></div>
                  </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${pTasks.slice(0, 3).map(t => `
                    <div style="font-size: 0.82rem; display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: var(--bg-secondary); border-radius: var(--radius-sm);">
                      <span style="${t.completed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${this.escapeHtml(t.title)}</span>
                      <span style="font-size: 0.72rem; color: var(--text-muted);">+${t.xp} XP</span>
                    </div>
                  `).join('')}
                </div>

                <button class="btn-secondary" style="width: 100%; justify-content: center; font-size: 0.82rem;" onclick="app.openTaskEditor(null, null, '${p.id}')">
                  + Add task to this project
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ==================== DEDICATED JOURNAL VIEW ====================

  renderJournalView() {
    const state = this.store.getState();
    const journal = state.journal;
    const insights = this.engine.generatePatternInsights();

    const prompts = [
      "What would make today feel worthwhile, even if small?",
      "What feels like too much right now?",
      "What made starting easier today?",
      "What went better than expected?"
    ];

    return `
      <div class="view-content">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 style="font-size: 1.4rem; font-weight: 700;">📓 AuDHD Journal & Pattern Insights</h1>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Low-pressure reflection, mood check-ins & non-judgmental pattern discovery.</p>
          </div>
          <button class="btn-primary" onclick="app.openJournalEditor()">
            <span>+</span> <span>New Reflection</span>
          </button>
        </div>

        <!-- Pattern Observations Stream -->
        <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 18px;">
          <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            <span>🔍</span> <span>Observed Habits & Patterns</span>
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px;">
            ${insights.map(ins => `
              <div style="padding: 10px 14px; background: var(--bg-secondary); border-radius: var(--radius-md); font-size: 0.84rem; display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 1.1rem;">${ins.icon}</span>
                <span style="color: var(--text-secondary); line-height: 1.4;">${ins.text}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Guided Prompt Chips -->
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <span style="font-size: 0.8rem; color: var(--text-muted); align-self: center;">Optional Prompts:</span>
          ${prompts.map(p => `
            <button class="oracle-mode-btn" onclick="app.openJournalEditor('${p.replace(/'/g, "\\'")}')">
              💭 "${p}"
            </button>
          `).join('')}
        </div>

        <!-- Journal Entries Stream -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${journal.length > 0 ? (
            journal.map(j => `
              <div class="task-card" style="border-left: 4px solid var(--accent-color);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <span style="font-size: 0.78rem; color: var(--text-muted);">${j.date} at ${j.time || '12:00'}</span>
                    <h3 style="font-size: 1.1rem; font-weight: 700; margin-top: 2px;">${this.escapeHtml(j.title)}</h3>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="badge" style="background: var(--bg-secondary);">Mood: ${this.getMoodEmoji(j.mood)}</span>
                    <span class="badge" style="background: var(--bg-secondary);">🔋 ${j.energy}/5</span>
                  </div>
                </div>

                ${j.prompt ? `
                  <div style="font-size: 0.82rem; color: var(--text-accent); background: var(--accent-light); padding: 6px 12px; border-radius: var(--radius-sm);">
                    Prompt: <em>"${this.escapeHtml(j.prompt)}"</em>
                  </div>
                ` : ''}

                <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap;">${this.escapeHtml(j.content)}</p>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                  <div style="display: flex; gap: 6px;">
                    ${(j.tags || []).map(tg => `<span class="badge badge-category">#${tg}</span>`).join('')}
                  </div>
                  <button class="task-action-btn" onclick="app.deleteJournalEntry('${j.id}')">
                    <span>🗑️</span> <span>Delete</span>
                  </button>
                </div>
              </div>
            `).join('')
          ) : `
            <div style="text-align: center; padding: 40px; background: var(--bg-primary); border-radius: var(--radius-xl);">
              <p style="font-size: 1.1rem; color: var(--text-muted);">Your thoughts have a blank, welcoming page waiting.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ==================== RPG SKILL TREE & PROGRESSION VIEW ====================

  renderSkillsView() {
    const state = this.store.getState();
    const profile = state.userProfile;
    const xpProgress = this.store.getLevelProgress(profile.xp);
    const unlockedAchievements = new Set(profile.unlockedAchievements || []);

    return `
      <div class="view-content">
        <div>
          <h1 style="font-size: 1.4rem; font-weight: 700;">🎮 RPG Character Sheet & Life Skills</h1>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Playful progress tracker. Life is an adventure, not an exam.</p>
        </div>

        <!-- Level Card Hero -->
        <div class="hero-oracle-card" style="display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div class="user-avatar" style="width: 52px; height: 52px; font-size: 1.75rem;">
                ${this.getCompanionIcon(profile.equippedCompanion)}
              </div>
              <div>
                <h2 style="font-size: 1.3rem; font-weight: 800;">${this.escapeHtml(profile.name)} — Level ${xpProgress.level}</h2>
                <span style="font-size: 0.82rem; color: var(--text-accent);">Total XP: ${profile.xp.toLocaleString()} • Active Streaks: ${profile.streakCount} days</span>
              </div>
            </div>
          </div>

          <div class="xp-progress-bar-container">
            <div class="xp-progress-labels">
              <span>Level ${xpProgress.level} Progress</span>
              <span>${xpProgress.currentProgress} / ${xpProgress.neededForNext} XP to Level ${xpProgress.level + 1} (${xpProgress.percentage}%)</span>
            </div>
            <div class="xp-progress-track" style="height: 12px;">
              <div class="xp-progress-fill" style="width: ${xpProgress.percentage}%;"></div>
            </div>
          </div>
        </div>

        <!-- Life Skill Categories Progress -->
        <div class="widget-card">
          <h3 style="font-size: 1.05rem; font-weight: 700;">🌟 10 Life Skill Progression</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
            ${DEFAULT_SKILLS.map(sk => {
              const skillTotalXp = (profile.skillXp && profile.skillXp[sk.id]) || 0;
              const skLevel = Math.floor(skillTotalXp / 100) + 1;
              const skPct = (skillTotalXp % 100);

              return `
                <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.9rem; font-weight: 600;">${sk.icon} ${sk.name}</span>
                    <span class="badge badge-xp">Lvl ${skLevel}</span>
                  </div>
                  <div class="xp-progress-track" style="height: 6px;">
                    <div class="xp-progress-fill" style="width: ${skPct}%; background: ${sk.color};"></div>
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-align: right;">${skillTotalXp} XP</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Achievements Showcase -->
        <div class="widget-card">
          <h3 style="font-size: 1.05rem; font-weight: 700;">🏆 Milestones & Achievements</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
            ${ACHIEVEMENTS_LIST.map(ach => {
              const isUnlocked = unlockedAchievements.has(ach.id);
              return `
                <div style="background: var(--bg-secondary); border: 1px solid ${isUnlocked ? 'var(--accent-color)' : 'var(--border-subtle)'}; border-radius: var(--radius-md); padding: 12px; display: flex; align-items: center; gap: 12px; opacity: ${isUnlocked ? '1' : '0.5'};">
                  <span style="font-size: 1.75rem;">${ach.icon}</span>
                  <div style="flex: 1;">
                    <div style="font-size: 0.9rem; font-weight: 700; color: ${isUnlocked ? 'var(--text-primary)' : 'var(--text-muted)'};">${ach.title}</div>
                    <div style="font-size: 0.76rem; color: var(--text-muted);">${ach.desc}</div>
                  </div>
                  <span class="badge badge-xp">+${ach.xp} XP</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ==================== INBOX & BRAIN DUMP VIEW ====================

  renderInboxView() {
    const state = this.store.getState();
    const brainDump = state.brainDump || [];
    const ideas = state.newIdeas || [];

    return `
      <div class="view-content">
        <div>
          <h1 style="font-size: 1.4rem; font-weight: 700;">🧠 External Working Memory & Brain Dump</h1>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Quick-dump everything in your head right now. Zero organizing required upfront.</p>
        </div>

        <!-- Multiline Brain Dump Box -->
        <div class="widget-card">
          <h3 style="font-size: 0.95rem; font-weight: 700;">⚡ Rapid Fire Brain Dump</h3>
          <p style="font-size: 0.82rem; color: var(--text-muted);">Paste or type your thoughts (one per line). Hit Save to offload them into inbox cards.</p>
          <textarea id="brain-dump-full-text" class="form-textarea" rows="4" placeholder="• Remember to buy batteries&#10;• Need to check train tickets&#10;• What if I wrote a sci-fi short story?"></textarea>
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn-primary" onclick="app.submitFullBrainDump()">
              <span>📥</span> <span>Offload to Inbox</span>
            </button>
          </div>
        </div>

        <!-- Triage Queue -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <!-- Dumped items queue -->
          <div class="widget-card">
            <h3 style="font-size: 0.95rem; font-weight: 700;">📥 Inbox Queue (${brainDump.length})</h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${brainDump.map(b => `
                <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
                  <span style="font-size: 0.88rem;">${this.escapeHtml(b.text)}</span>
                  <div style="display: flex; gap: 6px; margin-top: 4px;">
                    <button class="task-action-btn" onclick="app.convertBrainDumpToTask('${b.id}')">
                      <span>✓</span> <span>Make Task</span>
                    </button>
                    <button class="task-action-btn" onclick="app.convertBrainDumpToIdea('${b.id}')">
                      <span>💡</span> <span>Move to Idea</span>
                    </button>
                    <button class="task-action-btn" onclick="app.deleteBrainDump('${b.id}')">
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
              `).join('')}
              ${brainDump.length === 0 ? `<p style="font-size: 0.82rem; color: var(--text-muted);">Inbox is empty!</p>` : ''}
            </div>
          </div>

          <!-- Held Impulses / Shiny Ideas -->
          <div class="widget-card">
            <h3 style="font-size: 0.95rem; font-weight: 700;">💡 Shiny Ideas (No Pressure) (${ideas.length})</h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${ideas.map(i => `
                <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
                  <span style="font-size: 0.88rem; font-weight: 600;">${this.escapeHtml(i.title)}</span>
                  ${i.notes ? `<span style="font-size: 0.78rem; color: var(--text-muted);">${this.escapeHtml(i.notes)}</span>` : ''}
                  <div style="display: flex; gap: 6px; margin-top: 4px;">
                    <button class="task-action-btn" onclick="app.convertIdeaToProject('${i.id}')">
                      <span>📁</span> <span>Turn into Project</span>
                    </button>
                    <button class="task-action-btn" onclick="app.deleteIdea('${i.id}')">
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
              `).join('')}
              ${ideas.length === 0 ? `<p style="font-size: 0.82rem; color: var(--text-muted);">No held ideas yet.</p>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==================== SETTINGS VIEW ====================

  renderSettingsView() {
    const state = this.store.getState();
    const settings = state.settings;
    const profile = state.userProfile;

    return `
      <div class="view-content">
        <div>
          <h1 style="font-size: 1.4rem; font-weight: 700;">⚙️ Personal Customization & Sensory Controls</h1>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Tailor the application to your exact cognitive and sensory needs.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          <!-- Sensory & Theme Settings -->
          <div class="widget-card">
            <h3 style="font-size: 1.05rem; font-weight: 700;">🎨 Sensory Modes & Theme</h3>
            
            <div class="form-group">
              <label class="form-label">Visual & Sensory Mode</label>
              <select class="form-select" onchange="app.updateSensoryMode(this.value)">
                <option value="calm" ${settings.sensoryMode === 'calm' ? 'selected' : ''}>🌿 Calm Cozy (Muted, warm, soothing)</option>
                <option value="playful" ${settings.sensoryMode === 'playful' ? 'selected' : ''}>🎮 Playful RPG (Vibrant, HUD, game tones)</option>
                <option value="focus" ${settings.sensoryMode === 'focus' ? 'selected' : ''}>🎯 Deep Focus (High contrast, monochrome)</option>
                <option value="night" ${settings.sensoryMode === 'night' ? 'selected' : ''}>🌙 Night Owl (OLED dark, low glare)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Animation Intensity</label>
              <select class="form-select" onchange="app.updateAnimationIntensity(this.value)">
                <option value="none" ${settings.animationIntensity === 'none' ? 'selected' : ''}>None (Zero motion / instant)</option>
                <option value="minimal" ${settings.animationIntensity === 'minimal' ? 'selected' : ''}>Minimal (Subtle fades only)</option>
                <option value="normal" ${settings.animationIntensity === 'normal' ? 'selected' : ''}>Normal (Smooth cubic bezier)</option>
                <option value="high" ${settings.animationIntensity === 'high' ? 'selected' : ''}>High (Bouncy playful physics)</option>
              </select>
            </div>
          </div>

          <!-- Sound FX Settings -->
          <div class="widget-card">
            <h3 style="font-size: 1.05rem; font-weight: 700;">🔊 Sound FX (Web Audio API)</h3>

            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span class="form-label">Sound Effects Enabled</span>
              <input type="checkbox" ${settings.soundEnabled ? 'checked' : ''} onchange="app.updateSoundToggle(this.checked)">
            </div>

            <div class="form-group">
              <label class="form-label">Volume: <span id="sound-vol-label">${settings.soundVolume || 50}%</span></label>
              <input type="range" min="0" max="100" value="${settings.soundVolume || 50}" style="width: 100%;" oninput="app.updateSoundVolume(this.value)">
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <button class="btn-secondary" style="font-size: 0.76rem;" onclick="soundSynth.play('complete')">▶ Test Complete</button>
              <button class="btn-secondary" style="font-size: 0.76rem;" onclick="soundSynth.play('xp')">▶ Test XP</button>
              <button class="btn-secondary" style="font-size: 0.76rem;" onclick="soundSynth.play('levelup')">▶ Test Fanfare</button>
              <button class="btn-secondary" style="font-size: 0.76rem;" onclick="soundSynth.play('timer')">▶ Test Timer</button>
            </div>
          </div>

          <!-- Gamification Settings -->
          <div class="widget-card">
            <h3 style="font-size: 1.05rem; font-weight: 700;">🎮 Gamification Toggles</h3>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.88rem;">
                <span>XP & Level System</span>
                <input type="checkbox" ${settings.xpEnabled ? 'checked' : ''} onchange="app.updateSetting('xpEnabled', this.checked)">
              </label>
              <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.88rem;">
                <span>Flexible Streak Tracking</span>
                <input type="checkbox" ${settings.streaksEnabled ? 'checked' : ''} onchange="app.updateSetting('streaksEnabled', this.checked)">
              </label>
              <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.88rem;">
                <span>Virtual Companion Buddy</span>
                <input type="checkbox" ${settings.companionEnabled ? 'checked' : ''} onchange="app.updateSetting('companionEnabled', this.checked)">
              </label>
              <div class="form-group">
                <label class="form-label">Companion Avatar</label>
                <select class="form-select" onchange="app.updateProfile('equippedCompanion', this.value)">
                  <option value="luna" ${profile.equippedCompanion === 'luna' ? 'selected' : ''}>🐱 Luna (Cozy Cat)</option>
                  <option value="spark" ${profile.equippedCompanion === 'spark' ? 'selected' : ''}>🤖 Spark (Encouraging Bot)</option>
                  <option value="sage" ${profile.equippedCompanion === 'sage' ? 'selected' : ''}>🦉 Sage (Calm Owl)</option>
                  <option value="pip" ${profile.equippedCompanion === 'pip' ? 'selected' : ''}>🌱 Pip (Gentle Sprout)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Data Backup, Export & Reset -->
          <div class="widget-card">
            <h3 style="font-size: 1.05rem; font-weight: 700;">💾 Data Backup & Import</h3>
            <p style="font-size: 0.82rem; color: var(--text-muted);">
              All your tasks, routines, and reflections are securely saved locally on this browser.
            </p>

            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              <button class="btn-secondary" onclick="app.downloadBackupJson()">
                <span>📥</span> <span>Export JSON Backup</span>
              </button>
              <button class="btn-secondary" onclick="app.downloadTasksCsv()">
                <span>📊</span> <span>Export Tasks CSV</span>
              </button>
              <button class="btn-secondary" onclick="document.getElementById('import-file-input').click()">
                <span>📤</span> <span>Import JSON Backup</span>
              </button>
              <input type="file" id="import-file-input" style="display: none;" accept=".json" onchange="app.handleImportFile(event)">
            </div>

            <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px; margin-top: 6px;">
              <button class="btn-secondary" style="color: #f43f5e; border-color: rgba(244, 63, 94, 0.3);" onclick="app.resetDemoData()">
                🔄 Reset to Initial Sample Data
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==================== HELPER WIDGETS ====================

  renderRoutineWidget(routine) {
    const activeItems = this.store.getRoutineActiveItems(routine);

    return `
      <div style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.88rem; font-weight: 700;">${routine.icon} ${this.escapeHtml(routine.title)}</span>
          <div class="routine-tier-pills">
            <button class="tier-pill ${routine.activeTier === 'minimum' ? 'active' : ''}" onclick="app.setRoutineTier('${routine.id}', 'minimum')">Min</button>
            <button class="tier-pill ${routine.activeTier === 'short' ? 'active' : ''}" onclick="app.setRoutineTier('${routine.id}', 'short')">Short</button>
            <button class="tier-pill ${routine.activeTier === 'full' ? 'active' : ''}" onclick="app.setRoutineTier('${routine.id}', 'full')">Full</button>
          </div>
        </div>

        <div class="routine-items-list">
          ${activeItems.map(item => `
            <div class="routine-item-row ${item.completedToday ? 'is-done' : ''}" onclick="app.toggleRoutineItem('${routine.id}', '${item.id}')">
              <span style="display: flex; align-items: center; gap: 6px;">
                <span>${item.completedToday ? '✓' : '○'}</span>
                <span>${this.escapeHtml(item.title)}</span>
              </span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">${item.estimatedMinutes}m</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderXpSummaryWidget() {
    const state = this.store.getState();
    const profile = state.userProfile;
    const progress = this.store.getLevelProgress(profile.xp);

    return `
      <div class="xp-progress-bar-container">
        <div class="xp-progress-labels">
          <span>Level ${progress.level} (${progress.percentage}%)</span>
          <span>${progress.currentProgress} / ${progress.neededForNext} XP</span>
        </div>
        <div class="xp-progress-track">
          <div class="xp-progress-fill" style="width: ${progress.percentage}%;"></div>
        </div>
        <div style="font-size: 0.76rem; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 2px;">
          <span>🔥 ${profile.streakCount} days active</span>
          <span>Total: ${profile.xp} XP</span>
        </div>
      </div>
    `;
  }

  getCompanionIcon(id) {
    const map = { luna: '🐱', spark: '🤖', sage: '🦉', pip: '🌱' };
    return map[id] || '🐱';
  }

  getMoodEmoji(mood) {
    const map = {
      calm: '😌 Calm',
      happy: '😊 Happy',
      tired: '😴 Low Energy',
      overwhelmed: '🌊 Overwhelmed',
      foggy: '🌫️ Foggy',
      focused: '🎯 Focused',
      proud: '🌟 Proud'
    };
    return map[mood] || '😌 Calm';
  }
}

window.UIComponents = UIComponents;
