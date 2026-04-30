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
            results = results.filter(p => p.year === this.filters.year);
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

function createPlayerCard(player) {
    // Get the first image for this player's year
    const imageUrl = `/static/images/${player.player}/${player.year}/image.webp`;
    
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
        <img 
            src="${imageUrl}" 
            alt="${player.player}" 
            class="player-card-image"
            onerror="this.src='/static/images/placeholder.jpg'"
        >
        <div class="player-card-content">
            <div class="player-rank">RANK #${player.rank}</div>
            <h2 class="player-name">${player.player}</h2>
            <div class="player-position">Position: ${player.pos}</div>
            <div class="player-team">Team: ${player.tm}</div>
            <div class="player-badges">
                <span class="badge pos-${player.pos}">${player.pos}</span>
                <span class="badge team-badge">${player.tm}</span>
            </div>
            <div class="player-stats">
                <div class="stat">
                    <div class="stat-value">${player.g}</div>
                    <div class="stat-label">Games</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${player.solo}</div>
                    <div class="stat-label">Solo Tackles</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${player.sk}</div>
                    <div class="stat-label">Sacks</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${player.int2}</div>
                    <div class="stat-label">Interceptions</div>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Initialize services
const playerService = new PlayerService();
const appState = new AppState();

// Load data on page load
async function initializeApp() {
    try {
        appState.setLoading(true);
        appState.setError(false);

        // Load all players
        const players = await playerService.getAllPlayers();
        appState.setAllPlayers(players);

        // Load positions for dropdown
        const positionsResponse = await playerService.getPositions();
        appState.positions = positionsResponse.results || positionsResponse;

        // Load teams for dropdown
        const teamsResponse = await playerService.getTeams();
        appState.teams = teamsResponse.results || teamsResponse;

        appState.setLoading(false);
    } catch (error) {
        appState.setError(true, error.message);
        appState.setLoading(false);
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
    
    container.innerHTML = '';
    
    appState.filteredPlayers.forEach(player => {
        container.appendChild(createPlayerCard(player));
    });
}

// Then insert into grid:
const container = document.getElementById('players-container');
if (container && typeof players !== 'undefined') {
    players.forEach(player => {
        container.appendChild(createPlayerCard(player));
    });
}