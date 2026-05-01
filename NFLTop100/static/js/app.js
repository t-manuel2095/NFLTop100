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
    }

    setAllPlayers(players) {
        this.allPlayers = players;
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
        
        if (this.filters.year) {
            results = results.filter(p => p.year === parseInt(this.filters.year));
        }
        if (this.filters.position) {
            results = results.filter(p => p.pos === this.filters.position);
        }
        if (this.filters.team) {
            results = results.filter(p => p.tm === this.filters.team);
        }
        if (this.filters.search) {
            results = results.filter(p => 
                p.player.toLowerCase().includes(this.filters.search.toLowerCase())
            );
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

function getPrimaryStats(player) {
    const position = player.pos;
    
    const stats = {
        'QB': [
            { label: 'Pass Yards', value: player.yds || 0 },
            { label: 'TDs', value: player.td || 0 },
            { label: 'Interceptions', value: player.passing_int || 0 },
            { label: 'Completions', value: player.cmp || 0 }
        ],
        'RB': [
            { label: 'Rush Yards', value: player.yds2 || 0 },
            { label: 'Rush TDs', value: player.td2 || 0 },
            { label: 'Receptions', value: player.rec || 0 },
            { label: 'Games', value: player.g || 0 }
        ],
        'WR': [
            { label: 'Receptions', value: player.rec || 0 },
            { label: 'Rec Yards', value: player.yds3 || 0 },
            { label: 'Rec TDs', value: player.td3 || 0 },
            { label: 'Games', value: player.g || 0 }
        ],
        'TE': [
            { label: 'Receptions', value: player.rec || 0 },
            { label: 'Rec Yards', value: player.yds3 || 0 },
            { label: 'Rec TDs', value: player.td3 || 0 },
            { label: 'Games', value: player.g || 0 }
        ],
        'DL': [
            { label: 'Sacks', value: player.sk || 0 },
            { label: 'Solo Tackles', value: player.solo || 0 },
            { label: 'Games', value: player.g || 0 },
            { label: 'Games Started', value: player.gs || 0 }
        ],
        'LB': [
            { label: 'Solo Tackles', value: player.solo || 0 },
            { label: 'Sacks', value: player.sk || 0 },
            { label: 'Games', value: player.g || 0 },
            { label: 'Games Started', value: player.gs || 0 }
        ],
        'CB': [
            { label: 'Interceptions', value: player.int2 || 0 },
            { label: 'Solo Tackles', value: player.solo || 0 },
            { label: 'Games', value: player.g || 0 },
            { label: 'Games Started', value: player.gs || 0 }
        ],
        'S': [
            { label: 'Solo Tackles', value: player.solo || 0 },
            { label: 'Interceptions', value: player.int2 || 0 },
            { label: 'Games', value: player.g || 0 },
            { label: 'Games Started', value: player.gs || 0 }
        ],
        'OL': [
            { label: 'Games Started', value: player.gs || 0 },
            { label: 'Games', value: player.g || 0 },
            { label: '-', value: '-' },
            { label: '-', value: '-' }
        ],
        'K': [
            { label: 'Games', value: player.g || 0 },
            { label: 'Games Started', value: player.gs || 0 },
            { label: '-', value: '-' },
            { label: '-', value: '-' }
        ]
    };
    
    return stats[position] || [
        { label: 'Games', value: player.g || 0 },
        { label: 'Solo Tackles', value: player.solo || 0 },
        { label: 'Sacks', value: player.sk || 0 },
        { label: 'Interceptions', value: player.int2 || 0 }
    ];
}

// Helper: Check if year filter is active
function isYearFilterActive() {
    return appState.filters.year !== null && appState.filters.year !== '';
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

// Helper: Get year label for display
function getYearLabel(player) {
    if (isYearFilterActive()) {
        return `<div class="year-label">Year: ${player.year || 'Unknown'}</div>`;
    }
    return '';
}

function createPlayerCard(player) {
    const primaryStats = getPrimaryStats(player);
    const badgeColor = getPositionBadgeColor(player.pos);
    const displayName = getPlayerDisplayName(player);
    const wikiLink = getWikipediaLink(player);
    const yearLabel = getYearLabel(player);
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
                src="" 
                alt="${displayName}" 
                class="player-card-image"
                onerror="this.src='/static/images/placeholder.jpg'"
            >
            <div class="player-card-content">
                <div class="player-rank">RANK #${player.rank}</div>
                <div class="player-name-container">
                    <h2 class="player-name">${displayName}</h2>
                </div>
                ${yearLabel}
                <div class="player-badges">
                    <span class="badge pos-${player.pos}" style="background-color: ${badgeColor};">${player.pos}</span>
                    <span class="badge team-badge">${player.tm || 'Free agent'}</span>
                    <span class="badge year-badge">${player.year}</span>
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
    fetch(`/api/players/image/?player=${playerName}&year=${year}`)
        .then(response => response.json())
        .then(data => {
            if (data.filename) {
                const img = card.querySelector('.player-card-image');
                img.src = `/static/images/${playerName}/${year}/${data.filename}`;
            }
        })
        .catch(() => {
            // Image not found, placeholder will show
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

function renderPositionDropdown(positions) {
    const select = document.getElementById('position-filter');
    if (!select) return;
    
    select.innerHTML = '<option value="">All Positions</option>';
    
    // Sort positions alphabetically
    const sortedPositions = [...positions].sort();
    
    sortedPositions.forEach(pos => {
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
    
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
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

        // Load positions for dropdown
        const positionsResponse = await playerService.getPositions();
        appState.positions = positionsResponse.positions || positionsResponse;
        renderPositionDropdown(appState.positions);

        // Load teams for dropdown
        const teamsResponse = await playerService.getTeams();
        appState.teams = teamsResponse.teams || teamsResponse;
        renderTeamDropdown(appState.teams);

        // Set default filter to most recent year
        const mostRecentYear = Math.max(...uniqueYears);
        appState.updateFilter('year', mostRecentYear);
        
        // Update year dropdown to show selected year
        const yearSelect = document.getElementById('year-filter');
        if (yearSelect) {
            yearSelect.value = mostRecentYear;
        }

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

// Clear all filters
function clearAllFilters() {
    appState.clearFilters();
    
    // Reset form inputs
    const yearSelect = document.getElementById('year-filter');
    const positionSelect = document.getElementById('position-filter');
    const teamSelect = document.getElementById('team-filter');
    const searchInput = document.getElementById('search-input');
    
    if (yearSelect) yearSelect.value = '';
    if (positionSelect) positionSelect.value = '';
    if (teamSelect) teamSelect.value = '';
    if (searchInput) searchInput.value = '';
    
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

    // Retry button
    const retryButton = document.getElementById('retry-btn');
    if (retryButton) {
        retryButton.addEventListener('click', retryLoading);
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