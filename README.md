# NFL Top 100 Players

A Django REST Framework web application that displays the NFL's top 100 players with filtering and search capabilities.

## Overview

This project provides an interactive interface to browse NFL's top-rated players. Users can filter players by year, position, and team, search by player name, and view player statistics and rankings.

## Features

- **Player Cards**: Display player information including rank, position, team, year, and key statistics
- **Filtering**: Filter players by year, position, and team
- **Search**: Search for players by name with real-time results
- **Dynamic Images**: Automatically finds and displays player images from the file system
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **REST API**: Full REST API for all player data and filtering operations

## Project Structure

```
NFLTop100/
├── NFLTop100/                 # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── players/                   # Django app for player data
│   ├── models.py             # Player model
│   ├── views.py              # REST API endpoints
│   ├── serializers.py        # Data serializers
│   └── urls.py
├── static/
│   ├── css/
│   │   └── style.css         # Main styling
│   ├── js/
│   │   └── app.js            # Frontend application logic
│   ├── images/               # Player images organized by name/year
│   └── index.html            # Main HTML page
├── Pipfile                    # Python dependencies
└── manage.py                  # Django management script
```

## Tech Stack

- **Backend**: Django 4.x, Django REST Framework
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: MSSQL (read-only mode)
- **Additional**: django-filter, django-cors-headers

## Getting Started

### Prerequisites

- Python 3.14+
- pipenv
- MSSQL database with player data

### Installation

1. **Clone the repository**
   ```bash
   cd c:\Users\Manuel\source\repos\NFLTop100
   ```

2. **Install dependencies**
   ```bash
   pipenv install
   pipenv shell
   ```

3. **Configure database** (if needed)
   - Update `NFLTop100/settings.py` with your MSSQL connection details

4. **Run migrations** (if needed)
   ```bash
   python manage.py migrate
   ```

### Running the Development Server

```bash
python manage.py runserver
```

The application will be available at `http://localhost:8000/`

## Usage

- **View Players**: The app displays all players from the most recent year by default
- **Filter by Year**: Use the year dropdown to view players from different seasons
- **Filter by Position**: Select a position to see players in that role
- **Filter by Team**: Choose a team to view their players
- **Search**: Type a player name in the search box to find specific players
- **Clear Filters**: Click the "Clear Filters" button to reset all filters

## Image Structure

Player images should be organized as follows:
```
static/images/
└── {Player Name}/
    └── {Year}/
        └── {image_file}    # Can be .webp, .jpg, .jpeg, .avif, or .png
```

Example: `static/images/Aaron Donald/2023/image.webp`

## API Endpoints

- `GET /api/players/` - List all players with optional filtering
- `GET /api/players/positions/` - Get list of unique positions
- `GET /api/players/teams/` - Get list of unique teams
- `GET /api/players/count/` - Get total player count
- `GET /api/players/image/?player={name}&year={year}` - Get image filename for a player

## Frontend Development

The majority of the frontend development for this project was done with the assistance of **Cursor**, an AI-powered IDE. Cursor helped in:
- Building the responsive UI layout
- Creating the JavaScript application logic
- Implementing filtering and search functionality
- Styling and optimizing the user interface

## Notes

- The database is in read-only mode; player data cannot be modified through the application
- Images are dynamically discovered from the file system, supporting any image format (.webp, .jpg, .jpeg, .avif, .png)
- If an image is not found for a player, a placeholder is displayed

## License

This project is provided as-is for educational and personal use.
