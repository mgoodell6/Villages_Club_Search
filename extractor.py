"""
The Villages Club Contact PDF Extractor
Extracts and parses all clubs, schedules, recreation center locations, and contact info.
"""

import pdfplumber
import re
import json
import time
import os

DAY_MAP = {
    'M': 'Monday',
    'TU': 'Tuesday',
    'W': 'Wednesday',
    'TH': 'Thursday',
    'F': 'Friday',
    'SA': 'Saturday',
    'SU': 'Sunday'
}

ORD_MAP = {
    '1': '1st',
    '2': '2nd',
    '3': '3rd',
    '4': '4th',
    '5': '5th'
}

def parse_schedule(raw_name, location):
    """
    Parses meeting schedule codes embedded in the club/activity name.
    Examples:
      - 2,4W@3PM-LU -> 2nd & 4th Wednesday at 3:00 PM at Laurel Manor
      - QF@6PM-CO -> Every Friday at 6:00 PM at Coconut Cove
      - 2Meven@6PM-LH -> 2nd Monday at 6:00 PM (Even months)
      - 1Wx7,8@4PM-CV -> 1st Wednesday at 4:00 PM (Except July, August)
    """
    m_time = re.search(r'@\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))\s*(?:-\s*([A-Za-z0-9]+))?', raw_name, re.IGNORECASE)
    if not m_time:
        return {
            "name": raw_name.strip(),
            "code": "",
            "days": [],
            "weeks": [],
            "time": "",
            "time_period": "Unknown",
            "room": "",
            "details": "Contact leader or check recreation schedule"
        }
        
    raw_time = m_time.group(1).replace(" ", "").upper()
    # Format time with minutes if missing
    if ":" not in raw_time:
        time_str = raw_time.replace("AM", ":00 AM").replace("PM", ":00 PM")
    else:
        time_str = raw_time.replace("AM", " AM").replace("PM", " PM")
        
    room_code = (m_time.group(2) or "").strip()
    before_at = raw_name[:m_time.start()].rstrip()
    
    # Classify time of day (Morning / Afternoon / Evening)
    time_period = "Unknown"
    hour_m = re.search(r'^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)', time_str)
    if hour_m:
        h = int(hour_m.group(1))
        ampm = hour_m.group(3)
        if ampm == 'AM':
            hour_24 = 0 if h == 12 else h
        else:
            hour_24 = 12 if h == 12 else h + 12
        if hour_24 < 12:
            time_period = "Morning"
        elif hour_24 < 17:
            time_period = "Afternoon"
        else:
            time_period = "Evening"
            
    day_pattern = r'(SU|SA|TH|TU|M|W|F)'
    sched_m = re.search(r'(?:^|\s)((?:Q|[1-5](?:[\s,]?[1-5])*))\s*' + day_pattern + r'(.*)$', before_at, re.IGNORECASE)
    
    if not sched_m:
        sched_m = re.search(r'(?:^|\s)' + day_pattern + r'(.*)$', before_at, re.IGNORECASE)
        if sched_m:
            prefix_week = "Q"
            day_str = sched_m.group(1).upper()
            extra = sched_m.group(2).strip()
            name_part = before_at[:sched_m.start()].strip()
        else:
            return {
                "name": before_at.strip(" -"),
                "code": f"@{raw_time}" + (f"-{room_code}" if room_code else ""),
                "days": [],
                "weeks": [],
                "time": time_str,
                "time_period": time_period,
                "room": room_code,
                "details": f"Meets at {time_str}"
            }
    else:
        prefix_week = sched_m.group(1).upper().replace(" ", "")
        day_str = sched_m.group(2).upper()
        extra = sched_m.group(3).strip()
        name_part = before_at[:sched_m.start()].strip()
        
    day_full = DAY_MAP.get(day_str, day_str)
    
    weeks = []
    if prefix_week == 'Q':
        weeks.append("Every week")
        week_desc = "Every"
    else:
        nums = re.findall(r'[1-5]', prefix_week)
        weeks = [ORD_MAP[n] for n in nums if n in ORD_MAP]
        if len(weeks) == 1:
            week_desc = f"{weeks[0]}"
        elif len(weeks) > 1:
            week_desc = f"{', '.join(weeks[:-1])} & {weeks[-1]}"
        else:
            week_desc = prefix_week
            
    extra_desc = ""
    if extra:
        extra_clean = extra.strip(" -")
        if 'even' in extra_clean.lower():
            extra_desc = "(Even months)"
        elif 'odd' in extra_clean.lower():
            extra_desc = "(Odd months)"
        elif extra_clean.lower().startswith('x'):
            months = extra_clean[1:].strip()
            extra_desc = f"(Except months: {months})"
        elif re.search(r'\d', extra_clean):
            extra_desc = f"(Months: {extra_clean})"
        elif extra_clean:
            extra_desc = f"({extra_clean})"
            
    full_code = f"{prefix_week}{day_str}{extra}@{raw_time}" + (f"-{room_code}" if room_code else "")
    full_desc = f"{week_desc} {day_full} at {time_str}"
    if extra_desc:
        full_desc += f" {extra_desc}"
        
    return {
        "name": name_part.strip(" -"),
        "code": full_code,
        "days": [day_full],
        "weeks": weeks,
        "time": time_str,
        "time_period": time_period,
        "room": room_code,
        "details": full_desc
    }

def parse_pdf_page(page):
    """
    Extracts club rows from an Excel-exported PDF page with coordinate tracking.
    """
    words = page.extract_words()
    # Content area (skip headers and footer search hints)
    content_words = [w for w in words if w['top'] >= 125 and w['top'] <= 570]
    
    lines_dict = {}
    for w in sorted(content_words, key=lambda x: (x['top'], x['x0'])):
        matched_y = None
        for y in lines_dict:
            if abs(w['top'] - y) <= 3:
                matched_y = y
                break
        if matched_y is None:
            matched_y = round(w['top'], 1)
            lines_dict[matched_y] = []
        lines_dict[matched_y].append(w)
        
    sorted_ys = sorted(lines_dict.keys())
    
    records = []
    curr_record = []
    
    for y in sorted_ys:
        line_words = lines_dict[y]
        if curr_record:
            prev_y = curr_record[-1][0]
            delta = y - prev_y
            if delta < 13: # continuation of wrapped line
                curr_record.append((y, line_words))
                continue
        
        if curr_record:
            records.append(curr_record)
        curr_record = [(y, line_words)]
        
    if curr_record:
        records.append(curr_record)
        
    parsed_rows = []
    for rec in records:
        col_cname, col_loc, col_leader, col_web, col_email, col_phone = [], [], [], [], [], []
        
        for y, lwords in rec:
            for w in lwords:
                x = w['x0']
                txt = w['text']
                if x < 185:
                    col_cname.append(txt)
                elif x < 280:
                    col_loc.append(txt)
                elif x < 380:
                    col_leader.append(txt)
                elif x < 515:
                    col_web.append(txt)
                elif x < 645:
                    col_email.append(txt)
                else:
                    col_phone.append(txt)
                    
        cname = " ".join(col_cname).strip()
        loc = " ".join(col_loc).strip()
        leader = " ".join(col_leader).strip()
        web = " ".join(col_web).strip()
        email = " ".join(col_email).strip()
        phone = " ".join(col_phone).strip()
        
        if cname or loc:
            parsed_rows.append({
                "club_name": cname,
                "location": loc,
                "leader": leader,
                "website": web,
                "email": email,
                "phone": phone
            })
            
    return parsed_rows

def clean_location(loc):
    """
    Cleans and standardizes recreation center names, fixing column bleed
    and aliasing Ezell to Ezell Recreation (Sawgrass Grove).
    """
    if not loc:
        return 'Other / Not Listed'
    loc = re.sub(r'^Recreation\s+(.+)', r'\1', loc)
    loc = re.sub(r'Recreation\s+Recreation', 'Recreation', loc)
    bleed_names = ['Colleen', 'Rosemarie', 'Mary', 'Darlene', 'Christine', 'Susan', 'Theresa', 'Jacqueline', 'Randolph', 'Nancy', 'Barbara', 'Dongmei', 'John', 'Thomas']
    for n in bleed_names:
        loc = re.sub(r'\s+' + n + r'$', '', loc)
    loc = re.sub(r'\s+', ' ', loc).strip()
    if loc == 'Ezell Recreation':
        loc = 'Ezell Recreation (Sawgrass Grove)'
    return loc

def extract_clubs_from_pdf(pdf_path, output_json_path=None):
    """
    Extracts all clubs from the given PDF file and optionally saves to JSON.
    Returns list of dicts.
    """
    t0 = time.time()
    all_clubs = []
    
    with pdfplumber.open(pdf_path) as pdf:
        num_pages = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            rows = parse_pdf_page(page)
            for r in rows:
                parsed = parse_schedule(r['club_name'], r['location'])
                
                # Format clean map query and location
                loc_clean = clean_location(r['location'])
                map_url = f"https://www.google.com/maps/search/?api=1&query={loc_clean.replace(' ', '+')}+The+Villages+FL" if loc_clean else ""
                
                all_clubs.append({
                    "id": len(all_clubs) + 1,
                    "name": parsed['name'] or r['club_name'],
                    "raw_name": r['club_name'],
                    "schedule_code": parsed['code'],
                    "schedule_details": parsed['details'],
                    "days": parsed['days'],
                    "weeks": parsed['weeks'],
                    "time": parsed['time'],
                    "time_period": parsed['time_period'],
                    "room_code": parsed['room'],
                    "location": loc_clean,
                    "map_url": map_url,
                    "leader": r['leader'],
                    "website": r['website'],
                    "email": r['email'],
                    "phone": r['phone'],
                    "pdf_page": i + 1
                })
                
    if output_json_path:
        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(all_clubs, f, indent=2, ensure_ascii=False)
            
    elapsed = time.time() - t0
    print(f"Extracted {len(all_clubs)} clubs in {elapsed:.2f}s from {pdf_path}")
    return all_clubs

if __name__ == '__main__':
    extract_clubs_from_pdf('Club-Contact-9.11.26.pdf', 'clubs_data.json')
