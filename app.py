"""
The Villages Club & Activity Search - Flask Web Server
Serves the search application, REST APIs, and handles dynamic PDF uploads.
"""

from flask import Flask, jsonify, request, send_from_directory, render_template
import os
import json
import time
from extractor import extract_clubs_from_pdf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'clubs_data.json')
DEFAULT_PDF = os.path.join(BASE_DIR, 'Club-Contact-9.11.26.pdf')

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max PDF upload

# Global in-memory cache
clubs_cache = []
locations_cache = []
stats_cache = {}
last_updated = ""

def load_data():
    global clubs_cache, locations_cache, stats_cache, last_updated
    if not os.path.exists(DATA_FILE):
        if os.path.exists(DEFAULT_PDF):
            print(f"Data file not found. Extracting from {DEFAULT_PDF}...")
            extract_clubs_from_pdf(DEFAULT_PDF, DATA_FILE)
        else:
            clubs_cache = []
            return
            
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        clubs_cache = json.load(f)
        
    mtime = os.path.getmtime(DATA_FILE)
    last_updated = time.strftime('%B %d, %Y at %I:%M %p', time.localtime(mtime))
    
    # Calculate locations with counts
    loc_counts = {}
    for c in clubs_cache:
        loc = c.get('location') or 'Other / Not Listed'
        loc_counts[loc] = loc_counts.get(loc, 0) + 1
        
    locations_cache = [
        {"name": loc, "count": count, "map_url": f"https://www.google.com/maps/search/?api=1&query={loc.replace(' ', '+')}+The+Villages+FL"}
        for loc, count in sorted(loc_counts.items(), key=lambda x: x[0].lower())
    ]
    
    # Pre-calculate stats
    days_count = {}
    periods_count = {}
    for c in clubs_cache:
        for d in c.get('days', []):
            days_count[d] = days_count.get(d, 0) + 1
        p = c.get('time_period', 'Unknown')
        periods_count[p] = periods_count.get(p, 0) + 1
        
    stats_cache = {
        "total_clubs": len(clubs_cache),
        "total_locations": len(locations_cache),
        "days": days_count,
        "time_periods": periods_count,
        "last_updated": last_updated
    }
    print(f"Loaded {len(clubs_cache)} clubs across {len(locations_cache)} locations.")

# Initial load
load_data()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stats')
def get_stats():
    return jsonify(stats_cache)

@app.route('/api/locations')
def get_locations():
    return jsonify(locations_cache)

@app.route('/api/clubs')
def get_clubs():
    """
    Search and filter endpoint with optional pagination.
    Query parameters:
      - q: search term (club name, leader, room, code, keyword)
      - location: specific recreation center
      - day: day of the week (Monday, Tuesday, etc.)
      - week: frequency/week (Every week, 1st, 2nd, 3rd, 4th, 5th)
      - period: time period (Morning, Afternoon, Evening)
      - page: page number (default 1)
      - limit: items per page (default 0 = return all for client-side instant search)
    """
    q = request.args.get('q', '').strip().lower()
    day = request.args.get('day', '').strip()
    week = request.args.get('week', '').strip()
    period = request.args.get('period', '').strip()
    
    # Location Filter (supports multiple ?location= params or comma-separated ?location=A,B)
    raw_locations = request.args.getlist('location')
    locations = []
    for item in raw_locations:
        if item and item != 'all':
            for loc in item.split(','):
                loc_clean = loc.strip()
                if loc_clean and loc_clean != 'all':
                    if loc_clean.lower() in ('sawgrass', 'sawgrass grove', 'ezell', 'ezell recreation'):
                        locations.append('Ezell Recreation (Sawgrass Grove)')
                    else:
                        locations.append(loc_clean)
    
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 0))
    except ValueError:
        page = 1
        limit = 0
        
    filtered = clubs_cache
    
    if locations:
        loc_set = set(locations)
        filtered = [c for c in filtered if c.get('location') in loc_set]
        
    if day and day != 'all':
        filtered = [c for c in filtered if day in c.get('days', [])]
        
    if week and week != 'all':
        if week == 'Every week':
            filtered = [c for c in filtered if 'Every week' in c.get('weeks', [])]
        else:
            # If a specific week (1st, 2nd, etc.) is selected, include clubs that meet
            # on that specific week OR clubs that meet every week!
            filtered = [c for c in filtered if (week in c.get('weeks', []) or 'Every week' in c.get('weeks', []))]
        
    if period and period != 'all':
        filtered = [c for c in filtered if c.get('time_period') == period]
        
    if q:
        filtered = [
            c for c in filtered
            if q in c.get('name', '').lower()
            or q in c.get('location', '').lower()
            or q in c.get('leader', '').lower()
            or q in c.get('schedule_code', '').lower()
            or q in c.get('schedule_details', '').lower()
            or q in c.get('room_code', '').lower()
        ]
        
    total = len(filtered)
    
    if limit > 0:
        start = (page - 1) * limit
        end = start + limit
        results = filtered[start:end]
    else:
        results = filtered
        
    return jsonify({
        "total": total,
        "page": page,
        "limit": limit,
        "clubs": results
    })

@app.route('/api/upload', methods=['POST'])
def upload_pdf():
    """
    Upload and re-extract an updated Club-Contact PDF.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "File must be a PDF"}), 400
        
    save_path = os.path.join(BASE_DIR, file.filename)
    file.save(save_path)
    
    try:
        extract_clubs_from_pdf(save_path, DATA_FILE)
        load_data()
        return jsonify({
            "success": True,
            "filename": file.filename,
            "total_clubs": len(clubs_cache),
            "total_locations": len(locations_cache),
            "message": f"Successfully parsed {len(clubs_cache)} clubs from {file.filename}!"
        })
    except Exception as e:
        return jsonify({"error": f"Failed to parse PDF: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting The Villages Club Search Server at http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
