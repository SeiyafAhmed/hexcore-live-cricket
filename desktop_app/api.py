import requests
import os
import io
import uuid
import sqlite3
import datetime

BASE_URL = "http://127.0.0.1:8000/api"
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(PROJECT_ROOT, "db.sqlite3")
MEDIA_ROOT = os.path.join(PROJECT_ROOT, "media")

def _get_sqlite_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _save_file(folder, filename, file_bytes):
    target_dir = os.path.join(MEDIA_ROOT, folder)
    os.makedirs(target_dir, exist_ok=True)
    clean_name = f"{uuid.uuid4().hex[:8]}_{filename}"
    file_path = os.path.join(target_dir, clean_name)
    with open(file_path, "wb") as f:
        f.write(file_bytes)
    return f"{folder}/{clean_name}"

# ---------------------------------------------------------------------------
# Teams
# ---------------------------------------------------------------------------

def get_teams():
    try:
        url = f"{BASE_URL}/teams/"
        response = requests.get(url, timeout=2.5)
        response.raise_for_status()
        data = response.json()
        return data.get('results', data) if isinstance(data, dict) else data
    except Exception as e:
        print(f"[api.get_teams] API fallback to SQLite: {e}")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT t.id, t.name, t.logo, t.theme_color, t.created_at, t.updated_at,
                       COUNT(p.id) as player_count
                FROM scoring_team t
                LEFT JOIN scoring_player p ON p.team_id = t.id
                GROUP BY t.id
                ORDER BY t.name
            """)
            rows = cur.fetchall()
            teams = []
            for r in rows:
                tid = str(uuid.UUID(r["id"])) if len(r["id"]) == 32 else r["id"]
                logo = r["logo"]
                if logo and not logo.startswith("http"):
                    logo = f"http://127.0.0.1:8000/media/{logo}"
                teams.append({
                    "id": tid,
                    "name": r["name"],
                    "logo": logo,
                    "theme_color": r["theme_color"],
                    "player_count": r["player_count"],
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"]
                })
            return teams
        finally:
            conn.close()

def create_team(name, theme_color, logo_bytes=None, logo_filename=None, logo_path=None):
    try:
        url = f"{BASE_URL}/teams/"
        data = {
            "name": name,
            "theme_color": theme_color,
        }
        files = {}
        if logo_bytes and logo_filename:
            files["logo"] = (logo_filename, io.BytesIO(logo_bytes))
        elif logo_path and os.path.exists(logo_path):
            files["logo"] = open(logo_path, "rb")

        response = requests.post(url, data=data, files=files if files else None, timeout=3.0)
        if logo_path and "logo" in files and hasattr(files["logo"], "close"):
            files["logo"].close()
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.create_team] API fallback to SQLite: {e}")
        rel_logo = None
        if logo_bytes and logo_filename:
            rel_logo = _save_file("teams/logos", logo_filename, logo_bytes)
        elif logo_path and os.path.exists(logo_path):
            with open(logo_path, "rb") as lf:
                rel_logo = _save_file("teams/logos", os.path.basename(logo_path), lf.read())

        conn = _get_sqlite_conn()
        try:
            tid = uuid.uuid4().hex
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO scoring_team (id, name, logo, theme_color, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (tid, name, rel_logo, theme_color, now, now))
            conn.commit()
            return {
                "id": str(uuid.UUID(tid)),
                "name": name,
                "logo": f"http://127.0.0.1:8000/media/{rel_logo}" if rel_logo else None,
                "theme_color": theme_color,
                "player_count": 0,
                "created_at": now,
                "updated_at": now
            }
        finally:
            conn.close()

def update_team(team_id, name, theme_color, logo_bytes=None, logo_filename=None):
    try:
        url = f"{BASE_URL}/teams/{team_id}/"
        data = {
            "name": name,
            "theme_color": theme_color,
        }
        files = {}
        if logo_bytes and logo_filename:
            files["logo"] = (logo_filename, io.BytesIO(logo_bytes))

        response = requests.patch(url, data=data, files=files if files else None, timeout=3.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.update_team] API fallback to SQLite: {e}")
        raw_id = team_id.replace("-", "")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            if logo_bytes and logo_filename:
                rel_logo = _save_file("teams/logos", logo_filename, logo_bytes)
                cur.execute("""
                    UPDATE scoring_team
                    SET name = ?, theme_color = ?, logo = ?, updated_at = ?
                    WHERE id = ? OR id = ?
                """, (name, theme_color, rel_logo, now, raw_id, team_id))
            else:
                cur.execute("""
                    UPDATE scoring_team
                    SET name = ?, theme_color = ?, updated_at = ?
                    WHERE id = ? OR id = ?
                """, (name, theme_color, now, raw_id, team_id))
            conn.commit()
            return {"id": team_id, "name": name, "theme_color": theme_color}
        finally:
            conn.close()

def delete_team(team_id):
    try:
        url = f"{BASE_URL}/teams/{team_id}/"
        response = requests.delete(url, timeout=3.0)
        response.raise_for_status()
        return {"success": True}
    except Exception as e:
        print(f"[api.delete_team] API fallback to SQLite: {e}")
        raw_id = team_id.replace("-", "")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM scoring_player WHERE team_id = ? OR team_id = ?", (raw_id, team_id))
            cur.execute("DELETE FROM scoring_team WHERE id = ? OR id = ?", (raw_id, team_id))
            conn.commit()
            return {"success": True}
        finally:
            conn.close()

# ---------------------------------------------------------------------------
# Players
# ---------------------------------------------------------------------------

def get_players(team_id=None):
    try:
        url = f"{BASE_URL}/players/"
        params = {}
        if team_id:
            params["team"] = team_id
        response = requests.get(url, params=params, timeout=2.5)
        response.raise_for_status()
        data = response.json()
        return data.get('results', data) if isinstance(data, dict) else data
    except Exception as e:
        print(f"[api.get_players] API fallback to SQLite: {e}")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            query = """
                SELECT p.id, p.first_name, p.last_name, p.jersey_number, p.image, p.role,
                       p.team_id, t.name as team_name, p.created_at, p.updated_at
                FROM scoring_player p
                LEFT JOIN scoring_team t ON t.id = p.team_id
            """
            params = []
            if team_id:
                raw_tid = team_id.replace("-", "")
                query += " WHERE p.team_id = ? OR p.team_id = ?"
                params.extend([raw_tid, team_id])
            query += " ORDER BY p.jersey_number, p.first_name"
            cur.execute(query, params)
            rows = cur.fetchall()
            players = []
            for r in rows:
                pid = str(uuid.UUID(r["id"])) if len(r["id"]) == 32 else r["id"]
                tid = str(uuid.UUID(r["team_id"])) if len(r["team_id"]) == 32 else r["team_id"]
                img = r["image"]
                if img and not img.startswith("http"):
                    img = f"http://127.0.0.1:8000/media/{img}"
                players.append({
                    "id": pid,
                    "first_name": r["first_name"],
                    "last_name": r["last_name"],
                    "full_name": f"{r['first_name']} {r['last_name']}",
                    "jersey_number": r["jersey_number"],
                    "role": r["role"],
                    "image": img,
                    "team": tid,
                    "team_name": r["team_name"],
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"]
                })
            return players
        finally:
            conn.close()

def create_player(first_name, last_name, jersey_number, role, team_id, image_bytes=None, image_filename=None, image_path=None):
    try:
        url = f"{BASE_URL}/players/"
        data = {
            "first_name": first_name,
            "last_name": last_name,
            "jersey_number": int(jersey_number),
            "role": role,
            "team": team_id,
        }
        files = {}
        if image_bytes and image_filename:
            files["image"] = (image_filename, io.BytesIO(image_bytes))
        elif image_path and os.path.exists(image_path):
            files["image"] = open(image_path, "rb")

        response = requests.post(url, data=data, files=files if files else None, timeout=3.0)
        if image_path and "image" in files and hasattr(files["image"], "close"):
            files["image"].close()
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.create_player] API fallback to SQLite: {e}")
        rel_img = None
        if image_bytes and image_filename:
            rel_img = _save_file("players/images", image_filename, image_bytes)
        elif image_path and os.path.exists(image_path):
            with open(image_path, "rb") as imf:
                rel_img = _save_file("players/images", os.path.basename(image_path), imf.read())

        conn = _get_sqlite_conn()
        try:
            pid = uuid.uuid4().hex
            raw_tid = team_id.replace("-", "")
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO scoring_player (id, first_name, last_name, jersey_number, image, role, team_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (pid, first_name, last_name, int(jersey_number), rel_img, role, raw_tid, now, now))
            conn.commit()
            return {
                "id": str(uuid.UUID(pid)),
                "first_name": first_name,
                "last_name": last_name,
                "full_name": f"{first_name} {last_name}",
                "jersey_number": int(jersey_number),
                "role": role,
                "image": f"http://127.0.0.1:8000/media/{rel_img}" if rel_img else None,
                "team": team_id,
                "created_at": now,
                "updated_at": now
            }
        finally:
            conn.close()

def update_player(player_id, first_name, last_name, jersey_number, role, team_id, image_bytes=None, image_filename=None):
    try:
        url = f"{BASE_URL}/players/{player_id}/"
        data = {
            "first_name": first_name,
            "last_name": last_name,
            "jersey_number": int(jersey_number),
            "role": role,
            "team": team_id,
        }
        files = {}
        if image_bytes and image_filename:
            files["image"] = (image_filename, io.BytesIO(image_bytes))

        response = requests.patch(url, data=data, files=files if files else None, timeout=3.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.update_player] API fallback to SQLite: {e}")
        raw_pid = player_id.replace("-", "")
        raw_tid = team_id.replace("-", "")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            if image_bytes and image_filename:
                rel_img = _save_file("players/images", image_filename, image_bytes)
                cur.execute("""
                    UPDATE scoring_player
                    SET first_name = ?, last_name = ?, jersey_number = ?, role = ?, team_id = ?, image = ?, updated_at = ?
                    WHERE id = ? OR id = ?
                """, (first_name, last_name, int(jersey_number), role, raw_tid, rel_img, now, raw_pid, player_id))
            else:
                cur.execute("""
                    UPDATE scoring_player
                    SET first_name = ?, last_name = ?, jersey_number = ?, role = ?, team_id = ?, updated_at = ?
                    WHERE id = ? OR id = ?
                """, (first_name, last_name, int(jersey_number), role, raw_tid, now, raw_pid, player_id))
            conn.commit()
            return {"id": player_id, "first_name": first_name, "last_name": last_name, "team": team_id}
        finally:
            conn.close()

def delete_player(player_id):
    try:
        url = f"{BASE_URL}/players/{player_id}/"
        response = requests.delete(url, timeout=3.0)
        response.raise_for_status()
        return {"success": True}
    except Exception as e:
        print(f"[api.delete_player] API fallback to SQLite: {e}")
        raw_pid = player_id.replace("-", "")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM scoring_player WHERE id = ? OR id = ?", (raw_pid, player_id))
            conn.commit()
            return {"success": True}
        finally:
            conn.close()

def assign_player_to_team(player_id, team_id):
    try:
        url = f"{BASE_URL}/players/{player_id}/"
        data = {"team": team_id}
        response = requests.patch(url, data=data, timeout=3.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.assign_player_to_team] API fallback to SQLite: {e}")
        raw_pid = player_id.replace("-", "")
        raw_tid = team_id.replace("-", "")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cur.execute("""
                UPDATE scoring_player
                SET team_id = ?, updated_at = ?
                WHERE id = ? OR id = ?
            """, (raw_tid, now, raw_pid, player_id))
            conn.commit()
            return {"id": player_id, "team": team_id}
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# Tournaments & Groups
# ---------------------------------------------------------------------------

def get_tournaments():
    try:
        url = f"{BASE_URL}/tournaments/"
        response = requests.get(url, timeout=2.5)
        response.raise_for_status()
        data = response.json()
        return data.get('results', data) if isinstance(data, dict) else data
    except Exception as e:
        print(f"[api.get_tournaments] API fallback to SQLite: {e}")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT t.id, t.name, t.season, t.max_overs, t.created_at, t.updated_at,
                       COUNT(DISTINCT g.id) as group_count
                FROM scoring_tournament t
                LEFT JOIN scoring_group g ON g.tournament_id = t.id
                GROUP BY t.id
                ORDER BY t.created_at DESC
            """)
            rows = cur.fetchall()
            tournaments = []
            for r in rows:
                tid = str(uuid.UUID(r["id"])) if len(r["id"]) == 32 else r["id"]
                tournaments.append({
                    "id": tid,
                    "name": r["name"],
                    "season": r["season"],
                    "max_overs": r["max_overs"],
                    "group_count": r["group_count"],
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"]
                })
            return tournaments
        finally:
            conn.close()

def create_tournament(name, season="", max_overs=20):
    try:
        url = f"{BASE_URL}/tournaments/"
        data = {
            "name": name,
            "season": season,
            "max_overs": int(max_overs),
        }
        response = requests.post(url, json=data, timeout=3.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.create_tournament] API fallback to SQLite: {e}")
        conn = _get_sqlite_conn()
        try:
            tid = uuid.uuid4().hex
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO scoring_tournament (id, name, season, max_overs, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (tid, name, season, int(max_overs), now, now))
            conn.commit()
            return {
                "id": str(uuid.UUID(tid)),
                "name": name,
                "season": season,
                "max_overs": int(max_overs),
                "created_at": now,
                "updated_at": now
            }
        finally:
            conn.close()

def update_tournament(tournament_id, name, season="", max_overs=20):
    try:
        url = f"{BASE_URL}/tournaments/{tournament_id}/"
        data = {
            "name": name,
            "season": season,
            "max_overs": int(max_overs),
        }
        response = requests.patch(url, json=data, timeout=3.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.update_tournament] API fallback to SQLite: {e}")
        raw_tid = tournament_id.replace("-", "")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cur.execute("""
                UPDATE scoring_tournament
                SET name = ?, season = ?, max_overs = ?, updated_at = ?
                WHERE id = ? OR id = ?
            """, (name, season, int(max_overs), now, raw_tid, tournament_id))
            conn.commit()
            return {"id": tournament_id, "name": name, "season": season, "max_overs": int(max_overs)}
        finally:
            conn.close()

def delete_tournament(tournament_id):
    try:
        url = f"{BASE_URL}/tournaments/{tournament_id}/"
        response = requests.delete(url, timeout=3.0)
        response.raise_for_status()
        return {"success": True}
    except Exception as e:
        print(f"[api.delete_tournament] API fallback to SQLite: {e}")
        raw_tid = tournament_id.replace("-", "")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM scoring_tournament WHERE id = ? OR id = ?", (raw_tid, tournament_id))
            conn.commit()
            return {"success": True}
        finally:
            conn.close()

def get_groups(tournament_id=None):
    try:
        url = f"{BASE_URL}/groups/"
        params = {"tournament": tournament_id} if tournament_id else {}
        response = requests.get(url, params=params, timeout=2.5)
        response.raise_for_status()
        data = response.json()
        return data.get('results', data) if isinstance(data, dict) else data
    except Exception as e:
        print(f"[api.get_groups] API fallback to SQLite: {e}")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            query = """
                SELECT g.id, g.name, g.tournament_id, g.created_at, g.updated_at,
                       t.name as tournament_name
                FROM scoring_group g
                LEFT JOIN scoring_tournament t ON t.id = g.tournament_id
            """
            params = []
            if tournament_id:
                raw_tid = tournament_id.replace("-", "")
                query += " WHERE g.tournament_id = ? OR g.tournament_id = ?"
                params = [raw_tid, tournament_id]
            query += " ORDER BY g.name"
            cur.execute(query, params)
            group_rows = cur.fetchall()
            groups = []
            for gr in group_rows:
                gid = str(uuid.UUID(gr["id"])) if len(gr["id"]) == 32 else gr["id"]
                raw_gid = gr["id"]
                # Fetch teams for this group
                cur.execute("""
                    SELECT t.id, t.name, t.logo, t.theme_color
                    FROM scoring_team t
                    JOIN scoring_group_teams gt ON gt.team_id = t.id
                    WHERE gt.group_id = ? OR gt.group_id = ?
                    ORDER BY t.name
                """, (raw_gid, gid.replace("-", "")))
                team_rows = cur.fetchall()
                team_details = []
                team_ids = []
                for tr in team_rows:
                    tid = str(uuid.UUID(tr["id"])) if len(tr["id"]) == 32 else tr["id"]
                    logo = tr["logo"]
                    if logo and not logo.startswith("http"):
                        logo = f"http://127.0.0.1:8000/media/{logo}"
                    team_ids.append(tid)
                    team_details.append({
                        "id": tid,
                        "name": tr["name"],
                        "logo": logo,
                        "theme_color": tr["theme_color"]
                    })
                tourn_id = str(uuid.UUID(gr["tournament_id"])) if gr["tournament_id"] and len(gr["tournament_id"]) == 32 else gr["tournament_id"]
                groups.append({
                    "id": gid,
                    "name": gr["name"],
                    "tournament": tourn_id,
                    "tournament_name": gr["tournament_name"],
                    "teams": team_ids,
                    "team_details": team_details,
                    "team_count": len(team_ids),
                    "created_at": gr["created_at"],
                    "updated_at": gr["updated_at"]
                })
            return groups
        finally:
            conn.close()

def create_group(tournament_id, name, team_ids=None):
    try:
        url = f"{BASE_URL}/groups/"
        data = {
            "tournament": tournament_id,
            "name": name,
            "teams": team_ids or [],
        }
        response = requests.post(url, json=data, timeout=3.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.create_group] API fallback to SQLite: {e}")
        conn = _get_sqlite_conn()
        try:
            gid = uuid.uuid4().hex
            raw_tid = tournament_id.replace("-", "")
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO scoring_group (id, name, tournament_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (gid, name, raw_tid, now, now))
            if team_ids:
                for tid in team_ids:
                    raw_team_id = tid.replace("-", "")
                    cur.execute("""
                        INSERT INTO scoring_group_teams (group_id, team_id)
                        VALUES (?, ?)
                    """, (gid, raw_team_id))
            conn.commit()
            return {
                "id": str(uuid.UUID(gid)),
                "name": name,
                "tournament": tournament_id,
                "teams": team_ids or [],
                "created_at": now,
                "updated_at": now
            }
        finally:
            conn.close()

def update_group(group_id, name):
    try:
        url = f"{BASE_URL}/groups/{group_id}/"
        data = {"name": name}
        response = requests.patch(url, json=data, timeout=3.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.update_group] API fallback to SQLite: {e}")
        raw_gid = group_id.replace("-", "")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cur.execute("""
                UPDATE scoring_group
                SET name = ?, updated_at = ?
                WHERE id = ? OR id = ?
            """, (name, now, raw_gid, group_id))
            conn.commit()
            return {"id": group_id, "name": name}
        finally:
            conn.close()

def delete_group(group_id):
    try:
        url = f"{BASE_URL}/groups/{group_id}/"
        response = requests.delete(url, timeout=3.0)
        response.raise_for_status()
        return {"success": True}
    except Exception as e:
        print(f"[api.delete_group] API fallback to SQLite: {e}")
        raw_gid = group_id.replace("-", "")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM scoring_group_teams WHERE group_id = ? OR group_id = ?", (raw_gid, group_id))
            cur.execute("DELETE FROM scoring_group WHERE id = ? OR id = ?", (raw_gid, group_id))
            conn.commit()
            return {"success": True}
        finally:
            conn.close()

def assign_teams_to_group(group_id, team_ids):
    try:
        url = f"{BASE_URL}/groups/{group_id}/assign-teams/"
        data = {"team_ids": team_ids}
        response = requests.post(url, json=data, timeout=3.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.assign_teams_to_group] API fallback to SQLite: {e}")
        raw_gid = group_id.replace("-", "")
        conn = _get_sqlite_conn()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM scoring_group_teams WHERE group_id = ? OR group_id = ?", (raw_gid, group_id))
            for tid in team_ids:
                raw_team_id = tid.replace("-", "")
                cur.execute("""
                    INSERT INTO scoring_group_teams (group_id, team_id)
                    VALUES (?, ?)
                """, (raw_gid, raw_team_id))
            conn.commit()
            return {"id": group_id, "teams": team_ids}
        finally:
            conn.close()

def get_group_standings(group_id):
    try:
        url = f"{BASE_URL}/groups/{group_id}/standings/"
        response = requests.get(url, timeout=3.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.get_group_standings] API fallback to services: {e}")
        try:
            import django
            os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cricket_backend.settings")
            django.setup()
            from scoring.services import calculate_group_standings
            return calculate_group_standings(group_id)
        except Exception as inner_e:
            print(f"[api.get_group_standings] Direct services failed: {inner_e}")
            return []

def get_tournament_leaderboards(tournament_id, group_id=None):
    try:
        url = f"{BASE_URL}/tournaments/{tournament_id}/leaderboards/"
        params = {}
        if group_id and group_id not in ("", "all", "null", "None"):
            params["group"] = group_id
        response = requests.get(url, params=params, timeout=4.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[api.get_tournament_leaderboards] API fallback to services: {e}")
        try:
            import django
            os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cricket_backend.settings")
            django.setup()
            from scoring.services import calculate_tournament_leaderboards
            return calculate_tournament_leaderboards(tournament_id, group_id=group_id)
        except Exception as inner_e:
            print(f"[api.get_tournament_leaderboards] Direct services failed: {inner_e}")
            return {
                "error": str(inner_e),
                "awards": {},
                "batting": {},
                "bowling": {},
                "fielding": {},
                "mvp_standings": [],
                "team_highlights": {}
            }
