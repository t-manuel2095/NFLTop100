class PlayerService {
    constructor() {
        this.baseUrl = '/api/players';
    }

    async getAllPlayers() {
        try {
            const response = await fetch(`${this.baseUrl}/`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch players: ${error.message}`);
        }
    }

    async searchPlayers(searchTerm) {
        try {
            const params = new URLSearchParams({ search: searchTerm });
            const response = await fetch(`${this.baseUrl}/?${params}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    async getPlayerByName(name) {
        try {
            const response = await fetch(`${this.baseUrl}/?search=${encodeURIComponent(name)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const players = await response.json();
            return players.length > 0 ? players[0] : null;
        } catch (error) {
            throw new Error(`Failed to fetch player: ${error.message}`);
        }
    }

    async getPositions() {
        try {
            const response = await fetch(`${this.baseUrl}/positions/`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch positions: ${error.message}`);
        }
    }

    async getTeams() {
        try {
            const response = await fetch(`${this.baseUrl}/teams/`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch teams: ${error.message}`);
        }
    }

    async getPlayerCount() {
        try {
            const response = await fetch(`${this.baseUrl}/count/`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch player count: ${error.message}`);
        }
    }
}

class AppState {
    constructor() {
        this.allPlayers = [];
        this.filteredPlayers = [];
        
        this.filters = {
            year: null,
            position: null,
            team: null,
            search: ''
        };
        
        this.ui = {
            loading: false,
            error: false,
            errorMessage: ''
        };
        
        this.positions = [];
        this.teams = [];
        this.playerLookup = new Map();
    }

    buildPlayerLookup() {
        this.playerLookup = new Map();
        for (const p of this.allPlayers) {
            this.playerLookup.set(`${p.player}|${p.year}`, p);
        }
    }

    getStatsYear(filterYear) {
        const year = parseInt(filterYear, 10);
        return isNaN(year) ? filterYear : year - 1;
    }

    mergeRankWithStatsYear(rankPlayer, statsYear) {
        const statsPlayer = this.playerLookup.get(`${rankPlayer.player}|${statsYear}`);
        if (!statsPlayer) {
            return { ...rankPlayer };
        }
        return {
            ...statsPlayer,
            rank: rankPlayer.rank,
            year: rankPlayer.year,
        };
    }

    mergePlayerWithPriorYear(player) {
        return this.mergeRankWithStatsYear(player, this.getStatsYear(player.year));
    }

    shouldApplyYearMerge() {
        return Boolean(
            this.filters.year ||
            (this.filters.search && this.filters.search.trim()) ||
            this.filters.position ||
            this.filters.team
        );
    }

    setAllPlayers(players) {
        this.allPlayers = players;
        this.buildPlayerLookup();
        this.applyFilters();
    }

    setFilteredPlayers(players) {
        this.filteredPlayers = players;
    }

    updateFilter(filterName, value) {
        this.filters[filterName] = value;
        this.applyFilters();
    }

    setLoading(isLoading) {
        this.ui.loading = isLoading;
    }

    setError(hasError, message = '') {
        this.ui.error = hasError;
        this.ui.errorMessage = message;
    }

    applyFilters() {
        let results = this.allPlayers;
        const searchActive = Boolean(this.filters.search && this.filters.search.trim());
        const applyYearFilter = this.filters.year && !(useDefaultYearView && searchActive);
        
        if (applyYearFilter) {
            results = results.filter(p => p.year === parseInt(this.filters.year, 10));
        }
        if (searchActive) {
            results = results.filter(p => 
                p.player.toLowerCase().includes(this.filters.search.toLowerCase())
            );
        }
        
        if (this.shouldApplyYearMerge()) {
            results = results.map(p => this.mergePlayerWithPriorYear(p));
        }
        
        if (this.filters.position) {
            results = results.filter(p => playerMatchesPositionFilter(p, this.filters.position));
        }
        if (this.filters.team) {
            results = results.filter(p => p.tm === this.filters.team);
        }
        
        if (searchActive) {
            results.sort((a, b) => a.year - b.year || a.rank - b.rank);
        } else if (this.filters.year) {
            results.sort((a, b) => a.rank - b.rank);
        }
        
        this.filteredPlayers = results;
    }

    clearFilters() {
        this.filters = { year: null, position: null, team: null, search: '' };
        this.applyFilters();
    }
}

// Helper Functions
function getPlayerImageUrl(player) {
    // Images are stored in: /static/images/{player_name}/{year}/
    // Return the directory path, and the image tag will handle finding the actual file
    
    const playerName = encodeURIComponent(player.player);
    const year = player.year || 2025;
    
    // Return a directory path - the backend or frontend will need to resolve the actual filename
    return `/static/images/${playerName}/${year}/`;
}

function getPositionBadgeColor(position) {
    const positionColors = {
        'QB': '#e74c3c',
        'RB': '#3498db',
        'WR': '#2ecc71',
        'TE': '#f39c12',
        'OL': '#9b59b6',
        'DL': '#e67e22',
        'LB': '#1abc9c',
        'CB': '#34495e',
        'S': '#95a5a6',
        'K': '#16a085'
    };
    return positionColors[position] || '#95a5a6';
}

// Team colors mapping
const teamColors = {
    'ARI': '#97233F',  // Arizona Cardinals - Cardinal Red
    'ATL': '#000000',  // Atlanta Falcons - Black
    'BAL': '#241773',  // Baltimore Ravens - Purple
    'BUF': '#00338D',  // Buffalo Bills - Royal Blue
    'CAR': '#0085CA',  // Carolina Panthers - Panther Blue
    'CHI': '#0B162A',  // Chicago Bears - Navy
    'CIN': '#FB4F14',  // Cincinnati Bengals - Orange
    'CLE': '#311D00',  // Cleveland Browns - Brown
    'DAL': '#003594',  // Dallas Cowboys - Navy
    'DEN': '#FB4F14',  // Denver Broncos - Orange
    'DET': '#0076B6',  // Detroit Lions - Honolulu Blue
    'GNB': '#203731',  // Green Bay Packers - Green
    'HOU': '#03202F',  // Houston Texans - Navy
    'IND': '#002C5F',  // Indianapolis Colts - Royal Blue
    'JAX': '#006687',  // Jacksonville Jaguars - Teal
    'KAN': '#E31828',  // Kansas City Chiefs - Red
    'LVR': '#000000',  // Las Vegas Raiders - Black
    'LAC': '#0080D4',  // Los Angeles Chargers - Powder Blue
    'LAR': '#003594',  // Los Angeles Rams - Royal Blue
    'MIA': '#00A3E0',  // Miami Dolphins - Aqua
    'MIN': '#4F2683',  // Minnesota Vikings - Purple
    'NWE': '#002244',  // New England Patriots - Navy
    'NOR': '#D3BC8D',  // New Orleans Saints - Old Gold
    'NYG': '#0B3278',  // New York Giants - Blue
    'NYJ': '#125740',  // New York Jets - Green
    'PHI': '#004953',  // Philadelphia Eagles - Midnight Green
    'PIT': '#27251F',  // Pittsburgh Steelers - Black
    'SFO': '#AA0000',  // San Francisco 49ers - Red
    'SEA': '#0C2C56',  // Seattle Seahawks - Navy
    'TAM': '#D50A0A',  // Tampa Bay Buccaneers - Red
    'TEN': '#0C2C56',  // Tennessee Titans - Navy
    'WAS': '#5A1930'   // Washington Commanders - Burgundy
};

const teamNames = {
    'ARI': 'Cardinals',
    'ATL': 'Falcons',
    'BAL': 'Ravens',
    'BUF': 'Bills',
    'CAR': 'Panthers',
    'CHI': 'Bears',
    'CIN': 'Bengals',
    'CLE': 'Browns',
    'DAL': 'Cowboys',
    'DEN': 'Broncos',
    'DET': 'Lions',
    'GNB': 'Packers',
    'HOU': 'Texans',
    'IND': 'Colts',
    'JAX': 'Jaguars',
    'KAN': 'Chiefs',
    'LAC': 'Chargers',
    'LAR': 'Rams',
    'LVR': 'Raiders',
    'MIA': 'Dolphins',
    'MIN': 'Vikings',
    'NOR': 'Saints',
    'NWE': 'Patriots',
    'NYG': 'Giants',
    'NYJ': 'Jets',
    'OAK': 'Raiders',
    'PHI': 'Eagles',
    'PIT': 'Steelers',
    'SDG': 'Chargers',
    'SEA': 'Seahawks',
    'SFO': '49ers',
    'STL': 'Rams',
    'TAM': 'Buccaneers',
    'TEN': 'Titans',
    'WAS': 'Commanders',
};

function getTeamDisplayName(abbr) {
    return teamNames[abbr] || abbr;
}

function getTeamColor(teamAbbr) {
    if (!teamAbbr || teamAbbr === null || teamAbbr === '') {
        return '#FFFFFF';
    }
    return teamColors[teamAbbr] || '#000000';
}

function getTextColor(bgColor) {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
}

const positionGroup = {
    FB: 'RB',
    HB: 'RB',
    TE: 'WR',
    OT: 'OL',
    C: 'OL', 
    G: 'OL',
    OG: 'OL',
    T: 'OL',
    DE: 'DL',
    DT: 'DL',
    ILB: 'LB',
    OLB: 'LB',
    MLB: 'LB',
    CB: 'DB',
    S: 'DB',
    SS: 'DB',
    FS: 'DB',
};

const filterPositions = [
    'QB', 'RB', 'FB', 'WR', 'TE', 'OL',
    'DL', 'MLB', 'CB', 'FS', 'S', 'K', 'P',
];

// Filter dropdown value → DB position codes
const positionFilterMap = {
    QB: ['QB'],
    RB: ['RB', 'HB'],
    FB: ['FB'],
    WR: ['WR'],
    TE: ['TE'],
    OL: ['OL', 'OT', 'C', 'G', 'OG', 'T'],
    DL: ['DL', 'DE', 'DT'],
    MLB: ['MLB', 'ILB', 'OLB', 'LB'],
    CB: ['CB'],
    FS: ['FS'],
    S: ['S', 'SS'],
    K: ['K'],
    P: ['P'],
};

function playerMatchesPositionFilter(player, filterPos) {
    const matches = positionFilterMap[filterPos];
    if (!matches) return player.pos === filterPos;
    return matches.includes(player.pos);
}

function getPrimaryStats(player) {
    const position = positionGroup[player.pos] || player.pos;
    
    const stats = {
        //Offense
        'QB': [
            { label: 'TD/INT/Yds', value: `${player.td ?? 0}/${player.passing_int ?? 0}/${player.yds ?? 0}` },
            { label: 'Pass: Comp/Att/%', value: `${player.cmp ?? 0}/${player.att ?? 0}/${(player.cmp / player.att * 100).toFixed(1)}%` }, 
            { label: 'Rush: Yds/Att', value: `${player.yds2 ?? 0}/${player.att2 ?? 0}` },
            { label: 'Games: Played/Started', value: `${player.g ?? 0}/${player.gs ?? 0}` }
        ],
        'RB': [
            { label: 'Rush: Yds/Att/YPC', value: `${player.yds2 ?? 0}/${player.att2 ?? 0}/${(player.yds2 / player.att2 ).toFixed(1)}` },
            { label: 'Receiving: Yds/Att/YPR', value: `${player.yds3 ?? 0}/${player.rec ?? 0}/${(player.yds3 / player.rec ).toFixed(1)}` },
            { label: 'Games Started', value: player.gs || 0 },
            { label: 'Games Played', value: player.g || 0 }
        ],
        'WR': [
            { label: 'Receiving: Yds/Att', value: `${player.yds3 ?? 0}/${player.rec ?? 0}` },
            { label: 'Rec Yards', value: player.rec ? ((player.yds3 ?? 0) / player.rec).toFixed(1) : '0.0' },
            { label: 'Rec TDs', value: player.td3 || 0 },
            { label: 'Games: Played/Started', value: `${player.g ?? 0}/${player.gs ?? 0}` }
        ],
        'OL': [
            { label: 'Games: Played/Started', value: `${player.g ?? 0}/${player.gs ?? 0}` },
            { label: 'Solo Tackles', value: player.solo || 0 },
            { label: '-', value: '-' },
            { label: '-', value: '-' }
        ],
        //Defense
        'DL': [
            { label: 'Sacks', value: player.sk || 0 },
            { label: 'Solo Tackles', value: player.solo || 0 },
            { label: 'Interceptions', value: player.int2 || 0 },
            { label: 'Games: Played/Started', value: `${player.g ?? 0}/${player.gs ?? 0}` }
        ],
        'LB': [
            { label: 'Sacks', value: player.sk || 0 },
            { label: 'Solo Tackles', value: player.solo || 0 },
            { label: 'Interceptions', value: player.int2 || 0 },
            { label: 'Games: Played/Started', value: `${player.g ?? 0}/${player.gs ?? 0}` }
        ],
        'DB': [
            { label: 'Interceptions', value: player.int2 || 0 },
            { label: 'Solo Tackles', value: player.solo || 0 },
            { label: 'Sacks', value: player.sk || 0 },
            { label: 'Games: Played/Started', value: `${player.g ?? 0}/${player.gs ?? 0}` }
        ],
        //Special Teams
        'K': [
            { label: 'Games', value: player.g || 0 },
            { label: 'Games Started', value: player.gs || 0 },
            { label: '-', value: '-' },
            { label: '-', value: '-' }
        ]
        
    };
    return stats[position] ?? [];
}

// Default year set on app load (most recent year in data)
let defaultYear = null;
let useDefaultYearView = true;

function applyDefaultYearView() {
    useDefaultYearView = true;
    if (defaultYear !== null) {
        appState.filters.year = defaultYear;
        appState.applyFilters();
    }
    const yearSelect = document.getElementById('year-filter');
    if (yearSelect) yearSelect.value = '';
}

// NFL MVP by award year; card year Y → MVP from award year Y - 1 (matches stats shift)
const mvpByAwardYear = {
    2024: 'Josh Allen',
    2023: 'Lamar Jackson',
    2022: 'Patrick Mahomes',
    2021: 'Aaron Rodgers',
    2020: 'Aaron Rodgers',
    2019: 'Lamar Jackson',
    2018: 'Patrick Mahomes',
    2017: 'Tom Brady',
    2016: 'Matt Ryan',
    2015: 'Cam Newton',
    2014: 'Aaron Rodgers',
    2013: 'Peyton Manning',
    2012: 'Adrian Peterson',
    2011: 'Aaron Rodgers',
    2010: 'Tom Brady',
};

function getMvpForCardYear(cardYear) {
    const awardYear = parseInt(cardYear, 10) - 1;
    return mvpByAwardYear[awardYear] || null;
}

function isPlayerMvpForYear(player) {
    const mvp = getMvpForCardYear(player.year);
    return Boolean(mvp && player.player === mvp);
}

function getYearBadgeHtml(player) {
    const showYear = shouldShowYearOnCard(player);
    const isMvp = isPlayerMvpForYear(player);
    const parts = [];

    if (showYear) {
        parts.push(`<span class="badge year-badge">${player.year}</span>`);
    }
    if (isMvp) {
        parts.push(`<span class="badge mvp-badge">MVP 🏆</span>`);
    }
    return parts.join('');
}

// Helper: Check if year filter is active
function isYearFilterActive() {
    return appState.filters.year !== null && appState.filters.year !== '';
}

function isSearchActive() {
    return Boolean(appState.filters.search && appState.filters.search.trim());
}

function isPositionFilterActive() {
    return Boolean(appState.filters.position);
}

function isTeamFilterActive() {
    return Boolean(appState.filters.team);
}

// Hide year on cards when only the year filter is set (redundant), or for the default year
function shouldShowYearOnCard(player) {
    if (isSearchActive()) return true;
    if (isPositionFilterActive()) return true;
    if (isTeamFilterActive()) return true;
    if (isYearFilterActive()) return false;
    if (defaultYear !== null && parseInt(player.year, 10) === defaultYear) return false;
    return true;
}

// Helper: Get display name (playerName or fallback to player)
function getPlayerDisplayName(player) {
    return player.playerName || player.player || 'Unknown Player';
}

// Helper: Generate Wikipedia link if available
function getWikipediaLink(player) {
    // Check if wikipedia field exists in player data
    if (player.wikipedia) {
        return `<a href="${player.wikipedia}" target="_blank" class="wiki-link" title="View on Wikipedia">📖</a>`;
    }
    // Construct Wikipedia URL from player name as fallback
    const playerName = getPlayerDisplayName(player).replace(/\s+/g, '_');
    return `<a href="https://en.wikipedia.org/wiki/${playerName}" target="_blank" class="wiki-link" title="View on Wikipedia">📖</a>`;
}

function createPlayerCard(player) {
    const primaryStats = getPrimaryStats(player);
    const badgeColor = getPositionBadgeColor(player.pos);
    const displayName = getPlayerDisplayName(player);
    const wikiLink = getWikipediaLink(player);
    const yearBadge = getYearBadgeHtml(player);
    const teamColor = getTeamColor(player.tm);
    const textColor = getTextColor(teamColor);
    
    const statsHtml = primaryStats.map(stat => `
        <div class="stat">
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        </div>
    `).join('');
    
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
        <div class="player-card-container" style="background-color: ${teamColor}; color: ${textColor};">
            <img 
                alt="${displayName}" 
                class="player-card-image"
            >
            <div class="player-card-content">
                <div class="player-rank">RANK #${player.rank}</div>
                <div class="player-name-container">
                    <h2 class="player-name">${displayName} ${wikiLink}</h2>
                </div>
                <div class="player-badges">
                    <span class="badge pos-${player.pos}" style="background-color: ${badgeColor};">${player.pos}</span>
                    <span class="badge team-badge">${player.tm || 'Free agent'}</span>
                    ${yearBadge}
                </div>
                <div class="player-stats">
                    ${statsHtml}
                </div>
            </div>
        </div>
    `;
    
    // Load the correct image filename via API
    const playerName = encodeURIComponent(player.player);
    const year = player.year || 2025;
    const img = card.querySelector('.player-card-image');
    fetch(`/api/players/image/?player=${playerName}&year=${year}`)
        .then(response => {
            if (!response.ok) return null;
            return response.json();
        })
        .then(data => {
            if (!data?.filename) return;
            const folder = encodeURIComponent(data.folder || player.player);
            img.src = `/static/images/${folder}/${year}/${encodeURIComponent(data.filename)}`;
            img.onerror = () => {
                img.onerror = null;
                img.removeAttribute('src');
            };
        })
        .catch(() => {
            // No image — gray background from CSS remains visible
        });
    
    return card;
}

// Initialize services
const playerService = new PlayerService();
const appState = new AppState();

// DOM Rendering Functions
function renderLoadingState() {
    const container = document.getElementById('players-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading players...</p>
        </div>
    `;
}

function renderErrorState(error) {
    const container = document.getElementById('players-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-state">
            <p class="error-message">⚠️ ${error}</p>
            <button onclick="retryLoading()">Retry</button>
        </div>
    `;
}

function renderEmptyState() {
    const container = document.getElementById('players-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <p>No players found matching your filters</p>
            <button onclick="clearAllFilters()">Clear Filters</button>
        </div>
    `;
}

function renderPositionDropdown() {
    const select = document.getElementById('position-filter');
    if (!select) return;
    
    select.innerHTML = '<option value="">All Positions</option>';
    
    filterPositions.forEach(pos => {
        const option = document.createElement('option');
        option.value = pos;
        option.textContent = pos;
        select.appendChild(option);
    });
}

function renderYearDropdown(availableYears) {
    const select = document.getElementById('year-filter');
    if (!select) return;
    
    select.innerHTML = '<option value="">All Years</option>';
    
    // Sort years in descending order
    const sortedYears = [...availableYears].sort((a, b) => b - a);
    
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    });
}

function renderTeamDropdown(teams) {
    const select = document.getElementById('team-filter');
    if (!select) return;
    
    select.innerHTML = '<option value="">All Teams</option>';
    
    const sortedTeams = [...teams]
        .filter(team => team)
        .map(abbr => ({ abbr, name: getTeamDisplayName(abbr) }))
        .sort((a, b) => a.name.localeCompare(b.name));
    
    sortedTeams.forEach(({ abbr, name }) => {
        const option = document.createElement('option');
        option.value = abbr;
        option.textContent = name;
        select.appendChild(option);
    });
}

function renderPlayerCards(players) {
    const container = document.getElementById('players-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (players.length === 0) {
        renderEmptyState();
        return;
    }
    
    players.forEach(player => {
        container.appendChild(createPlayerCard(player));
    });
}

// Load data on page load
async function initializeApp() {
    try {
        renderLoadingState();

        // Load all players
        const players = await playerService.getAllPlayers();
        appState.setAllPlayers(players);

        // Get unique years from players data
        const uniqueYears = [...new Set(players.map(p => p.year).filter(y => y))];

        // Render year dropdown with actual data years
        renderYearDropdown(uniqueYears);

        renderPositionDropdown();

        // Load teams for dropdown
        const teamsResponse = await playerService.getTeams();
        appState.teams = teamsResponse.teams || teamsResponse;
        renderTeamDropdown(appState.teams);

        // Set default to most recent year (dropdown stays on All Years)
        defaultYear = Math.max(...uniqueYears);
        applyDefaultYearView();

        // Render players with default year filter
        renderPlayerCards(appState.filteredPlayers);
    } catch (error) {
        renderErrorState(error.message);
    }
}

// Retry function
async function retryLoading() {
    await initializeApp();
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Debounce function for search
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// Filter event handlers
function handleYearFilter(year) {
    useDefaultYearView = false;
    appState.updateFilter('year', year || null);
    renderPlayers();
}

function handlePositionFilter(position) {
    appState.updateFilter('position', position || null);
    renderPlayers();
}

function handleTeamFilter(team) {
    appState.updateFilter('team', team || null);
    renderPlayers();
}

function handleSearch(searchTerm) {
    appState.updateFilter('search', searchTerm);
    renderPlayers();
}

// Debounced search handler
const debouncedSearch = debounce(handleSearch, 300);

// Clear all filters — reset to default year view (2025 data, All Years label)
function clearAllFilters() {
    appState.filters.position = null;
    appState.filters.team = null;
    appState.filters.search = '';

    const positionSelect = document.getElementById('position-filter');
    const teamSelect = document.getElementById('team-filter');
    const searchInput = document.getElementById('search-input');

    if (positionSelect) positionSelect.value = '';
    if (teamSelect) teamSelect.value = '';
    if (searchInput) searchInput.value = '';

    applyDefaultYearView();
    renderPlayers();
}

// Render players to the grid
function renderPlayers() {
    const container = document.getElementById('players-container');
    if (!container) return;
    
    if (appState.filteredPlayers.length === 0) {
        renderEmptyState();
        return;
    }
    
    container.innerHTML = '';
    renderPlayerCards(appState.filteredPlayers);
}

// Event Listeners Setup
function setupEventListeners() {
    // Year filter
    const yearSelect = document.getElementById('year-filter');
    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            handleYearFilter(e.target.value);
        });
    }

    // Position filter
    const positionSelect = document.getElementById('position-filter');
    if (positionSelect) {
        positionSelect.addEventListener('change', (e) => {
            handlePositionFilter(e.target.value);
        });
    }

    // Team filter
    const teamSelect = document.getElementById('team-filter');
    if (teamSelect) {
        teamSelect.addEventListener('change', (e) => {
            handleTeamFilter(e.target.value);
        });
    }

    // Search input with debouncing
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }

    // Clear filters button
    const clearButton = document.getElementById('clear-filters-btn');
    if (clearButton) {
        clearButton.addEventListener('click', clearAllFilters);
    }
}

// Update initializeApp to setup event listeners
const originalInitializeApp = initializeApp;
async function initializeAppWithListeners() {
    await originalInitializeApp();
    setupEventListeners();
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeAppWithListeners);

// Remove old initialization code
// The new rendering functions handle all DOM updates