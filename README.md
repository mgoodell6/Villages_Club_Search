# The Villages Club & Activity Search Web Application

An interactive, resident-friendly web application designed for residents of **The Villages, FL** to search, filter, and discover lifestyle clubs and activities across all **79 Recreation Centers**.

---

## 🌟 Key Features

1. **Location-First Exploration**:
   - Filter clubs across any of the **79 Recreation Centers** (e.g. Eisenhower, SeaBreeze, Lake Miona, Laurel Manor, Rohan, Colony Cottage).
   - Interactive **Recreation Centers Directory Grid** displaying active club counts per center with direct Google Maps golf cart navigation links.

2. **Plain-English Meeting Schedule Decoder**:
   - Translates shorthand codes into human-readable text:
     - `2,4W@3PM-LU` ➔ *2nd & 4th Wednesday at 3:00 PM at Laurel Manor Recreation*
     - `QF@6PM-CO` ➔ *Every Friday at 6:00 PM at Coconut Cove Recreation*
     - `2Meven@6PM-LH` ➔ *2nd Monday at 6:00 PM (Even months)*
     - `1Wx7,8@4PM-CV` ➔ *1st Wednesday at 4:00 PM (Except July, August)*
   - Interactive code breakdown modal and dedicated **Meeting Code Guide** tab.

3. **Multi-Dimensional Instant Filtering**:
   - **Global Search**: Type-ahead search across club names, leader names, room codes, keywords, and activities.
   - **Day of Week**: Quick pills for *Monday* through *Sunday*, or *Any Day*.
   - **Meeting Frequency**: Filter by *Every week (Q)*, *1st*, *2nd*, *3rd*, *4th*, or *5th* week.
   - **Time of Day**: Filter by *Morning (< 12 PM)*, *Afternoon (12–5 PM)*, or *Evening (5 PM+)*.

4. **Senior-Friendly & Accessible Interface**:
   - **Font Size Scaler**: One-click text sizing (`A`, `A+`, `A++`) for enhanced readability.
   - **Day / Night Themes**: High-contrast light mode and dark mode toggle.
   - **Direct Contact Links**: One-click calling (`tel:`) and emailing (`mailto:`).
   - **View Switcher**: Toggle between Card View and Dense Table View.

5. **"My Saved Clubs" & Export**:
   - Click the star icon (⭐) on any club card to save it to your personal schedule (persisted in your browser's local storage).
   - Export your saved clubs directly to a **CSV spreadsheet**.
   - Clean, ink-friendly **Print** layout for taking schedules to the recreation center.

6. **Automatic PDF Catalog Updater**:
   - Built-in drag-and-drop uploader to upload newly released versions of `Club-Contact-*.pdf`. The system automatically re-extracts 3,200+ clubs in under 10 seconds.

---

## 🚀 Running the Application

### 1. Launch the Server
In PowerShell or your terminal, run:
```powershell
python app.py
```

### 2. Open in Browser
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 🌐 Deploying to Render (render.com)

This application is ready to deploy directly on **Render's Free Web Service**:

1. **Push your code to GitHub / GitLab**.
2. Log into [dashboard.render.com](https://dashboard.render.com/) and click **New + ➔ Web Service**.
3. Connect your repository.
4. Render will auto-detect the configuration, or configure it with:
   - **Environment / Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Plan**: `Free`
5. Click **Create Web Service**. Your app will be live with a free SSL URL (e.g. `https://villages-club-search.onrender.com`).

---

## 📁 File Structure

- [`app.py`](file:///c:/Users/mgood/OneDrive/Computer%20Files/Python_Projects/Villages_Club_Search/app.py): Flask application server and REST endpoints (`/api/clubs`, `/api/locations`, `/api/stats`, `/api/upload`).
- [`extractor.py`](file:///c:/Users/mgood/OneDrive/Computer%20Files/Python_Projects/Villages_Club_Search/extractor.py): High-performance PDF parser using `pdfplumber` with schedule decoder engine.
- [`clubs_data.json`](file:///c:/Users/mgood/OneDrive/Computer%20Files/Python_Projects/Villages_Club_Search/clubs_data.json): Structured dataset of 3,205 clubs across 79 recreation centers.
- [`templates/index.html`](file:///c:/Users/mgood/OneDrive/Computer%20Files/Python_Projects/Villages_Club_Search/templates/index.html): Semantic, accessible frontend template.
- [`static/css/styles.css`](file:///c:/Users/mgood/OneDrive/Computer%20Files/Python_Projects/Villages_Club_Search/static/css/styles.css): Modern CSS design system, responsive grids, and dark/light themes.
- [`static/js/app.js`](file:///c:/Users/mgood/OneDrive/Computer%20Files/Python_Projects/Villages_Club_Search/static/js/app.js): Single-page client logic for instant search, filtering, and local storage favorites.
- [`Club-Contact-9.11.26.pdf`](file:///c:/Users/mgood/OneDrive/Computer%20Files/Python_Projects/Villages_Club_Search/Club-Contact-9.11.26.pdf): Source document (229 pages).
