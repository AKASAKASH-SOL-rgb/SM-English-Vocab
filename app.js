// VocabMaster - Samundramanthan 200 Vocabulary Interactive Engine
// Full Application Logic: Dashboard, Study Hub, 3D Flashcards, Mock Test Arena, Mini Games, LocalStorage & Audio TTS

class VocabMasterApp {
  constructor() {
    this.words = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA : [];
    this.currentTab = 'dashboard';
    
    // Persistent User State
    this.masteredWords = new Set(JSON.parse(localStorage.getItem('vm_mastered') || '[]'));
    this.learningWords = new Set(JSON.parse(localStorage.getItem('vm_learning') || '[]'));
    this.starredWords = new Set(JSON.parse(localStorage.getItem('vm_starred') || '[]'));
    this.streakData = JSON.parse(localStorage.getItem('vm_streak') || '{"lastDate":"","count":1}');
    this.dailyProgress = JSON.parse(localStorage.getItem('vm_daily_progress') || '{"date":"","count":0}');
    
    // Flashcard State
    this.fcDeck = [];
    this.fcIndex = 0;
    this.fcFlipped = false;
    
    // Quiz State
    this.quizQuestions = [];
    this.quizIndex = 0;
    this.quizScore = 0;
    this.quizTimer = null;
    this.quizTimeLeft = 30;
    this.quizStartTime = null;
    this.quizUserAnswers = [];
    this.quizMissedQuestions = [];
    
    // Memory Game State
    this.gameTiles = [];
    this.gameSelected = [];
    this.gameMatched = 0;
    this.gameMoves = 0;
    this.gameTimer = null;
    this.gameSeconds = 0;

    // Study Filter State
    this.studySearch = '';
    this.studySetFilter = 'all';
    this.studyPos = 'all';
    this.studyStatus = 'all';
    this.studyViewMode = 'grid'; // 'grid' | 'table'

    this.init();
  }

  init() {
    this.initTheme();
    this.checkStreak();
    this.updateDashboardStats();
    this.renderWordOfTheDay();
    this.renderStudyCards();
    this.initFlashcardDeck();
    this.initKeyboardShortcuts();
    this.initMemoryGame();
    this.navigate('dashboard');
    this.updateBookmarkCountBadge();

    // Render Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // ================= THEME & UI =================
  initTheme() {
    const savedTheme = localStorage.getItem('vm_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('vm_theme', isDark ? 'dark' : 'light');
    if (window.lucide) lucide.createIcons();
  }

  toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
    if (window.lucide) lucide.createIcons();
  }

  navigate(tabName) {
    this.currentTab = tabName;
    
    // Switch active view
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.add('hidden');
    });
    
    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) {
      targetView.classList.remove('hidden');
    }

    // Update active tab styles
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('bg-indigo-50', 'dark:bg-indigo-950/80', 'text-indigo-600', 'dark:text-indigo-400', 'font-bold');
        btn.classList.remove('text-slate-600', 'dark:text-slate-300');
      } else {
        btn.classList.remove('bg-indigo-50', 'dark:bg-indigo-950/80', 'text-indigo-600', 'dark:text-indigo-400', 'font-bold');
        btn.classList.add('text-slate-600', 'dark:text-slate-300');
      }
    });

    if (tabName === 'dashboard') {
      this.updateDashboardStats();
    } else if (tabName === 'study') {
      this.renderStudyCards();
    } else if (tabName === 'bookmarks') {
      this.renderBookmarksList();
    } else if (tabName === 'flashcards') {
      this.updateFlashcardView();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) lucide.createIcons();
  }

  // ================= STREAK & PROGRESS =================
  checkStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (this.streakData.lastDate) {
      const last = new Date(this.streakData.lastDate);
      const cur = new Date(today);
      const diffDays = Math.round((cur - last) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Continuous streak
        this.streakData.count += 1;
        this.streakData.lastDate = today;
      } else if (diffDays > 1) {
        // Streak broken
        this.streakData.count = 1;
        this.streakData.lastDate = today;
      }
    } else {
      this.streakData = { lastDate: today, count: 1 };
    }
    localStorage.setItem('vm_streak', JSON.stringify(this.streakData));
    
    const streakEl = document.getElementById('streak-count');
    if (streakEl) streakEl.textContent = this.streakData.count;
  }

  incrementDailyCount() {
    const today = new Date().toISOString().split('T')[0];
    if (this.dailyProgress.date !== today) {
      this.dailyProgress = { date: today, count: 1 };
    } else {
      this.dailyProgress.count += 1;
    }
    localStorage.setItem('vm_daily_progress', JSON.stringify(this.dailyProgress));
    this.updateDashboardStats();
  }

  saveStorage() {
    localStorage.setItem('vm_mastered', JSON.stringify(Array.from(this.masteredWords)));
    localStorage.setItem('vm_learning', JSON.stringify(Array.from(this.learningWords)));
    localStorage.setItem('vm_starred', JSON.stringify(Array.from(this.starredWords)));
    this.updateDashboardStats();
    this.updateBookmarkCountBadge();
  }

  updateBookmarkCountBadge() {
    const count = this.starredWords.size;
    const badge = document.getElementById('nav-bookmark-count');
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  updateDashboardStats() {
    const mastered = this.masteredWords.size;
    const learning = this.learningWords.size;
    const starred = this.starredWords.size;
    const total = this.words.length || 200;
    const pct = Math.round((mastered / total) * 100);

    const masteredEl = document.getElementById('stat-mastered-count');
    const masteredPctEl = document.getElementById('stat-mastered-pct');
    const masteredBar = document.getElementById('stat-mastered-bar');
    const learningEl = document.getElementById('stat-learning-count');
    const starredEl = document.getElementById('stat-starred-count');

    if (masteredEl) masteredEl.textContent = mastered;
    if (masteredPctEl) masteredPctEl.textContent = `${pct}%`;
    if (masteredBar) masteredBar.style.width = `${pct}%`;
    if (learningEl) learningEl.textContent = learning;
    if (starredEl) starredEl.textContent = starred;

    // Update 4 Sets statistics
    for (let setNum = 1; setNum <= 4; setNum++) {
      const setStart = (setNum - 1) * 50 + 1;
      const setEnd = setNum * 50;
      let setMastered = 0;
      for (let id = setStart; id <= setEnd; id++) {
        if (this.masteredWords.has(id)) setMastered++;
      }
      const setPct = Math.round((setMastered / 50) * 100);
      const statEl = document.getElementById(`set-${setNum}-stat`);
      const barEl = document.getElementById(`set-${setNum}-bar`);
      if (statEl) statEl.textContent = `${setMastered}/50`;
      if (barEl) barEl.style.width = `${setPct}%`;
    }
  }

  renderWordOfTheDay() {
    const container = document.getElementById('wotd-card');
    if (!container || !this.words.length) return;

    // Pick a deterministic word of the day based on day of year
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const wotdIndex = dayOfYear % this.words.length;
    const word = this.words[wotdIndex] || this.words[0];

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-[11px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            🌟 Word of the Day • #${word.id}
          </span>
          <span class="text-xs font-semibold text-slate-500">${word.pos}</span>
        </div>
        <button onclick="app.speakWord('${word.word}')" class="self-start sm:self-auto p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 flex items-center gap-1 text-xs font-bold">
          <i data-lucide="volume-2" class="w-4 h-4"></i> Pronounce
        </button>
      </div>

      <div class="space-y-2">
        <div class="flex items-baseline gap-3">
          <h3 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">${word.word}</h3>
          <span class="font-hindi text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">${word.hindiMeaning}</span>
        </div>
        
        <p class="text-xs text-slate-600 dark:text-slate-300">
          <strong class="text-slate-700 dark:text-slate-200">Key Synonyms:</strong> ${word.synonyms.slice(0, 6).join(', ')}
        </p>
        <p class="text-xs text-slate-600 dark:text-slate-300">
          <strong class="text-slate-700 dark:text-slate-200">Antonyms (${word.hindiAntonymMeaning}):</strong> ${word.antonyms.slice(0, 5).join(', ')}
        </p>
        <p class="text-xs italic text-slate-500 dark:text-slate-400 pt-1">
          "${word.example}"
        </p>
      </div>

      <div class="pt-2 flex justify-end">
        <button onclick="app.openWordModal(${word.id})" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
          View Full Breakdown & 15+ Synonyms →
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  // ================= STUDY HUB LOGIC =================
  setStudyView(mode) {
    this.studyViewMode = mode;
    const gridContainer = document.getElementById('study-card-grid');
    const tableContainer = document.getElementById('study-table-container');
    const btnGrid = document.getElementById('btn-view-grid');
    const btnTable = document.getElementById('btn-view-table');

    if (mode === 'grid') {
      gridContainer.classList.remove('hidden');
      tableContainer.classList.add('hidden');
      btnGrid.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm flex items-center gap-1';
      btnTable.className = 'px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 flex items-center gap-1';
    } else {
      gridContainer.classList.add('hidden');
      tableContainer.classList.remove('hidden');
      btnTable.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm flex items-center gap-1';
      btnGrid.className = 'px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 flex items-center gap-1';
    }
  }

  setPosFilter(pos) {
    this.studyPos = pos;
    document.querySelectorAll('.pos-filter-btn').forEach(btn => {
      if (btn.dataset.pos === pos) {
        btn.className = 'pos-filter-btn px-2.5 py-1 rounded-lg font-semibold bg-indigo-600 text-white';
      } else {
        btn.className = 'pos-filter-btn px-2.5 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800';
      }
    });
    this.renderStudyCards();
  }

  filterStudyWords() {
    this.studySearch = document.getElementById('study-search-input').value.trim().toLowerCase();
    this.studySetFilter = document.getElementById('study-set-filter').value;
    this.studyStatus = document.getElementById('study-status-filter').value;
    
    const clearBtn = document.getElementById('study-search-clear');
    if (clearBtn) {
      if (this.studySearch) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    this.renderStudyCards();
  }

  clearStudySearch() {
    const input = document.getElementById('study-search-input');
    if (input) input.value = '';
    this.filterStudyWords();
  }

  studySet(setNum) {
    this.studySetFilter = String(setNum);
    this.studySearch = '';
    this.studyPos = 'all';
    this.studyStatus = 'all';

    // Reset Study View inputs
    const searchInput = document.getElementById('study-search-input');
    if (searchInput) searchInput.value = '';

    const clearBtn = document.getElementById('study-search-clear');
    if (clearBtn) clearBtn.classList.add('hidden');

    const setSelect = document.getElementById('study-set-filter');
    if (setSelect) setSelect.value = String(setNum);

    const statusSelect = document.getElementById('study-status-filter');
    if (statusSelect) statusSelect.value = 'all';

    // Reset POS filter pill buttons
    document.querySelectorAll('.pos-filter-btn').forEach(btn => {
      if (btn.dataset.pos === 'all') {
        btn.className = 'pos-filter-btn px-2.5 py-1 rounded-lg font-semibold bg-indigo-600 text-white';
      } else {
        btn.className = 'pos-filter-btn px-2.5 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800';
      }
    });

    this.navigate('study');
    this.renderStudyCards();
  }

  flashcardSet(setNum) {
    const deckSelect = document.getElementById('flashcard-deck-select');
    if (deckSelect) deckSelect.value = String(setNum);
    this.initFlashcardDeck();
    this.navigate('flashcards');
  }

  searchKeyword(keyword) {
    const input = document.getElementById('study-search-input');
    if (input) {
      input.value = keyword;
      this.filterStudyWords();
      this.navigate('study');
    }
  }

  getFilteredWords() {
    return this.words.filter(item => {
      // Set Filter
      if (this.studySetFilter !== 'all') {
        const setNum = parseInt(this.studySetFilter, 10);
        const minId = (setNum - 1) * 50 + 1;
        const maxId = setNum * 50;
        if (item.id < minId || item.id > maxId) return false;
      }

      // POS Filter
      if (this.studyPos !== 'all') {
        if (item.pos.toLowerCase() !== this.studyPos.toLowerCase()) return false;
      }

      // Status Filter
      if (this.studyStatus === 'mastered' && !this.masteredWords.has(item.id)) return false;
      if (this.studyStatus === 'learning' && !this.learningWords.has(item.id)) return false;
      if (this.studyStatus === 'unlearned' && this.masteredWords.has(item.id)) return false;
      if (this.studyStatus === 'starred' && !this.starredWords.has(item.id)) return false;

      // Text Search
      if (this.studySearch) {
        const q = this.studySearch;
        const inWord = item.word.toLowerCase().includes(q);
        const inHindiSyn = item.hindiMeaning.toLowerCase().includes(q);
        const inHindiAnt = item.hindiAntonymMeaning.toLowerCase().includes(q);
        const inSyns = item.synonyms.some(s => s.toLowerCase().includes(q));
        const inAnts = item.antonyms.some(a => a.toLowerCase().includes(q));
        const inId = String(item.id) === q;

        if (!inWord && !inHindiSyn && !inHindiAnt && !inSyns && !inAnts && !inId) {
          return false;
        }
      }

      return true;
    });
  }

  renderStudyCards() {
    const filtered = this.getFilteredWords();
    const gridContainer = document.getElementById('study-card-grid');
    const tableBody = document.getElementById('study-table-body');
    const countEl = document.getElementById('study-results-count');

    if (countEl) {
      countEl.textContent = `Showing ${filtered.length} of ${this.words.length} words`;
    }

    if (!gridContainer || !tableBody) return;

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-full text-center py-12 glass-panel rounded-3xl space-y-3">
          <i data-lucide="search-x" class="w-12 h-12 mx-auto text-slate-400"></i>
          <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300">No vocabulary words found</h3>
          <p class="text-xs text-slate-500">Try adjusting your search query or filter criteria.</p>
          <button onclick="app.clearStudySearch()" class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs">Clear Filters</button>
        </div>
      `;
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">No matching words found.</td></tr>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Render Grid Cards
    gridContainer.innerHTML = filtered.map(item => {
      const isMastered = this.masteredWords.has(item.id);
      const isStarred = this.starredWords.has(item.id);

      return `
        <div class="glass-panel p-5 sm:p-6 rounded-3xl space-y-4 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition flex flex-col justify-between group">
          
          <!-- Card Top Bar -->
          <div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-md text-xs font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  #${item.id}
                </span>
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400">${item.pos}</span>
              </div>
              
              <div class="flex items-center gap-1">
                <!-- Mastered Checkbox -->
                <button onclick="app.toggleMastered(${item.id})" class="p-1.5 rounded-lg ${isMastered ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800'} transition" title="Mark as Mastered">
                  <i data-lucide="${isMastered ? 'check-circle' : 'circle'}" class="w-4 h-4"></i>
                </button>

                <!-- Audio TTS -->
                <button onclick="app.speakWord('${item.word}')" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Pronounce">
                  <i data-lucide="volume-2" class="w-4 h-4"></i>
                </button>

                <!-- Star / Bookmark -->
                <button onclick="app.toggleStarred(${item.id})" class="p-1.5 rounded-lg ${isStarred ? 'text-amber-500 fill-amber-500' : 'text-slate-400 hover:text-amber-500'} hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Save / Bookmark">
                  <i data-lucide="bookmark" class="w-4 h-4 ${isStarred ? 'fill-amber-500' : ''}"></i>
                </button>
              </div>
            </div>

            <!-- Headword & Hindi -->
            <div class="mt-2.5">
              <div class="flex items-baseline gap-2.5">
                <h3 onclick="app.openWordModal(${item.id})" class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  ${item.word}
                </h3>
              </div>
            </div>

            <!-- Synonyms Section -->
            <div class="mt-3 space-y-1.5">
              <div class="flex items-center gap-1.5">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">Synonyms Sense</span>
                <span class="font-hindi text-xs font-bold text-emerald-700 dark:text-emerald-400">${item.hindiMeaning}</span>
              </div>
              <div class="flex flex-wrap gap-1">
                ${item.synonyms.map(syn => `
                  <span onclick="app.searchKeyword('${syn}')" class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 cursor-pointer transition">
                    ${syn}
                  </span>
                `).join('')}
              </div>
            </div>

            <!-- Antonyms Section -->
            <div class="mt-3 space-y-1.5">
              <div class="flex items-center gap-1.5">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">Antonyms Sense</span>
                <span class="font-hindi text-xs font-bold text-rose-700 dark:text-rose-400">${item.hindiAntonymMeaning}</span>
              </div>
              <div class="flex flex-wrap gap-1">
                ${item.antonyms.map(ant => `
                  <span onclick="app.searchKeyword('${ant}')" class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/60 dark:hover:text-rose-300 cursor-pointer transition">
                    ${ant}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Bottom Example & Detail Link -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <p class="italic text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[80%]" title="${item.example}">
              "${item.example}"
            </p>
            <button onclick="app.openWordModal(${item.id})" class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">
              Details →
            </button>
          </div>

        </div>
      `;
    }).join('');

    // Render Table Rows
    tableBody.innerHTML = filtered.map(item => {
      const isMastered = this.masteredWords.has(item.id);
      const isStarred = this.starredWords.has(item.id);

      return `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition">
          <td class="p-3.5 font-bold text-slate-400">#${item.id}</td>
          <td class="p-3.5 font-black text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600" onclick="app.openWordModal(${item.id})">
            ${item.word}
          </td>
          <td class="p-3.5 text-slate-500">${item.pos}</td>
          <td class="p-3.5 font-hindi font-bold text-emerald-600 dark:text-emerald-400">${item.hindiMeaning}</td>
          <td class="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">${item.synonyms.slice(0, 4).join(', ')}...</td>
          <td class="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">${item.antonyms.slice(0, 4).join(', ')}...</td>
          <td class="p-3.5 text-right space-x-1">
            <button onclick="app.speakWord('${item.word}')" class="p-1 rounded text-slate-400 hover:text-indigo-600" title="Audio"><i data-lucide="volume-2" class="w-3.5 h-3.5"></i></button>
            <button onclick="app.toggleStarred(${item.id})" class="p-1 rounded ${isStarred ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}" title="Star"><i data-lucide="bookmark" class="w-3.5 h-3.5"></i></button>
            <button onclick="app.toggleMastered(${item.id})" class="p-1 rounded ${isMastered ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}" title="Master"><i data-lucide="${isMastered ? 'check-circle' : 'circle'}" class="w-3.5 h-3.5"></i></button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  toggleMastered(id) {
    if (this.masteredWords.has(id)) {
      this.masteredWords.delete(id);
    } else {
      this.masteredWords.add(id);
      this.learningWords.delete(id);
      this.incrementDailyCount();
    }
    this.saveStorage();
    this.renderStudyCards();
    if (this.currentTab === 'flashcards') this.updateFlashcardView();
  }

  toggleStarred(id) {
    if (this.starredWords.has(id)) {
      this.starredWords.delete(id);
    } else {
      this.starredWords.add(id);
    }
    this.saveStorage();
    this.renderStudyCards();
    if (this.currentTab === 'bookmarks') this.renderBookmarksList();
  }

  // ================= WORD DETAILS MODAL =================
  openWordModal(id) {
    const word = this.words.find(w => w.id === id);
    if (!word) return;

    document.getElementById('modal-word-id').textContent = `#${word.id}`;
    document.getElementById('modal-word-pos').textContent = word.pos;
    document.getElementById('modal-word-title').textContent = word.word;
    document.getElementById('modal-hindi-syn').textContent = word.hindiMeaning;
    document.getElementById('modal-hindi-ant').textContent = word.hindiAntonymMeaning;
    document.getElementById('modal-example').textContent = `"${word.example}"`;

    const synList = document.getElementById('modal-synonyms-list');
    synList.innerHTML = word.synonyms.map(syn => `
      <span onclick="app.closeWordModal(); app.searchKeyword('${syn}');" class="px-2.5 py-1 rounded-lg bg-emerald-100/80 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-medium cursor-pointer hover:scale-105 transition">
        ${syn}
      </span>
    `).join('');

    const antList = document.getElementById('modal-antonyms-list');
    antList.innerHTML = word.antonyms.map(ant => `
      <span onclick="app.closeWordModal(); app.searchKeyword('${ant}');" class="px-2.5 py-1 rounded-lg bg-rose-100/80 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-medium cursor-pointer hover:scale-105 transition">
        ${ant}
      </span>
    `).join('');

    document.getElementById('word-modal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeWordModal() {
    document.getElementById('word-modal').classList.add('hidden');
  }

  // ================= FLASHCARDS HUB =================
  initFlashcardDeck() {
    const deckSelect = document.getElementById('flashcard-deck-select');
    const deckType = deckSelect ? deckSelect.value : 'all';

    let pool = [...this.words];
    if (deckType === '1') pool = this.words.filter(w => w.id >= 1 && w.id <= 50);
    else if (deckType === '2') pool = this.words.filter(w => w.id >= 51 && w.id <= 100);
    else if (deckType === '3') pool = this.words.filter(w => w.id >= 101 && w.id <= 150);
    else if (deckType === '4') pool = this.words.filter(w => w.id >= 151 && w.id <= 200);
    else if (deckType === 'starred') pool = this.words.filter(w => this.starredWords.has(w.id));
    else if (deckType === 'unlearned') pool = this.words.filter(w => !this.masteredWords.has(w.id));

    this.fcDeck = pool.length > 0 ? pool : [...this.words];
    this.fcIndex = 0;
    this.fcFlipped = false;
    this.updateFlashcardView();
  }

  shuffleFlashcards() {
    for (let i = this.fcDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.fcDeck[i], this.fcDeck[j]] = [this.fcDeck[j], this.fcDeck[i]];
    }
    this.fcIndex = 0;
    this.fcFlipped = false;
    this.updateFlashcardView();
  }

  flipFlashcard() {
    this.fcFlipped = !this.fcFlipped;
    const cardEl = document.getElementById('flashcard-element');
    if (cardEl) {
      if (this.fcFlipped) cardEl.classList.add('is-flipped');
      else cardEl.classList.remove('is-flipped');
    }
  }

  updateFlashcardView() {
    if (!this.fcDeck.length) return;
    if (this.fcIndex >= this.fcDeck.length) this.fcIndex = 0;
    if (this.fcIndex < 0) this.fcIndex = this.fcDeck.length - 1;

    const currentWord = this.fcDeck[this.fcIndex];
    const frontType = document.getElementById('flashcard-front-type')?.value || 'word';

    // Reset flip state
    this.fcFlipped = false;
    const cardEl = document.getElementById('flashcard-element');
    if (cardEl) cardEl.classList.remove('is-flipped');

    // Progress Text & Bar
    document.getElementById('flashcard-progress-text').textContent = `Card ${this.fcIndex + 1} of ${this.fcDeck.length}`;
    const pct = ((this.fcIndex + 1) / this.fcDeck.length) * 100;
    document.getElementById('flashcard-progress-bar').style.width = `${pct}%`;

    // Mastered count in deck
    const deckMastered = this.fcDeck.filter(w => this.masteredWords.has(w.id)).length;
    document.getElementById('flashcard-score-badge').textContent = `${deckMastered} Mastered`;

    // Front Content
    document.getElementById('fc-front-badge').textContent = `#${currentWord.id} • ${currentWord.pos}`;
    if (frontType === 'word') {
      document.getElementById('fc-front-title').textContent = currentWord.word;
      document.getElementById('fc-front-sub').textContent = 'Click or press [Space] to reveal Hindi meaning & synonyms';
    } else {
      document.getElementById('fc-front-title').textContent = currentWord.hindiMeaning;
      document.getElementById('fc-front-sub').textContent = 'Click or press [Space] to reveal English headword';
    }

    // Back Content
    document.getElementById('fc-back-title').textContent = currentWord.word;
    document.getElementById('fc-back-pos').textContent = `${currentWord.pos} (Word #${currentWord.id})`;
    document.getElementById('fc-back-hindi-syn').textContent = currentWord.hindiMeaning;
    document.getElementById('fc-back-syn-list').textContent = currentWord.synonyms.join(', ');
    document.getElementById('fc-back-hindi-ant').textContent = currentWord.hindiAntonymMeaning;
    document.getElementById('fc-back-ant-list').textContent = currentWord.antonyms.join(', ');
    document.getElementById('fc-back-example').textContent = `"${currentWord.example}"`;

    if (window.lucide) lucide.createIcons();
  }

  rateFlashcard(level) {
    if (!this.fcDeck.length) return;
    const currentWord = this.fcDeck[this.fcIndex];

    if (level === 'easy') {
      this.masteredWords.add(currentWord.id);
      this.learningWords.delete(currentWord.id);
      this.incrementDailyCount();
    } else if (level === 'medium') {
      this.learningWords.add(currentWord.id);
      this.masteredWords.delete(currentWord.id);
    } else if (level === 'hard') {
      this.learningWords.add(currentWord.id);
      this.masteredWords.delete(currentWord.id);
      this.starredWords.add(currentWord.id); // Auto star hard words
    }

    this.saveStorage();
    this.nextFlashcard();
  }

  nextFlashcard() {
    this.fcIndex = (this.fcIndex + 1) % this.fcDeck.length;
    this.updateFlashcardView();
  }

  prevFlashcard() {
    this.fcIndex = (this.fcIndex - 1 + this.fcDeck.length) % this.fcDeck.length;
    this.updateFlashcardView();
  }

  speakCurrentFlashcard() {
    if (!this.fcDeck.length) return;
    this.speakWord(this.fcDeck[this.fcIndex].word);
  }

  // ================= MOCK TEST ARENA =================
  startMockTest(customPool = null) {
    const type = document.getElementById('quiz-type-select').value;
    const poolType = document.getElementById('quiz-pool-select').value;
    const count = parseInt(document.getElementById('quiz-count-select').value, 10);
    const timerSetting = document.getElementById('quiz-timer-select').value;

    let pool = customPool || [...this.words];
    if (!customPool) {
      if (poolType === '1') pool = this.words.filter(w => w.id >= 1 && w.id <= 50);
      else if (poolType === '2') pool = this.words.filter(w => w.id >= 51 && w.id <= 100);
      else if (poolType === '3') pool = this.words.filter(w => w.id >= 101 && w.id <= 150);
      else if (poolType === '4') pool = this.words.filter(w => w.id >= 151 && w.id <= 200);
      else if (poolType === 'starred') pool = this.words.filter(w => this.starredWords.has(w.id));
    }

    if (pool.length < 4) {
      alert('You need at least 4 words in the selected pool to start a test. Defaulting to all 200 words.');
      pool = [...this.words];
    }

    // Shuffle pool
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
    const actualCount = Math.min(count, shuffledPool.length);

    // Generate Questions
    this.quizQuestions = [];
    for (let i = 0; i < actualCount; i++) {
      const targetWord = shuffledPool[i];
      const q = this.generateQuizQuestion(targetWord, type, pool);
      this.quizQuestions.push(q);
    }

    this.quizIndex = 0;
    this.quizScore = 0;
    this.quizUserAnswers = [];
    this.quizMissedQuestions = [];
    this.quizStartTime = Date.now();
    this.quizTimerDuration = timerSetting === 'none' ? null : parseInt(timerSetting, 10);

    document.getElementById('quiz-setup-screen').classList.add('hidden');
    document.getElementById('quiz-results-screen').classList.add('hidden');
    document.getElementById('quiz-active-screen').classList.remove('hidden');

    this.renderQuizQuestion();
  }

  generateQuizQuestion(targetWord, selectedType, pool) {
    let qType = selectedType;
    if (qType === 'mixed') {
      const types = ['synonym', 'antonym', 'en_to_hi', 'hi_to_en'];
      qType = types[Math.floor(Math.random() * types.length)];
    }

    let prompt = '';
    let questionText = '';
    let hindiHint = '';
    let correctAnswer = '';
    let distractors = [];

    // Distractor candidate words
    const otherWords = pool.filter(w => w.id !== targetWord.id);
    const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random());

    if (qType === 'synonym') {
      prompt = 'Select the closest SYNONYM for:';
      questionText = targetWord.word;
      hindiHint = `(हिंदी अर्थ: ${targetWord.hindiMeaning})`;
      correctAnswer = targetWord.synonyms[Math.floor(Math.random() * targetWord.synonyms.length)];
      
      // Distractors: Antonyms or synonyms of other words
      distractors = [
        targetWord.antonyms[0] || 'Opposite',
        shuffledOthers[0]?.synonyms[0] || 'Unrelated',
        shuffledOthers[1]?.synonyms[0] || 'Different'
      ];
    } else if (qType === 'antonym') {
      prompt = 'Select the accurate ANTONYM (opposite) for:';
      questionText = targetWord.word;
      hindiHint = `(हिंदी अर्थ: ${targetWord.hindiMeaning})`;
      correctAnswer = targetWord.antonyms[Math.floor(Math.random() * targetWord.antonyms.length)];
      
      // Distractors: Synonyms of targetWord or antonyms of other words
      distractors = [
        targetWord.synonyms[0] || 'Similar',
        shuffledOthers[0]?.antonyms[0] || 'Unrelated',
        shuffledOthers[1]?.antonyms[0] || 'Different'
      ];
    } else if (qType === 'en_to_hi') {
      prompt = 'Select the correct HINDI MEANING for:';
      questionText = targetWord.word;
      hindiHint = `(${targetWord.pos})`;
      correctAnswer = targetWord.hindiMeaning;
      
      distractors = [
        targetWord.hindiAntonymMeaning,
        shuffledOthers[0]?.hindiMeaning || 'अन्य अर्थ',
        shuffledOthers[1]?.hindiMeaning || 'दूसरा अर्थ'
      ];
    } else { // hi_to_en
      prompt = 'Which English word matches this Hindi meaning?';
      questionText = targetWord.hindiMeaning;
      hindiHint = `(${targetWord.pos})`;
      correctAnswer = targetWord.word;
      
      distractors = [
        shuffledOthers[0]?.word || 'WORD1',
        shuffledOthers[1]?.word || 'WORD2',
        shuffledOthers[2]?.word || 'WORD3'
      ];
    }

    // Combine & shuffle options
    const options = [correctAnswer, ...distractors.slice(0, 3)].sort(() => 0.5 - Math.random());

    return {
      type: qType,
      prompt,
      questionText,
      hindiHint,
      correctAnswer,
      options,
      targetWord
    };
  }

  renderQuizQuestion() {
    clearInterval(this.quizTimer);

    if (this.quizIndex >= this.quizQuestions.length) {
      this.finishQuiz();
      return;
    }

    const q = this.quizQuestions[this.quizIndex];
    document.getElementById('quiz-active-num').textContent = `Q ${this.quizIndex + 1} / ${this.quizQuestions.length}`;
    document.getElementById('quiz-active-type-badge').textContent = q.type.toUpperCase().replace('_', ' ');
    document.getElementById('quiz-question-prompt').textContent = q.prompt;
    document.getElementById('quiz-question-word').textContent = q.questionText;
    document.getElementById('quiz-question-hindi-hint').textContent = q.hindiHint;

    // Options Container
    const optionsContainer = document.getElementById('quiz-options-container');
    optionsContainer.innerHTML = q.options.map((opt, idx) => `
      <button onclick="app.selectQuizOption('${opt.replace(/'/g, "\\'")}', this)" class="quiz-option-btn p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm text-left hover:border-indigo-400 dark:hover:border-indigo-600 transition flex items-center gap-3">
        <span class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">${String.fromCharCode(65 + idx)}</span>
        <span>${opt}</span>
      </button>
    `).join('');

    // Hide Explanation Box
    const explBox = document.getElementById('quiz-explanation-box');
    explBox.classList.add('hidden');
    explBox.innerHTML = '';

    // Disable Next button until answered
    const nextBtn = document.getElementById('quiz-next-btn');
    nextBtn.disabled = true;

    // Handle Timer
    const timerContainer = document.getElementById('quiz-timer-container');
    if (this.quizTimerDuration) {
      timerContainer.classList.remove('hidden');
      this.quizTimeLeft = this.quizTimerDuration;
      document.getElementById('quiz-timer-text').textContent = `${this.quizTimeLeft}s`;

      this.quizTimer = setInterval(() => {
        this.quizTimeLeft--;
        document.getElementById('quiz-timer-text').textContent = `${this.quizTimeLeft}s`;
        if (this.quizTimeLeft <= 0) {
          clearInterval(this.quizTimer);
          this.handleQuizTimeUp();
        }
      }, 1000);
    } else {
      timerContainer.classList.add('hidden');
    }

    if (window.lucide) lucide.createIcons();
  }

  selectQuizOption(selectedOpt, btnElement) {
    clearInterval(this.quizTimer);
    const q = this.quizQuestions[this.quizIndex];
    const isCorrect = (selectedOpt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());

    // Record answer
    this.quizUserAnswers.push({
      question: q,
      selected: selectedOpt,
      isCorrect
    });

    if (isCorrect) {
      this.quizScore++;
      btnElement.classList.remove('border-slate-200', 'dark:border-slate-800');
      btnElement.classList.add('border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-950/60', 'text-emerald-800', 'dark:text-emerald-200');
    } else {
      btnElement.classList.remove('border-slate-200', 'dark:border-slate-800');
      btnElement.classList.add('border-rose-500', 'bg-rose-50', 'dark:bg-rose-950/60', 'text-rose-800', 'dark:text-rose-200');
      this.quizMissedQuestions.push(q);
    }

    // Highlight Correct option
    document.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.disabled = true;
      if (btn.textContent.includes(q.correctAnswer)) {
        btn.classList.add('border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-950/60', 'text-emerald-800', 'dark:text-emerald-200');
      }
    });

    // Reveal Explanation Box
    const explBox = document.getElementById('quiz-explanation-box');
    explBox.innerHTML = `
      <div class="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
        <i data-lucide="${isCorrect ? 'check-circle' : 'alert-circle'}" class="w-4 h-4 ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}"></i>
        <span>${isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}</span>
      </div>
      <p class="text-slate-700 dark:text-slate-300">
        <strong>${q.targetWord.word}</strong> (${q.targetWord.pos}): <span class="font-hindi font-bold">${q.targetWord.hindiMeaning}</span>
      </p>
      <p class="text-slate-600 dark:text-slate-400">
        <strong>Synonyms:</strong> ${q.targetWord.synonyms.slice(0, 6).join(', ')}
      </p>
      <p class="text-slate-600 dark:text-slate-400">
        <strong>Antonyms (${q.targetWord.hindiAntonymMeaning}):</strong> ${q.targetWord.antonyms.slice(0, 5).join(', ')}
      </p>
    `;
    explBox.classList.remove('hidden');

    document.getElementById('quiz-next-btn').disabled = false;
    if (window.lucide) lucide.createIcons();
  }

  handleQuizTimeUp() {
    const q = this.quizQuestions[this.quizIndex];
    this.quizUserAnswers.push({
      question: q,
      selected: 'Time Expired',
      isCorrect: false
    });
    this.quizMissedQuestions.push(q);

    document.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.disabled = true;
      if (btn.textContent.includes(q.correctAnswer)) {
        btn.classList.add('border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-950/60', 'text-emerald-800', 'dark:text-emerald-200');
      }
    });

    const explBox = document.getElementById('quiz-explanation-box');
    explBox.innerHTML = `
      <div class="flex items-center gap-2 font-bold text-rose-600">
        <i data-lucide="clock" class="w-4 h-4"></i> Time Expired!
      </div>
      <p class="text-slate-700 dark:text-slate-300">
        Correct answer: <strong>${q.correctAnswer}</strong> (${q.targetWord.hindiMeaning})
      </p>
    `;
    explBox.classList.remove('hidden');
    document.getElementById('quiz-next-btn').disabled = false;
    if (window.lucide) lucide.createIcons();
  }

  nextQuizQuestion() {
    this.quizIndex++;
    this.renderQuizQuestion();
  }

  finishQuiz() {
    clearInterval(this.quizTimer);
    const total = this.quizQuestions.length;
    const accuracy = Math.round((this.quizScore / total) * 100);
    const elapsedSecs = Math.round((Date.now() - this.quizStartTime) / 1000);
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    const timeStr = `${mins}m ${secs}s`;

    document.getElementById('quiz-active-screen').classList.add('hidden');
    document.getElementById('quiz-results-screen').classList.remove('hidden');

    document.getElementById('quiz-result-score').textContent = `${this.quizScore} / ${total}`;
    document.getElementById('quiz-result-accuracy').textContent = `${accuracy}%`;
    document.getElementById('quiz-result-time').textContent = timeStr;

    // Result Message
    const msgEl = document.getElementById('quiz-result-message');
    if (accuracy >= 90) msgEl.textContent = '🌟 Outstanding! You have mastered these vocabulary words!';
    else if (accuracy >= 70) msgEl.textContent = '👏 Great work! Solid grasp of vocabulary and Hindi meanings.';
    else msgEl.textContent = '📚 Keep practicing! Review your missed words below.';

    // Confetti on high score
    if (accuracy >= 70 && typeof confetti === 'function') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // Retest Button
    const retestBtn = document.getElementById('btn-retest-incorrect');
    if (retestBtn) {
      if (this.quizMissedQuestions.length > 0) retestBtn.classList.remove('hidden');
      else retestBtn.classList.add('hidden');
    }

    // Detailed Review Breakdown
    const reviewList = document.getElementById('quiz-detailed-review-list');
    reviewList.innerHTML = this.quizUserAnswers.map((item, idx) => `
      <div class="p-3 rounded-2xl ${item.isCorrect ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800'} space-y-1">
        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-900 dark:text-white">Q${idx + 1}: ${item.question.targetWord.word}</span>
          <span class="font-bold ${item.isCorrect ? 'text-emerald-600' : 'text-rose-600'}">${item.isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
        </div>
        <p class="text-slate-600 dark:text-slate-300">
          Your Answer: <strong>${item.selected}</strong> | Correct: <strong class="text-emerald-700 dark:text-emerald-300">${item.question.correctAnswer}</strong>
        </p>
        <p class="text-slate-500 font-hindi">
          हिंदी अर्थ: ${item.question.targetWord.hindiMeaning} (विलोम: ${item.question.targetWord.hindiAntonymMeaning})
        </p>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  }

  retestIncorrectQuestions() {
    if (!this.quizMissedQuestions.length) return;
    const pool = this.quizMissedQuestions.map(q => q.targetWord);
    this.startMockTest(pool);
  }

  resetQuizArena() {
    document.getElementById('quiz-results-screen').classList.add('hidden');
    document.getElementById('quiz-active-screen').classList.add('hidden');
    document.getElementById('quiz-setup-screen').classList.remove('hidden');
  }

  quitQuiz() {
    if (confirm('Are you sure you want to exit the current test?')) {
      clearInterval(this.quizTimer);
      this.resetQuizArena();
    }
  }

  // ================= MEMORY MATCH GAME =================
  initMemoryGame() {
    clearInterval(this.gameTimer);
    this.gameSelected = [];
    this.gameMatched = 0;
    this.gameMoves = 0;
    this.gameSeconds = 0;

    const setVal = document.getElementById('game-set-select')?.value || 'all';
    let pool = [...this.words];
    if (setVal === '1') pool = this.words.filter(w => w.id >= 1 && w.id <= 50);
    else if (setVal === '2') pool = this.words.filter(w => w.id >= 51 && w.id <= 100);
    else if (setVal === '3') pool = this.words.filter(w => w.id >= 101 && w.id <= 150);
    else if (setVal === '4') pool = this.words.filter(w => w.id >= 151 && w.id <= 200);

    // Pick 6 random words
    const picked = [...pool].sort(() => 0.5 - Math.random()).slice(0, 6);

    // Generate 12 tiles: 6 words, 6 Hindi meanings
    this.gameTiles = [];
    picked.forEach(w => {
      this.gameTiles.push({ id: w.id, text: w.word, type: 'word', matched: false });
      this.gameTiles.push({ id: w.id, text: w.hindiMeaning, type: 'hindi', matched: false });
    });

    // Shuffle tiles
    this.gameTiles.sort(() => 0.5 - Math.random());

    // Update UI Stats
    document.getElementById('game-moves-count').textContent = '0';
    document.getElementById('game-matches-count').textContent = '0/6 Pairs';
    document.getElementById('game-timer-text').textContent = '00:00';

    this.renderMemoryTiles();

    // Start Timer
    this.gameTimer = setInterval(() => {
      this.gameSeconds++;
      const m = String(Math.floor(this.gameSeconds / 60)).padStart(2, '0');
      const s = String(this.gameSeconds % 60).padStart(2, '0');
      const timerEl = document.getElementById('game-timer-text');
      if (timerEl) timerEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  renderMemoryTiles() {
    const container = document.getElementById('memory-grid-container');
    if (!container) return;

    container.innerHTML = this.gameTiles.map((tile, idx) => `
      <div onclick="app.flipMemoryTile(${idx})" id="tile-${idx}" class="memory-tile h-24 sm:h-28 rounded-2xl cursor-pointer ${tile.matched ? 'matched opacity-50 pointer-events-none' : ''}">
        <div class="memory-tile-inner relative w-full h-full text-center">
          
          <!-- Back of Card (Hidden) -->
          <div class="memory-tile-front absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md font-extrabold text-lg">
            <i data-lucide="help-circle" class="w-6 h-6 opacity-60"></i>
          </div>

          <!-- Front of Card (Revealed) -->
          <div class="memory-tile-back absolute inset-0 rounded-2xl glass-panel border-2 border-indigo-400 dark:border-indigo-600 text-slate-900 dark:text-white flex items-center justify-center p-2 text-center font-bold text-xs sm:text-sm shadow-md ${tile.type === 'hindi' ? 'font-hindi text-indigo-600 dark:text-indigo-400 text-base' : ''}">
            ${tile.text}
          </div>

        </div>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  }

  flipMemoryTile(idx) {
    if (this.gameSelected.length >= 2) return;
    const tile = this.gameTiles[idx];
    if (tile.matched || this.gameSelected.some(s => s.idx === idx)) return;

    const tileEl = document.getElementById(`tile-${idx}`);
    if (tileEl) tileEl.classList.add('flipped');
    this.gameSelected.push({ idx, tile });

    if (this.gameSelected.length === 2) {
      this.gameMoves++;
      document.getElementById('game-moves-count').textContent = this.gameMoves;
      this.checkMemoryMatch();
    }
  }

  checkMemoryMatch() {
    const [first, second] = this.gameSelected;
    const match = (first.tile.id === second.tile.id && first.tile.type !== second.tile.type);

    if (match) {
      first.tile.matched = true;
      second.tile.matched = true;
      this.gameMatched++;
      document.getElementById('game-matches-count').textContent = `${this.gameMatched}/6 Pairs`;
      this.gameSelected = [];

      if (this.gameMatched === 6) {
        clearInterval(this.gameTimer);
        setTimeout(() => {
          if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80 });
          alert(`🎉 Congratulations! You completed Memory Match in ${this.gameMoves} moves!`);
        }, 500);
      }
    } else {
      setTimeout(() => {
        document.getElementById(`tile-${first.idx}`)?.classList.remove('flipped');
        document.getElementById(`tile-${second.idx}`)?.classList.remove('flipped');
        this.gameSelected = [];
      }, 900);
    }
  }

  // ================= BOOKMARKS / SAVED =================
  renderBookmarksList() {
    const container = document.getElementById('bookmarks-list-container');
    if (!container) return;

    const starred = this.words.filter(w => this.starredWords.has(w.id));
    if (!starred.length) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 glass-panel rounded-3xl space-y-3">
          <i data-lucide="bookmark" class="w-12 h-12 mx-auto text-slate-300"></i>
          <h3 class="text-base font-bold text-slate-700 dark:text-slate-300">No bookmarked words yet</h3>
          <p class="text-xs text-slate-500">Star words while studying or taking mock tests to review them here.</p>
          <button onclick="app.navigate('study')" class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs">Browse 200 Words</button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = starred.map(item => `
      <div class="glass-panel p-5 rounded-3xl space-y-3 border-l-4 border-l-amber-500">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-400">#${item.id} • ${item.pos}</span>
          <button onclick="app.toggleStarred(${item.id})" class="text-amber-500 hover:text-slate-400 p-1">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
        <div class="flex items-baseline justify-between">
          <h3 class="text-xl font-extrabold text-slate-900 dark:text-white">${item.word}</h3>
          <span class="font-hindi text-sm font-bold text-emerald-600 dark:text-emerald-400">${item.hindiMeaning}</span>
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-300">
          <strong>Synonyms:</strong> ${item.synonyms.slice(0, 5).join(', ')}
        </p>
        <p class="text-xs text-slate-600 dark:text-slate-300">
          <strong>Antonyms (${item.hindiAntonymMeaning}):</strong> ${item.antonyms.slice(0, 5).join(', ')}
        </p>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  }

  clearAllBookmarks() {
    if (confirm('Are you sure you want to clear all bookmarked words?')) {
      this.starredWords.clear();
      this.saveStorage();
      this.renderBookmarksList();
    }
  }

  startDailyGoalPractice() {
    this.navigate('flashcards');
  }

  // ================= TEXT TO SPEECH =================
  speakWord(wordText) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(wordText);
    utterance.rate = 0.9;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  // ================= KEYBOARD SHORTCUTS =================
  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Escape closes modal
      if (e.key === 'Escape') {
        this.closeWordModal();
      }

      // Flashcards navigation
      if (this.currentTab === 'flashcards' && !document.getElementById('word-modal').classList.contains('hidden')) {
        return;
      }

      if (this.currentTab === 'flashcards') {
        if (e.code === 'Space') {
          e.preventDefault();
          this.flipFlashcard();
        } else if (e.key === 'ArrowRight') {
          this.nextFlashcard();
        } else if (e.key === 'ArrowLeft') {
          this.prevFlashcard();
        } else if (e.key === '1') {
          this.rateFlashcard('hard');
        } else if (e.key === '2') {
          this.rateFlashcard('medium');
        } else if (e.key === '3') {
          this.rateFlashcard('easy');
        }
      }
    });
  }
}

// Global App Instance
// Global App Instance
window.app = new VocabMasterApp();
var app = window.app;

