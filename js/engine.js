/**
 * AuDHD Life Dashboard - AuDHD Smart Engine
 * Recommendation Oracle, Deadline Escalation, Natural Language Parser,
 * Comeback Sanctuary, Task Breakdown AI/Heuristics, and Pattern Insights.
 */

class AuDHDEngine {
  constructor(store) {
    this.store = store;
  }

  // ==================== DEADLINE EVALUATION ====================

  getDeadlineState(task) {
    if (!task.deadlineDate && !task.softTargetDate) {
      return { status: 'none', label: 'No deadline', color: 'slate', isOverdue: false };
    }

    const isHard = task.deadlineType === 'hard';
    const targetDateStr = isHard ? task.deadlineDate : (task.softTargetDate || task.deadlineDate);
    if (!targetDateStr) {
      return { status: 'none', label: 'No deadline', color: 'slate', isOverdue: false };
    }

    const now = new Date();
    const todayStr = this.store.getTodayString();

    let targetDateTime = new Date(`${targetDateStr}T${task.deadlineTime || '23:59:59'}`);
    const diffMs = targetDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      return {
        status: 'overdue',
        label: isHard ? 'Deadline passed' : 'Past soft target',
        badgeClass: isHard ? 'badge-overdue-hard' : 'badge-overdue-soft',
        color: isHard ? 'amber' : 'slate',
        isOverdue: true,
        diffDays,
        diffHours: Math.round(diffHours),
        timeString: this.formatRelativeTime(diffMs)
      };
    }

    if (diffHours <= 2) {
      return {
        status: 'due_now',
        label: isHard ? 'Due in < 2 hrs' : 'Due today',
        badgeClass: 'badge-due-now',
        color: 'rose',
        isOverdue: false,
        diffDays: 0,
        diffHours: Math.round(diffHours),
        timeString: this.formatRelativeTime(diffMs)
      };
    }

    if (targetDateStr === todayStr) {
      return {
        status: 'urgent',
        label: isHard ? `Due today at ${task.deadlineTime || 'end of day'}` : 'Planned for today',
        badgeClass: isHard ? 'badge-urgent' : 'badge-today',
        color: isHard ? 'amber' : 'sky',
        isOverdue: false,
        diffDays: 0,
        diffHours: Math.round(diffHours),
        timeString: 'Today'
      };
    }

    if (diffDays === 1) {
      return {
        status: 'approaching',
        label: isHard ? 'Due tomorrow' : 'Target: tomorrow',
        badgeClass: 'badge-approaching',
        color: 'sky',
        isOverdue: false,
        diffDays: 1,
        diffHours: Math.round(diffHours),
        timeString: 'Tomorrow'
      };
    }

    if (diffDays <= 3) {
      return {
        status: 'approaching',
        label: `In ${diffDays} days`,
        badgeClass: 'badge-approaching',
        color: 'indigo',
        isOverdue: false,
        diffDays,
        diffHours: Math.round(diffHours),
        timeString: `In ${diffDays} days`
      };
    }

    return {
      status: 'comfortable',
      label: `Due ${targetDateStr}`,
      badgeClass: 'badge-comfortable',
      color: 'emerald',
      isOverdue: false,
      diffDays,
      diffHours: Math.round(diffHours),
      timeString: `${diffDays} days left`
    };
  }

  formatRelativeTime(diffMs) {
    const absMs = Math.abs(diffMs);
    const mins = Math.floor(absMs / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  }

  // ==================== "WHAT SHOULD I DO?" ORACLE ====================

  recommendTask(mode = 'smart', excludeIds = []) {
    const state = this.store.getState();
    const capacity = state.userProfile.currentCapacity || 'normal';
    const isBareMinimum = state.userProfile.bareMinimumMode;
    const todayStr = this.store.getTodayString();

    // Incomplete, non-someday, non-inbox tasks
    let candidates = state.tasks.filter(t => 
      !t.completed && 
      !t.isSomeday && 
      !t.isInbox && 
      !excludeIds.includes(t.id)
    );

    if (candidates.length === 0) {
      // Check someday tasks if no active candidates
      candidates = state.tasks.filter(t => !t.completed && !excludeIds.includes(t.id));
      if (candidates.length === 0) return null;
    }

    // Bare minimum mode forces tiny tasks or hard deadlines
    if (isBareMinimum) {
      const bareCandidates = candidates.filter(t => 
        (t.deadlineType === 'hard' && t.deadlineDate <= todayStr) || 
        (t.estimatedMinutes <= 5)
      );
      if (bareCandidates.length > 0) candidates = bareCandidates;
    }

    // Novelty / Random / Surprise Me mode
    if (mode === 'random') {
      const randIdx = Math.floor(Math.random() * candidates.length);
      const chosen = candidates[randIdx];
      return {
        task: chosen,
        reason: 'Surprise pick! A fresh spark to shake up routine.',
        mode: 'random'
      };
    }

    if (mode === 'quick') {
      const quickTasks = candidates.filter(t => (t.estimatedMinutes || 10) <= 5);
      if (quickTasks.length > 0) {
        return {
          task: quickTasks[Math.floor(Math.random() * quickTasks.length)],
          reason: 'Quick 2–5 minute win to build immediate momentum.',
          mode: 'quick'
        };
      }
    }

    if (mode === 'urgent') {
      const urgentTasks = candidates.filter(t => t.deadlineType === 'hard');
      if (urgentTasks.length > 0) {
        urgentTasks.sort((a, b) => (a.deadlineDate || '9999').localeCompare(b.deadlineDate || '9999'));
        return {
          task: urgentTasks[0],
          reason: 'Highest priority hard deadline requiring attention.',
          mode: 'urgent'
        };
      }
    }

    // Smart Score Algorithm
    const scored = candidates.map(task => {
      let score = 50;
      const reasons = [];

      // 1. Capacity Alignment
      const taskMins = task.estimatedMinutes || 10;
      if (capacity === 'low') {
        if (taskMins <= 5) { score += 45; reasons.push('≤5 min micro task'); }
        else if (taskMins <= 10) { score += 20; }
        else { score -= 30; }
        if (task.energyLevel === 'low') { score += 30; reasons.push('Gentle energy demand'); }
      } else if (capacity === 'limited') {
        if (taskMins <= 15) { score += 30; reasons.push('Manageable size'); }
        if (task.energyLevel === 'low' || task.energyLevel === 'limited') score += 20;
      } else if (capacity === 'high') {
        if (task.energyLevel === 'high' || taskMins >= 20) { score += 40; reasons.push('Great for high capacity'); }
      } else if (capacity === 'hyperfocus') {
        if (task.difficulty === 'medium' || task.difficulty === 'hard' || taskMins >= 25) {
          score += 50;
          reasons.push('Deep work focus candidate');
        }
      }

      // 2. Deadline Urgency
      const deadline = this.getDeadlineState(task);
      if (deadline.status === 'due_now') {
        score += 60;
        reasons.push('Due very soon');
      } else if (deadline.status === 'urgent') {
        score += 45;
        reasons.push('Due today');
      } else if (deadline.status === 'overdue') {
        score += 35;
        reasons.push('Overdue recovery win');
      } else if (deadline.status === 'approaching') {
        score += 20;
      }

      // 3. Avoidance Bonus (Gentle push for stalled items)
      if (task.avoidedCount > 0) {
        score += Math.min(task.avoidedCount * 12, 35);
        reasons.push(`Avoided ${task.avoidedCount}x (+Bonus XP!)`);
      }

      // 4. Priority Weight
      if (task.priority === 'urgent') score += 25;
      if (task.priority === 'high') score += 15;
      if (task.priority === 'low') score -= 10;

      // Small jitter for novelty
      score += Math.random() * 8;

      return {
        task,
        score,
        reason: reasons.length > 0 ? reasons.join(' • ') : 'Balanced next step for today'
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];

    return {
      task: top.task,
      reason: top.reason,
      alternatives: scored.slice(1, 4).map(s => s.task),
      mode: 'smart'
    };
  }

  // ==================== NATURAL LANGUAGE QUICK ADD ====================

  parseQuickAddText(input) {
    if (!input || !input.trim()) return null;

    let text = input.trim();
    let result = {
      title: '',
      category: 'Life Admin',
      priority: 'normal',
      estimatedMinutes: 10,
      deadlineType: 'none',
      deadlineDate: null,
      deadlineTime: null,
      softTargetDate: null,
      recurrence: null,
      tags: [],
      energyLevel: 'normal'
    };

    // Extract tags (#tag)
    const tagMatches = text.match(/#([\w-]+)/g);
    if (tagMatches) {
      result.tags = tagMatches.map(t => t.replace('#', ''));
      text = text.replace(/#([\w-]+)/g, '').trim();

      // Check if tag matches a category
      const matchedSkill = DEFAULT_SKILLS.find(s => 
        result.tags.some(t => s.name.toLowerCase().includes(t.toLowerCase()) || s.id.toLowerCase() === t.toLowerCase())
      );
      if (matchedSkill) {
        result.category = matchedSkill.id;
      }
    }

    // Extract priority (!urgent, !high, !low)
    if (/\!urgent/i.test(text)) {
      result.priority = 'urgent';
      result.deadlineType = 'hard';
      text = text.replace(/\!urgent/i, '').trim();
    } else if (/\!high/i.test(text)) {
      result.priority = 'high';
      text = text.replace(/\!high/i, '').trim();
    } else if (/\!low/i.test(text)) {
      result.priority = 'low';
      text = text.replace(/\!low/i, '').trim();
    }

    // Extract duration (e.g. 5m, 15min, 30m, 1h, 45mins)
    const durationMatch = text.match(/\b(\d+)\s*(m|min|mins|minutes|h|hr|hours)\b/i);
    if (durationMatch) {
      let val = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2].toLowerCase();
      if (unit.startsWith('h')) val *= 60;
      result.estimatedMinutes = val;
      text = text.replace(durationMatch[0], '').trim();
    }

    // Extract time (e.g. 14:00, 3pm, 9:30am)
    const timeMatch = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (timeMatch && (timeMatch[3] || timeMatch[2])) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      result.deadlineTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      text = text.replace(timeMatch[0], '').trim();
    }

    const today = new Date();
    const formatDate = (d) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Extract date terms: today, tomorrow, in X days, every X days, weekday
    if (/\btoday\b/i.test(text)) {
      result.deadlineDate = formatDate(today);
      result.deadlineType = 'hard';
      text = text.replace(/\btoday\b/i, '').trim();
    } else if (/\btomorrow\b/i.test(text)) {
      const tomorrow = new Date(today.getTime() + 86400000);
      result.deadlineDate = formatDate(tomorrow);
      result.deadlineType = 'hard';
      text = text.replace(/\btomorrow\b/i, '').trim();
    } else {
      const inDaysMatch = text.match(/\bin\s+(\d+)\s+days?\b/i);
      if (inDaysMatch) {
        const d = new Date(today.getTime() + parseInt(inDaysMatch[1], 10) * 86400000);
        result.deadlineDate = formatDate(d);
        result.deadlineType = 'hard';
        text = text.replace(inDaysMatch[0], '').trim();
      }
    }

    // Extract recurrence (e.g. "every day", "every 3 days", "every monday")
    const recMatch = text.match(/\bevery\s+(?:(\d+)\s+days?|day|weekday|(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i);
    if (recMatch) {
      result.recurrence = {
        enabled: true,
        type: 'interval',
        intervalDays: 1,
        weeklyDays: [],
        strategy: 'rolling',
        skipNext: false
      };

      if (recMatch[1]) {
        result.recurrence.intervalDays = parseInt(recMatch[1], 10);
      } else if (recMatch[2]) {
        const daysMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        result.recurrence.type = 'weekly';
        result.recurrence.weeklyDays = [daysMap[recMatch[2].toLowerCase()]];
      }
      text = text.replace(recMatch[0], '').trim();
    }

    // Clean remaining text as task title
    result.title = text.replace(/^(to|do|please|must)\s+/i, '').trim() || 'Quick Task';

    return result;
  }

  // ==================== "I'M STUCK" UNSTICK ENGINE ====================

  getUnstickSolutions(task) {
    const title = task ? task.title : 'this task';
    const estimated = task ? (task.estimatedMinutes || 10) : 10;

    const solutions = [
      {
        id: 'two_minute',
        title: '⚡ The 2-Minute Micro Version',
        desc: 'Give yourself 100% permission to stop after 120 seconds.',
        actionLabel: 'Start 2-Min Timer',
        actionType: 'timer',
        minutes: 2,
        firstStep: `Just open or touch ${title} for 2 minutes`
      },
      {
        id: 'breakdown',
        title: '🪄 Split into Tiny First Steps',
        desc: 'Transform this mountain into 3 bite-sized grains of sand.',
        actionLabel: 'Apply Breakdown',
        actionType: 'breakdown',
        subtasks: this.generateAutoSubtasks(title)
      },
      {
        id: 'sensory_adjust',
        title: '🎧 Sensory & Comfort Reset',
        desc: 'Put on noise canceling headphones, grab cold water, or sit comfortably.',
        actionLabel: 'Sensory Reset Check',
        actionType: 'sensory'
      },
      {
        id: 'park_someday',
        title: '🛋️ Park for Later (Zero Guilt)',
        desc: 'Move this to Someday/Maybe. Your brain is not in the right space right now.',
        actionLabel: 'Move to Someday',
        actionType: 'park'
      },
      {
        id: 'whats_blocking',
        title: '🔍 Name the Blocker',
        desc: 'Identify whether it is perfectionism, unclear instructions, or low battery.',
        actionLabel: 'Reflect Blocker',
        actionType: 'blocker_chat'
      }
    ];

    return solutions;
  }

  generateAutoSubtasks(taskTitle) {
    const lower = taskTitle.toLowerCase();

    if (lower.includes('clean') || lower.includes('tidy') || lower.includes('dishes') || lower.includes('room') || lower.includes('desk')) {
      return [
        { id: 'st_' + Date.now() + '_1', title: 'Put on favorite upbeat song or podcast', completed: false },
        { id: 'st_' + Date.now() + '_2', title: 'Pick up only 3 items and put them away', completed: false },
        { id: 'st_' + Date.now() + '_3', title: 'Wipe one single flat surface', completed: false }
      ];
    }

    if (lower.includes('email') || lower.includes('reply') || lower.includes('message') || lower.includes('write') || lower.includes('doc') || lower.includes('report')) {
      return [
        { id: 'st_' + Date.now() + '_1', title: 'Open the app or document (that counts!)', completed: false },
        { id: 'st_' + Date.now() + '_2', title: 'Write 2 ugly bullet points (no grammar check)', completed: false },
        { id: 'st_' + Date.now() + '_3', title: 'Polish or send without overthinking', completed: false }
      ];
    }

    if (lower.includes('call') || lower.includes('appointment') || lower.includes('book') || lower.includes('dentist') || lower.includes('doctor') || lower.includes('bill') || lower.includes('pay')) {
      return [
        { id: 'st_' + Date.now() + '_1', title: 'Locate the website or phone number', completed: false },
        { id: 'st_' + Date.now() + '_2', title: 'Draft a 1-sentence note of what you need', completed: false },
        { id: 'st_' + Date.now() + '_3', title: 'Make the call or submit the form', completed: false }
      ];
    }

    return [
      { id: 'st_' + Date.now() + '_1', title: 'Open or look at the materials for 30 seconds', completed: false },
      { id: 'st_' + Date.now() + '_2', title: 'Do the very first smallest physical motion', completed: false },
      { id: 'st_' + Date.now() + '_3', title: 'Check how you feel — stop or keep going', completed: false }
    ];
  }

  // ==================== COMEBACK DETECTOR ====================

  checkComebackStatus() {
    const state = this.store.getState();
    const lastActive = state.userProfile.lastActiveDate;
    const today = this.store.getTodayString();

    let daysSince = 0;
    if (lastActive) {
      const diffTime = Math.abs(new Date(today) - new Date(lastActive));
      daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const overdueCount = state.tasks.filter(t => {
      if (t.completed || t.isSomeday) return false;
      const dl = this.getDeadlineState(t);
      return dl.isOverdue;
    }).length;

    const isComeback = daysSince >= 2 || overdueCount >= 4;

    return {
      isComeback,
      daysSince,
      overdueCount,
      lastActive
    };
  }

  executeComebackAction(actionType) {
    const state = this.store.getState();
    const todayStr = this.store.getTodayString();

    if (actionType === 'essentials_only') {
      // Hide non-urgent overdue to someday, keep only today's essentials
      state.tasks.forEach(t => {
        if (!t.completed && !t.isSomeday) {
          const dl = this.getDeadlineState(t);
          if (dl.isOverdue && t.priority !== 'urgent') {
            t.isSomeday = true;
          }
        }
      });
    } else if (actionType === 'gentle_reschedule') {
      // Reschedule overdue tasks nicely across the next 3 days
      let offset = 0;
      state.tasks.forEach(t => {
        if (!t.completed && !t.isSomeday) {
          const dl = this.getDeadlineState(t);
          if (dl.isOverdue) {
            const targetDate = new Date(Date.now() + (offset % 3) * 86400000).toISOString().split('T')[0];
            if (t.deadlineType === 'hard') {
              t.deadlineDate = targetDate;
            } else {
              t.softTargetDate = targetDate;
            }
            offset++;
          }
        }
      });
    } else if (actionType === 'clean_slate') {
      // Archive or mark overdue tasks as "let go" without guilt
      state.tasks.forEach(t => {
        if (!t.completed && !t.isSomeday) {
          const dl = this.getDeadlineState(t);
          if (dl.isOverdue) {
            t.isSomeday = true;
            t.notes = (t.notes ? t.notes + '\n' : '') + '[Gently released during Comeback Reset]';
          }
        }
      });
    }

    // Update active date and award Comeback XP
    state.userProfile.lastActiveDate = todayStr;
    state.userProfile.streakPaused = false;
    this.store.awardXP(100, 'Welcome Back Reset', 'Personal Growth');
    this.store.checkAchievements();
    this.store.save();
  }

  // ==================== COMPANION DIALOGUES ====================

  getCompanionMessage(context = 'greeting') {
    const profile = this.store.getState().userProfile;
    const name = profile.name || 'Friend';
    const capacity = profile.currentCapacity;
    const personality = profile.companionPersonality || 'cozy';

    const messages = {
      cozy: {
        greeting: [
          `Hey ${name}, nice to see you! How is your battery feeling today?`,
          `No rush, no pressure today. Even one tiny thing counts.`,
          `Welcome in. Grab a warm sip of water and let's take it step by step.`
        ],
        low_battery: [
          `Honoring low energy is a superpower. Let's stick to tiny wins today.`,
          `Low battery mode active. I'll keep the dashboard nice and quiet.`
        ],
        complete: [
          `✨ That was lovely! Progress happened.`,
          `Another thing off your mental plate. Take a breath!`,
          `Awesome job! Your brain did that.`
        ],
        stuck: [
          `It's okay to feel stuck! It just means the step was slightly too big. Let's shrink it.`
        ]
      },
      enthusiastic: {
        greeting: [
          `Let's go, ${name}! Ready for some fun quests today? 🚀`,
          `High five for showing up! What shall we tackle first?`
        ],
        low_battery: [
          `Recharge time! Tiny micro-steps only. You got this!`
        ],
        complete: [
          `BOOM! Quest complete! +XP in the bank! 🎉`,
          `Leveling up in real life! That was awesome!`
        ],
        stuck: [
          `No sweat! Let's slice this task into bite-sized confetti pieces!`
        ]
      },
      calm: {
        greeting: [
          `Peaceful space ready. Take your time.`,
          `One gentle breath at a time. What matters right now?`
        ],
        low_battery: [
          `Rest and conservation mode. Only essential actions.`
        ],
        complete: [
          `Done and released. Clear mind.`,
          `Gently completed. Well done.`
        ],
        stuck: [
          `Take a pause. The task will wait until you are ready.`
        ]
      },
      minimalist: {
        greeting: [
          `Ready. Focus on the next immediate action.`,
          `Welcome. What is next?`
        ],
        low_battery: [
          `Low capacity noted. Filtered to essentials.`
        ],
        complete: [
          `Completed.`,
          `Done.`
        ],
        stuck: [
          `Make it smaller.`
        ]
      }
    };

    const personalitySet = messages[personality] || messages.cozy;
    const list = personalitySet[context] || personalitySet.greeting;
    return list[Math.floor(Math.random() * list.length)];
  }

  // ==================== PATTERN INSIGHTS ====================

  generatePatternInsights() {
    const state = this.store.getState();
    const tasks = state.tasks;
    const completed = tasks.filter(t => t.completed);
    const journal = state.journal;

    const insights = [];

    if (completed.length >= 3) {
      const shortTasks = completed.filter(t => (t.estimatedMinutes || 10) <= 5);
      const shortRatio = Math.round((shortTasks.length / completed.length) * 100);
      if (shortRatio >= 40) {
        insights.push({
          icon: '⚡',
          text: `You've completed ${shortRatio}% of your tasks using quick 2–5 min actions. Micro-steps work really well for your initiation.`
        });
      }
    }

    if (journal.length >= 2) {
      const lowEnergyDays = journal.filter(j => j.energy <= 2).length;
      if (lowEnergyDays >= 2) {
        insights.push({
          icon: '🔋',
          text: `You frequently log energy around 1–2/5. Using "Bare Minimum Mode" on these days helps protect your momentum.`
        });
      }
    }

    const hardDeadlines = completed.filter(t => t.deadlineType === 'hard');
    if (hardDeadlines.length >= 2) {
      insights.push({
        icon: '🎯',
        text: `You've conquered ${hardDeadlines.length} hard deadlines successfully without last-minute panic.`
      });
    }

    if (insights.length === 0) {
      insights.push({
        icon: '🌱',
        text: `As you complete tasks and write journal reflections, gentle non-diagnostic patterns will appear here to help you work with your brain.`
      });
    }

    return insights;
  }
}

window.AuDHDEngine = AuDHDEngine;
