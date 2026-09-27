/**
 * AuDHD Life Dashboard - Central Data Store
 * Reactive state management, reliable LocalStorage persistence,
 * undo management, and realistic sample data.
 */

const STORAGE_KEY = 'audhd_dashboard_state_v1';

// Default skills
const DEFAULT_SKILLS = [
  { id: 'Focus', name: 'Focus & Deep Work', icon: '🧠', color: '#818cf8' },
  { id: 'Maintenance', name: 'Maintenance & Reset', icon: '🧹', color: '#38bdf8' },
  { id: 'Health', name: 'Health & Body', icon: '💪', color: '#4ade80' },
  { id: 'Learning', name: 'Learning & Curiosity', icon: '📚', color: '#fbbf24' },
  { id: 'Work', name: 'Work & Career', icon: '💼', color: '#a78bfa' },
  { id: 'Home', name: 'Home & Sanctuary', icon: '🏠', color: '#f472b6' },
  { id: 'Creativity', name: 'Creativity & Play', icon: '🎨', color: '#fb7185' },
  { id: 'Life Admin', name: 'Life Admin & Finance', icon: '💰', color: '#34d399' },
  { id: 'Relationships', name: 'Friends & Family', icon: '❤️', color: '#f87171' },
  { id: 'Personal Growth', name: 'Personal Growth', icon: '🌱', color: '#2dd4bf' },
];

// Pre-defined achievements
const ACHIEVEMENTS_LIST = [
  { id: 'first_step', title: 'First Step', desc: 'Complete your first task in the system.', icon: '🌱', xp: 50 },
  { id: 'momentum', title: 'Momentum', desc: 'Complete 3 tasks in a single day.', icon: '⚡', xp: 75 },
  { id: 'tiny_wins', title: 'Tiny Wins Master', desc: 'Complete 5 tasks that take 5 minutes or less.', icon: '✨', xp: 100 },
  { id: 'comeback_hero', title: 'Comeback Hero', desc: 'Return and gently re-orient without shame.', icon: '🌅', xp: 150 },
  { id: 'chaos_tamer', title: 'Chaos Tamer', desc: 'Reschedule or adjust an overdue task instead of feeling guilty.', icon: '🛡️', xp: 80 },
  { id: 'deep_diver', title: 'Deep Diver', desc: 'Complete a focused session of 25+ minutes.', icon: '🌊', xp: 120 },
  { id: 'routine_builder', title: 'Gentle Routine', desc: 'Complete an essential routine 3 times.', icon: '🔄', xp: 100 },
  { id: 'stuck_breaker', title: 'Gentle Unstick', desc: 'Use the "I\'m Stuck" button to unstick a task and finish it.', icon: '🪄', xp: 90 },
  { id: 'brain_dumper', title: 'Mind Liberator', desc: 'Offload thoughts with the Brain Dump tool.', icon: '🧠', xp: 60 },
  { id: 'someday_sanctuary', title: 'Impulse Protector', desc: 'Save a shiny new idea into the Idea Vault without pressure.', icon: '💡', xp: 50 },
  { id: 'journal_reflector', title: 'Inner Mirror', desc: 'Write a calm journal entry with mood/energy check-in.', icon: '📓', xp: 75 },
  { id: 'bare_minimum_honored', title: 'Honoring Capacity', desc: 'Use Bare Minimum Mode on a low-energy day.', icon: '🪫', xp: 80 },
];

class AppStore {
  constructor() {
    this.subscribers = new Set();
    this.undoStack = [];
    this.state = this.loadInitialState();
  }

  // Generate unique IDs
  generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadInitialState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Ensure required fields exist in case of version upgrades
        return this.migrateState(parsed);
      } catch (e) {
        console.error('Failed to parse saved state, using demo data', e);
      }
    }
    return this.createDemoState();
  }

  migrateState(state) {
    const base = this.createDefaultStateStructure();
    // Deep merge top-level arrays and objects
    return {
      ...base,
      ...state,
      userProfile: { ...base.userProfile, ...(state.userProfile || {}) },
      settings: { ...base.settings, ...(state.settings || {}) },
      tasks: state.tasks || [],
      projects: state.projects || [],
      routines: state.routines || base.routines,
      journal: state.journal || [],
      brainDump: state.brainDump || [],
      newIdeas: state.newIdeas || [],
      xpHistory: state.xpHistory || []
    };
  }

  createDefaultStateStructure() {
    const today = this.getTodayString();
    return {
      tasks: [],
      projects: [],
      routines: this.createDefaultRoutines(),
      journal: [],
      brainDump: [],
      newIdeas: [],
      xpHistory: [],
      userProfile: {
        name: 'Alex',
        level: 3,
        xp: 380,
        skillXp: {
          'Focus': 120,
          'Maintenance': 80,
          'Health': 60,
          'Home': 50,
          'Creativity': 70
        },
        currentCapacity: 'normal', // 'low', 'limited', 'normal', 'high', 'hyperfocus'
        bareMinimumMode: false,
        streakCount: 4,
        lastActiveDate: today,
        streakPaused: false,
        cosmeticsUnlocked: ['hat_cozy_beanie', 'room_plants', 'badge_early_bird'],
        equippedCompanion: 'luna', // 'luna' (cat), 'spark' (bot), 'sage' (owl), 'pip' (plant)
        companionPersonality: 'cozy',
        companionEnabled: true,
        unlockedAchievements: ['first_step', 'momentum', 'tiny_wins']
      },
      settings: {
        sensoryMode: 'calm', // 'calm', 'playful', 'focus', 'night', 'custom'
        accentColor: '#38bdf8',
        customBg: 'cozy-dots',
        animationIntensity: 'normal', // 'none', 'minimal', 'normal', 'high'
        soundEnabled: true,
        soundVolume: 50,
        soundPack: 'cozy',
        soundPerAction: { complete: true, xp: true, levelup: true, timer: true, click: false },
        gamificationEnabled: true,
        xpEnabled: true,
        levelsEnabled: true,
        streaksEnabled: true,
        flexibleStreaksTarget: 4,
        achievementsEnabled: true,
        timeFormat: '24h',
        weekStartDay: 1, // 1 = Mon
        focusListLimit: 3,
        notificationBudget: 'normal',
        hasCompletedOnboarding: true,
        lastSeenVersion: '1.0.0',
        companionReactionFrequency: 'balanced'
      }
    };
  }

  createDefaultRoutines() {
    return [
      {
        id: 'routine_morning',
        title: 'Morning Kickstart',
        timeOfDay: 'morning',
        icon: '☀️',
        color: '#f59e0b',
        activeTier: 'short', // 'full', 'short', 'minimum'
        items: [
          { id: 'm1', title: 'Drink a big glass of water', estimatedMinutes: 1, isCrucial: true, completedToday: false },
          { id: 'm2', title: 'Take morning medication & vitamins', estimatedMinutes: 2, isCrucial: true, completedToday: false },
          { id: 'm3', title: '1-minute gentle stretch or shakeout', estimatedMinutes: 2, isCrucial: false, completedToday: false },
          { id: 'm4', title: 'Check today\'s top 3 things', estimatedMinutes: 3, isCrucial: false, completedToday: false },
          { id: 'm5', title: 'Open blinds / let sunlight in', estimatedMinutes: 1, isCrucial: false, completedToday: false }
        ],
        completedDays: []
      },
      {
        id: 'routine_evening',
        title: 'Evening Reset & Unwind',
        timeOfDay: 'evening',
        icon: '🌙',
        color: '#8b5cf6',
        activeTier: 'minimum',
        items: [
          { id: 'e1', title: 'Plug phone into charger across room', estimatedMinutes: 1, isCrucial: true, completedToday: false },
          { id: 'e2', title: 'Put 3 stray dishes into the sink', estimatedMinutes: 3, isCrucial: false, completedToday: false },
          { id: 'e3', title: 'Quick brain dump of tomorrow\'s thoughts', estimatedMinutes: 3, isCrucial: true, completedToday: false },
          { id: 'e4', title: 'Brush teeth & face wash', estimatedMinutes: 4, isCrucial: true, completedToday: false }
        ],
        completedDays: []
      }
    ];
  }

  createDemoState() {
    const today = this.getTodayString();
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

    const demoTasks = [
      {
        id: 'task_demo_1',
        title: 'Pay electricity & internet bill',
        description: 'Log into bank portal, confirm auto-pay or send confirmation reference.',
        completed: false,
        completedAt: null,
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        updatedAt: new Date().toISOString(),
        icon: '⚡',
        iconType: 'emoji',
        category: 'Life Admin',
        tags: ['bills', 'admin', 'important'],
        priority: 'urgent',
        difficulty: 'easy',
        estimatedMinutes: 5,
        energyLevel: 'low',
        deadlineType: 'hard',
        deadlineDate: today,
        deadlineTime: '17:00',
        softTargetDate: null,
        recurrence: null,
        subtasks: [
          { id: 'st_1', title: 'Open banking app or website', completed: false },
          { id: 'st_2', title: 'Confirm payment amount and tap Pay', completed: false }
        ],
        notes: 'Utility reference ID is saved in password vault.',
        xp: 25,
        projectId: null,
        firstStep: 'Open banking app on phone',
        isSomeday: false,
        isInbox: false,
        avoidedCount: 1,
        recurringSeriesId: null
      },
      {
        id: 'task_demo_2',
        title: 'Clean desk & clear mugs',
        description: 'Gather empty glasses, wipe keyboard dust, put loose pens in container.',
        completed: false,
        completedAt: null,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        updatedAt: new Date().toISOString(),
        icon: '🧹',
        iconType: 'emoji',
        category: 'Home',
        tags: ['quick-win', 'sensory-reset'],
        priority: 'normal',
        difficulty: 'tiny',
        estimatedMinutes: 5,
        energyLevel: 'low',
        deadlineType: 'soft',
        deadlineDate: null,
        deadlineTime: null,
        softTargetDate: today,
        recurrence: {
          enabled: true,
          type: 'interval',
          intervalDays: 2,
          weeklyDays: [],
          monthlyDay: 1,
          monthlyWeekday: null,
          strategy: 'rolling',
          skipNext: false
        },
        subtasks: [
          { id: 'st_3', title: 'Carry dirty cups to kitchen', completed: false },
          { id: 'st_4', title: 'Wipe surface with microfiber cloth', completed: false }
        ],
        notes: 'Having a clear visual field reduces sensory clutter right away.',
        xp: 15,
        projectId: null,
        firstStep: 'Pick up the two mugs right next to your keyboard',
        isSomeday: false,
        isInbox: false,
        avoidedCount: 0,
        recurringSeriesId: 'rec_desk_clean'
      },
      {
        id: 'task_demo_3',
        title: 'Draft outline for quarterly project overview',
        description: 'Just dump bullet points. No polished sentences required on the first pass.',
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        icon: '💼',
        iconType: 'emoji',
        category: 'Work',
        tags: ['deep-work', 'writing'],
        priority: 'high',
        difficulty: 'medium',
        estimatedMinutes: 25,
        energyLevel: 'high',
        deadlineType: 'hard',
        deadlineDate: tomorrow,
        deadlineTime: '14:00',
        softTargetDate: null,
        recurrence: null,
        subtasks: [
          { id: 'st_5', title: 'Open Google Doc template', completed: true },
          { id: 'st_6', title: 'List the 3 main achievements', completed: false },
          { id: 'st_7', title: 'Note 2 blockers and next month roadmap', completed: false }
        ],
        notes: 'Remember: "Bad drafting is better than no drafting." Set a 15-min timer and stop when it rings.',
        xp: 45,
        projectId: 'proj_quarterly_review',
        firstStep: 'Write 3 headlines without formatting',
        isSomeday: false,
        isInbox: false,
        avoidedCount: 0,
        recurringSeriesId: null
      },
      {
        id: 'task_demo_4',
        title: 'Water indoor monstera & pothos plants',
        description: 'Check soil moisture first with finger test.',
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        icon: '🌿',
        iconType: 'emoji',
        category: 'Maintenance',
        tags: ['plants', 'cozy'],
        priority: 'normal',
        difficulty: 'tiny',
        estimatedMinutes: 3,
        energyLevel: 'low',
        deadlineType: 'none',
        deadlineDate: null,
        deadlineTime: null,
        softTargetDate: today,
        recurrence: {
          enabled: true,
          type: 'interval',
          intervalDays: 4,
          weeklyDays: [],
          monthlyDay: 1,
          monthlyWeekday: null,
          strategy: 'rolling',
          skipNext: false
        },
        subtasks: [],
        notes: '',
        xp: 15,
        projectId: null,
        firstStep: 'Fill small watering jug in kitchen',
        isSomeday: false,
        isInbox: false,
        avoidedCount: 0,
        recurringSeriesId: 'rec_water_plants'
      },
      {
        id: 'task_demo_5',
        title: '10-minute restorative walk or fresh air',
        description: 'Step outside with headphones or podcast, no specific destination.',
        completed: true,
        completedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        icon: '👟',
        iconType: 'emoji',
        category: 'Health',
        tags: ['movement', 'mental-health'],
        priority: 'normal',
        difficulty: 'easy',
        estimatedMinutes: 10,
        energyLevel: 'limited',
        deadlineType: 'none',
        deadlineDate: null,
        deadlineTime: null,
        softTargetDate: today,
        recurrence: null,
        subtasks: [],
        notes: 'Felt really refreshing!',
        xp: 20,
        projectId: null,
        firstStep: 'Slip into shoes',
        isSomeday: false,
        isInbox: false,
        avoidedCount: 0,
        recurringSeriesId: null
      },
      {
        id: 'task_demo_6',
        title: 'Research acoustic guitar starter chords',
        description: 'Explore easy open chords (G, C, D, Em) for playing favorite songs.',
        completed: false,
        completedAt: null,
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        updatedAt: new Date().toISOString(),
        icon: '🎸',
        iconType: 'emoji',
        category: 'Creativity',
        tags: ['hobby', 'music', 'someday'],
        priority: 'low',
        difficulty: 'easy',
        estimatedMinutes: 15,
        energyLevel: 'normal',
        deadlineType: 'none',
        deadlineDate: null,
        deadlineTime: null,
        softTargetDate: null,
        recurrence: null,
        subtasks: [],
        notes: 'Just for pure fun, no mastery pressure.',
        xp: 20,
        projectId: 'proj_guitar',
        firstStep: 'Watch one 4-minute YouTube chord tutorial',
        isSomeday: true,
        isInbox: false,
        avoidedCount: 0,
        recurringSeriesId: null
      }
    ];

    const demoProjects = [
      {
        id: 'proj_quarterly_review',
        title: 'Quarterly Team Deliverable',
        description: 'Prepare and organize summary report and key milestones.',
        color: '#6366f1',
        icon: '📊',
        category: 'Work',
        targetDate: tomorrow,
        archived: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'proj_guitar',
        title: 'Learn Acoustic Guitar for Fun',
        description: 'A low-pressure creative exploration of basic songs and rhythm.',
        color: '#ec4899',
        icon: '🎸',
        category: 'Creativity',
        targetDate: null,
        archived: false,
        createdAt: new Date().toISOString()
      }
    ];

    const demoJournal = [
      {
        id: 'jrnl_demo_1',
        date: today,
        time: '09:30',
        title: 'Morning Mental Fog & Adjusting Expectations',
        content: 'Woke up feeling about 35% battery. Struggled to initiate for the first hour. Decided not to force the massive backlog and instead set Bare Minimum focus to paying the internet bill and doing the 10-minute walk. That walk helped clear some sensory overwhelm.',
        mood: 'calm',
        energy: 2,
        tags: ['capacity', 'self-compassion'],
        linkedTaskIds: ['task_demo_1', 'task_demo_5'],
        prompt: 'What feels like too much right now, and what is one gentle thing that would help?',
        createdAt: new Date().toISOString()
      }
    ];

    const demoIdeas = [
      {
        id: 'idea_1',
        title: 'Build a tabletop moss terrarium with LED light',
        notes: 'Saw a cool video about closed biome jars. Might be a peaceful weekend project.',
        category: 'Creativity',
        createdAt: new Date().toISOString(),
        status: 'held'
      },
      {
        id: 'idea_2',
        title: 'Color-code USB cables with pastel tape',
        notes: 'To stop confusing the audio interface cable with the microphone charger.',
        category: 'Home',
        createdAt: new Date().toISOString(),
        status: 'held'
      }
    ];

    const state = this.createDefaultStateStructure();
    state.tasks = demoTasks;
    state.projects = demoProjects;
    state.journal = demoJournal;
    state.newIdeas = demoIdeas;
    return state;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notify();
    } catch (e) {
      console.error('LocalStorage save failed:', e);
    }
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  notify() {
    for (const fn of this.subscribers) {
      try {
        fn(this.state);
      } catch (e) {
        console.error('Error in subscriber:', e);
      }
    }
  }

  getState() {
    return this.state;
  }

  // Record undoable action
  pushUndo(actionDescription, restoreFn) {
    this.undoStack.push({
      desc: actionDescription,
      undo: restoreFn,
      time: Date.now()
    });
    if (this.undoStack.length > 20) {
      this.undoStack.shift();
    }
  }

  popUndo() {
    if (this.undoStack.length === 0) return null;
    const action = this.undoStack.pop();
    action.undo();
    this.save();
    return action.desc;
  }

  // ==================== TASK ACTIONS ====================

  addTask(taskData) {
    const id = taskData.id || this.generateId('task');
    const xpMap = { tiny: 10, easy: 20, medium: 40, hard: 80 };
    const xp = taskData.xp || xpMap[taskData.difficulty || 'easy'] || 20;

    const newTask = {
      id,
      title: taskData.title?.trim() || 'Untitled Task',
      description: taskData.description?.trim() || '',
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      icon: taskData.icon || '📝',
      iconType: taskData.iconType || 'emoji',
      category: taskData.category || 'Life Admin',
      tags: Array.isArray(taskData.tags) ? taskData.tags : [],
      priority: taskData.priority || 'normal', // 'low', 'normal', 'high', 'urgent'
      difficulty: taskData.difficulty || 'easy',
      estimatedMinutes: Number(taskData.estimatedMinutes) || 10,
      energyLevel: taskData.energyLevel || 'normal',
      deadlineType: taskData.deadlineType || 'none', // 'none', 'soft', 'hard'
      deadlineDate: taskData.deadlineDate || null,
      deadlineTime: taskData.deadlineTime || null,
      softTargetDate: taskData.softTargetDate || null,
      recurrence: taskData.recurrence || null,
      subtasks: Array.isArray(taskData.subtasks) ? taskData.subtasks : [],
      notes: taskData.notes || '',
      xp,
      projectId: taskData.projectId || null,
      firstStep: taskData.firstStep || '',
      isSomeday: Boolean(taskData.isSomeday),
      isInbox: Boolean(taskData.isInbox),
      avoidedCount: 0,
      recurringSeriesId: taskData.recurringSeriesId || null
    };

    this.state.tasks.unshift(newTask);
    this.save();
    return newTask;
  }

  updateTask(taskId, patch) {
    const idx = this.state.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;

    const oldTask = { ...this.state.tasks[idx] };
    this.state.tasks[idx] = {
      ...this.state.tasks[idx],
      ...patch,
      updatedAt: new Date().toISOString()
    };

    this.save();
    return this.state.tasks[idx];
  }

  completeTask(taskId, completed = true) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return null;

    const wasCompleted = task.completed;
    task.completed = completed;
    task.completedAt = completed ? new Date().toISOString() : null;
    task.updatedAt = new Date().toISOString();

    let earnedXp = 0;
    if (completed && !wasCompleted) {
      // Base XP
      earnedXp = task.xp || 20;

      // Bonus for tackling an avoided task
      if (task.avoidedCount > 0) {
        earnedXp += Math.min(task.avoidedCount * 10, 30);
      }

      // Bonus for beating a hard deadline
      if (task.deadlineType === 'hard' && task.deadlineDate) {
        const todayStr = this.getTodayString();
        if (task.deadlineDate >= todayStr) {
          earnedXp += 15; // On-time / early bonus
        }
      }

      this.awardXP(earnedXp, `Completed: ${task.title}`, task.category);
      this.checkAchievements();

      // Handle recurrence if configured
      if (task.recurrence && task.recurrence.enabled) {
        this.spawnNextRecurrence(task);
      }
    }

    this.save();
    return { task, earnedXp };
  }

  spawnNextRecurrence(task) {
    const rec = task.recurrence;
    const baseDate = rec.strategy === 'calendar' && task.deadlineDate 
      ? new Date(task.deadlineDate) 
      : new Date();

    let nextDate = new Date(baseDate);

    if (rec.type === 'interval') {
      const days = rec.intervalDays || 1;
      nextDate.setDate(nextDate.getDate() + days);
    } else if (rec.type === 'weekly' && Array.isArray(rec.weeklyDays) && rec.weeklyDays.length > 0) {
      // Find next matching weekday
      let currentDay = nextDate.getDay();
      let daysToAdd = 1;
      while (true) {
        const candidateDay = (currentDay + daysToAdd) % 7;
        if (rec.weeklyDays.includes(candidateDay)) {
          nextDate.setDate(nextDate.getDate() + daysToAdd);
          break;
        }
        daysToAdd++;
        if (daysToAdd > 14) {
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        }
      }
    } else if (rec.type === 'monthly_date') {
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (rec.monthlyDay) {
        nextDate.setDate(Math.min(rec.monthlyDay, 28));
      }
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    const nextDateStr = nextDate.toISOString().split('T')[0];

    // Create next occurrence
    const nextTask = {
      ...task,
      id: this.generateId('task_rec'),
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deadlineDate: task.deadlineType === 'hard' ? nextDateStr : null,
      softTargetDate: task.deadlineType === 'soft' || task.softTargetDate ? nextDateStr : null,
      avoidedCount: 0,
      subtasks: task.subtasks.map(s => ({ ...s, id: this.generateId('st'), completed: false }))
    };

    this.state.tasks.push(nextTask);
  }

  deleteTask(taskId) {
    const idx = this.state.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;

    const [deleted] = this.state.tasks.splice(idx, 1);
    this.pushUndo(`Deleted task "${deleted.title}"`, () => {
      this.state.tasks.splice(idx, 0, deleted);
    });

    this.save();
    return deleted;
  }

  // Postpone / Reschedule task
  rescheduleTask(taskId, newDate, newTime = null) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return null;

    if (task.deadlineType === 'hard') {
      task.deadlineDate = newDate;
      if (newTime !== null) task.deadlineTime = newTime;
    } else {
      task.softTargetDate = newDate;
    }
    task.avoidedCount = (task.avoidedCount || 0) + 1;
    task.updatedAt = new Date().toISOString();

    this.save();
    return task;
  }

  // ==================== XP & RPG PROGRESSION ====================

  awardXP(amount, source = 'Action', category = null) {
    if (!this.state.settings.xpEnabled) return;

    const profile = this.state.userProfile;
    profile.xp += amount;

    // Track skill category XP
    if (category) {
      profile.skillXp = profile.skillXp || {};
      profile.skillXp[category] = (profile.skillXp[category] || 0) + amount;
    }

    // Record event
    this.state.xpHistory.unshift({
      id: this.generateId('xpevt'),
      amount,
      source,
      category,
      timestamp: new Date().toISOString()
    });
    if (this.state.xpHistory.length > 50) this.state.xpHistory.pop();

    // Level progression curve: Level N requires N * 150 + 100 XP
    const prevLevel = profile.level;
    const newLevel = this.calculateLevel(profile.xp);

    let leveledUp = false;
    if (newLevel > prevLevel) {
      profile.level = newLevel;
      leveledUp = true;
    }

    this.save();
    return { earned: amount, level: profile.level, leveledUp };
  }

  calculateLevel(totalXp) {
    // Smooth RPG Curve:
    // L1: 0, L2: 100, L3: 250, L4: 450, L5: 700, L6: 1000, L7: 1350...
    let lvl = 1;
    let required = 0;
    while (true) {
      const nextThreshold = required + (lvl * 120 + 50);
      if (totalXp < nextThreshold) {
        return lvl;
      }
      required = nextThreshold;
      lvl++;
      if (lvl > 100) return 100;
    }
  }

  getXpForLevel(level) {
    let required = 0;
    for (let i = 1; i < level; i++) {
      required += (i * 120 + 50);
    }
    return required;
  }

  getLevelProgress(totalXp) {
    const currentLevel = this.calculateLevel(totalXp);
    const currentLevelFloor = this.getXpForLevel(currentLevel);
    const nextLevelFloor = this.getXpForLevel(currentLevel + 1);
    const currentProgress = totalXp - currentLevelFloor;
    const neededForNext = nextLevelFloor - currentLevelFloor;
    const percentage = Math.min(100, Math.max(0, Math.round((currentProgress / neededForNext) * 100)));

    return {
      level: currentLevel,
      currentProgress,
      neededForNext,
      percentage,
      totalXp
    };
  }

  checkAchievements() {
    if (!this.state.settings.achievementsEnabled) return [];

    const unlockedNow = [];
    const profile = this.state.userProfile;
    const currentUnlocked = new Set(profile.unlockedAchievements || []);
    const tasks = this.state.tasks;
    const completedTasks = tasks.filter(t => t.completed);

    const awardAchievement = (achId) => {
      if (!currentUnlocked.has(achId)) {
        currentUnlocked.add(achId);
        profile.unlockedAchievements = Array.from(currentUnlocked);
        const ach = ACHIEVEMENTS_LIST.find(a => a.id === achId);
        if (ach) {
          unlockedNow.push(ach);
          this.awardXP(ach.xp, `Achievement: ${ach.title}`);
        }
      }
    };

    // Rule checks
    if (completedTasks.length >= 1) awardAchievement('first_step');

    const todayStr = this.getTodayString();
    const completedToday = completedTasks.filter(t => t.completedAt && t.completedAt.startsWith(todayStr));
    if (completedToday.length >= 3) awardAchievement('momentum');

    const tinyCompleted = completedTasks.filter(t => (t.estimatedMinutes || 10) <= 5);
    if (tinyCompleted.length >= 5) awardAchievement('tiny_wins');

    const deepDives = completedTasks.filter(t => (t.estimatedMinutes || 0) >= 25);
    if (deepDives.length >= 1) awardAchievement('deep_diver');

    if (this.state.brainDump && this.state.brainDump.length >= 2) {
      awardAchievement('brain_dumper');
    }

    if (this.state.newIdeas && this.state.newIdeas.length >= 1) {
      awardAchievement('someday_sanctuary');
    }

    if (this.state.journal && this.state.journal.length >= 1) {
      awardAchievement('journal_reflector');
    }

    return unlockedNow;
  }

  // ==================== CAPACITY & ENERGY ====================

  setCapacity(capacity) {
    this.state.userProfile.currentCapacity = capacity;
    if (capacity === 'low' && !this.state.userProfile.bareMinimumMode) {
      // Optionally suggest or enable bare minimum
    }
    this.save();
  }

  toggleBareMinimumMode(override = null) {
    const nextVal = override !== null ? override : !this.state.userProfile.bareMinimumMode;
    this.state.userProfile.bareMinimumMode = nextVal;
    if (nextVal) {
      this.checkAchievements();
    }
    this.save();
    return nextVal;
  }

  // ==================== ROUTINES ====================

  toggleRoutineItem(routineId, itemId) {
    const routine = this.state.routines.find(r => r.id === routineId);
    if (!routine) return;

    const item = routine.items.find(i => i.id === itemId);
    if (!item) return;

    item.completedToday = !item.completedToday;

    // Check if entire active tier is complete
    const todayStr = this.getTodayString();
    const activeItems = this.getRoutineActiveItems(routine);
    const allDone = activeItems.every(i => i.completedToday);

    if (allDone && !routine.completedDays.includes(todayStr)) {
      routine.completedDays.push(todayStr);
      this.awardXP(30, `Completed routine: ${routine.title}`, 'Maintenance');
      this.checkAchievements();
    }

    this.save();
  }

  setRoutineTier(routineId, tier) {
    const routine = this.state.routines.find(r => r.id === routineId);
    if (routine) {
      routine.activeTier = tier; // 'full', 'short', 'minimum'
      this.save();
    }
  }

  getRoutineActiveItems(routine) {
    if (routine.activeTier === 'minimum') {
      return routine.items.filter(i => i.isCrucial).slice(0, 2);
    }
    if (routine.activeTier === 'short') {
      return routine.items.filter(i => i.isCrucial || routine.items.indexOf(i) < 3);
    }
    return routine.items;
  }

  deleteRoutine(routineId) {
    const idx = this.state.routines.findIndex(r => r.id === routineId);
    if (idx === -1) return null;
    const [deleted] = this.state.routines.splice(idx, 1);
    this.pushUndo(`Deleted routine "${deleted.title}"`, () => {
      this.state.routines.splice(idx, 0, deleted);
    });
    this.save();
    return deleted;
  }

  deleteRoutineItem(routineId, itemId) {
    const routine = this.state.routines.find(r => r.id === routineId);
    if (!routine) return null;
    const idx = routine.items.findIndex(i => i.id === itemId);
    if (idx === -1) return null;
    const [deleted] = routine.items.splice(idx, 1);
    this.pushUndo(`Removed routine step "${deleted.title}"`, () => {
      routine.items.splice(idx, 0, deleted);
    });
    this.save();
    return deleted;
  }

  addRoutine(routineData) {
    const id = routineData.id || this.generateId('routine');
    const newRoutine = {
      id,
      title: routineData.title?.trim() || 'New Routine',
      timeOfDay: routineData.timeOfDay || 'morning',
      icon: routineData.icon || '☀️',
      color: routineData.color || '#f59e0b',
      activeTier: routineData.activeTier || 'short',
      items: Array.isArray(routineData.items) ? routineData.items : [],
      completedDays: []
    };
    this.state.routines.push(newRoutine);
    this.save();
    return newRoutine;
  }

  addRoutineItem(routineId, itemTitle, estimatedMinutes = 2, isCrucial = false) {
    const routine = this.state.routines.find(r => r.id === routineId);
    if (!routine) return null;
    const newItem = {
      id: this.generateId('ritem'),
      title: itemTitle.trim(),
      estimatedMinutes: Number(estimatedMinutes) || 2,
      isCrucial: Boolean(isCrucial),
      completedToday: false
    };
    routine.items.push(newItem);
    this.save();
    return newItem;
  }

  // ==================== JOURNAL ====================

  addJournalEntry(entryData) {
    const id = this.generateId('jrnl');
    const entry = {
      id,
      date: entryData.date || this.getTodayString(),
      time: entryData.time || new Date().toTimeString().slice(0, 5),
      title: entryData.title?.trim() || 'Reflection',
      content: entryData.content?.trim() || '',
      mood: entryData.mood || 'calm',
      energy: Number(entryData.energy) || 3,
      tags: Array.isArray(entryData.tags) ? entryData.tags : [],
      linkedTaskIds: Array.isArray(entryData.linkedTaskIds) ? entryData.linkedTaskIds : [],
      prompt: entryData.prompt || null,
      createdAt: new Date().toISOString()
    };

    this.state.journal.unshift(entry);
    this.awardXP(25, 'Journal reflection', 'Personal Growth');
    this.checkAchievements();
    this.save();
    return entry;
  }

  deleteJournalEntry(id) {
    const idx = this.state.journal.findIndex(j => j.id === id);
    if (idx === -1) return;
    const [deleted] = this.state.journal.splice(idx, 1);
    this.pushUndo('Deleted journal entry', () => {
      this.state.journal.splice(idx, 0, deleted);
    });
    this.save();
  }

  // ==================== BRAIN DUMP & NEW IDEAS ====================

  addBrainDump(text) {
    if (!text || !text.trim()) return null;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const added = [];

    for (const line of lines) {
      const item = {
        id: this.generateId('bd'),
        text: line.replace(/^[•\-\*]\s*/, ''),
        createdAt: new Date().toISOString(),
        status: 'inbox'
      };
      this.state.brainDump.unshift(item);
      added.push(item);
    }

    this.checkAchievements();
    this.save();
    return added;
  }

  convertBrainDumpToTask(brainDumpId, extraParams = {}) {
    const item = this.state.brainDump.find(b => b.id === brainDumpId);
    if (!item) return null;

    const task = this.addTask({
      title: item.text,
      ...extraParams
    });

    item.status = 'processed';
    this.save();
    return task;
  }

  deleteBrainDump(id) {
    const idx = this.state.brainDump.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.state.brainDump.splice(idx, 1);
      this.save();
    }
  }

  addNewIdea(title, notes = '', category = 'Creativity') {
    const idea = {
      id: this.generateId('idea'),
      title: title.trim(),
      notes: notes.trim(),
      category,
      createdAt: new Date().toISOString(),
      status: 'held'
    };
    this.state.newIdeas.unshift(idea);
    this.checkAchievements();
    this.save();
    return idea;
  }

  convertIdeaToProject(ideaId) {
    const idea = this.state.newIdeas.find(i => i.id === ideaId);
    if (!idea) return null;

    const proj = {
      id: this.generateId('proj'),
      title: idea.title,
      description: idea.notes || 'Created from spark idea.',
      color: '#ec4899',
      icon: '💡',
      category: idea.category || 'Creativity',
      targetDate: null,
      archived: false,
      createdAt: new Date().toISOString()
    };

    this.state.projects.unshift(proj);
    idea.status = 'converted';
    this.save();
    return proj;
  }

  deleteIdea(id) {
    const idx = this.state.newIdeas.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.state.newIdeas.splice(idx, 1);
      this.save();
    }
  }

  // ==================== PROJECTS ====================

  addProject(projData) {
    const proj = {
      id: projData.id || this.generateId('proj'),
      title: projData.title.trim(),
      description: projData.description?.trim() || '',
      color: projData.color || '#6366f1',
      icon: projData.icon || '📁',
      category: projData.category || 'Work',
      targetDate: projData.targetDate || null,
      archived: false,
      createdAt: new Date().toISOString()
    };
    this.state.projects.unshift(proj);
    this.save();
    return proj;
  }

  deleteProject(projectId) {
    const idx = this.state.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;
    const [deleted] = this.state.projects.splice(idx, 1);
    this.pushUndo(`Deleted project "${deleted.title}"`, () => {
      this.state.projects.splice(idx, 0, deleted);
    });
    this.save();
    return deleted;
  }

  // ==================== SETTINGS & DATA EXPORT ====================

  updateSettings(patch) {
    this.state.settings = {
      ...this.state.settings,
      ...patch
    };
    this.save();
  }

  updateProfile(patch) {
    this.state.userProfile = {
      ...this.state.userProfile,
      ...patch
    };
    this.save();
  }

  exportDataJson() {
    return JSON.stringify(this.state, null, 2);
  }

  exportTasksCsv() {
    const headers = ['ID', 'Title', 'Category', 'Priority', 'Difficulty', 'EstimatedMinutes', 'Energy', 'DeadlineType', 'DeadlineDate', 'Completed', 'CompletedAt'];
    const rows = this.state.tasks.map(t => [
      t.id,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.category,
      t.priority,
      t.difficulty,
      t.estimatedMinutes,
      t.energyLevel,
      t.deadlineType,
      t.deadlineDate || '',
      t.completed ? 'YES' : 'NO',
      t.completedAt || ''
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  importDataJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Invalid JSON file structure.' };
      }
      this.state = this.migrateState(parsed);
      this.save();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  resetToDemoData() {
    this.state = this.createDemoState();
    this.save();
  }
}

window.appStore = new AppStore();
window.DEFAULT_SKILLS = DEFAULT_SKILLS;
window.ACHIEVEMENTS_LIST = ACHIEVEMENTS_LIST;
