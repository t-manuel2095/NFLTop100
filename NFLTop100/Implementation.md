# NFL Player Stats - Django DRF Project
## 7-Day Implementation Plan

---

## Day 1: Project Setup & Django Configuration

### Objectives
- Initialize Django project structure
- Set up virtual environment and dependencies
- Configure Django settings and basic project structure

### Tasks
1. **Install pipenv**
   x `pip install pipenv`

2. **Create Pipenv environment and install dependencies**
   x Create `Pipfile` with: Django, djangorestframework, django-filter, django-cors-headers
   x `pipenv install Django djangorestframework django-filter django-cors-headers`
   x Activate pipenv shell: `pipenv shell`

3. **Initialize Django project**
   x `django-admin startproject mywebapp .`
   x `python manage.py startapp players`

4. **Update `settings.py`**
   x Add `'rest_framework'` to `INSTALLED_APPS`
   x Add `'players'` to `INSTALLED_APPS`
   x Add `'corsheaders'` to `INSTALLED_APPS`
   x Configure CORS settings for frontend development
   x Configure static files for serving HTML/CSS/JS

5. **Create initial database migration**
   x `python manage.py makemigrations`
   x `python manage.py migrate`

6. **Create superuser**
   x `python manage.py createsuperuser`

### Deliverables
- ✅ Working Django project that runs without errors
- ✅ `Pipfile` and `Pipfile.lock` with all dependencies
- ✅ SQLite database initialized

### Time Estimate: 1-2 hours

---

## Day 2: Database Models & Serializers

### Objectives
- Reverse-engineer Player model from existing MSSQL database
- Create DRF serializers for data validation and transformation
- Configure Django to connect to MSSQL in read-only mode

### Tasks
1. **Verify MSSQL connection in settings.py**
   x Confirm `DATABASES` configuration with MSSQL credentials
   x Ensure connection details are stored securely (environment variables)
   x Test connection: `python manage.py dbshell`

2. **Reverse-engineer Player model from MSSQL**
   x Run: `python manage.py inspectdb > players/models.py`
   x This auto-generates model from existing MSSQL table schema
   x Review and customize the generated model if needed
   x Add `__str__` method and `Meta` class with ordering

3. **Configure model as read-only**
   x Add `managed = False` to Player model's `Meta` class (prevents Django migrations)
   x This ensures Django doesn't modify the MSSQL table structure

4. **Register model in admin** (`players/admin.py`)
   x Register Player model for Django admin (read-only browsing)
   x Customize list display for easy browsing
   x Optional: Set `readonly_fields` to prevent accidental edits

5. **Create PlayerSerializer** (`players/serializers.py`)
   x Use `ModelSerializer` for automatic field handling
   x Include all model fields
   x Add validation if needed (e.g., year range)

### Deliverables
- ✅ Player model successfully reverse-engineered from MSSQL
- ✅ Django connected to MSSQL database in read-only mode
- ✅ Admin interface accessible and model registered
- ✅ PlayerSerializer created and tested

### Time Estimate: 1-2 hours

---

## Day 3: REST API Endpoints (ViewSets & URLs)

### Objectives
x Create ViewSet for Player model
x Configure DRF router for automatic URL routing
x Test basic API endpoints

### Tasks
1. **Create PlayerViewSet** (`players/views.py`)
   x Inherit from `viewsets.ModelViewSet`
   x Set `queryset` and `serializer_class`
   x Add filtering using `django-filter` for year, position, team
   x Add search functionality for player name
   x Add custom actions:
     - `@action(detail=False)` for `/positions/` endpoint
     - `@action(detail=False)` for `/teams/` endpoint
     - `@action(detail=False)` for `/count/` endpoint
     - `@action(detail=False)` for `/search/` endpoint

2. **Configure URLs** (`players/urls.py`)
   x Import `DefaultRouter` from `rest_framework.routers`
   x Create router instance
   x Register PlayerViewSet
   x Include router URLs

3. **Update main URLs** (`mywebapp/urls.py`)
   x Include players app URLs at `/api/` prefix

4. **Test endpoints with Postman or curl**
   x GET `/api/players/`
   x GET `/api/players/?year=2025&position=QB`
   x GET `/api/players/positions/`
   x GET `/api/players/teams/`
   x GET `/api/players/count/`

### Deliverables
- ✅ All REST endpoints working and returning correct data
- ✅ Filtering and search functionality operational
- ✅ API responses in JSON format

### Time Estimate: 2-3 hours

---

## Day 4: Frontend Setup & HTML Structure

### Objectives
- Create static file structure
- Build HTML page with layout matching the Angular app
- Set up basic CSS framework

### Tasks
1. **Create static directory structure**
   ```
   static/
   ├── index.html
   ├── css/
   │   └── style.css
   ├── js/
   │   └── app.js
   └── images/
       ├── {player_name}/
       │   ├── 2015/
       │   ├── 2016/
       │   └── ... (years)
       └── ... (all players)
   ```

2. **Build HTML page** (`static/index.html`)
   x Create header with title and filter controls
   x Add search input box
   x Add year, position, and team filter dropdowns
   x Add "Clear Filters" and "Reload" buttons
   x Create player grid container with placeholder structure
   x Add loading spinner element
   x Add error message display
   x Add empty state message
   x Include favicon and metadata

3. **Basic CSS setup** (`static/css/style.css`)
   x Start with CSS variables for colors and spacing
   x Create grid layout (e.g., `display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`)
   x Style header and filter section
   x Create player card structure (ready for content)
   x Add responsive breakpoints for mobile

4. **Configure Django to serve static files**
   x Verify `STATIC_URL = '/static/'` in settings
   x Run `python manage.py collectstatic` (for production reference)

5. **Create player card template structure**
   - Image container
   - Rank badge
   - Player name and info
   - Position and team badges
   - Stats grid placeholder

### Deliverables
- ✅ HTML page displaying with proper structure
- ✅ Filter controls visible and accessible
- ✅ Responsive layout on desktop
- ✅ Player grid ready for content

### Time Estimate: 2-3 hours

---

## Day 5: Frontend CSS & Styling

### Objectives
- Complete CSS styling to match the Angular app
- Implement responsive design
- Add visual polish and animations

### Tasks
1. **Complete CSS styling** (`static/css/style.css`)
   - Header styling with background and shadow
   - Filter section with flexbox layout
   - Input and dropdown styling
   - Button styling (search, clear, retry)
   - Player card styling with shadows and borders
   - Badge styling for positions with position-specific colors
   - Team badge styling
   - Stats card styling with icons (use emoji or text)
   - Loading spinner animation
   - Error state styling
   - Empty state styling

2. **Implement position-based colors**
   - QB: Red (#e74c3c)
   - RB: Blue (#3498db)
   - WR: Green (#2ecc71)
   - TE: Orange (#f39c12)
   - OL: Purple (#9b59b6)
   - DL: Dark orange (#e67e22)
   - LB: Teal (#1abc9c)
   - CB: Dark gray (#34495e)
   - S: Light gray (#95a5a6)
   - K: Dark teal (#16a085)

3. **Add animations**
   - Card hover effects
   - Loading spinner
   - Smooth transitions
   - Image loading states

4. **Test responsiveness**
   - Desktop (1200px+)
   - Tablet (768px - 1199px)
   - Mobile (< 768px)

### Deliverables
- ✅ Fully styled HTML page matching design
- ✅ Responsive on all screen sizes
- ✅ Smooth animations and transitions

### Time Estimate: 3-4 hours

---

## Day 6: Frontend JavaScript - API & Data Handling

### Objectives
- Implement API communication layer
- Create application state management
- Build data filtering logic

### Tasks
1. **Create PlayerService class** (`static/js/app.js`)
   - `getAllPlayers()` - Fetch all players
   - `searchPlayers(searchTerm)` - Search players
   - `getPlayerByName(name)` - Get single player
   - `getPositions()` - Get unique positions
   - `getTeams()` - Get unique teams
   - `getPlayerCount()` - Get total count
   - Error handling with proper feedback

2. **Create AppState class**
   - Store players data
   - Store filtered players
   - Store filter values (year, position, team, search)
   - Store UI state (loading, error, error message)
   - Methods to update state

3. **Implement data loading**
   - Load all players on page load
   - Load positions and teams for dropdowns
   - Handle loading state
   - Handle error state with retry

4. **Implement filtering logic**
   - Filter by year
   - Filter by position
   - Filter by team
   - Search by player name (with debouncing)
   - Combine multiple filters

5. **Test API integration**
   - Verify data loads correctly
   - Test filtering combinations
   - Test error scenarios

### Deliverables
- ✅ API calls working from JavaScript
- ✅ Data properly retrieved and filtered
- ✅ Loading and error states handled
- ✅ Filter combinations working correctly

### Time Estimate: 3-4 hours

---

## Day 7: Frontend JavaScript - DOM Rendering & Polish

### Objectives
- Implement DOM manipulation to render player cards
- Add event listeners for filters
- Final testing and bug fixes

### Tasks
1. **Create DOM rendering functions** (`static/js/app.js`)
   - `renderPlayerCards(players)` - Render all cards
   - `createPlayerCard(player)` - Create single card element
   - `renderPositionDropdown(positions)`
   - `renderTeamDropdown(teams)`
   - `renderLoadingState()`
   - `renderErrorState(error)`
   - `renderEmptyState()`

2. **Implement event listeners**
   - Search input with debouncing (300ms)
   - Year filter dropdown
   - Position filter dropdown
   - Team filter dropdown
   - Clear filters button
   - Retry button
   - Image error handling (fallback to default avatar)

3. **Add helper functions**
   - `getPrimaryStats(player)` - Display relevant stats based on position
   - `getPositionBadgeColor(position)` - Return color for position
   - `getPlayerImageUrl(player)` - Construct image URL
   - `debounce(function, delay)` - Debounce search

4. **Handle special cases**
   - Player name display (playerName or fallback to player)
   - Conditional stat display based on position
   - Year label display when filtering
   - Wikipedia links if available

5. **Full testing**
   - Test all filters individually
   - Test filter combinations
   - Test search functionality
   - Test loading states
   - Test error handling
   - Test on different screen sizes
   - Test with various player data

6. **Final polish**
   - Fix any styling issues
   - Optimize performance
   - Add console logging for debugging
   - Test in multiple browsers

### Deliverables
- ✅ All player cards rendering correctly
- ✅ All filters and search working
- ✅ Loading and error states displaying
- ✅ Application fully functional and tested
- ✅ Clean, maintainable code

### Time Estimate: 4-5 hours

---

## Post-Implementation Checklist

- [ ] All API endpoints tested and working
- [ ] Frontend loads and displays data correctly
- [ ] All filters work individually and in combination
- [ ] Search with debouncing works smoothly
- [ ] Error handling displays appropriate messages
- [ ] Responsive design works on mobile, tablet, desktop
- [ ] No console errors
- [ ] Images load or fallback gracefully
- [ ] Code is clean and commented
- [ ] README.md with setup and usage instructions
- [ ] Virtual environment documented in .gitignore

---

## Optional Enhancements (If Time Permits)

- Add sorting by different stats (rank, name, yards)
- Add pagination for large datasets
- Add data export functionality (CSV/JSON)
- Add player comparison feature
- Add favorites/bookmarks feature
- Deploy to cloud platform (Heroku, AWS, etc.)
- Add automated tests (pytest, Jest)
- Implement caching for performance
- Add API rate limiting
- Create admin dashboard with charts

---

## Notes

- **Database**: Data can be loaded manually via admin or with a CSV import script
- **Images**: Organized in `static/images/` by player name and year
  - Structure: `static/images/{player_name}/{year}/{image_filename}`
  - Example: `static/images/Aaron Donald/2023/image.webp`
  - Reference dynamically in JavaScript: `/static/images/${playerName}/${year}/${imageFilename}`
- **Testing**: Test API with Postman before connecting frontend
- **Development**: Run `python manage.py runserver` to start development server (while in `pipenv shell`)
- **Frontend**: Access at `http://localhost:8000/`
- **Pipenv**: Use `pipenv shell` to activate the virtual environment, `pipenv install` to add new packages, or `pipenv run python manage.py` to run commands without activating shell
