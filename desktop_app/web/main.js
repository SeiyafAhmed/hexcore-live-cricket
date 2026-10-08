let currentSidebarTab = 'scoreboard';
let allTeamsData = [];
let allPlayersData = [];

window.onerror = function(msg, url, line, col, error) {
    if(window.eel && eel.console_log) {
        eel.console_log(`Global Error: ${msg} at ${line}:${col}`)();
    }
    return false;
};

// =========================================================================
// TOURNAMENT & GROUP API CLIENT (HYBRID: EEL + DIRECT DJANGO REST FALLBACK)
// =========================================================================
const TOURNAMENT_API_BASE = "http://127.0.0.1:8000/api";

const TournamentAPI = {
    async getTournaments() {
        if (window.eel && typeof eel.get_tournaments === 'function') {
            try {
                let res = await eel.get_tournaments()();
                if (res !== undefined && res !== null) return res;
            } catch(e) {
                console.warn("Eel get_tournaments failed, using REST fallback:", e);
            }
        }
        let res = await fetch(`${TOURNAMENT_API_BASE}/tournaments/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return await res.json();
    },

    async createTournament(name, season = "", maxOvers = 20) {
        if (window.eel && typeof eel.create_tournament === 'function') {
            try {
                let res = await eel.create_tournament(name, season, maxOvers)();
                if (res !== undefined && res !== null) return res;
            } catch(e) {
                console.warn("Eel create_tournament failed, using REST fallback:", e);
            }
        }
        let res = await fetch(`${TOURNAMENT_API_BASE}/tournaments/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, season: season || "", max_overs: parseInt(maxOvers) || 20 })
        });
        if (!res.ok) {
            let errText = await res.text().catch(() => "");
            throw new Error(`Failed to create tournament (${res.status}): ${errText || res.statusText}`);
        }
        return await res.json();
    },

    async updateTournament(tournamentId, name, season = "", maxOvers = 20) {
        if (window.eel && typeof eel.update_tournament === 'function') {
            try {
                let res = await eel.update_tournament(tournamentId, name, season, maxOvers)();
                if (res !== undefined && res !== null) return res;
            } catch(e) {
                console.warn("Eel update_tournament failed, using REST fallback:", e);
            }
        }
        let res = await fetch(`${TOURNAMENT_API_BASE}/tournaments/${tournamentId}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, season: season || "", max_overs: parseInt(maxOvers) || 20 })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return await res.json();
    },

    async deleteTournament(tournamentId) {
        if (window.eel && typeof eel.delete_tournament === 'function') {
            try {
                let res = await eel.delete_tournament(tournamentId)();
                if (res !== undefined && res !== null) return res;
            } catch(e) {
                console.warn("Eel delete_tournament failed, using REST fallback:", e);
            }
        }
        let res = await fetch(`${TOURNAMENT_API_BASE}/tournaments/${tournamentId}/`, {
            method: "DELETE"
        });
        if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return { success: true };
    },

    async getGroups(tournamentId = null) {
        if (window.eel && typeof eel.get_groups === 'function') {
            try {
                let res = await eel.get_groups(tournamentId)();
                if (res !== undefined && res !== null) return res;
            } catch(e) {
                console.warn("Eel get_groups failed, using REST fallback:", e);
            }
        }
        let url = tournamentId ? `${TOURNAMENT_API_BASE}/groups/?tournament=${tournamentId}` : `${TOURNAMENT_API_BASE}/groups/`;
        let res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return await res.json();
    },

    async createGroup(tournamentId, name, teamIds = []) {
        if (window.eel && typeof eel.create_group === 'function') {
            try {
                let res = await eel.create_group(tournamentId, name, teamIds)();
                if (res !== undefined && res !== null) return res;
            } catch(e) {
                console.warn("Eel create_group failed, using REST fallback:", e);
            }
        }
        let res = await fetch(`${TOURNAMENT_API_BASE}/groups/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tournament: tournamentId, name: name, teams: teamIds || [] })
        });
        if (!res.ok) {
            let errText = await res.text().catch(() => "");
            throw new Error(`Failed to create group (${res.status}): ${errText || res.statusText}`);
        }
        return await res.json();
    },

    async updateGroup(groupId, name) {
        if (window.eel && typeof eel.update_group === 'function') {
            try {
                let res = await eel.update_group(groupId, name)();
                if (res !== undefined && res !== null) return res;
            } catch(e) {
                console.warn("Eel update_group failed, using REST fallback:", e);
            }
        }
        let res = await fetch(`${TOURNAMENT_API_BASE}/groups/${groupId}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return await res.json();
    },

    async deleteGroup(groupId) {
        if (window.eel && typeof eel.delete_group === 'function') {
            try {
                let res = await eel.delete_group(groupId)();
                if (res !== undefined && res !== null) return res;
            } catch(e) {
                console.warn("Eel delete_group failed, using REST fallback:", e);
            }
        }
        let res = await fetch(`${TOURNAMENT_API_BASE}/groups/${groupId}/`, {
            method: "DELETE"
        });
        if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return { success: true };
    },

    async assignTeamsToGroup(groupId, teamIds) {
        if (window.eel && typeof eel.assign_teams_to_group === 'function') {
            try {
                let res = await eel.assign_teams_to_group(groupId, teamIds)();
                if (res !== undefined && res !== null) return res;
            } catch(e) {
                console.warn("Eel assign_teams_to_group failed, using REST fallback:", e);
            }
        }
        let res = await fetch(`${TOURNAMENT_API_BASE}/groups/${groupId}/assign-teams/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ team_ids: teamIds || [] })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return await res.json();
    },

    async getGroupStandings(groupId) {
        if (window.eel && typeof eel.get_group_standings === 'function') {
            try {
                let res = await eel.get_group_standings(groupId)();
                if (res !== undefined && res !== null) return res;
            } catch(e) {
                console.warn("Eel get_group_standings failed, using REST fallback:", e);
            }
        }
        let res = await fetch(`${TOURNAMENT_API_BASE}/groups/${groupId}/standings/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return await res.json();
    }
};

// Polyfill window.eel so eel.<method>()() syntax NEVER throws "is not a function"
(function polyfillEelTournamentMethods() {
    if (!window.eel) window.eel = {};
    const methods = {
        get_tournaments: () => () => TournamentAPI.getTournaments(),
        create_tournament: (n, s, o) => () => TournamentAPI.createTournament(n, s, o),
        update_tournament: (id, n, s, o) => () => TournamentAPI.updateTournament(id, n, s, o),
        delete_tournament: (id) => () => TournamentAPI.deleteTournament(id),
        get_groups: (tId) => () => TournamentAPI.getGroups(tId),
        create_group: (tId, n, teams) => () => TournamentAPI.createGroup(tId, n, teams),
        update_group: (gId, n) => () => TournamentAPI.updateGroup(gId, n),
        delete_group: (gId) => () => TournamentAPI.deleteGroup(gId),
        assign_teams_to_group: (gId, teams) => () => TournamentAPI.assignTeamsToGroup(gId, teams),
        get_group_standings: (gId) => () => TournamentAPI.getGroupStandings(gId)
    };

    for (const [key, fn] of Object.entries(methods)) {
        if (typeof window.eel[key] !== 'function') {
            window.eel[key] = fn;
        }
    }
})();


async function initSetup() {
    try {
        if(window.eel && eel.console_log) eel.console_log("Starting initSetup")();
        let teams = await eel.get_teams()();
        if(window.eel && eel.console_log) eel.console_log("Teams loaded: " + JSON.stringify(teams))();
        
        allTeamsData = teams || [];
        updateSidebarBadges();
        
        let battingSelect = document.getElementById("setup-batting-team");
        let bowlingSelect = document.getElementById("setup-bowling-team");
        if (battingSelect && bowlingSelect) {
            let currentBat = battingSelect.value;
            let currentBowl = bowlingSelect.value;
            battingSelect.innerHTML = "";
            bowlingSelect.innerHTML = "";
            
            teams.forEach(t => {
                let opt1 = document.createElement("option");
                opt1.value = t.id;
                opt1.text = t.name;
                battingSelect.add(opt1);
                
                let opt2 = document.createElement("option");
                opt2.value = t.id;
                opt2.text = t.name;
                bowlingSelect.add(opt2);
            });

            if (currentBat && teams.some(t => t.id === currentBat)) battingSelect.value = currentBat;
            if (currentBowl && teams.some(t => t.id === currentBowl)) bowlingSelect.value = currentBowl;
        }

        battingSelect.onchange = async () => {
            try {
                let players = await eel.get_players(battingSelect.value)();
                if(window.eel && eel.console_log) eel.console_log("Batting players loaded: " + JSON.stringify(players))();
                let str = document.getElementById("setup-striker");
                let nstr = document.getElementById("setup-nonstriker");
                str.innerHTML = ""; nstr.innerHTML = "";
                players.forEach(p => {
                    let name = p.first_name + " " + p.last_name;
                    str.add(new Option(name, name));
                    nstr.add(new Option(name, name));
                });
            } catch(e) { if(window.eel && eel.console_log) eel.console_log("Error loading batting players: " + e); }
        };
        
        bowlingSelect.onchange = async () => {
            try {
                let players = await eel.get_players(bowlingSelect.value)();
                if(window.eel && eel.console_log) eel.console_log("Bowling players loaded: " + JSON.stringify(players))();
                let bowl = document.getElementById("setup-bowler");
                bowl.innerHTML = "";
                players.forEach(p => {
                    let name = p.first_name + " " + p.last_name;
                    bowl.add(new Option(name, name));
                });
            } catch(e) { if(window.eel && eel.console_log) eel.console_log("Error loading bowling players: " + e); }
        };
        
        let tournSelect = document.getElementById("setup-tournament");
        if (tournSelect) {
            try {
                let tourns = await TournamentAPI.getTournaments();
                let curVal = tournSelect.value;
                tournSelect.innerHTML = `<option value="">-- Standalone Match --</option>`;
                (tourns || []).forEach(t => {
                    let opt = document.createElement("option");
                    opt.value = t.id;
                    opt.text = `${t.name} (${t.season || 'T20'})`;
                    tournSelect.add(opt);
                });
                if (curVal) tournSelect.value = curVal;
            } catch(e) {
                console.error("Error populating tournaments in setup:", e);
            }
        }

        if(teams.length > 0) {
            battingSelect.onchange();
            bowlingSelect.onchange();
        }
    } catch(e) {
        if(window.eel && eel.console_log) eel.console_log("Failed to load teams: " + e);
        alert("Error loading teams: " + e.message);
    }
}

window.onSetupTournamentChange = async function() {
    let tournSelect = document.getElementById("setup-tournament");
    let grpSelect = document.getElementById("setup-group");
    let oversInp = document.getElementById("setup-overs");
    if (!tournSelect || !grpSelect) return;
    let tournId = tournSelect.value;
    grpSelect.innerHTML = `<option value="">-- No Group / Standalone --</option>`;
    
    if (tournId) {
        try {
            let tourns = await TournamentAPI.getTournaments();
            let selectedT = (tourns || []).find(t => t.id == tournId);
            if (selectedT && selectedT.max_overs && oversInp) {
                oversInp.value = selectedT.max_overs;
            }

            let groups = await TournamentAPI.getGroups(tournId);
            (groups || []).forEach(g => {
                let opt = document.createElement("option");
                opt.value = g.id;
                opt.text = g.name;
                grpSelect.add(opt);
            });
        } catch(e) {
            console.error("Error updating setup groups:", e);
        }
    }
    
    if (window.onSetupGroupChange) {
        await window.onSetupGroupChange();
    }
};

window.onSetupGroupChange = async function() {
    let grpSelect = document.getElementById("setup-group");
    let tournSelect = document.getElementById("setup-tournament");
    let battingSelect = document.getElementById("setup-batting-team");
    let bowlingSelect = document.getElementById("setup-bowling-team");

    if (!battingSelect || !bowlingSelect) return;
    
    let currentBat = battingSelect.value;
    let currentBowl = bowlingSelect.value;
    
    let teamsToLoad = allTeamsData; // Default to all teams

    if (grpSelect && grpSelect.value && tournSelect && tournSelect.value) {
        try {
            let groups = await TournamentAPI.getGroups(tournSelect.value);
            let selectedGroup = groups.find(g => g.id == grpSelect.value);
            if (selectedGroup && selectedGroup.teams) {
                teamsToLoad = allTeamsData.filter(t => selectedGroup.teams.includes(t.id));
            }
        } catch(e) {
            console.error("Error filtering teams by group:", e);
        }
    }

    battingSelect.innerHTML = "";
    bowlingSelect.innerHTML = "";

    teamsToLoad.forEach(t => {
        let opt1 = document.createElement("option");
        opt1.value = t.id;
        opt1.text = t.name;
        battingSelect.add(opt1);
        
        let opt2 = document.createElement("option");
        opt2.value = t.id;
        opt2.text = t.name;
        bowlingSelect.add(opt2);
    });

    if (currentBat && teamsToLoad.some(t => t.id == currentBat)) battingSelect.value = currentBat;
    if (currentBowl && teamsToLoad.some(t => t.id == currentBowl)) bowlingSelect.value = currentBowl;

    if (battingSelect.onchange) battingSelect.onchange();
    if (bowlingSelect.onchange) bowlingSelect.onchange();
};

async function startMatch() {
    let batId = document.getElementById("setup-batting-team").value;
    let bowlId = document.getElementById("setup-bowling-team").value;
    let batName = document.getElementById("setup-batting-team").options[document.getElementById("setup-batting-team").selectedIndex].text;
    let bowlName = document.getElementById("setup-bowling-team").options[document.getElementById("setup-bowling-team").selectedIndex].text;
    
    let striker = document.getElementById("setup-striker").value;
    let nonstriker = document.getElementById("setup-nonstriker").value;
    let bowler = document.getElementById("setup-bowler").value;
    let overs = document.getElementById("setup-overs").value;

    let tournSelect = document.getElementById("setup-tournament");
    let tournId = tournSelect && tournSelect.value ? tournSelect.value : null;
    let grpSelect = document.getElementById("setup-group");
    let grpId = grpSelect && grpSelect.value ? grpSelect.value : null;
    
    if(striker === nonstriker) {
        alert("Striker and Non-Striker cannot be the same!");
        return;
    }
    
    await eel.start_match(batId, batName, bowlId, bowlName, striker, nonstriker, bowler, overs, tournId, grpId)();
    
    document.getElementById("setup-screen").classList.add("hidden");
    document.getElementById("scoring-screen").classList.remove("hidden");
    
    refreshUI();
}

// ---------------------------------------------------------------------------
// Color & Theme Utilities
// ---------------------------------------------------------------------------
function hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string') return `rgba(15, 23, 42, ${alpha})`;
    let clean = hex.trim().replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    if (clean.length !== 6) return `rgba(15, 23, 42, ${alpha})`;
    let num = parseInt(clean, 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastColor(hex) {
    if (!hex || typeof hex !== 'string') return '#ffffff';
    let clean = hex.trim().replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    if (clean.length !== 6) return '#ffffff';
    let num = parseInt(clean, 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;
    let brightness = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
    return brightness > 155 ? '#0f172a' : '#ffffff';
}

function adjustBrightness(hex, percent) {
    if (!hex || typeof hex !== 'string') return '#0f172a';
    let clean = hex.trim().replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    if (clean.length !== 6) return hex;
    let num = parseInt(clean, 16);
    let r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 255) * (1 + percent / 100))));
    let g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 255) * (1 + percent / 100))));
    let b = Math.min(255, Math.max(0, Math.round((num & 255) * (1 + percent / 100))));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getTeamTheme(meta, teamName, defaultColor = '#0f547c') {
    let team = (meta && Array.isArray(meta.teams)) ? meta.teams.find(t => t && t.name === teamName) : null;
    let color = (team && team.theme_color && team.theme_color.startsWith('#')) ? team.theme_color : defaultColor;
    return {
        team: team,
        name: teamName || 'Team',
        color: color,
        darkColor: adjustBrightness(color, -25),
        lightColor: adjustBrightness(color, 25),
        textColor: getContrastColor(color),
        logo: team ? team.logo : null
    };
}

// ---------------------------------------------------------------------------
// Text & Cricket Notation Utilities
// ---------------------------------------------------------------------------
function toTitleCase(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().replace(/(?:^|\s|-|\.)\S/g, function(a) {
        return a.toUpperCase();
    });
}

function formatDismissal(status) {
    if (!status || typeof status !== 'string') return 'out';
    let s = status.trim();
    if (!s || s.toLowerCase() === 'not out') return 'not out';
    if (s.toLowerCase() === 'retired hurt') return 'retired hurt';
    
    // c & b Bowler Name
    let cbMatch = s.match(/^c\s*&\s*b\s+(.*)$/i);
    if (cbMatch) {
        return `c & b ${toTitleCase(cbMatch[1])}`;
    }
    
    // c Fielder Name b Bowler Name
    let cMatch = s.match(/^c\s+(.*?)\s+b\s+(.*)$/i);
    if (cMatch) {
        return `c ${toTitleCase(cMatch[1])} b ${toTitleCase(cMatch[2])}`;
    }
    
    // st Fielder Name b Bowler Name
    let stMatch = s.match(/^st\s+(.*?)\s+b\s+(.*)$/i);
    if (stMatch) {
        return `st ${toTitleCase(stMatch[1])} b ${toTitleCase(stMatch[2])}`;
    }
    
    // lbw b Bowler Name or lbw Bowler Name
    let lbwMatch = s.match(/^lbw(?:\s+b)?\s+(.*)$/i);
    if (lbwMatch) {
        return `lbw b ${toTitleCase(lbwMatch[1])}`;
    }
    
    // b Bowler Name
    let bMatch = s.match(/^b\s+(.*)$/i);
    if (bMatch) {
        return `b ${toTitleCase(bMatch[1])}`;
    }
    
    // run out (Fielder Name) or run out
    let roMatch = s.match(/^run\s*out(?:\s*\((.*?)\))?$/i);
    if (roMatch) {
        return roMatch[1] ? `run out (${toTitleCase(roMatch[1])})` : 'run out';
    }
    
    // hit wicket b Bowler Name
    let hwMatch = s.match(/^hit\s*wicket(?:\s+b)?\s+(.*)$/i);
    if (hwMatch) {
        return `hit wicket b ${toTitleCase(hwMatch[1])}`;
    }
    
    // out (method)
    let outMatch = s.match(/^out\s*\((.*?)\)$/i);
    if (outMatch) {
        return `out (${outMatch[1].toLowerCase()})`;
    }
    
    return s.toLowerCase();
}

let teamCache = null;
let playerCache = {};

async function populateImageCaches(state) {
    try {
        if (!teamCache || !Array.isArray(teamCache)) {
            let res = await eel.get_teams()();
            teamCache = Array.isArray(res) ? res : [];
        }
        
        let batTeamId = state.batting_team_id;
        let bowlTeamId = state.bowling_team_id;
        if (!batTeamId || !bowlTeamId) {
            let batTeam = teamCache.find(t => t && t.name === (state.innings === 1 ? state.team_1_name : state.team_2_name));
            let bowlTeam = teamCache.find(t => t && t.name === (state.innings === 1 ? state.team_2_name : state.team_1_name));
            if (batTeam) batTeamId = batTeam.id;
            if (bowlTeam) bowlTeamId = bowlTeam.id;
        }
        
        if (batTeamId && !playerCache[batTeamId]) {
            let pRes = await eel.get_players(batTeamId)();
            playerCache[batTeamId] = Array.isArray(pRes) ? pRes : [];
        }
        if (bowlTeamId && !playerCache[bowlTeamId]) {
            let pRes = await eel.get_players(bowlTeamId)();
            playerCache[bowlTeamId] = Array.isArray(pRes) ? pRes : [];
        }
        
        let p1 = Array.isArray(playerCache[batTeamId]) ? playerCache[batTeamId] : [];
        let p2 = Array.isArray(playerCache[bowlTeamId]) ? playerCache[bowlTeamId] : [];
        
        return {
            teams: teamCache || [],
            players: [...p1, ...p2]
        };
    } catch (err) {
        console.error("Error in populateImageCaches:", err);
        return { teams: teamCache || [], players: [] };
    }
}

let activeScorecardTab = null;
let lastSeenInnings = null;

window.switchScorecardTab = function(tab) {
    activeScorecardTab = tab;
    refreshUI();
};

async function refreshUI() {
    let state = await eel.get_state()();
    let meta = await populateImageCaches(state);
    
    if (!activeScorecardTab || state.innings !== lastSeenInnings) {
        activeScorecardTab = state.innings || 1;
        lastSeenInnings = state.innings;
    }
    
    // Resolve dynamic theme colors for both teams
    let t1Theme = getTeamTheme(meta, state.team_1_name, '#0f547c');
    let t2Theme = getTeamTheme(meta, state.team_2_name, '#059669');
    
    let currentBattingTheme = (state.innings === 1) ? t1Theme : t2Theme;
    let currentBowlingTheme = (state.innings === 1) ? t2Theme : t1Theme;
    let tabBattingTheme = (activeScorecardTab === 1) ? t1Theme : t2Theme;
    let tabBowlingTheme = (activeScorecardTab === 1) ? t2Theme : t1Theme;
    
    let leftName = state.team_1_name;
    let rightName = state.team_2_name;
    let leftScore = state.innings === 1 ? `${state.runs}/${state.wickets}` : (state.innings_1_stats ? `${state.innings_1_stats.runs}/${state.innings_1_stats.wickets}` : "0/0");
    let rightScore = state.innings === 1 ? (state.bowling_team_penalty ? `${state.bowling_team_penalty}/0` : "0/0") : `${state.runs}/${state.wickets}`;
    let leftOvers = state.innings === 1 ? `(${state.overs_completed}.${state.balls_this_over})` : (state.innings_1_stats ? `(${state.innings_1_stats.overs_completed}.${state.innings_1_stats.balls_this_over})` : "(0.0)");
    let rightOvers = state.innings === 1 ? "(0.0)" : `(${state.overs_completed}.${state.balls_this_over})`;
    
    // Header updates
    let elT1Name = document.getElementById("team1-name");
    if (elT1Name) elT1Name.innerText = leftName;
    let elT2Name = document.getElementById("team2-name");
    if (elT2Name) elT2Name.innerText = rightName;
    
    let tLeft = (meta.teams && Array.isArray(meta.teams)) ? meta.teams.find(t => t && t.name === leftName) : null;
    let elT1Img = document.getElementById("team1-img");
    let elT1Ph = document.getElementById("team1-placeholder");
    if (tLeft && tLeft.logo && elT1Img && elT1Ph) {
        elT1Img.src = tLeft.logo;
        elT1Img.classList.remove("hidden");
        elT1Ph.classList.add("hidden");
    } else if (elT1Img && elT1Ph) {
        elT1Img.classList.add("hidden");
        elT1Ph.classList.remove("hidden");
        elT1Ph.style.backgroundColor = t1Theme.color;
        elT1Ph.innerText = (state.team_1_name || 'T1').charAt(0);
    }
    
    let tRight = (meta.teams && Array.isArray(meta.teams)) ? meta.teams.find(t => t && t.name === rightName) : null;
    let elT2Img = document.getElementById("team2-img");
    let elT2Ph = document.getElementById("team2-placeholder");
    if (tRight && tRight.logo && elT2Img && elT2Ph) {
        elT2Img.src = tRight.logo;
        elT2Img.classList.remove("hidden");
        elT2Ph.classList.add("hidden");
    } else if (elT2Img && elT2Ph) {
        elT2Img.classList.add("hidden");
        elT2Ph.classList.remove("hidden");
        elT2Ph.style.backgroundColor = t2Theme.color;
        elT2Ph.innerText = (state.team_2_name || 'T2').charAt(0);
    }
    
    let elT1Score = document.getElementById("team1-score");
    if (elT1Score) elT1Score.innerText = leftScore;
    let elT2Score = document.getElementById("team2-score");
    if (elT2Score) elT2Score.innerText = rightScore;
    let elT1Overs = document.getElementById("team1-overs");
    if (elT1Overs) elT1Overs.innerText = leftOvers;
    let elT2Overs = document.getElementById("team2-overs");
    if (elT2Overs) elT2Overs.innerText = rightOvers;
    
    let elMaxOvers = document.getElementById("match-max-overs");
    if (elMaxOvers) elMaxOvers.innerText = `${state.max_overs} Overs`;
    
    // Dynamic Scorecard Tabs using team theme colors
    let tab1El = document.getElementById("tab-team1");
    let tab2El = document.getElementById("tab-team2");
    if (tab1El && tab2El) {
        if (activeScorecardTab === 1) {
            tab1El.style.background = `linear-gradient(135deg, ${t1Theme.color}, ${t1Theme.darkColor})`;
            tab1El.style.color = t1Theme.textColor;
            tab1El.style.boxShadow = `0 4px 14px ${hexToRgba(t1Theme.color, 0.32)}`;
            tab1El.className = "flex-1 px-4 py-2.5 rounded-xl cursor-pointer select-none font-bold flex items-center justify-between transition-all transform active:scale-98 shadow-sm";
            tab1El.innerHTML = `
                <div class="flex items-center gap-2">
                    ${t1Theme.logo ? `<img src="${t1Theme.logo}" class="w-5 h-5 rounded-full object-contain bg-white/20 p-0.5">` : `<span class="w-2.5 h-2.5 rounded-full bg-white/80"></span>`}
                    <span class="tracking-tight text-sm">${state.team_1_name || "Team 1"}</span>
                </div>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">1st Inn</span>
            `;
            
            tab2El.style.background = 'transparent';
            tab2El.style.color = '#475569';
            tab2El.style.boxShadow = 'none';
            tab2El.className = "flex-1 px-4 py-2.5 rounded-xl hover:bg-slate-200/60 cursor-pointer select-none font-bold flex items-center justify-between transition-all";
            tab2El.innerHTML = `
                <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">2nd Inn</span>
                <div class="flex items-center gap-2">
                    <span class="tracking-tight text-sm">${state.team_2_name || "Team 2"}</span>
                    <span class="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style="background: ${t2Theme.color};"></span>
                </div>
            `;
        } else {
            tab2El.style.background = `linear-gradient(135deg, ${t2Theme.color}, ${t2Theme.darkColor})`;
            tab2El.style.color = t2Theme.textColor;
            tab2El.style.boxShadow = `0 4px 14px ${hexToRgba(t2Theme.color, 0.32)}`;
            tab2El.className = "flex-1 px-4 py-2.5 rounded-xl cursor-pointer select-none font-bold flex items-center justify-between transition-all transform active:scale-98 shadow-sm";
            tab2El.innerHTML = `
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">2nd Inn</span>
                <div class="flex items-center gap-2">
                    <span class="tracking-tight text-sm">${state.team_2_name || "Team 2"}</span>
                    ${t2Theme.logo ? `<img src="${t2Theme.logo}" class="w-5 h-5 rounded-full object-contain bg-white/20 p-0.5">` : `<span class="w-2.5 h-2.5 rounded-full bg-white/80"></span>`}
                </div>
            `;
            
            tab1El.style.background = 'transparent';
            tab1El.style.color = '#475569';
            tab1El.style.boxShadow = 'none';
            tab1El.className = "flex-1 px-4 py-2.5 rounded-xl hover:bg-slate-200/60 cursor-pointer select-none font-bold flex items-center justify-between transition-all";
            tab1El.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style="background: ${t1Theme.color};"></span>
                    <span class="tracking-tight text-sm">${state.team_1_name || "Team 1"}</span>
                </div>
                <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">1st Inn</span>
            `;
        }
    }
    
    // RR / Target
    let bpo = state.balls_per_over || 6;
    let total_balls = (state.overs_completed * bpo) + state.balls_this_over;
    let rr = total_balls > 0 ? (state.runs / total_balls * bpo) : 0;
    let elRR = document.getElementById("lbl-rr");
    if (elRR) elRR.innerText = `RR: ${rr.toFixed(2)}`;
    
    let elTarget = document.getElementById("lbl-target");
    let elRRR = document.getElementById("lbl-rrr");
    let elEquation = document.getElementById("lbl-equation");
    if (state.target) {
        if (elTarget) elTarget.innerText = `Target: ${state.target}`;
        if (state.innings === 2) {
            let runs_needed = state.target - state.runs;
            let balls_rem = (state.max_overs * bpo) - total_balls;
            let rrr = balls_rem > 0 ? (runs_needed / balls_rem * bpo) : 0;
            if (elRRR) elRRR.innerText = `RRR: ${rrr.toFixed(2)}`;
            let chaseTeam = state.team_2_name || "Team 2";
            if (elEquation) {
                if (runs_needed > 0 && balls_rem > 0) {
                    elEquation.innerText = `${chaseTeam} need ${runs_needed} runs from ${balls_rem} balls`;
                } else if (runs_needed <= 0) {
                    elEquation.innerText = `${chaseTeam} won the match!`;
                } else {
                    elEquation.innerText = `Innings over`;
                }
            }
        } else {
            if (elRRR) elRRR.innerText = "";
            if (elEquation) elEquation.innerText = `Target set to ${state.target} runs`;
        }
    } else {
        if (elTarget) elTarget.innerText = "";
        if (elRRR) elRRR.innerText = "";
        if (elEquation) elEquation.innerText = "";
    }
    
    // Active players - with defensive null checks for innings transitions & concluded games
    let strName = state.striker ? state.striker.name : "-";
    let strRuns = state.striker ? state.striker.runs : 0;
    let strBalls = state.striker ? state.striker.balls : 0;
    let elStrName = document.getElementById("striker-name");
    if (elStrName) elStrName.innerText = state.striker ? (toTitleCase(strName) + " *") : "-";
    let elStrScore = document.getElementById("striker-score");
    if (elStrScore) elStrScore.innerHTML = state.striker ? `${strRuns} <span class="text-xs font-normal opacity-90">(${strBalls})</span>` : "-";
    
    // Style active striker card with current batting team's theme color
    let elStrikerCard = document.getElementById("striker-card");
    if (elStrikerCard && state.striker) {
        elStrikerCard.style.background = `linear-gradient(135deg, ${currentBattingTheme.color}, ${currentBattingTheme.darkColor})`;
        elStrikerCard.style.color = currentBattingTheme.textColor;
        elStrikerCard.style.boxShadow = `0 4px 14px ${hexToRgba(currentBattingTheme.color, 0.28)}`;
    }
    
    let nstrName = state.non_striker ? state.non_striker.name : "-";
    let nstrRuns = state.non_striker ? state.non_striker.runs : 0;
    let nstrBalls = state.non_striker ? state.non_striker.balls : 0;
    let elNstrName = document.getElementById("nonstriker-name");
    if (elNstrName) elNstrName.innerText = state.non_striker ? toTitleCase(nstrName) : "-";
    let elNstrScore = document.getElementById("nonstriker-score");
    if (elNstrScore) elNstrScore.innerHTML = state.non_striker ? `${nstrRuns} <span class="text-xs font-normal text-slate-500">(${nstrBalls})</span>` : "-";
    
    let bwlObj = (state.bowler && typeof state.bowler === 'object') ? state.bowler : { name: state.bowler || "-", runs: 0, wickets: 0, overs: 0 };
    let bowlName = bwlObj.name || "-";
    let bowlRuns = bwlObj.runs || 0;
    let bowlWkts = bwlObj.wickets || 0;
    let bowlOvers = bwlObj.overs || 0;
    let elBwlName = document.getElementById("bowler-name");
    if (elBwlName) elBwlName.innerText = (bwlObj.name && bwlObj.name !== "-") ? toTitleCase(bowlName) : "-";
    let elBwlScore = document.getElementById("bowler-score");
    if (elBwlScore) elBwlScore.innerHTML = (bwlObj.name && bwlObj.name !== "-") ? `${bowlRuns}-${bowlWkts} <span class="text-xs font-normal text-slate-300">(${bowlOvers})</span>` : "-";
    
    let elBowlerBadge = document.getElementById("bowler-badge");
    if (elBowlerBadge) {
        elBowlerBadge.style.background = hexToRgba(currentBowlingTheme.color, 0.4);
    }
    
    let targetState = state;
    if (activeScorecardTab !== state.innings) {
        if (activeScorecardTab === 1 && state.innings_1_stats) {
            targetState = state.innings_1_stats;
        } else if (activeScorecardTab === 2 && (state.innings || 1) === 1) {
            targetState = {
                batting_team_id: state.bowling_team_id,
                batsmen_stats: {},
                bowler_stats: {},
                extras: {wd:0, nb:0, b:0, lb:0},
                this_over: [],
                past_overs: [],
                out_batsmen: []
            };
        }
    }
    
    // Extras
    let ex = targetState.extras || {wd:0, nb:0, b:0, lb:0};
    let exTotal = (ex.wd || 0) + (ex.nb || 0) + (ex.b || 0) + (ex.lb || 0) + (ex.pen || 0);
    let penText = ex.pen ? `, Pen ${ex.pen}` : '';
    let elExtras = document.getElementById("extras-summary");
    if (elExtras) {
        elExtras.innerText = `${exTotal} (Wd ${ex.wd || 0}, Nb ${ex.nb || 0}, B ${ex.b || 0}, LB ${ex.lb || 0}${penText})`;
    }
    
    // Recent Balls
    let recentHTML = "";
    if (targetState.this_over && targetState.this_over.length > 0) {
        targetState.this_over.forEach(b => {
            let bStr = String(b);
            let bg = "bg-white text-slate-800 border-slate-300 border shadow-xs";
            if (bStr.includes("W") && !bStr.includes("Wd")) bg = "bg-[#cc0000] text-white border-red-700 shadow-sm font-black";
            else if (bStr.includes("4")) bg = "bg-blue-600 text-white border-blue-700 shadow-sm font-black";
            else if (bStr.includes("6")) bg = "bg-emerald-600 text-white border-emerald-700 shadow-sm font-black";
            else if (bStr.includes("Pen")) bg = "bg-purple-600 text-white border-purple-700 shadow-sm font-bold";
            else if (bStr.includes("Wd") || bStr.includes("Nb")) bg = "bg-amber-500 text-white border-amber-600 shadow-sm font-bold";
            recentHTML += `<div class="min-w-[2rem] px-1.5 h-8 flex items-center justify-center font-bold text-xs rounded ${bg}">${bStr}</div>`;
        });
    } else if (targetState.past_overs && targetState.past_overs.length > 0) {
        // If an over just completed, show the completed over's balls with context
        let lastOverNum = targetState.past_overs.length;
        let lastOver = targetState.past_overs[lastOverNum - 1];
        if (lastOver && Array.isArray(lastOver.balls) && lastOver.balls.length > 0) {
            recentHTML += `<span class="text-[11px] font-bold text-slate-400 self-center mr-1">Ov ${lastOverNum}:</span>`;
            lastOver.balls.forEach(b => {
                let bStr = String(b);
                let bg = "bg-slate-100 text-slate-700 border-slate-300 border opacity-85";
                if (bStr.includes("W") && !bStr.includes("Wd")) bg = "bg-[#cc0000]/80 text-white border-red-700";
                else if (bStr.includes("4")) bg = "bg-blue-600/80 text-white border-blue-700";
                else if (bStr.includes("6")) bg = "bg-emerald-600/80 text-white border-emerald-700";
                else if (bStr.includes("Pen")) bg = "bg-purple-600/80 text-white border-purple-700";
                else if (bStr.includes("Wd") || bStr.includes("Nb")) bg = "bg-amber-500/80 text-white border-amber-600";
                recentHTML += `<div class="min-w-[2rem] px-1.5 h-8 flex items-center justify-center font-bold text-xs rounded ${bg}">${bStr}</div>`;
            });
            recentHTML += `<span class="text-[10px] text-slate-400 font-semibold self-center ml-1 italic">(Over complete)</span>`;
        } else {
            recentHTML = `<span class="text-xs text-slate-400 italic py-1">Start of over — no balls bowled yet</span>`;
        }
    } else {
        recentHTML = `<span class="text-xs text-slate-400 italic py-1">Start of innings — no balls bowled yet</span>`;
    }
    let elRecentBalls = document.getElementById("recent-balls");
    if (elRecentBalls) elRecentBalls.innerHTML = recentHTML;
    
    // Dynamic Innings Status Banner in Scorecard
    let elBanner = document.getElementById("scorecard-innings-banner");
    if (elBanner) {
        let inningsNum = activeScorecardTab;
        let bRuns = targetState.runs !== undefined ? targetState.runs : 0;
        let bWkts = targetState.wickets !== undefined ? targetState.wickets : 0;
        let bOv = targetState.overs_completed !== undefined ? `${targetState.overs_completed}.${targetState.balls_this_over || 0}` : "0.0";
        let bBpo = state.balls_per_over || 6;
        let bTotBalls = ((targetState.overs_completed || 0) * bBpo) + (targetState.balls_this_over || 0);
        let bRR = bTotBalls > 0 ? (bRuns / bTotBalls * bBpo).toFixed(2) : "0.00";
        
        elBanner.style.background = `linear-gradient(to right, ${hexToRgba(tabBattingTheme.color, 0.08)}, ${hexToRgba(tabBattingTheme.color, 0.02)})`;
        elBanner.style.borderColor = hexToRgba(tabBattingTheme.color, 0.22);
        
        let isChasing = (inningsNum === 2);
        let rightBadge = "";
        if (isChasing && state.target) {
            rightBadge = `
                <div class="text-right flex items-center gap-2">
                    <span class="text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs" style="background: ${hexToRgba(tabBattingTheme.color, 0.15)}; color: ${tabBattingTheme.color};">Target: ${state.target}</span>
                    <span class="text-xs text-slate-500 font-semibold">CRR: <strong class="text-slate-800">${bRR}</strong></span>
                </div>
            `;
        } else {
            rightBadge = `
                <div class="text-right">
                    <div class="text-xs text-slate-500 font-semibold">CRR: <strong class="text-slate-800 text-sm">${bRR}</strong></div>
                </div>
            `;
        }
        
        elBanner.innerHTML = `
            <div class="flex items-center gap-2.5">
                ${tabBattingTheme.logo ? `<img src="${tabBattingTheme.logo}" class="w-9 h-9 rounded-xl object-contain bg-white p-1 shadow-2xs border border-slate-200/80">` : `<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs" style="background: ${hexToRgba(tabBattingTheme.color, 0.18)}; color: ${tabBattingTheme.color};">${(tabBattingTheme.name || "?").charAt(0)}</div>`}
                <div>
                    <div class="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 leading-tight">
                        <span>${tabBattingTheme.name}</span>
                        <span class="w-2 h-2 rounded-full" style="background: ${tabBattingTheme.color};"></span>
                    </div>
                    <div class="text-[11px] text-slate-500 font-medium mt-0.5">
                        ${inningsNum === 1 ? '1st Innings' : '2nd Innings'} • Max ${state.max_overs} ov
                    </div>
                </div>
            </div>
            ${rightBadge}
        `;
    }
    
    // Batting Table
    let batHTML = "";
    try {
        if (targetState.batsmen_stats && Object.keys(targetState.batsmen_stats).length > 0) {
            let playersList = (meta && Array.isArray(meta.players)) ? meta.players : [];
            Object.keys(targetState.batsmen_stats).forEach(name => {
                let p = targetState.batsmen_stats[name] || {};
                let pRuns = p.runs !== undefined ? p.runs : 0;
                let pBalls = p.balls !== undefined ? p.balls : 0;
                let sr = pBalls > 0 ? (pRuns / pBalls * 100).toFixed(2) : "0.00";
                let isStriker = state.striker && state.striker.name === name;
                let isNonStriker = state.non_striker && state.non_striker.name === name;
                let isOut = p.status && p.status !== "not out";
                
                let rowStyle = "";
                let rowClass = "border-b border-slate-100/90 transition-colors";
                
                if (isStriker) {
                    rowStyle = `background: ${hexToRgba(tabBattingTheme.color, 0.05)}; border-left: 3px solid ${tabBattingTheme.color};`;
                    rowClass += " font-bold";
                } else if (isNonStriker) {
                    rowStyle = `background: rgba(248, 250, 252, 0.8); border-left: 3px solid #94a3b8;`;
                    rowClass += " font-semibold";
                } else if (isOut) {
                    rowClass += " text-slate-500 opacity-80";
                }
                
                let pMeta = playersList.find(x => x && ((x.full_name || (x.first_name ? (x.first_name + " " + (x.last_name || "")) : "")).trim() === (name || "").trim()));
                let imgTag = (pMeta && pMeta.image) 
                    ? `<img src="${pMeta.image}" class="w-10 h-10 rounded-full object-cover border border-slate-200 bg-white shadow-2xs shrink-0">` 
                    : `<div class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-2xs shrink-0" style="background: ${hexToRgba(tabBattingTheme.color, 0.15)}; color: ${tabBattingTheme.color};">${(name || "?").charAt(0).toUpperCase()}</div>`;
                
                let statusText = isStriker 
                    ? `<span class="text-[10px] font-bold px-1.5 py-0.2 rounded" style="background: ${hexToRgba(tabBattingTheme.color, 0.15)}; color: ${tabBattingTheme.color};">Striker</span>`
                    : (isNonStriker 
                        ? `<span class="text-[10px] font-semibold text-slate-500">Non-striker</span>`
                        : `<span class="text-[11px] text-slate-400 font-medium">${formatDismissal(p.status)}</span>`);
                
                let displayName = toTitleCase(name);
                batHTML += `
                    <tr class="${rowClass}" style="${rowStyle}">
                        <td class="py-1 pl-3">
                            <div class="flex items-center gap-2.5">
                                ${imgTag}
                                <div class="min-w-0">
                                    <div class="text-slate-800 text-sm leading-tight truncate font-semibold">${displayName}${isStriker ? ' *' : ''}</div>
                                    <div class="mt-0.5 leading-none">${statusText}</div>
                                </div>
                            </div>
                        </td>
                        <td class="text-center font-black text-slate-900 text-sm py-1">${pRuns}</td>
                        <td class="text-center text-xs font-semibold text-slate-600 py-1">${pBalls}</td>
                        <td class="text-center text-xs font-semibold text-slate-600 py-1">${p["4s"] || 0}</td>
                        <td class="text-center text-xs font-semibold text-slate-600 py-1">${p["6s"] || 0}</td>
                        <td class="text-center text-xs font-bold text-slate-700 pr-3 py-1">${sr}</td>
                    </tr>
                `;
            });
        }
    } catch (e) {
        console.error("Error rendering batting table:", e);
    }
    if (!batHTML) {
        if (activeScorecardTab === 2 && (state.innings || 1) === 1) {
            batHTML = `<tr><td colspan="6" class="text-center py-7 text-slate-400 font-medium"><div class="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">2nd Innings Not Started</div>${state.team_2_name || "Team 2"} yet to bat</td></tr>`;
        } else {
            batHTML = `<tr><td colspan="6" class="text-center py-5 text-xs text-slate-400 italic">No batting statistics recorded yet</td></tr>`;
        }
    }
    let elBatTbody = document.getElementById("batting-table-body");
    if (elBatTbody) elBatTbody.innerHTML = batHTML;
    
    // Yet to bat
    let yetToBatNames = [];
    try {
        let batTeamId = targetState.batting_team_id;
        if (batTeamId) {
            let playersList = (meta && Array.isArray(meta.players)) ? meta.players : [];
            let cleanBatTeamId = String(batTeamId).replace(/-/g, "").toLowerCase();
            let allBatters = playersList.filter(p => p && p.team && String(p.team).replace(/-/g, "").toLowerCase() === cleanBatTeamId);
            let outBatsmen = targetState.out_batsmen || [];
            let currentlyBatting = targetState.batsmen_stats ? Object.keys(targetState.batsmen_stats) : [];
            
            yetToBatNames = allBatters
                .map(p => (p.full_name || (p.first_name ? (p.first_name + " " + (p.last_name || "")) : "")).trim())
                .filter(name => name && !currentlyBatting.includes(name) && !outBatsmen.includes(name));
        }
    } catch (e) {
        console.error("Error rendering yet to bat:", e);
    }
    
    let elYetToBatCount = document.getElementById("yet-to-bat-count");
    if (elYetToBatCount) {
        elYetToBatCount.innerText = yetToBatNames.length > 0 ? `${yetToBatNames.length} remaining` : "";
    }
    
    let elYetToBat = document.getElementById("yet-to-bat");
    if (elYetToBat) {
        if (yetToBatNames.length > 0) {
            let chips = yetToBatNames.map(name => `
                <span class="inline-block px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 text-slate-700 text-xs font-semibold shadow-2xs hover:border-slate-300 transition-colors">
                    ${toTitleCase(name)}
                </span>
            `).join("");
            elYetToBat.innerHTML = `<div class="flex flex-wrap gap-1.5 mt-1">${chips}</div>`;
        } else {
            if (activeScorecardTab === 2 && (state.innings || 1) === 1) {
                elYetToBat.innerHTML = `<div class="py-1 text-xs text-slate-400 italic">Full squad available for 2nd innings</div>`;
            } else {
                elYetToBat.innerHTML = `<div class="py-1 text-xs text-slate-400 italic">All batsmen have batted</div>`;
            }
        }
    }
    
    // Bowling Table
    let bowlHTML = "";
    let elBowlHeader = document.getElementById("bowling-table-header");
    if (elBowlHeader) {
        elBowlHeader.innerHTML = `Bowler <span class="font-normal opacity-75 text-[10px]">(${tabBowlingTheme.name})</span>`;
    }
    
    try {
        if (targetState.bowler_stats && Object.keys(targetState.bowler_stats).length > 0) {
            let playersList = (meta && Array.isArray(meta.players)) ? meta.players : [];
            Object.keys(targetState.bowler_stats).forEach(name => {
                let p = targetState.bowler_stats[name] || {};
                let overs = p.overs || 0;
                let b_full = Math.floor(overs);
                let b_rem = Math.round((overs - b_full) * 10);
                let t_balls = b_full * bpo + b_rem;
                let pRuns = p.runs || 0;
                let econ = t_balls > 0 ? (pRuns / t_balls * bpo).toFixed(2) : "0.00";
                let isCurrentBowler = state.bowler && (typeof state.bowler === 'object' ? state.bowler.name === name : state.bowler === name);
                
                let rowStyle = isCurrentBowler ? `background: ${hexToRgba(tabBowlingTheme.color, 0.05)}; border-left: 3px solid ${tabBowlingTheme.color};` : "";
                let rowClass = isCurrentBowler ? "border-b border-slate-100 font-bold" : "border-b border-slate-100/90 hover:bg-slate-50/50 transition-colors";
                
                let pMeta = playersList.find(x => x && ((x.full_name || (x.first_name ? (x.first_name + " " + (x.last_name || "")) : "")).trim() === (name || "").trim()));
                let imgTag = (pMeta && pMeta.image) 
                    ? `<img src="${pMeta.image}" class="w-10 h-10 rounded-full object-cover border border-slate-200 bg-white shadow-2xs shrink-0">` 
                    : `<div class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-2xs shrink-0" style="background: ${hexToRgba(tabBowlingTheme.color, 0.15)}; color: ${tabBowlingTheme.color};">${(name || "?").charAt(0).toUpperCase()}</div>`;

                let displayName = toTitleCase(name);
                bowlHTML += `
                    <tr class="${rowClass}" style="${rowStyle}">
                        <td class="py-1 pl-3">
                            <div class="flex items-center gap-2.5">
                                ${imgTag}
                                <div class="min-w-0">
                                    <div class="text-slate-800 text-sm leading-tight truncate font-semibold">${displayName}</div>
                                    ${isCurrentBowler ? `<span class="text-[10px] font-bold px-1.5 py-0.2 rounded inline-block mt-0.5" style="background: ${hexToRgba(tabBowlingTheme.color, 0.15)}; color: ${tabBowlingTheme.color};">Current</span>` : ''}
                                </div>
                            </div>
                        </td>
                        <td class="text-center text-xs font-semibold text-slate-700 py-1">${p.overs || 0}</td>
                        <td class="text-center text-xs font-semibold text-slate-600 py-1">${p.maidens || 0}</td>
                        <td class="text-center text-xs font-bold text-slate-800 py-1">${pRuns}</td>
                        <td class="text-center py-1">
                            <span class="inline-block px-2 py-0.5 rounded-md font-black text-xs shadow-2xs" style="background: ${hexToRgba(tabBowlingTheme.color, 0.15)}; color: ${tabBowlingTheme.color};">
                                ${p.wickets || 0}
                            </span>
                        </td>
                        <td class="text-center text-xs font-bold text-slate-700 pr-3 py-1">${econ}</td>
                    </tr>
                `;
            });
        }
    } catch (e) {
        console.error("Error rendering bowling table:", e);
    }
    if (!bowlHTML) {
        if (activeScorecardTab === 2 && (state.innings || 1) === 1) {
            bowlHTML = `<tr><td colspan="6" class="text-center py-7 text-slate-400 font-medium">Innings 2 not started yet</td></tr>`;
        } else {
            bowlHTML = `<tr><td colspan="6" class="text-center py-5 text-xs text-slate-400 italic">No bowling statistics recorded yet</td></tr>`;
        }
    }
    let elBowlTbody = document.getElementById("bowling-table-body");
    if (elBowlTbody) elBowlTbody.innerHTML = bowlHTML;
    
    // Scorecard Footer Summary
    let elFooter = document.getElementById("scorecard-footer-summary");
    if (elFooter) {
        elFooter.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="font-bold text-slate-700">Extras:</span>
                <span class="font-black text-slate-900">${exTotal}</span>
                <span class="text-slate-400 text-[11px]">(Wd ${ex.wd || 0}, Nb ${ex.nb || 0}, B ${ex.b || 0}, LB ${ex.lb || 0}${penText})</span>
            </div>
            <div class="text-[11px] text-slate-400">
                <span>Status: </span>
                <strong class="text-slate-700 font-semibold">${activeScorecardTab === (state.innings || 1) ? (state.match_over ? 'Final' : 'Live') : 'Completed'}</strong>
            </div>
        `;
    }
    
    // Update sidebar live status
    let sbStatus = document.getElementById("sidebar-match-status");
    let sbSub = document.getElementById("sidebar-match-subtitle");
    let sbBadge = document.getElementById("badge-scoreboard");
    if (sbStatus && sbSub) {
        if (state.match_over) {
            sbStatus.innerText = "Match Completed";
            sbSub.innerText = `${leftName} vs ${rightName}`;
            if (sbBadge) {
                sbBadge.innerText = "Final";
                sbBadge.className = "text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600";
            }
        } else if (state.team_1_name && state.team_2_name) {
            sbStatus.innerText = `${state.team_1_name} vs ${state.team_2_name}`;
            sbSub.innerText = `Inn ${state.innings || 1}: ${leftScore} (${leftOvers})`;
            if (sbBadge) {
                sbBadge.innerText = "LIVE";
                sbBadge.className = "text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse";
            }
        }
    }

    // Speed Scale Controller & Status sync
    let scSlider = document.getElementById("scale-slider");
    let scStatus = document.getElementById("scale-overlay-status");
    if (state.ball_speed) {
        let speedVal = parseFloat(state.ball_speed);
        if (scSlider && !isNaN(speedVal) && document.activeElement !== scSlider) {
            scSlider.value = speedVal;
            if (typeof window.updateScaleIndicatorDisplay === 'function') {
                window.updateScaleIndicatorDisplay(speedVal);
            }
        }
        if (scStatus) {
            scStatus.innerText = `${state.ball_speed} km/h (Live)`;
            scStatus.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30";
        }
    } else {
        if (scStatus) {
            scStatus.innerText = "No Speed";
            scStatus.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
        }
    }

    // Auto-show match summary if match is over
    if (state.match_over) {
        showMatchOverPrompt();
    }
}

eel.expose(showNewOverPrompt);
function showNewOverPrompt(prevBowler) {
    _doShowNewOverPrompt(prevBowler);
}

async function _doShowNewOverPrompt(prevBowler) {
    let state = await eel.get_state()();
    let meta = await populateImageCaches(state);
    
    let bowlPlayers = (meta && Array.isArray(meta.players)) ? meta.players : [];
    if (state.bowling_team_id) {
        let cleanBowlId = String(state.bowling_team_id).replace(/-/g, "").toLowerCase();
        bowlPlayers = bowlPlayers.filter(p => p && p.team && String(p.team).replace(/-/g, "").toLowerCase() === cleanBowlId);
    }
    
    let options = bowlPlayers
        .map(p => (p.full_name || (p.first_name ? (p.first_name + " " + (p.last_name || "")) : "")).trim())
        .filter(name => name && name !== prevBowler)
        .map(name => `<option value="${name}">${name}</option>`)
        .join("");

    let html = `
        <div class="p-4 bg-blue-600 text-white font-bold text-lg">End of Over!</div>
        <div class="p-6 flex flex-col gap-4">
            <div>
                <label class="block font-bold mb-1">Select New Bowler</label>
                <select id="new-bowler-select" class="border p-2 w-full">
                    ${options || '<option value="Unknown Bowler">Unknown Bowler</option>'}
                </select>
                <div class="text-sm text-gray-500 mt-1">Cannot bowl two consecutive overs. Previous bowler: ${prevBowler}</div>
            </div>
            <div class="flex justify-end gap-2 mt-4">
                <button onclick="submitNewBowler()" class="px-4 py-2 bg-blue-600 text-white rounded font-bold">Confirm</button>
            </div>
        </div>
    `;
    showModal(html);
}

window.submitNewBowler = async function() {
    let name = document.getElementById("new-bowler-select").value;
    if (!name) name = "New Bowler";
    await eel.set_new_bowler(name)();
    closeModal();
    refreshUI();
}

eel.expose(showInnings2SetupPrompt);
function showInnings2SetupPrompt(target) {
    _doShowInnings2Setup(target);
}

async function _doShowInnings2Setup(target) {
    let state = await eel.get_state()();
    let meta = await populateImageCaches(state);
    
    // Remember the IDs are already swapped in Python state! 
    // So batting team is the new chasing team.
    let playersList = (meta && Array.isArray(meta.players)) ? meta.players : [];
    let cleanBatId = String(state.batting_team_id || "").replace(/-/g, "").toLowerCase();
    let cleanBowlId = String(state.bowling_team_id || "").replace(/-/g, "").toLowerCase();
    let batPlayers = playersList.filter(p => p && p.team && String(p.team).replace(/-/g, "").toLowerCase() === cleanBatId);
    let bowlPlayers = playersList.filter(p => p && p.team && String(p.team).replace(/-/g, "").toLowerCase() === cleanBowlId);
    
    let batNames = batPlayers.map(p => (p.full_name || (p.first_name ? (p.first_name + " " + (p.last_name || "")) : "")).trim()).filter(Boolean);
    let bowlNames = bowlPlayers.map(p => (p.full_name || (p.first_name ? (p.first_name + " " + (p.last_name || "")) : "")).trim()).filter(Boolean);

    if (batNames.length === 0) batNames = ["Opening Batsman 1", "Opening Batsman 2", "Batsman 3"];
    if (bowlNames.length === 0) bowlNames = ["Opening Bowler", "Change Bowler"];

    let batOptions1 = batNames.map((name, i) => `<option value="${name}" ${i === 0 ? 'selected' : ''}>${name}</option>`).join("");
    let batOptions2 = batNames.map((name, i) => `<option value="${name}" ${i === 1 ? 'selected' : (i === 0 && batNames.length === 1 ? 'selected' : '')}>${name}</option>`).join("");
    let bowlOptions = bowlNames.map((name, i) => `<option value="${name}" ${i === 0 ? 'selected' : ''}>${name}</option>`).join("");

    let html = `
        <div class="p-4 bg-slate-900 text-white font-bold text-base flex justify-between items-center border-b border-slate-800">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-base font-black shadow-inner">
                    🏏
                </div>
                <div>
                    <div class="text-sm font-bold text-white">Start Innings 2 • Target: ${target} Runs</div>
                    <div class="text-[11px] text-slate-400 font-normal">${state.team_2_name} need ${target} runs from ${state.max_overs} overs</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center text-xl transition-colors">&times;</button>
        </div>
        
        <div class="p-6 bg-slate-50 flex flex-col gap-4">
            <div class="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
                <div>
                    <span class="font-bold text-emerald-900">Chasing Team:</span> ${state.team_2_name}
                </div>
                <div class="font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs">
                    Target: ${target} Runs
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Striker</label>
                    <select id="i2-striker" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">${batOptions1}</select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Non-Striker</label>
                    <select id="i2-nonstriker" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">${batOptions2}</select>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Opening Bowler (${state.team_1_name})</label>
                <select id="i2-bowler" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">${bowlOptions}</select>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-1">
                <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors">Cancel</button>
                <button onclick="submitInnings2Setup()" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all active:scale-98">Start 2nd Innings</button>
            </div>
        </div>
    `;
    showModal(html, "w-[520px]");
}

window.submitInnings2Setup = async function() {
    let str = document.getElementById("i2-striker").value;
    let nstr = document.getElementById("i2-nonstriker").value;
    let bwl = document.getElementById("i2-bowler").value;
    
    if(str === nstr) {
        alert("Striker and Non-Striker cannot be the same person!");
        return;
    }
    
    await eel.start_innings_2(str, nstr, bwl)();
    closeModal();
    refreshUI();
}

eel.expose(showMatchOverPrompt);
async function showMatchOverPrompt() {
    let state = await eel.get_state()();
    let meta = await populateImageCaches(state);
    
    // Ensure all players for both teams are loaded into meta.players
    if (meta && meta.teams) {
        let t1Obj = meta.teams.find(t => t && t.name === state.team_1_name);
        let t2Obj = meta.teams.find(t => t && t.name === state.team_2_name);
        if (t1Obj && (!playerCache[t1Obj.id] || playerCache[t1Obj.id].length === 0)) {
            try { playerCache[t1Obj.id] = await eel.get_players(t1Obj.id)(); } catch(e){}
        }
        if (t2Obj && (!playerCache[t2Obj.id] || playerCache[t2Obj.id].length === 0)) {
            try { playerCache[t2Obj.id] = await eel.get_players(t2Obj.id)(); } catch(e){}
        }
        let allP = [];
        if (t1Obj && Array.isArray(playerCache[t1Obj.id])) allP.push(...playerCache[t1Obj.id]);
        if (t2Obj && Array.isArray(playerCache[t2Obj.id])) allP.push(...playerCache[t2Obj.id]);
        meta.players = allP;
    }
    
    document.getElementById("scoring-screen").classList.add("hidden");
    let summaryScreen = document.getElementById("match-summary-screen");
    summaryScreen.classList.remove("hidden");
    
    let t1Theme = getTeamTheme(meta, state.team_1_name, '#0f547c');
    let t2Theme = getTeamTheme(meta, state.team_2_name, '#059669');
    let bpo = state.balls_per_over || 6;
    let playersList = (meta && Array.isArray(meta.players)) ? meta.players : [];
    
    // Player avatar helper
    function getPlayerAvatar(pName, teamTheme) {
        if (!pName) return '';
        let cleanName = pName.trim().toLowerCase();
        let pMeta = playersList.find(x => {
            if (!x) return false;
            let fn = (x.full_name || (x.first_name ? (x.first_name + " " + (x.last_name || "")) : "")).trim().toLowerCase();
            return fn === cleanName || (x.first_name && x.first_name.toLowerCase() === cleanName) || (x.last_name && x.last_name.toLowerCase() === cleanName);
        });
        
        if (pMeta && pMeta.image) {
            return `<img src="${pMeta.image}" class="w-9 h-9 rounded-xl object-cover bg-white border border-slate-200 shadow-2xs shrink-0" alt="${pName}">`;
        }
        
        let initial = pName.charAt(0).toUpperCase();
        return `
            <div class="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs" 
                 style="background: ${hexToRgba(teamTheme.color, 0.15)}; color: ${teamTheme.color}; border: 1.5px solid ${hexToRgba(teamTheme.color, 0.3)};">
                ${initial}
            </div>
        `;
    }
    
    // Extract top batsmen
    function getTopBatsmen(statsObj) {
        if (!statsObj || typeof statsObj !== 'object') return [];
        let list = Object.values(statsObj).filter(p => p && p.name && (p.runs !== undefined || p.balls !== undefined));
        list.sort((a, b) => {
            let rA = a.runs || 0;
            let rB = b.runs || 0;
            if (rB !== rA) return rB - rA;
            return (a.balls || 0) - (b.balls || 0);
        });
        return list.slice(0, 3);
    }
    
    // Extract top bowlers
    function getTopBowlers(statsObj) {
        if (!statsObj || typeof statsObj !== 'object') return [];
        let list = Object.values(statsObj).filter(b => b && b.name && (b.overs !== undefined || b.wickets !== undefined || b.runs !== undefined));
        list.sort((a, b) => {
            let wA = a.wickets || 0;
            let wB = b.wickets || 0;
            if (wB !== wA) return wB - wA; // more wickets first
            return (a.runs || 0) - (b.runs || 0); // fewer runs first
        });
        return list.slice(0, 3);
    }
    
    // Extras helper
    function formatExtras(extrasObj) {
        if (!extrasObj) return { total: 0, detail: "0" };
        let wd = extrasObj.wd || 0;
        let nb = extrasObj.nb || 0;
        let b = extrasObj.b || 0;
        let lb = extrasObj.lb || 0;
        let pen = extrasObj.pen || 0;
        let total = wd + nb + b + lb + pen;
        let parts = [];
        if (wd > 0) parts.push(`w ${wd}`);
        if (nb > 0) parts.push(`nb ${nb}`);
        if (b > 0) parts.push(`b ${b}`);
        if (lb > 0) parts.push(`lb ${lb}`);
        if (pen > 0) parts.push(`pen ${pen}`);
        return {
            total: total,
            detail: parts.length > 0 ? parts.join(", ") : "0"
        };
    }
    
    // Boundary counter
    function countBoundaries(statsObj) {
        let fours = 0, sixes = 0;
        if (!statsObj) return { fours, sixes };
        Object.values(statsObj).forEach(p => {
            if (p) {
                fours += (p['4s'] || p.fours || 0);
                sixes += (p['6s'] || p.sixes || 0);
            }
        });
        return { fours, sixes };
    }
    
    let isEndedIn1 = (!state.innings || state.innings === 1);
    
    // Innings 1 data
    let i1_runs = isEndedIn1 ? (state.runs || 0) : (state.innings_1_stats ? (state.innings_1_stats.runs || 0) : 0);
    let i1_wickets = isEndedIn1 ? (state.wickets || 0) : (state.innings_1_stats ? (state.innings_1_stats.wickets || 0) : 0);
    let i1_oversComp = isEndedIn1 ? (state.overs_completed || 0) : (state.innings_1_stats ? (state.innings_1_stats.overs_completed || 0) : 0);
    let i1_ballsOver = isEndedIn1 ? (state.balls_this_over || 0) : (state.innings_1_stats ? (state.innings_1_stats.balls_this_over || 0) : 0);
    let i1_batsmenStats = isEndedIn1 ? (state.batsmen_stats || {}) : (state.innings_1_stats ? (state.innings_1_stats.batsmen_stats || {}) : {});
    let i1_bowlerStats = isEndedIn1 ? (state.bowler_stats || {}) : (state.innings_1_stats ? (state.innings_1_stats.bowler_stats || {}) : {});
    let i1_extras = isEndedIn1 ? (state.extras || {}) : (state.innings_1_stats ? (state.innings_1_stats.extras || {}) : {});
    let i1_score = `${i1_runs}/${i1_wickets}`;
    let i1_overs = `${i1_oversComp}.${i1_ballsOver}`;
    let i1_totBalls = (i1_oversComp * bpo) + i1_ballsOver;
    let i1_crr = i1_totBalls > 0 ? (i1_runs / (i1_totBalls / bpo)).toFixed(2) : "0.00";
    let i1_ext = formatExtras(i1_extras);
    let i1_bat = getTopBatsmen(i1_batsmenStats);
    let i1_bowl = getTopBowlers(i1_bowlerStats);
    
    // Innings 2 data
    let i2_runs = isEndedIn1 ? 0 : (state.runs || 0);
    let i2_wickets = isEndedIn1 ? 0 : (state.wickets || 0);
    let i2_oversComp = isEndedIn1 ? 0 : (state.overs_completed || 0);
    let i2_ballsOver = isEndedIn1 ? 0 : (state.balls_this_over || 0);
    let i2_batsmenStats = isEndedIn1 ? {} : (state.batsmen_stats || {});
    let i2_bowlerStats = isEndedIn1 ? {} : (state.bowler_stats || {});
    let i2_extras = isEndedIn1 ? {} : (state.extras || {});
    let i2_score = isEndedIn1 ? (state.bowling_team_penalty ? `${state.bowling_team_penalty}/0 (Pen)` : "Did not bat") : `${i2_runs}/${i2_wickets}`;
    let i2_overs = isEndedIn1 ? "-" : `${i2_oversComp}.${i2_ballsOver}`;
    let i2_totBalls = (i2_oversComp * bpo) + i2_ballsOver;
    let i2_crr = (!isEndedIn1 && i2_totBalls > 0) ? (i2_runs / (i2_totBalls / bpo)).toFixed(2) : "0.00";
    let i2_ext = formatExtras(i2_extras);
    let i2_bat = getTopBatsmen(i2_batsmenStats);
    let i2_bowl = getTopBowlers(i2_bowlerStats);
    
    // Determine winner & result message
    let winnerTheme = null;
    let resultTitle = "";
    let resultSubtitle = "";
    let subBadge = "MATCH RESULT";
    let trophyIcon = `
        <svg class="w-10 h-10 text-amber-300 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3h14v2H5V3zm2 4v2c0 2.21 1.79 4 4 4v2.09c-2.83.48-5 2.94-5 5.91h12c0-2.97-2.17-5.43-5-5.91V13c2.21 0 4-1.79 4-4V7H7zm-2 2h2v2c0 1.1-.9 2-2 2s-2-.9-2-2v-2zm14 0c0 1.1-.9 2-2 2v-2h2z"/>
        </svg>
    `;
    
    if (state.abandoned || state.status === "ABANDONED") {
        resultTitle = "MATCH ABANDONED";
        resultSubtitle = "The match was called off without a conclusive result";
        subBadge = "NO RESULT";
        trophyIcon = `
            <svg class="w-10 h-10 text-slate-300 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
        `;
    } else if (state.target && state.runs >= state.target) {
        // Team 2 won
        winnerTheme = t2Theme;
        let maxW = state.max_wickets || 10;
        let wLeft = Math.max(0, maxW - (state.wickets || 0));
        resultTitle = `${state.team_2_name.toUpperCase()} WON`;
        resultSubtitle = `Won by ${wLeft} wicket${wLeft !== 1 ? 's' : ''} with ${state.max_overs ? (state.max_overs - state.overs_completed) + ' overs' : 'balls'} remaining`;
        subBadge = "CHAMPIONS";
    } else if (state.target && state.runs < state.target - 1) {
        // Team 1 won
        winnerTheme = t1Theme;
        let runsDiff = (state.target - 1) - (state.runs || 0);
        resultTitle = `${state.team_1_name.toUpperCase()} WON`;
        resultSubtitle = `Defended total successfully • Won by ${runsDiff} run${runsDiff !== 1 ? 's' : ''}`;
        subBadge = "CHAMPIONS";
    } else if (state.target && state.runs === state.target - 1) {
        resultTitle = "MATCH TIED";
        resultSubtitle = `Thrilling finish! Scores level at ${state.runs} runs each`;
        subBadge = "TIED MATCH";
        trophyIcon = `
            <svg class="w-10 h-10 text-amber-300 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
            </svg>
        `;
    } else {
        resultTitle = state.match_result || "MATCH CONCLUDED";
        resultSubtitle = "Official match result recorded";
        subBadge = "COMPLETED";
    }
    
    // Hero Banner styling
    let heroBg = "";
    if (winnerTheme) {
        heroBg = `background: linear-gradient(135deg, ${winnerTheme.darkColor} 0%, ${winnerTheme.color} 55%, ${winnerTheme.lightColor} 100%);`;
    } else if (state.abandoned || state.status === "ABANDONED") {
        heroBg = `background: linear-gradient(135deg, #1e293b 0%, #334155 55%, #475569 100%);`;
    } else {
        heroBg = `background: linear-gradient(135deg, #78350f 0%, #b45309 55%, #d97706 100%);`;
    }
    
    let winnerVisual = trophyIcon;
    if (winnerTheme && winnerTheme.logo) {
        winnerVisual = `
            <div class="relative">
                <img src="${winnerTheme.logo}" class="w-16 h-16 rounded-2xl object-contain bg-white p-1.5 shadow-md">
                <span class="absolute -bottom-2 -right-2 text-xl drop-shadow">🏆</span>
            </div>
        `;
    }
    
    // Render batter row
    function renderBatterRow(p, teamTheme) {
        let runs = p.runs !== undefined ? p.runs : 0;
        let balls = p.balls !== undefined ? p.balls : 0;
        let fours = p['4s'] || p.fours || 0;
        let sixes = p['6s'] || p.sixes || 0;
        let sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0.0";
        let isNotOut = p.status === "not out";
        let avatar = getPlayerAvatar(p.name, teamTheme);
        
        return `
            <div class="flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-slate-50/80 transition-all border border-slate-100 shadow-2xs">
                <div class="flex items-center gap-3 min-w-0">
                    ${avatar}
                    <div class="min-w-0">
                        <div class="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                            <span>${toTitleCase(p.name)}</span>
                            ${isNotOut ? `<span class="w-1.5 h-1.5 rounded-full" style="background: ${teamTheme.color};" title="Not Out"></span>` : ''}
                        </div>
                        <div class="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <span>${balls}b</span>
                            <span class="text-slate-300">•</span>
                            <span>${fours}x4</span>
                            <span class="text-slate-300">•</span>
                            <span>${sixes}x6</span>
                            <span class="text-slate-300">•</span>
                            <span>SR: ${sr}</span>
                        </div>
                    </div>
                </div>
                <div class="shrink-0 pl-3">
                    <div class="px-3 py-1.5 rounded-xl font-black text-sm flex items-baseline gap-1 shadow-2xs" 
                         style="background: ${teamTheme.color}; color: ${teamTheme.textColor};">
                        <span>${runs}</span>
                        <span class="text-[10px] font-normal opacity-85">r</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Render bowler row
    function renderBowlerRow(p, bowlTeamTheme) {
        let overs = p.overs !== undefined ? p.overs : 0;
        let wickets = p.wickets !== undefined ? p.wickets : 0;
        let runs = p.runs !== undefined ? p.runs : 0;
        let maidens = p.maidens !== undefined ? p.maidens : 0;
        
        let b_full = Math.floor(overs);
        let b_rem = Math.round((overs - b_full) * 10);
        let t_balls = b_full * bpo + b_rem;
        let econ = t_balls > 0 ? ((runs / t_balls) * bpo).toFixed(2) : "0.00";
        let avatar = getPlayerAvatar(p.name, bowlTeamTheme);
        
        return `
            <div class="flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-slate-50/80 transition-all border border-slate-100 shadow-2xs">
                <div class="flex items-center gap-3 min-w-0">
                    ${avatar}
                    <div class="min-w-0">
                        <div class="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                            <span>${toTitleCase(p.name)}</span>
                        </div>
                        <div class="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <span>${overs} ov</span>
                            <span class="text-slate-300">•</span>
                            <span>M: ${maidens}</span>
                            <span class="text-slate-300">•</span>
                            <span>Econ: ${econ}</span>
                        </div>
                    </div>
                </div>
                <div class="shrink-0 pl-3">
                    <div class="px-3 py-1.5 rounded-xl font-black text-sm flex items-baseline gap-0.5 shadow-2xs" 
                         style="background: ${bowlTeamTheme.color}; color: ${bowlTeamTheme.textColor};">
                        <span>${wickets}</span>
                        <span class="text-xs font-normal opacity-80">/</span>
                        <span>${runs}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Overall Match Highlights
    let bnd1 = countBoundaries(i1_batsmenStats);
    let bnd2 = countBoundaries(i2_batsmenStats);
    let totalFours = bnd1.fours + bnd2.fours;
    let totalSixes = bnd1.sixes + bnd2.sixes;
    let totalBoundaries = totalFours + totalSixes;
    let totalExtras = i1_ext.total + i2_ext.total;
    let totalMatchRuns = i1_runs + i2_runs;
    let totalMatchWickets = i1_wickets + i2_wickets;
    
    // Find top scorer
    let allBatsmen = [...Object.values(i1_batsmenStats), ...Object.values(i2_batsmenStats)];
    let topScorer = null;
    allBatsmen.forEach(b => {
        if (b && (!topScorer || (b.runs || 0) > (topScorer.runs || 0))) {
            topScorer = b;
        }
    });
    let topScorerText = (topScorer && (topScorer.runs || 0) > 0) ? `${toTitleCase(topScorer.name)} (${topScorer.runs})` : "—";
    
    let html = `
        <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6 animate-fade-in">
            
            <!-- Top App Bar -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shadow-sm">
                        <svg class="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7"/><path d="M14 14.66V17c0 .55.45 1 1 1h2"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                    </div>
                    <div>
                        <h1 class="text-2xl font-black text-slate-900 heading-font tracking-tight">Match Summary</h1>
                        <p class="text-xs font-semibold text-slate-500">${state.team_1_name} vs ${state.team_2_name} • ${state.max_overs || 20} Overs Match</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="undoFromSummary()" class="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-200/90 shadow-2xs transition-all active:scale-98 flex items-center gap-2 text-xs cursor-pointer">
                        <svg class="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                        <span>Undo Last Ball</span>
                    </button>
                    <button onclick="startNewMatch()" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all active:scale-98 flex items-center gap-2 text-xs cursor-pointer">
                        <svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span>New Match</span>
                    </button>
                </div>
            </div>
            
            <!-- Hero Championship / Winner Banner -->
            <div class="rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl" style="${heroBg}">
                <div class="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 pointer-events-none blur-2xl"></div>
                <div class="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-black/10 pointer-events-none blur-xl"></div>
                
                <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div class="flex items-center gap-5 text-center md:text-left">
                        <div class="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg shrink-0">
                            ${winnerVisual}
                        </div>
                        <div>
                            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider mb-2">
                                <span>${subBadge}</span>
                            </div>
                            <h2 class="text-3xl md:text-4xl font-black tracking-tight leading-tight">${resultTitle}</h2>
                            <p class="text-white/90 text-sm md:text-base font-medium mt-1">${resultSubtitle}</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-col items-center md:items-end gap-2 shrink-0">
                        <div class="px-5 py-3 rounded-2xl bg-black/20 backdrop-blur-md border border-white/20 text-center md:text-right">
                            <div class="text-[11px] uppercase font-bold text-white/75 tracking-wider">Match Target</div>
                            <div class="text-xl font-black text-white heading-font">${state.target ? `${state.target} Runs` : '1st Innings Setup'}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Side-by-Side Innings Performance Cards -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <!-- Innings 1 Card -->
                <div class="bg-white rounded-3xl p-6 shadow-sm border transition-all flex flex-col gap-5" 
                     style="border-color: ${hexToRgba(t1Theme.color, 0.28)}; box-shadow: 0 10px 30px -10px ${hexToRgba(t1Theme.color, 0.12)};">
                    
                    <!-- Innings 1 Header -->
                    <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div class="flex items-center gap-3">
                            ${t1Theme.logo 
                                ? `<img src="${t1Theme.logo}" class="w-12 h-12 rounded-2xl object-contain bg-white p-1 border border-slate-200/80 shadow-2xs">`
                                : `<div class="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-2xs" style="background: linear-gradient(135deg, ${t1Theme.color}, ${t1Theme.darkColor});">${t1Theme.name.charAt(0)}</div>`}
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="font-extrabold text-slate-800 text-lg leading-tight">${t1Theme.name}</h3>
                                    <span class="w-2.5 h-2.5 rounded-full" style="background: ${t1Theme.color};"></span>
                                </div>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" 
                                          style="background: ${hexToRgba(t1Theme.color, 0.12)}; color: ${t1Theme.color};">1st Innings</span>
                                    <span class="text-xs text-slate-400 font-medium">CRR: ${i1_crr}</span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-black text-slate-900 heading-font">${i1_score}</div>
                            <div class="text-xs font-bold text-slate-400">(${i1_overs} ov)</div>
                        </div>
                    </div>
                    
                    <!-- Extras breakdown -->
                    <div class="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 font-medium text-slate-600">
                        <span class="font-semibold text-slate-500">Extras Conceded:</span>
                        <span class="font-bold text-slate-800">${i1_ext.total} <span class="text-slate-400 font-normal">(${i1_ext.detail})</span></span>
                    </div>
                    
                    <!-- Innings 1 Top Batters -->
                    <div>
                        <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                            <span class="flex items-center gap-1.5">
                                <span>🏏</span>
                                <span>Top Batters</span>
                            </span>
                            <span class="text-[10px] text-slate-400 font-semibold lowercase">runs (balls)</span>
                        </div>
                        <div class="flex flex-col gap-2">
                            ${i1_bat.length > 0 
                                ? i1_bat.map(p => renderBatterRow(p, t1Theme)).join("") 
                                : `<div class="py-5 text-center text-xs text-slate-400 italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">No batting recorded</div>`}
                        </div>
                    </div>
                    
                    <!-- Innings 1 Top Bowlers (from Team 2) -->
                    <div class="mt-1 pt-4 border-t border-slate-100">
                        <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                            <span class="flex items-center gap-1.5">
                                <span>⚾</span>
                                <span>Top Bowlers <span class="text-[10px] font-normal text-slate-400">(${t2Theme.name})</span></span>
                            </span>
                            <span class="text-[10px] text-slate-400 font-semibold lowercase">wkt / runs</span>
                        </div>
                        <div class="flex flex-col gap-2">
                            ${i1_bowl.length > 0 
                                ? i1_bowl.map(p => renderBowlerRow(p, t2Theme)).join("") 
                                : `<div class="py-5 text-center text-xs text-slate-400 italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">No bowling recorded</div>`}
                        </div>
                    </div>
                    
                </div>
                
                <!-- Innings 2 Card -->
                <div class="bg-white rounded-3xl p-6 shadow-sm border transition-all flex flex-col gap-5" 
                     style="border-color: ${hexToRgba(t2Theme.color, 0.28)}; box-shadow: 0 10px 30px -10px ${hexToRgba(t2Theme.color, 0.12)};">
                    
                    <!-- Innings 2 Header -->
                    <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div class="flex items-center gap-3">
                            ${t2Theme.logo 
                                ? `<img src="${t2Theme.logo}" class="w-12 h-12 rounded-2xl object-contain bg-white p-1 border border-slate-200/80 shadow-2xs">`
                                : `<div class="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-2xs" style="background: linear-gradient(135deg, ${t2Theme.color}, ${t2Theme.darkColor});">${t2Theme.name.charAt(0)}</div>`}
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="font-extrabold text-slate-800 text-lg leading-tight">${t2Theme.name}</h3>
                                    <span class="w-2.5 h-2.5 rounded-full" style="background: ${t2Theme.color};"></span>
                                </div>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" 
                                          style="background: ${hexToRgba(t2Theme.color, 0.12)}; color: ${t2Theme.color};">2nd Innings</span>
                                    <span class="text-xs text-slate-400 font-medium">${isEndedIn1 ? 'Did not bat' : `CRR: ${i2_crr}`}</span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-black text-slate-900 heading-font">${i2_score}</div>
                            <div class="text-xs font-bold text-slate-400">${!isEndedIn1 ? `(${i2_overs} ov)` : ''}</div>
                        </div>
                    </div>
                    
                    <!-- Extras breakdown -->
                    <div class="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 font-medium text-slate-600">
                        <span class="font-semibold text-slate-500">Extras Conceded:</span>
                        <span class="font-bold text-slate-800">${i2_ext.total} <span class="text-slate-400 font-normal">(${i2_ext.detail})</span></span>
                    </div>
                    
                    <!-- Innings 2 Top Batters -->
                    <div>
                        <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                            <span class="flex items-center gap-1.5">
                                <span>🏏</span>
                                <span>Top Batters</span>
                            </span>
                            <span class="text-[10px] text-slate-400 font-semibold lowercase">runs (balls)</span>
                        </div>
                        <div class="flex flex-col gap-2">
                            ${i2_bat.length > 0 
                                ? i2_bat.map(p => renderBatterRow(p, t2Theme)).join("") 
                                : `<div class="py-5 text-center text-xs text-slate-400 italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">${isEndedIn1 ? 'Innings did not commence' : 'No batting recorded'}</div>`}
                        </div>
                    </div>
                    
                    <!-- Innings 2 Top Bowlers (from Team 1) -->
                    <div class="mt-1 pt-4 border-t border-slate-100">
                        <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                            <span class="flex items-center gap-1.5">
                                <span>⚾</span>
                                <span>Top Bowlers <span class="text-[10px] font-normal text-slate-400">(${t1Theme.name})</span></span>
                            </span>
                            <span class="text-[10px] text-slate-400 font-semibold lowercase">wkt / runs</span>
                        </div>
                        <div class="flex flex-col gap-2">
                            ${i2_bowl.length > 0 
                                ? i2_bowl.map(p => renderBowlerRow(p, t1Theme)).join("") 
                                : `<div class="py-5 text-center text-xs text-slate-400 italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">${isEndedIn1 ? 'Innings did not commence' : 'No bowling recorded'}</div>`}
                        </div>
                    </div>
                    
                </div>
                
            </div>
            
            <!-- Match Highlights & Metrics Strip -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Match Runs</span>
                    <span class="text-2xl font-black text-slate-900 mt-1 heading-font">${totalMatchRuns}</span>
                    <span class="text-[11px] text-slate-500 font-medium">${i1_runs} + ${i2_runs} runs</span>
                </div>
                
                <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Wickets</span>
                    <span class="text-2xl font-black text-slate-900 mt-1 heading-font">${totalMatchWickets}</span>
                    <span class="text-[11px] text-slate-500 font-medium">${i1_wickets} + ${i2_wickets} wickets</span>
                </div>
                
                <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Boundaries</span>
                    <span class="text-2xl font-black text-slate-900 mt-1 heading-font">${totalBoundaries}</span>
                    <span class="text-[11px] text-slate-500 font-medium">${totalFours} fours • ${totalSixes} sixes</span>
                </div>
                
                <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Match Scorer</span>
                    <span class="text-base font-black text-slate-900 mt-1 truncate max-w-full px-2">${topScorerText}</span>
                    <span class="text-[11px] text-slate-500 font-medium">${totalExtras} total extras</span>
                </div>
            </div>
            
            <!-- Subtle Branding Footer -->
            <div class="text-center py-2 text-xs text-slate-400 font-medium">
                Live Cricket Scoring Engine • Hexcore Live
            </div>
            
        </div>
    `;
    
    summaryScreen.innerHTML = html;
}

window.undoFromSummary = async function() {
    await eel.undo()();
    document.getElementById("match-summary-screen").classList.add("hidden");
    document.getElementById("scoring-screen").classList.remove("hidden");
    refreshUI();
};

window.resumeActiveMatch = async function() {
    let state = await eel.get_state()();
    document.getElementById("setup-screen").classList.add("hidden");
    if (state && state.match_over) {
        document.getElementById("scoring-screen").classList.add("hidden");
        document.getElementById("match-summary-screen").classList.remove("hidden");
        showMatchOverPrompt();
    } else {
        document.getElementById("match-summary-screen").classList.add("hidden");
        document.getElementById("scoring-screen").classList.remove("hidden");
        refreshUI();
    }
};

window.startNewMatch = async function() {
    if (window.eel && typeof eel.reset_match === 'function') {
        try {
            await eel.reset_match()();
        } catch (e) {
            console.error("Error resetting match:", e);
        }
    }
    document.getElementById("match-summary-screen").classList.add("hidden");
    document.getElementById("scoring-screen").classList.add("hidden");
    document.getElementById("setup-screen").classList.remove("hidden");
    
    let resumeBanner = document.getElementById("setup-resume-banner");
    if (resumeBanner) resumeBanner.classList.add("hidden");

    initSetup();
};

window.confirmResetCurrentMatch = function() {
    closeModal();
    let html = `
        <div class="p-4 bg-rose-600 text-white font-bold text-base flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span>⚠️</span>
                <span>Reset Match & Start Fresh?</span>
            </div>
            <button onclick="closeModal()" class="text-white hover:text-slate-200 text-xl font-bold cursor-pointer">&times;</button>
        </div>
        <div class="p-6 flex flex-col gap-4">
            <p class="text-sm text-slate-600">
                Are you sure you want to discard this match? All current scoring data will be reset and you will return to the match setup screen.
            </p>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer">Cancel</button>
                <button onclick="closeModal(); startNewMatch();" class="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-98 cursor-pointer">Yes, Reset Match</button>
            </div>
        </div>
    `;
    showModal(html, "w-[440px]");
};

async function scoreBall(runs) {
    await eel.process_delivery(runs.toString(), parseInt(runs), parseInt(runs), parseInt(runs), true, parseInt(runs), false)();
    refreshUI();
}

async function undo() {
    await eel.undo()();
    refreshUI();
}

function showModal(html, widthClass = "w-[420px]") {
    let container = document.getElementById("modal-container");
    container.innerHTML = `
        <div class="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onclick="if(event.target === this) closeModal()">
            <div class="bg-white text-slate-900 rounded-2xl shadow-2xl ${widthClass} max-w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200/80">
                ${html}
            </div>
        </div>
    `;
}
function closeModal() {
    document.getElementById("modal-container").innerHTML = "";
}

async function scoreWicket() {
    let state = await eel.get_state()();
    let strikerName = state.striker ? state.striker.name : "Striker";
    let nonStrikerName = state.non_striker ? state.non_striker.name : "Non-Striker";
    
    let batTeamId = state.batting_team_id;
    let bowlTeamId = state.bowling_team_id;
    
    if (!batTeamId || !bowlTeamId) {
        let allTeams = await eel.get_teams()();
        let batTeam = allTeams.find(t => t.name === (state.innings === 1 ? state.team_1_name : state.team_2_name));
        let bowlTeam = allTeams.find(t => t.name === (state.innings === 1 ? state.team_2_name : state.team_1_name));
        if (batTeam) batTeamId = batTeam.id;
        if (bowlTeam) bowlTeamId = bowlTeam.id;
    }
    
    let batPlayers = [];
    let bowlPlayers = [];
    if (batTeamId) {
        let bpRes = await eel.get_players(batTeamId)();
        batPlayers = Array.isArray(bpRes) ? bpRes : [];
    }
    if (bowlTeamId) {
        let bwlRes = await eel.get_players(bowlTeamId)();
        bowlPlayers = Array.isArray(bwlRes) ? bwlRes : [];
    }

    let outBatsmen = state.out_batsmen || [];
    let batOptions = batPlayers
        .map(p => (p && (p.full_name || (p.first_name ? (p.first_name + " " + (p.last_name || "")) : ""))) || "")
        .map(s => s.trim())
        .filter(name => name && name !== strikerName && name !== nonStrikerName && !outBatsmen.includes(name))
        .map(name => `<option value="${name}">${name}</option>`)
        .join("");
        
    let updateFielderDropdown = (method) => {
        let wkName = "";
        return bowlPlayers
            .filter(p => {
                if (!p) return false;
                let name = ((p.full_name || (p.first_name ? (p.first_name + " " + (p.last_name || "")) : "")) || "").trim();
                if (p.role === 'WK') wkName = name;
                if (method === 'Stumped' && name === (state.bowler ? state.bowler.name : "")) return false;
                return Boolean(name);
            })
            .map(p => {
                let name = ((p.full_name || (p.first_name ? (p.first_name + " " + (p.last_name || "")) : "")) || "").trim();
                let sel = (method === 'Stumped' && name === wkName) ? "selected" : "";
                return `<option value="${name}" ${sel}>${name}${p.role === 'WK' ? ' (WK)' : ''}</option>`;
            })
            .join("");
    };

    let html = `
        <div class="p-4 bg-red-600 text-white font-bold text-lg">Wicket!</div>
        <div class="p-6 flex flex-col gap-4">
            <div>
                <label class="block font-bold mb-1">Dismissal Method</label>
                <select id="w-method" class="border p-2 w-full">
                    <option>Bowled</option>
                    <option>Caught</option>
                    <option>LBW</option>
                    <option>Run Out</option>
                    <option>Stumped</option>
                    <option>Hit Wicket</option>
                </select>
            </div>
            
            <div id="fielder-options" class="hidden">
                <label class="block font-bold mb-1 mt-2">Fielder</label>
                <select id="w-fielder" class="border p-2 w-full">
                    ${updateFielderDropdown("Bowled")}
                </select>
            </div>

            <div id="ro-options" class="hidden">
                <label class="block font-bold mb-1 mt-2">Batsman Out</label>
                <select id="w-outbat" class="border p-2 w-full">
                    <option value="Striker">${strikerName} (Striker)</option>
                    <option value="Non-Striker">${nonStrikerName} (Non-Striker)</option>
                </select>

                <label class="block font-bold mb-1 mt-2">Runs Completed (Run Out)</label>
                <input id="w-runs" type="number" value="0" class="border p-2 w-full">
                
                <div class="mt-3">
                    <label class="block font-bold mb-1">Illegal Delivery</label>
                    <div class="flex gap-4">
                        <label><input type="radio" name="w-illegal" value="None" checked> None</label>
                        <label><input type="radio" name="w-illegal" value="Wide"> Wide</label>
                        <label><input type="radio" name="w-illegal" value="No Ball"> No Ball</label>
                    </div>
                </div>
                
                <div class="mt-3" id="w-extras-section">
                    <label class="block font-bold mb-1">Extras (Byes/Leg Byes)</label>
                    <div class="flex gap-4">
                        <label><input type="radio" name="w-byes" value="None" checked> None</label>
                        <label><input type="radio" name="w-byes" value="Byes"> Byes</label>
                        <label><input type="radio" name="w-byes" value="Leg Byes"> Leg Byes</label>
                    </div>
                </div>
            </div>
            <div>
                <label class="block font-bold mb-1 mt-2">New Batsman Name</label>
                <select id="w-newbat" class="border p-2 w-full">
                    ${batOptions || '<option value="Unknown Batsman">Unknown Batsman</option>'}
                </select>
            </div>
            <div class="flex justify-end gap-2 mt-4">
                <button onclick="closeModal()" class="px-4 py-2 bg-gray-300 rounded font-bold">Cancel</button>
                <button onclick="submitWicket()" class="px-4 py-2 bg-red-600 text-white rounded font-bold">Confirm</button>
            </div>
        </div>
    `;
    showModal(html);
    
    document.getElementById("w-method").onchange = (e) => {
        let m = e.target.value;
        if(m === "Run Out") document.getElementById("ro-options").classList.remove("hidden");
        else document.getElementById("ro-options").classList.add("hidden");
        
        if(m === "Caught" || m === "Stumped" || m === "Run Out") {
            document.getElementById("fielder-options").classList.remove("hidden");
            document.getElementById("w-fielder").innerHTML = updateFielderDropdown(m);
        } else {
            document.getElementById("fielder-options").classList.add("hidden");
        }
    };

    document.querySelectorAll('input[name="w-illegal"]').forEach(r => {
        r.addEventListener('change', (e) => {
            let byesRadios = document.querySelectorAll('input[name="w-byes"]');
            if (e.target.value === 'Wide') {
                byesRadios.forEach(br => {
                    br.disabled = true;
                    if (br.value === 'None') br.checked = true;
                });
            } else {
                byesRadios.forEach(br => br.disabled = false);
            }
        });
    });
}

window.submitWicket = async function() {
    let method = document.getElementById("w-method").value;
    let newBat = document.getElementById("w-newbat").value || "New Batsman";
    let fielder = document.getElementById("w-fielder") ? document.getElementById("w-fielder").value : "";
    
    if (method === "Run Out") {
        let runs = parseInt(document.getElementById("w-runs").value) || 0;
        let illegal = document.querySelector('input[name="w-illegal"]:checked').value;
        let byes = document.querySelector('input[name="w-byes"]:checked').value;
        let outbat = document.getElementById("w-outbat").value;
        closeModal();
        await eel.score_wicket(method, newBat, runs, illegal, byes, outbat, fielder)();
        refreshUI();
    } else {
        closeModal();
        await eel.score_wicket(method, newBat, 0, "None", "None", "Striker", fielder)();
        refreshUI();
    }
}

window.submitExtraDirect = async function(type, runs, runType) {
    closeModal();
    if (type === 'Wd') {
        let lbl = runs === 0 ? "Wd" : `Wd+${runs}B`;
        await eel.process_delivery(lbl, runs + 1, 0, 1, false, runs, true)();
    } else if (type === 'Nb') {
        let lbl = runs === 0 ? "Nb" : `Nb+${runs}`;
        if (runType === "Byes") lbl = `Nb+${runs}B`;
        if (runType === "Leg Byes") lbl = `Nb+${runs}LB`;
        
        let bat_runs = runType === "Batsman" ? runs : 0;
        let bowl_runs = runType === "Batsman" ? runs + 1 : 1;
        await eel.process_delivery(lbl, runs + 1, bat_runs, bowl_runs, false, runs, false)();
    } else if (type === 'Byes' || type === 'LB') {
        let lbl = `${runs}${type === 'Byes' ? 'B' : 'LB'}`;
        await eel.process_delivery(lbl, runs, 0, 0, true, runs, false)();
    }
    
    refreshUI();
}

async function scoreExtra(type) {
    if (type === '5789' || type === '5678') {
        show5789Modal();
        return;
    }
    if (type === 'More') {
        showMoreOptionsModal();
        return;
    }
    if (type === 'bonus') {
        alert("Bonus runs scoring coming soon.");
        return;
    }
    
    let html = `<div class="p-4 bg-gray-800 text-white font-bold text-lg flex justify-between items-center">
                    <span>Score ${type}</span>
                    <button onclick="closeModal()" class="text-white hover:text-gray-300">&times;</button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[80vh]">`;

    if (type === 'Wd') {
        html += `<div class="grid grid-cols-3 gap-3">`;
        ['wd', '1+wd', '2+wd', '3+wd', '4+wd', '5+wd', '6+wd'].forEach((lbl, i) => {
            html += `<button onclick="submitExtraDirect('Wd', ${i}, 'Byes')" class="px-4 py-4 bg-white text-black border-2 border-black rounded font-bold shadow hover:bg-gray-100">${lbl}</button>`;
        });
        html += `</div>`;
    } else if (type === 'LB') {
        html += `<div class="grid grid-cols-3 gap-3">`;
        [1, 2, 3, 4, 5, 6, 7].forEach((r) => {
            html += `<button onclick="submitExtraDirect('LB', ${r}, 'Leg Byes')" class="px-4 py-4 bg-[#00adef] text-white rounded font-bold shadow hover:bg-blue-500">${r}LB</button>`;
        });
        html += `</div>`;
    } else if (type === 'Byes') {
        html += `<div class="grid grid-cols-3 gap-3">`;
        [1, 2, 3, 4, 5, 6, 7].forEach((r) => {
            html += `<button onclick="submitExtraDirect('Byes', ${r}, 'Byes')" class="px-4 py-4 bg-[#00adef] text-white rounded font-bold shadow hover:bg-blue-500">${r}B</button>`;
        });
        html += `</div>`;
    } else if (type === 'Nb') {
        html += `<div class="flex flex-col gap-6">`;
        
        html += `<div><div class="font-bold mb-2 text-gray-700 border-b pb-1">Runs off Bat</div><div class="grid grid-cols-4 gap-2">`;
        let batRunsNb = [0, 1, 2, 3, 4, 6];
        batRunsNb.forEach(r => {
            let lbl = r === 0 ? "NB" : `${r}+NB`;
            html += `<button onclick="submitExtraDirect('Nb', ${r}, 'Batsman')" class="px-2 py-3 bg-[#fcbf00] text-black rounded font-bold shadow hover:bg-yellow-500">${lbl}</button>`;
        });
        html += `</div></div>`;
        
        html += `<div><div class="font-bold mb-2 text-gray-700 border-b pb-1">Leg Byes</div><div class="grid grid-cols-4 gap-2">`;
        [1, 2, 3, 4, 5, 6, 7].forEach(r => {
            html += `<button onclick="submitExtraDirect('Nb', ${r}, 'Leg Byes')" class="px-2 py-3 bg-[#fcbf00] text-black rounded font-bold shadow hover:bg-yellow-500">${r}L NB</button>`;
        });
        html += `</div></div>`;

        html += `<div><div class="font-bold mb-2 text-gray-700 border-b pb-1">Byes</div><div class="grid grid-cols-4 gap-2">`;
        [1, 2, 3, 4, 5, 6, 7].forEach(r => {
            html += `<button onclick="submitExtraDirect('Nb', ${r}, 'Byes')" class="px-2 py-3 bg-[#fcbf00] text-black rounded font-bold shadow hover:bg-yellow-500">${r}B NB</button>`;
        });
        html += `</div></div>`;
        
        html += `<div><div class="font-bold mb-2 text-gray-700 border-b pb-1">4567</div><div class="grid grid-cols-4 gap-2">`;
        [4, 5, 6, 7, 8, 9, 10].forEach(r => {
            html += `<button onclick="submitExtraDirect('Nb', ${r}, 'Batsman')" class="px-2 py-3 bg-[#fcbf00] text-black rounded font-bold shadow hover:bg-yellow-500">${r} NB</button>`;
        });
        html += `</div></div>`;

        html += `</div>`;
    }

    html += `
        <div class="flex justify-end mt-6">
            <button onclick="closeModal()" class="px-6 py-2 bg-gray-300 rounded font-bold hover:bg-gray-400">Cancel</button>
        </div>
    </div>`;
    showModal(html);
}

// =========================================================================
// 5789 & MORE ACTIONS MODALS
// =========================================================================

window.show5789Modal = function() {
    let runs = [5, 7, 8, 9, 10];
    let buttonsHtml = runs.map(r => {
        let isOdd = (r % 2 !== 0);
        let note = isOdd ? 'Strike changes' : 'Strike retains';
        return `
            <button onclick="submit5789Run(${r})" class="group flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#f58133] to-[#e06d1d] hover:from-[#e06d1d] hover:to-[#c85b12] text-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 border border-amber-300/30">
                <span class="text-3xl font-black heading-font tracking-tight group-hover:scale-110 transition-transform">${r}</span>
                <span class="text-[11px] font-semibold text-white/90 mt-1 uppercase tracking-wider">${r} Runs</span>
                <span class="text-[10px] text-amber-100/80 font-normal">(${note})</span>
            </button>
        `;
    }).join("");

    let html = `
        <div class="p-4 bg-slate-900 text-white font-bold text-base flex justify-between items-center border-b border-slate-800">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-[#f58133] flex items-center justify-center text-white text-xs font-black shadow-inner">
                    5789
                </div>
                <div>
                    <div class="text-sm font-bold text-white">Score Runs (5789)</div>
                    <div class="text-[11px] text-slate-400 font-normal">Select batsman runs off the bat</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center text-xl transition-colors">&times;</button>
        </div>
        
        <div class="p-6 bg-slate-50 flex flex-col gap-4">
            <div class="grid grid-cols-5 gap-3">
                ${buttonsHtml}
            </div>
            
            <div class="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Recorded as bat runs for the striker. Strike rotation (swap) occurs automatically for odd runs (5, 7, 9).</span>
            </div>
            
            <div class="flex justify-end pt-2 border-t border-slate-200">
                <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors">Cancel</button>
            </div>
        </div>
    `;
    showModal(html, "w-[560px]");
};

window.submit5789Run = async function(r) {
    closeModal();
    await scoreBall(r);
};

window.showMoreOptionsModal = async function() {
    let state = await eel.get_state()();
    let isInnings1 = (!state.innings || state.innings === 1);
    let currentInnings = state.innings || 1;
    let targetText = state.target ? `${state.target} runs` : 'Not set';

    let html = `
        <div class="p-4 bg-slate-900 text-white font-bold text-base flex justify-between items-center border-b border-slate-800">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 text-base font-black border border-slate-700">
                    ⚡
                </div>
                <div>
                    <div class="text-sm font-bold text-white">More Options & Match Controls</div>
                    <div class="text-[11px] text-slate-400 font-normal">Innings ${currentInnings} • ${state.team_1_name || 'Team 1'} vs ${state.team_2_name || 'Team 2'}</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center text-xl transition-colors">&times;</button>
        </div>
        
        <div class="p-6 bg-slate-50 overflow-y-auto max-h-[82vh] flex flex-col gap-3">
            
            <!-- Grid of Actions -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                <!-- Abandon Match -->
                <button onclick="showConfirmAbandonModal()" class="flex flex-col text-left p-4 bg-white hover:bg-red-50/50 border border-slate-200 hover:border-red-300 rounded-2xl shadow-sm transition-all group active:scale-[0.99]">
                    <div class="flex items-center justify-between w-full">
                        <span class="p-2 rounded-xl bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        </span>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">Needs Confirmation</span>
                    </div>
                    <div class="mt-3 font-bold text-slate-900 group-hover:text-red-700 text-sm">Abandon Match</div>
                    <div class="text-xs text-slate-500 mt-0.5">Immediately declare match abandoned with confirmation prompt</div>
                </button>

                <!-- End Innings -->
                <button onclick="showConfirmEndInningsModal()" class="flex flex-col text-left p-4 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-2xl shadow-sm transition-all group active:scale-[0.99]">
                    <div class="flex items-center justify-between w-full">
                        <span class="p-2 rounded-xl bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                        </span>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Needs Confirmation</span>
                    </div>
                    <div class="mt-3 font-bold text-slate-900 group-hover:text-amber-700 text-sm">End Innings ${currentInnings}</div>
                    <div class="text-xs text-slate-500 mt-0.5">${isInnings1 ? 'Conclude 1st innings & transition to 2nd innings setup' : 'Conclude 2nd innings & finalize match summary'}</div>
                </button>

                <!-- Penalty Runs -->
                <button onclick="showPenaltyModal()" class="flex flex-col text-left p-4 bg-white hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 rounded-2xl shadow-sm transition-all group active:scale-[0.99]">
                    <div class="flex items-center justify-between w-full">
                        <span class="p-2 rounded-xl bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </span>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">+5 Runs</span>
                    </div>
                    <div class="mt-3 font-bold text-slate-900 group-hover:text-purple-700 text-sm">Award Penalty Runs</div>
                    <div class="text-xs text-slate-500 mt-0.5">Select the team who will receive 5 extra penalty runs</div>
                </button>

                <!-- Retired Hurt -->
                <button onclick="showRetiredHurtModal()" class="flex flex-col text-left p-4 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl shadow-sm transition-all group active:scale-[0.99]">
                    <div class="flex items-center justify-between w-full">
                        <span class="p-2 rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        </span>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Player Sub</span>
                    </div>
                    <div class="mt-3 font-bold text-slate-900 group-hover:text-emerald-700 text-sm">Retired Hurt</div>
                    <div class="text-xs text-slate-500 mt-0.5">Select retiring batsman &rarr; select new incoming batsman</div>
                </button>

                <!-- Change Target (Only available in 2nd Innings) -->
                ${!isInnings1 ? `
                <button onclick="showChangeTargetModal()" class="flex flex-col text-left p-4 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl shadow-sm transition-all group active:scale-[0.99]">
                    <div class="flex items-center justify-between w-full">
                        <span class="p-2 rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                        </span>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Target: ${targetText}</span>
                    </div>
                    <div class="mt-3 font-bold text-slate-900 group-hover:text-blue-700 text-sm">Change Target</div>
                    <div class="text-xs text-slate-500 mt-0.5">Manually set or revise target runs (DLS / rain rule / adjustments)</div>
                </button>
                ` : `
                <div class="flex flex-col text-left p-4 bg-slate-100/80 border border-slate-200/80 rounded-2xl opacity-60 cursor-not-allowed select-none relative">
                    <div class="flex items-center justify-between w-full">
                        <span class="p-2 rounded-xl bg-slate-200 text-slate-400">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                        </span>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">Unavailable in 1st Innings</span>
                    </div>
                    <div class="mt-3 font-bold text-slate-500 text-sm">Change Target</div>
                    <div class="text-xs text-slate-400 mt-0.5">Target can only be set or changed during the 2nd innings</div>
                </div>
                `}

                <!-- Overs / Format / Wickets -->
                ${isInnings1 ? `
                <button onclick="showFormatModal()" class="flex flex-col text-left p-4 bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-300 rounded-2xl shadow-sm transition-all group active:scale-[0.99]">
                    <div class="flex items-center justify-between w-full">
                        <span class="p-2 rounded-xl bg-teal-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </span>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">${state.max_overs || 20} Ov / ${state.max_wickets || 10} Wkt</span>
                    </div>
                    <div class="mt-3 font-bold text-slate-900 group-hover:text-teal-700 text-sm">Overs / Format / Wickets</div>
                    <div class="text-xs text-slate-500 mt-0.5">Select total match overs and wickets for this match</div>
                </button>
                ` : `
                <div class="flex flex-col text-left p-4 bg-slate-100/80 border border-slate-200/80 rounded-2xl opacity-60 cursor-not-allowed select-none relative">
                    <div class="flex items-center justify-between w-full">
                        <span class="p-2 rounded-xl bg-slate-200 text-slate-400">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </span>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">Disabled in 2nd Innings</span>
                    </div>
                    <div class="mt-3 font-bold text-slate-500 text-sm">Overs / Format / Wickets</div>
                    <div class="text-xs text-slate-400 mt-0.5">Format cannot be modified after the 1st innings has completed</div>
                </div>
                `}
                
                <!-- Reset Match -->
                <button onclick="confirmResetCurrentMatch()" class="flex flex-col text-left p-4 bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 rounded-2xl shadow-sm transition-all group active:scale-[0.99] cursor-pointer">
                    <div class="flex items-center justify-between w-full">
                        <span class="p-2 rounded-xl bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        </span>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Dangerous</span>
                    </div>
                    <div class="mt-3 font-bold text-slate-900 group-hover:text-rose-700 text-sm">Reset & Start New Match</div>
                    <div class="text-xs text-slate-500 mt-0.5">Discard current match data and return to setup screen</div>
                </button>

            </div>

            <div class="flex justify-end pt-3 border-t border-slate-200 mt-2">
                <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors">Close</button>
            </div>
        </div>
    `;
    showModal(html, "w-[620px]");
};

window.showConfirmAbandonModal = async function() {
    let state = await eel.get_state()();
    let currentInn = state.innings || 1;
    let battingTeam = currentInn === 1 ? state.team_1_name : state.team_2_name;

    let reasons = [
        "Rain / Wet Outfield",
        "Bad Light / Darkness",
        "Pitch / Ground Unfit",
        "Player Injury / Medical Emergency",
        "Technical / Equipment Issue",
        "Mutual Agreement / Forfeit"
    ];
    let reasonOptions = reasons.map(r => `<option value="${r}">${r}</option>`).join("");

    let html = `
        <div class="p-4 bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                    <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                </div>
                <div>
                    <div class="text-sm font-bold text-white">Confirm Match Abandonment</div>
                    <div class="text-[11px] text-red-100 font-normal">Immediate conclusion of match scoring</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-xl transition-colors">&times;</button>
        </div>
        
        <div class="p-6 bg-slate-50 flex flex-col gap-4">
            <!-- Current Status Box -->
            <div class="p-3.5 bg-red-50/80 border border-red-200/90 rounded-2xl flex items-center justify-between">
                <div>
                    <div class="text-xs font-bold text-red-950 uppercase tracking-wider">Innings ${currentInn} • ${state.team_1_name} vs ${state.team_2_name}</div>
                    <div class="text-xs text-red-800 mt-0.5">Batting: <strong>${battingTeam}</strong> • Score: <strong>${state.runs}/${state.wickets}</strong> (${state.overs_completed}.${state.balls_this_over} ov)</div>
                </div>
                <div class="px-2.5 py-1 rounded-full bg-red-200/80 text-red-900 text-[10px] font-black tracking-wider uppercase">
                    Unfinished
                </div>
            </div>

            <!-- Reason Selector -->
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Official Abandonment Reason</label>
                <select id="abandon-reason-select" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none shadow-sm">
                    ${reasonOptions}
                    <option value="Custom">+ Other Reason...</option>
                </select>
                <input id="abandon-custom-reason" type="text" placeholder="Specify custom reason..." class="hidden mt-2 border border-slate-300 rounded-xl p-3 w-full bg-white font-medium text-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none shadow-sm" />
            </div>

            <!-- Confirmation Notice -->
            <div class="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                <svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div>
                    <strong>Action cannot be undone automatically:</strong> Match status will be set to <strong>ABANDONED</strong> and active scoring screen will be finalized to the official summary.
                </div>
            </div>
            
            <div class="flex justify-between items-center pt-3 border-t border-slate-200 mt-1">
                <button onclick="showMoreOptionsModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    <span>Back</span>
                </button>
                <div class="flex gap-2">
                    <button onclick="closeModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors">Cancel</button>
                    <button onclick="submitAbandonMatch()" class="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-red-600/30 transition-all active:scale-98 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Yes, Abandon Match</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    showModal(html, "w-[500px]");

    let sel = document.getElementById("abandon-reason-select");
    let custom = document.getElementById("abandon-custom-reason");
    if (sel && custom) {
        sel.onchange = () => {
            if (sel.value === "Custom") {
                custom.classList.remove("hidden");
                custom.focus();
            } else {
                custom.classList.add("hidden");
            }
        };
    }
};

window.submitAbandonMatch = async function() {
    let sel = document.getElementById("abandon-reason-select");
    let custom = document.getElementById("abandon-custom-reason");
    let reason = sel ? (sel.value === "Custom" ? (custom.value.trim() || "Abandoned") : sel.value) : "Abandoned";
    closeModal();
    await eel.abandon_match()();
    refreshUI();
};

window.showConfirmEndInningsModal = async function() {
    let state = await eel.get_state()();
    let isInnings1 = (!state.innings || state.innings === 1);
    let target = state.runs + 1;

    let html = `
        <div class="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                    <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                </div>
                <div>
                    <div class="text-sm font-bold text-white">${isInnings1 ? 'Conclude 1st Innings' : 'Conclude 2nd Innings & Finalize Match'}</div>
                    <div class="text-[11px] text-amber-100 font-normal">${state.team_1_name} vs ${state.team_2_name}</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-xl transition-colors">&times;</button>
        </div>
        
        <div class="p-6 bg-slate-50 flex flex-col gap-4">
            ${isInnings1 ? `
                <div class="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex flex-col gap-3">
                    <div class="flex items-center justify-between border-b border-amber-200/70 pb-2.5">
                        <div>
                            <div class="text-xs font-bold uppercase tracking-wider text-amber-900">${state.team_1_name} (1st Innings)</div>
                            <div class="text-2xl font-black text-amber-950 mt-0.5">${state.runs}/${state.wickets} <span class="text-sm font-semibold text-amber-800">(${state.overs_completed}.${state.balls_this_over} ov)</span></div>
                        </div>
                        <div class="text-right">
                            <div class="text-[10px] font-bold uppercase tracking-wider text-amber-700">Calculated Target</div>
                            <div class="text-2xl font-black text-emerald-700 mt-0.5">${target} <span class="text-xs font-semibold text-emerald-800">runs</span></div>
                        </div>
                    </div>
                    
                    <div>
                        <div class="flex items-center justify-between mb-1.5">
                            <label class="text-xs font-bold uppercase tracking-wider text-slate-700">Adjust Target (Optional)</label>
                            <span class="text-[11px] text-slate-500 font-medium">For DLS or penalty revisions</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="adjustEndInningsTarget(-5)" class="px-2.5 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs">-5</button>
                            <button type="button" onclick="adjustEndInningsTarget(-1)" class="px-2.5 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs">-1</button>
                            <input id="end-innings-target-input" type="number" min="1" value="${target}" class="flex-1 border border-slate-300 rounded-xl p-2.5 text-center font-extrabold text-slate-900 text-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
                            <button type="button" onclick="adjustEndInningsTarget(1)" class="px-2.5 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs">+1</button>
                            <button type="button" onclick="adjustEndInningsTarget(5)" class="px-2.5 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs">+5</button>
                        </div>
                        <div id="end-innings-equation-preview" class="text-xs text-amber-900 font-medium mt-2 bg-amber-100/70 p-2 rounded-lg">
                            ${state.team_2_name} will need <strong>${target} runs</strong> in <strong>${state.max_overs} overs</strong> (RRR: ${(target / (state.max_overs || 20)).toFixed(2)})
                        </div>
                    </div>
                </div>
            ` : `
                <div class="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex flex-col gap-2.5">
                    <div class="text-xs font-bold uppercase tracking-wider text-amber-900">Final Innings 2 Score</div>
                    <div class="text-3xl font-black text-amber-950">${state.runs}/${state.wickets} <span class="text-base font-semibold text-amber-800">(${state.overs_completed}.${state.balls_this_over} ov)</span></div>
                    <div class="text-xs text-amber-900 mt-1">
                        Target was: <strong>${state.target || (state.runs + 1)}</strong>. Confirming will finalize all statistics and open the official match summary.
                    </div>
                </div>
            `}
            
            <div class="flex justify-between items-center pt-3 border-t border-slate-200 mt-1">
                <button onclick="showMoreOptionsModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    <span>Back</span>
                </button>
                <div class="flex gap-2">
                    <button onclick="closeModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors">Cancel</button>
                    <button onclick="submitEndInnings()" class="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-amber-600/30 transition-all active:scale-98 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>${isInnings1 ? 'Conclude Innings 1' : 'Conclude Match'}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    showModal(html, "w-[520px]");

    let inp = document.getElementById("end-innings-target-input");
    if (inp) {
        inp.oninput = () => {
            let val = parseInt(inp.value) || 1;
            let preview = document.getElementById("end-innings-equation-preview");
            if (preview) {
                let rrr = (val / (state.max_overs || 20)).toFixed(2);
                preview.innerHTML = `${state.team_2_name} will need <strong>${val} runs</strong> in <strong>${state.max_overs} overs</strong> (RRR: ${rrr})`;
            }
        };
    }
};

window.adjustEndInningsTarget = function(delta) {
    let inp = document.getElementById("end-innings-target-input");
    if (!inp) return;
    let current = parseInt(inp.value) || 1;
    let next = Math.max(1, current + delta);
    inp.value = next;
    inp.oninput();
};

window.submitEndInnings = async function() {
    let inp = document.getElementById("end-innings-target-input");
    let state = await eel.get_state()();
    let isInnings1 = (!state.innings || state.innings === 1);
    
    if (isInnings1 && inp) {
        let val = parseInt(inp.value);
        if (!isNaN(val) && val > 0) {
            await eel.set_target(val)();
        }
    }
    closeModal();
    await eel.end_current_innings()();
    refreshUI();
};

let selectedPenaltyTeamName = "";

window.showPenaltyModal = async function() {
    let state = await eel.get_state()();
    let team1 = state.team_1_name || "Team 1";
    let team2 = state.team_2_name || "Team 2";
    let currentInn = state.innings || 1;
    let isT1Batting = (currentInn === 1);
    
    // Default selected team: batting team
    selectedPenaltyTeamName = isT1Batting ? team1 : team2;

    let reasons = [
        "Ball strikes fielder's helmet (+5)",
        "Unfair play / Deliberate time wasting (+5)",
        "Fielder distraction / illegal fielding (+5)",
        "Pitch damage / running on the wicket (+5)",
        "General umpire disciplinary award (+5)"
    ];

    let reasonsHtml = reasons.map((r, i) => `
        <button type="button" onclick="selectPenaltyReason('${r}', this)" class="penalty-reason-chip text-left text-xs p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-purple-50/60 font-medium text-slate-700 transition-all ${i === 0 ? 'border-purple-600 bg-purple-50/80 text-purple-900 font-bold' : ''}">
            ${r}
        </button>
    `).join("");

    let t1Score = isT1Batting ? state.runs : (state.bowling_team_penalty || 0);
    let t2Score = !isT1Batting ? state.runs : (state.bowling_team_penalty || 0);

    let html = `
        <div class="p-4 bg-gradient-to-r from-purple-700 to-indigo-800 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                    <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div>
                    <div class="text-sm font-bold text-white">Award Penalty (+5 Runs)</div>
                    <div class="text-[11px] text-purple-200 font-normal">MCC Law 41/42 • Award 5 extra runs without consuming legal ball</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-xl transition-colors">&times;</button>
        </div>
        
        <div class="p-6 bg-slate-50 flex flex-col gap-4">
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Step 1: Select Team To Receive +5 Runs</label>
                <div class="grid grid-cols-2 gap-3">
                    
                    <!-- Team 1 Card -->
                    <div id="penalty-card-t1" onclick="selectPenaltyTeam('${team1}')" class="cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${selectedPenaltyTeamName === team1 ? 'border-purple-600 bg-purple-50/80 shadow-md ring-2 ring-purple-400/30' : 'border-slate-200 bg-white hover:border-slate-300'}">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isT1Batting ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">${isT1Batting ? 'Batting' : 'Bowling'}</span>
                            <div id="penalty-check-t1" class="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs ${selectedPenaltyTeamName === team1 ? '' : 'hidden'}">✓</div>
                        </div>
                        <div class="my-2">
                            <div class="font-black text-slate-900 text-base truncate">${team1}</div>
                            <div class="text-xs text-slate-500 mt-0.5">Current: <strong>${t1Score}</strong> runs</div>
                        </div>
                        <div class="text-xs font-extrabold text-purple-700 bg-purple-100/80 rounded-lg py-1 text-center">
                            ➔ Next: ${t1Score + 5} runs (+5)
                        </div>
                    </div>

                    <!-- Team 2 Card -->
                    <div id="penalty-card-t2" onclick="selectPenaltyTeam('${team2}')" class="cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${selectedPenaltyTeamName === team2 ? 'border-purple-600 bg-purple-50/80 shadow-md ring-2 ring-purple-400/30' : 'border-slate-200 bg-white hover:border-slate-300'}">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${!isT1Batting ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">${!isT1Batting ? 'Batting' : 'Bowling'}</span>
                            <div id="penalty-check-t2" class="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs ${selectedPenaltyTeamName === team2 ? '' : 'hidden'}">✓</div>
                        </div>
                        <div class="my-2">
                            <div class="font-black text-slate-900 text-base truncate">${team2}</div>
                            <div class="text-xs text-slate-500 mt-0.5">Current: <strong>${t2Score}</strong> runs</div>
                        </div>
                        <div class="text-xs font-extrabold text-purple-700 bg-purple-100/80 rounded-lg py-1 text-center">
                            ➔ Next: ${t2Score + 5} runs (+5)
                        </div>
                    </div>

                </div>
            </div>

            <!-- Reason Selector -->
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Step 2: Penalty Reason</label>
                <div class="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                    ${reasonsHtml}
                </div>
            </div>

            <!-- Scoring Rule Notice -->
            <div class="p-3 bg-purple-50 border border-purple-200/80 rounded-xl text-xs text-purple-950 flex items-start gap-2">
                <svg class="w-4 h-4 text-purple-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>5 runs will be credited under Penalty extras. Does not count as a ball faced or legal delivery.</span>
            </div>
            
            <div class="flex justify-between items-center pt-3 border-t border-slate-200 mt-1">
                <button onclick="showMoreOptionsModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    <span>Back</span>
                </button>
                <div class="flex gap-2">
                    <button onclick="closeModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors">Cancel</button>
                    <button id="btn-confirm-penalty" onclick="submitPenaltyRuns()" class="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-purple-600/30 transition-all active:scale-98 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span id="btn-confirm-penalty-text">Award +5 Runs to ${selectedPenaltyTeamName}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    showModal(html, "w-[540px]");
};

window.selectPenaltyTeam = function(teamName) {
    selectedPenaltyTeamName = teamName;
    let card1 = document.getElementById("penalty-card-t1");
    let card2 = document.getElementById("penalty-card-t2");
    let check1 = document.getElementById("penalty-check-t1");
    let check2 = document.getElementById("penalty-check-t2");
    let btnText = document.getElementById("btn-confirm-penalty-text");

    let isT1 = (card1 && card1.getAttribute("onclick") && card1.getAttribute("onclick").includes(teamName));

    if (isT1) {
        if (card1) card1.className = "cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between border-purple-600 bg-purple-50/80 shadow-md ring-2 ring-purple-400/30";
        if (card2) card2.className = "cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between border-slate-200 bg-white hover:border-slate-300";
        if (check1) check1.classList.remove("hidden");
        if (check2) check2.classList.add("hidden");
    } else {
        if (card2) card2.className = "cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between border-purple-600 bg-purple-50/80 shadow-md ring-2 ring-purple-400/30";
        if (card1) card1.className = "cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between border-slate-200 bg-white hover:border-slate-300";
        if (check2) check2.classList.remove("hidden");
        if (check1) check1.classList.add("hidden");
    }

    if (btnText) {
        btnText.innerText = `Award +5 Runs to ${teamName}`;
    }
};

window.selectPenaltyReason = function(reason, btn) {
    document.querySelectorAll(".penalty-reason-chip").forEach(el => {
        el.className = "penalty-reason-chip text-left text-xs p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-purple-50/60 font-medium text-slate-700 transition-all";
    });
    btn.className = "penalty-reason-chip text-left text-xs p-2.5 rounded-xl border border-purple-600 bg-purple-50/80 font-bold text-purple-900 transition-all shadow-sm";
};

window.submitPenaltyRuns = async function() {
    if (!selectedPenaltyTeamName) {
        alert("Please select a team.");
        return;
    }
    closeModal();
    await eel.award_penalty_runs(selectedPenaltyTeamName)();
    refreshUI();
};

let selectedRetirePlayerType = "Striker";

window.showRetiredHurtModal = async function() {
    let state = await eel.get_state()();
    selectedRetirePlayerType = "Striker";

    let strikerName = state.striker ? state.striker.name : "Striker";
    let strikerRuns = state.striker ? state.striker.runs : 0;
    let strikerBalls = state.striker ? state.striker.balls : 0;
    let striker4s = state.striker ? (state.striker["4s"] || 0) : 0;
    let striker6s = state.striker ? (state.striker["6s"] || 0) : 0;

    let nonStrikerName = state.non_striker ? state.non_striker.name : "Non-Striker";
    let nonStrikerRuns = state.non_striker ? state.non_striker.runs : 0;
    let nonStrikerBalls = state.non_striker ? state.non_striker.balls : 0;
    let nonStriker4s = state.non_striker ? (state.non_striker["4s"] || 0) : 0;
    let nonStriker6s = state.non_striker ? (state.non_striker["6s"] || 0) : 0;

    let batTeamId = state.batting_team_id;
    if (!batTeamId) {
        let allTeams = await eel.get_teams()();
        let batTeam = allTeams.find(t => t.name === (state.innings === 1 ? state.team_1_name : state.team_2_name));
        if (batTeam) batTeamId = batTeam.id;
    }

    let batPlayers = [];
    if (batTeamId) {
        try {
            batPlayers = await eel.get_players(batTeamId)();
        } catch(e) {
            console.error("Error fetching bat players:", e);
        }
    }

    let outBatsmen = state.out_batsmen || [];
    
    // Check if any previously retired hurt batsmen can resume!
    let previouslyRetiredHurt = [];
    if (state.batsmen_stats) {
        Object.keys(state.batsmen_stats).forEach(name => {
            let st = state.batsmen_stats[name];
            if (st && st.status === "retired hurt" && name !== strikerName && name !== nonStrikerName) {
                previouslyRetiredHurt.push(name);
            }
        });
    }

    let availableSquad = batPlayers
        .map(p => p.full_name || (p.first_name + " " + p.last_name).trim())
        .filter(name => name !== strikerName && name !== nonStrikerName && (!outBatsmen.includes(name) || previouslyRetiredHurt.includes(name)));

    let optionsHtml = "";
    if (previouslyRetiredHurt.length > 0) {
        optionsHtml += `<optgroup label="Eligible to Resume Innings">`;
        previouslyRetiredHurt.forEach(name => {
            let stats = state.batsmen_stats[name] || {};
            optionsHtml += `<option value="${name}">↩ ${name} (${stats.runs || 0} runs - Resume Innings)</option>`;
        });
        optionsHtml += `</optgroup>`;
    }

    if (availableSquad.length > 0) {
        optionsHtml += `<optgroup label="Remaining Squad Batsmen">`;
        availableSquad.forEach(name => {
            if (!previouslyRetiredHurt.includes(name)) {
                optionsHtml += `<option value="${name}">${name}</option>`;
            }
        });
        optionsHtml += `</optgroup>`;
    }

    optionsHtml += `<optgroup label="Custom Batsman">`;
    optionsHtml += `<option value="__custom__">+ Enter Custom Batsman Name...</option>`;
    optionsHtml += `</optgroup>`;

    let html = `
        <div class="p-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                    <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                </div>
                <div>
                    <div class="text-sm font-bold text-white">Batsman Retired Hurt / Sub</div>
                    <div class="text-[11px] text-emerald-200 font-normal">Player leaves the crease due to illness or injury</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-xl transition-colors">&times;</button>
        </div>
        
        <div class="p-6 bg-slate-50 flex flex-col gap-4">
            
            <!-- Step 1: Retiring Batsman Selection Cards -->
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Step 1: Select Retiring Batsman</label>
                <div class="grid grid-cols-2 gap-3">
                    
                    <!-- Striker Card -->
                    <div id="retire-card-striker" onclick="selectRetiringPlayer('Striker')" class="cursor-pointer p-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-400/30 transition-all flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200/90 text-emerald-900">Striker *</span>
                            <div id="retire-check-striker" class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</div>
                        </div>
                        <div class="my-2">
                            <div class="font-black text-slate-900 text-base truncate">${strikerName}</div>
                            <div class="text-xs text-slate-500 mt-0.5">${strikerRuns} runs (${strikerBalls} balls) • 4s: ${striker4s}, 6s: ${striker6s}</div>
                        </div>
                        <div class="text-[11px] font-semibold text-emerald-800">
                            SR: ${strikerBalls > 0 ? (strikerRuns / strikerBalls * 100).toFixed(1) : '0.0'}
                        </div>
                    </div>

                    <!-- Non-Striker Card -->
                    <div id="retire-card-nonstriker" onclick="selectRetiringPlayer('Non-Striker')" class="cursor-pointer p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">Non-Striker</span>
                            <div id="retire-check-nonstriker" class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs hidden">✓</div>
                        </div>
                        <div class="my-2">
                            <div class="font-black text-slate-900 text-base truncate">${nonStrikerName}</div>
                            <div class="text-xs text-slate-500 mt-0.5">${nonStrikerRuns} runs (${nonStrikerBalls} balls) • 4s: ${nonStriker4s}, 6s: ${nonStriker6s}</div>
                        </div>
                        <div class="text-[11px] font-semibold text-slate-600">
                            SR: ${nonStrikerBalls > 0 ? (nonStrikerRuns / nonStrikerBalls * 100).toFixed(1) : '0.0'}
                        </div>
                    </div>

                </div>
            </div>

            <!-- Step 2: New Batsman -->
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Step 2: Incoming Replacement Batsman</label>
                <select id="retire-newbat-select" onchange="toggleRetireCustomInput(this.value)" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">
                    ${optionsHtml}
                </select>
                <input id="retire-newbat-custom" type="text" placeholder="Type new batsman name here..." class="hidden mt-2 border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">
            </div>

            <div class="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
                <svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>The player will be marked as "retired hurt" (not out). They are allowed by cricket law to resume their innings at the fall of a future wicket.</span>
            </div>
            
            <div class="flex justify-between items-center pt-3 border-t border-slate-200 mt-1">
                <button onclick="showMoreOptionsModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    <span>Back</span>
                </button>
                <div class="flex gap-2">
                    <button onclick="closeModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors">Cancel</button>
                    <button onclick="submitRetiredHurt()" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all active:scale-98 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Confirm Substitution</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    showModal(html, "w-[540px]");
};

window.selectRetiringPlayer = function(type) {
    selectedRetirePlayerType = type;
    let cardS = document.getElementById("retire-card-striker");
    let cardN = document.getElementById("retire-card-nonstriker");
    let checkS = document.getElementById("retire-check-striker");
    let checkN = document.getElementById("retire-check-nonstriker");

    if (type === "Striker") {
        if (cardS) cardS.className = "cursor-pointer p-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-400/30 transition-all flex flex-col justify-between";
        if (cardN) cardN.className = "cursor-pointer p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between";
        if (checkS) checkS.classList.remove("hidden");
        if (checkN) checkN.classList.add("hidden");
    } else {
        if (cardN) cardN.className = "cursor-pointer p-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-400/30 transition-all flex flex-col justify-between";
        if (cardS) cardS.className = "cursor-pointer p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between";
        if (checkN) checkN.classList.remove("hidden");
        if (checkS) checkS.classList.add("hidden");
    }
};

window.toggleRetireCustomInput = function(val) {
    let inp = document.getElementById("retire-newbat-custom");
    if (!inp) return;
    if (val === "__custom__") {
        inp.classList.remove("hidden");
        inp.focus();
    } else {
        inp.classList.add("hidden");
    }
};

window.submitRetiredHurt = async function() {
    let playerType = selectedRetirePlayerType || "Striker";
    let sel = document.getElementById("retire-newbat-select");
    let customInp = document.getElementById("retire-newbat-custom");
    let newBatName = sel ? sel.value : "";
    if (newBatName === "__custom__") {
        newBatName = customInp ? customInp.value.trim() : "";
    }
    if (!newBatName || newBatName.trim() === "") {
        alert("Please select or enter the new batsman's name.");
        return;
    }

    closeModal();
    await eel.retire_hurt(playerType, newBatName)();
    refreshUI();
};

window.showChangeTargetModal = async function() {
    let state = await eel.get_state()();
    if (!state.innings || state.innings === 1) {
        alert("Change Target is unavailable during the 1st innings. Targets are only active in the 2nd innings.");
        return;
    }
    let currentTarget = state.target != null ? state.target : "Not Set";
    let defaultVal = state.target != null ? state.target : (state.runs + 1);
    let bpo = state.balls_per_over || 6;
    let totalBalls = (state.max_overs || 20) * bpo;
    let bowledBalls = (state.overs_completed || 0) * bpo + (state.balls_this_over || 0);
    let ballsRemaining = Math.max(0, totalBalls - bowledBalls);

    let html = `
        <div class="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                    <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                </div>
                <div>
                    <div class="text-sm font-bold text-white">Change Target Runs</div>
                    <div class="text-[11px] text-blue-100 font-normal">Revise victory target for DLS rain calculation or manual adjustment</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-xl transition-colors">&times;</button>
        </div>
        
        <div class="p-6 bg-slate-50 flex flex-col gap-4">
            
            <!-- Match Status Preview -->
            <div class="grid grid-cols-3 gap-2 p-3 bg-blue-50/80 border border-blue-200/90 rounded-2xl text-center">
                <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-blue-600">Current Target</div>
                    <div class="text-lg font-black text-blue-950 mt-0.5">${currentTarget}</div>
                </div>
                <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Score</div>
                    <div class="text-lg font-black text-slate-900 mt-0.5">${state.runs}/${state.wickets}</div>
                </div>
                <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Balls Left</div>
                    <div class="text-lg font-black text-slate-900 mt-0.5">${ballsRemaining} b</div>
                </div>
            </div>

            <!-- Target Input & Steppers -->
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">New Target Runs to Win</label>
                
                <div class="flex items-center gap-2">
                    <input id="change-target-input" type="number" min="1" max="1000" value="${defaultVal}" class="border border-slate-300 rounded-xl p-3 flex-1 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-black text-slate-900 text-2xl tracking-wide text-center shadow-inner">
                </div>

                <!-- Quick adjustment buttons -->
                <div class="grid grid-cols-6 gap-2 mt-2.5">
                    <button type="button" onclick="adjustTargetInput(-10)" class="py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all">-10</button>
                    <button type="button" onclick="adjustTargetInput(-5)" class="py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all">-5</button>
                    <button type="button" onclick="adjustTargetInput(-1)" class="py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all">-1</button>
                    <button type="button" onclick="adjustTargetInput(1)" class="py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all">+1</button>
                    <button type="button" onclick="adjustTargetInput(5)" class="py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all">+5</button>
                    <button type="button" onclick="adjustTargetInput(10)" class="py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all">+10</button>
                </div>
            </div>

            <!-- Live Dynamic Impact Equation -->
            <div id="target-live-preview" class="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-sm flex flex-col gap-1">
                <!-- Rendered dynamically -->
            </div>
            
            <div class="flex justify-between items-center pt-3 border-t border-slate-200 mt-1">
                <button onclick="showMoreOptionsModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    <span>Back</span>
                </button>
                <div class="flex gap-2">
                    <button onclick="closeModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors">Cancel</button>
                    <button onclick="submitChangeTarget()" class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-600/30 transition-all active:scale-98 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Update Target</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    showModal(html, "w-[500px]");

    let inp = document.getElementById("change-target-input");
    if (inp) {
        inp.oninput = () => updateTargetPreview(state);
        updateTargetPreview(state);
    }
};

window.adjustTargetInput = function(delta) {
    let inp = document.getElementById("change-target-input");
    if (!inp) return;
    let current = parseInt(inp.value) || 1;
    let next = Math.max(1, current + delta);
    inp.value = next;
    inp.oninput();
};

window.updateTargetPreview = function(state) {
    let inp = document.getElementById("change-target-input");
    let preview = document.getElementById("target-live-preview");
    if (!inp || !preview) return;

    let target = parseInt(inp.value) || 0;
    let bpo = state.balls_per_over || 6;
    let totalBalls = (state.max_overs || 20) * bpo;
    let bowledBalls = (state.overs_completed || 0) * bpo + (state.balls_this_over || 0);
    let ballsRemaining = Math.max(0, totalBalls - bowledBalls);
    let runsNeeded = target - state.runs;
    let rrr = (ballsRemaining > 0 && runsNeeded > 0) ? ((runsNeeded / ballsRemaining) * bpo).toFixed(2) : "0.00";
    let chasingTeam = state.team_2_name || "Chasing Team";

    if (state.innings === 2) {
        if (runsNeeded <= 0) {
            preview.innerHTML = `
                <div class="text-amber-800 font-bold flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>Target reached (${state.runs} >= ${target})</span>
                </div>
                <div class="text-[11px] text-slate-600">Setting this target will immediately conclude the match with ${chasingTeam} winning!</div>
            `;
        } else {
            preview.innerHTML = `
                <div class="font-extrabold text-blue-900 text-sm">
                    ${chasingTeam} need <strong>${runsNeeded} runs</strong> from <strong>${ballsRemaining} balls</strong>
                </div>
                <div class="text-[11px] text-slate-500 font-medium">
                    Required Run Rate (RRR): <strong class="text-blue-700">${rrr}</strong> runs per over
                </div>
            `;
        }
    } else {
        preview.innerHTML = `
            <div class="font-bold text-slate-800 text-sm">Target set to <strong>${target} runs</strong></div>
            <div class="text-[11px] text-slate-500">Innings 1 is in progress. Chasing team will face a target of ${target} in Innings 2.</div>
        `;
    }
};

window.submitChangeTarget = async function() {
    let state = await eel.get_state()();
    if (!state.innings || state.innings === 1) {
        alert("Target can only be changed during the 2nd innings.");
        closeModal();
        return;
    }
    let inp = document.getElementById("change-target-input");
    let val = parseInt(inp.value);
    if (isNaN(val) || val <= 0) {
        alert("Please enter a valid positive target number.");
        return;
    }
    closeModal();
    await eel.change_target(val)();
    refreshUI();
};

window.showFormatModal = async function() {
    let state = await eel.get_state()();
    if (state.innings && state.innings > 1) {
        alert("Match format (overs/wickets) can only be changed during the 1st innings.");
        return;
    }

    let currentPlayedOvers = (state.overs_completed || 0) + ((state.balls_this_over || 0) > 0 ? 1 : 0);
    let minAllowedOvers = Math.max(1, currentPlayedOvers);
    let currentWicketsLost = state.wickets || 0;
    let minAllowedWickets = Math.max(1, currentWicketsLost);

    let defaultOvers = Math.max(state.max_overs || 20, minAllowedOvers);
    let defaultWickets = Math.max(state.max_wickets || 10, minAllowedWickets);

    let presets = [
        { label: "T20 (20 ov, 10 wkt)", overs: 20, wickets: 10 },
        { label: "T10 (10 ov, 10 wkt)", overs: 10, wickets: 10 },
        { label: "50 Overs (ODI)", overs: 50, wickets: 10 },
        { label: "15 Overs", overs: 15, wickets: 10 },
        { label: "5 Overs Blitz", overs: 5, wickets: 10 },
        { label: "8 Wickets Match", overs: defaultOvers, wickets: 8 }
    ];

    let presetsHtml = presets.map(p => {
        let isOversTooLow = p.overs < minAllowedOvers;
        let isWicketsTooLow = p.wickets < minAllowedWickets;
        let isDisabled = isOversTooLow || isWicketsTooLow;
        let reason = isOversTooLow 
            ? `Cannot set to ${p.overs} overs because ${minAllowedOvers} overs have already been played` 
            : `Cannot set to ${p.wickets} wickets because ${minAllowedWickets} wickets have already fallen`;
        
        if (isDisabled) {
            return `
                <div class="p-2 bg-slate-100 border border-slate-200 rounded-xl text-left text-xs font-bold text-slate-400 opacity-50 cursor-not-allowed flex items-center justify-between" title="${reason}">
                    <span class="truncate">${p.label}</span>
                    <span class="text-[10px] text-slate-400 font-semibold shrink-0 ml-1">N/A</span>
                </div>
            `;
        }
        return `
            <button type="button" onclick="setFormatPreset(${p.overs}, ${p.wickets})" class="p-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left text-xs font-bold text-slate-800 transition-all flex items-center justify-between cursor-pointer">
                <span>${p.label}</span>
                <span class="text-[10px] text-teal-600 font-semibold">${p.overs}o / ${p.wickets}w</span>
            </button>
        `;
    }).join("");

    let html = `
        <div class="p-4 bg-gradient-to-r from-teal-700 to-teal-800 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                    <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                    <div class="text-sm font-bold text-white">Match Format (Overs / Wickets)</div>
                    <div class="text-[11px] text-teal-100 font-normal">Available during 1st innings • Adjust total match overs & wickets</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-xl transition-colors">&times;</button>
        </div>
        
        <div class="p-6 bg-slate-50 flex flex-col gap-4">
            
            <!-- Quick Presets -->
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Quick Format Presets</label>
                <div class="grid grid-cols-2 gap-2">
                    ${presetsHtml}
                </div>
            </div>

            <!-- Custom Overs & Wickets Steppers -->
            <div class="grid grid-cols-2 gap-4">
                
                <!-- Max Overs -->
                <div class="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-xs font-bold uppercase tracking-wider text-slate-700">Max Overs</label>
                        <span class="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">Min: ${minAllowedOvers} ov</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="adjustFormatOvers(-5)" class="w-8 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">-5</button>
                        <button type="button" onclick="adjustFormatOvers(-1)" class="w-8 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">-1</button>
                        <input id="change-format-overs" type="number" min="${minAllowedOvers}" max="100" value="${defaultOvers}" class="flex-1 border border-slate-300 rounded-xl p-2 text-center font-black text-slate-900 text-lg bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none">
                        <button type="button" onclick="adjustFormatOvers(1)" class="w-8 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">+1</button>
                        <button type="button" onclick="adjustFormatOvers(5)" class="w-8 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">+5</button>
                    </div>
                    <div id="overs-error-msg" class="text-[11px] text-red-600 font-bold mt-1.5 hidden flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>Cannot be less than played overs (${minAllowedOvers} ov).</span>
                    </div>
                </div>

                <!-- Max Wickets -->
                <div class="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-xs font-bold uppercase tracking-wider text-slate-700">Max Wickets</label>
                        <span class="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">Lost: ${currentWicketsLost} wkt</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="adjustFormatWickets(-1)" class="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">-1</button>
                        <input id="change-format-wickets" type="number" min="${minAllowedWickets}" max="10" value="${defaultWickets}" class="flex-1 border border-slate-300 rounded-xl p-2 text-center font-black text-slate-900 text-lg bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none">
                        <button type="button" onclick="adjustFormatWickets(1)" class="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">+1</button>
                    </div>
                    <div id="wickets-error-msg" class="text-[11px] text-red-600 font-bold mt-1.5 hidden flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>Cannot be less than wickets lost (${currentWicketsLost} wkt).</span>
                    </div>
                </div>

            </div>

            <!-- Format Live Summary -->
            <div id="format-live-summary" class="p-3 bg-teal-50 border border-teal-200/80 rounded-xl text-xs text-teal-950 flex items-start gap-2">
                <svg class="w-4 h-4 text-teal-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div id="format-summary-text">
                    Total match: <strong>${defaultOvers} overs</strong> (${defaultOvers * 6} balls) • Innings concludes at <strong>${defaultWickets} wickets</strong>.
                </div>
            </div>
            
            <div class="flex justify-between items-center pt-3 border-t border-slate-200 mt-1">
                <button onclick="showMoreOptionsModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    <span>Back</span>
                </button>
                <div class="flex gap-2">
                    <button onclick="closeModal()" class="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer">Cancel</button>
                    <button id="save-format-btn" onclick="submitChangeFormat()" class="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-teal-600/30 transition-all active:scale-98 flex items-center gap-1.5 cursor-pointer">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Save Format</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    showModal(html, "w-[520px]");

    let oInp = document.getElementById("change-format-overs");
    let wInp = document.getElementById("change-format-wickets");
    let updateSummary = () => {
        let ov = parseInt(oInp.value) || minAllowedOvers;
        let wk = parseInt(wInp.value) || 10;
        let errOvers = document.getElementById("overs-error-msg");
        let errWkts = document.getElementById("wickets-error-msg");
        let saveBtn = document.getElementById("save-format-btn");
        let txt = document.getElementById("format-summary-text");
        
        let hasError = false;
        if (ov < minAllowedOvers) {
            hasError = true;
            if (errOvers) errOvers.classList.remove("hidden");
        } else {
            if (errOvers) errOvers.classList.add("hidden");
        }

        if (wk < minAllowedWickets) {
            hasError = true;
            if (errWkts) errWkts.classList.remove("hidden");
        } else {
            if (errWkts) errWkts.classList.add("hidden");
        }

        if (saveBtn) {
            saveBtn.disabled = hasError;
            if (hasError) {
                saveBtn.classList.add("opacity-50", "cursor-not-allowed");
            } else {
                saveBtn.classList.remove("opacity-50", "cursor-not-allowed");
            }
        }

        if (txt) {
            if (hasError) {
                txt.innerHTML = `<span class="text-red-700 font-bold">Invalid Format:</span> Maximum overs cannot be less than current played overs (${state.overs_completed || 0}.${state.balls_this_over || 0} ov). Minimum is <strong>${minAllowedOvers} overs</strong>.`;
            } else {
                txt.innerHTML = `Total match: <strong>${ov} overs</strong> (${ov * 6} balls) • Innings concludes at <strong>${wk} wickets</strong>.`;
            }
        }
    };
    if (oInp) oInp.oninput = updateSummary;
    if (wInp) wInp.oninput = updateSummary;
};

window.setFormatPreset = function(overs, wickets) {
    let oInp = document.getElementById("change-format-overs");
    let wInp = document.getElementById("change-format-wickets");
    let minO = oInp ? (parseInt(oInp.min) || 1) : 1;
    if (overs < minO) {
        alert(`Maximum overs cannot be less than current played overs (${minO} overs).`);
        return;
    }
    if (oInp) oInp.value = overs;
    if (wInp) wInp.value = wickets;
    if (oInp && oInp.oninput) oInp.oninput();
};

window.adjustFormatOvers = function(delta) {
    let oInp = document.getElementById("change-format-overs");
    if (!oInp) return;
    let minO = parseInt(oInp.min) || 1;
    let cur = parseInt(oInp.value) || minO;
    oInp.value = Math.max(minO, cur + delta);
    if (oInp.oninput) oInp.oninput();
};

window.adjustFormatWickets = function(delta) {
    let wInp = document.getElementById("change-format-wickets");
    if (!wInp) return;
    let minW = parseInt(wInp.min) || 1;
    let cur = parseInt(wInp.value) || minW;
    wInp.value = Math.min(10, Math.max(minW, cur + delta));
    if (wInp.oninput) wInp.oninput();
};

window.submitChangeFormat = async function() {
    let state = await eel.get_state()();
    let currentPlayedOvers = (state.overs_completed || 0) + ((state.balls_this_over || 0) > 0 ? 1 : 0);
    let minAllowedOvers = Math.max(1, currentPlayedOvers);
    let currentWicketsLost = state.wickets || 0;
    let minAllowedWickets = Math.max(1, currentWicketsLost);

    let oversInp = document.getElementById("change-format-overs");
    let wicketsInp = document.getElementById("change-format-wickets");
    let overs = parseInt(oversInp.value);
    let wickets = parseInt(wicketsInp.value);

    if (isNaN(overs) || overs <= 0) {
        alert("Please enter a valid positive number for overs.");
        return;
    }
    if (overs < minAllowedOvers) {
        alert(`Maximum overs cannot be less than current played overs (${state.overs_completed || 0}.${state.balls_this_over || 0} overs bowled). Minimum allowed overs is ${minAllowedOvers}.`);
        return;
    }
    if (isNaN(wickets) || wickets <= 0 || wickets > 10) {
        alert("Please enter a valid wicket count (1-10).");
        return;
    }
    if (wickets < minAllowedWickets) {
        alert(`Maximum wickets cannot be less than current wickets lost (${currentWicketsLost} wickets fallen). Minimum allowed wickets is ${minAllowedWickets}.`);
        return;
    }

    closeModal();
    await eel.update_match_format(overs, wickets)();
    refreshUI();
};

// =========================================================================
// SIDEBAR NAVIGATION & BADGES
// =========================================================================

window.switchSidebarTab = function(tabName) {
    currentSidebarTab = tabName;
    
    // Update nav button styling
    ['scoreboard', 'teams', 'players', 'tournaments', 'stats'].forEach(t => {
        let btn = document.getElementById(`nav-tab-${t}`);
        let view = document.getElementById(`view-${t}`);
        if (btn) {
            if (t === tabName) {
                btn.className = "nav-item-active w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all duration-150 text-white font-bold group";
            } else {
                btn.className = "w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all duration-150 text-slate-400 hover:text-white hover:bg-slate-800/40 group";
            }
        }
        if (view) {
            if (t === tabName) {
                view.classList.remove("hidden");
            } else {
                view.classList.add("hidden");
            }
        }
    });

    if (tabName === 'teams') {
        loadTeamsView();
    } else if (tabName === 'players') {
        loadPlayersView();
    } else if (tabName === 'tournaments') {
        loadTournamentsView();
    } else if (tabName === 'stats') {
        loadStatsView();
    }
};

async function updateSidebarBadges() {
    try {
        if (!allTeamsData || allTeamsData.length === 0) {
            allTeamsData = await eel.get_teams()();
        }
        let teamsCount = allTeamsData ? allTeamsData.length : 0;
        let tBadge = document.getElementById("badge-teams-count");
        if (tBadge) tBadge.innerText = teamsCount;

        if (!allPlayersData || allPlayersData.length === 0) {
            allPlayersData = await eel.get_players()();
        }
        let playersCount = allPlayersData ? allPlayersData.length : 0;
        let pBadge = document.getElementById("badge-players-count");
        if (pBadge) pBadge.innerText = playersCount;

        let tourns = await TournamentAPI.getTournaments();
        let tournBadge = document.getElementById("badge-tournaments-count");
        if (tournBadge) tournBadge.innerText = (tourns ? tourns.length : 0);
    } catch(e) {
        console.error("Error updating badges:", e);
    }
}

// =========================================================================
// TEAMS MANAGEMENT & CRUD
// =========================================================================

window.loadTeamsView = async function() {
    try {
        let container = document.getElementById("teams-cards-container");
        if (!container) return;
        container.innerHTML = `
            <div class="col-span-full py-16 flex flex-col items-center justify-center text-slate-400">
                <div class="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="mt-3 text-sm font-semibold">Loading teams and squad data...</p>
            </div>
        `;

        let [teams, players] = await Promise.all([
            eel.get_teams()(),
            eel.get_players()()
        ]);
        allTeamsData = teams || [];
        allPlayersData = players || [];
        teamCache = teams;

        updateSidebarBadges();
        renderTeams(allTeamsData);
    } catch (e) {
        console.error("Error in loadTeamsView:", e);
        showToast("Error loading teams: " + e.message, "error");
    }
};

window.filterTeams = function() {
    let searchInput = document.getElementById("teams-search-input");
    let query = (searchInput ? searchInput.value : "").trim().toLowerCase();
    if (!query) {
        renderTeams(allTeamsData);
        return;
    }
    let filtered = allTeamsData.filter(t => t.name.toLowerCase().includes(query));
    renderTeams(filtered);
};

window.renderTeams = function(teamsList) {
    let container = document.getElementById("teams-cards-container");
    if (!container) return;

    if (!teamsList || teamsList.length === 0) {
        container.innerHTML = `
            <div class="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center">
                <div class="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl mb-3">
                    🛡️
                </div>
                <h3 class="text-lg font-bold text-slate-800">No Teams Found</h3>
                <p class="text-sm text-slate-500 mt-1 max-w-sm">Get started by creating your first cricket team with custom brand colors and logo.</p>
                <button onclick="openCreateTeamModal()" class="mt-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 text-sm">
                    + Create New Team
                </button>
            </div>
        `;
        return;
    }

    let html = teamsList.map(t => {
        let color = t.theme_color || "#0284c7";
        let teamPlayers = (allPlayersData || []).filter(p => p.team === t.id);
        let count = teamPlayers.length;
        
        let batCount = teamPlayers.filter(p => p.role === 'BAT').length;
        let bowlCount = teamPlayers.filter(p => p.role === 'BOWL').length;
        let arCount = teamPlayers.filter(p => p.role === 'AR').length;
        let wkCount = teamPlayers.filter(p => p.role === 'WK').length;

        let logoHtml = t.logo 
            ? `<img src="${t.logo}" class="w-14 h-14 rounded-2xl object-contain bg-white p-1 border-2 border-white shadow-md">`
            : `<div class="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white border-2 border-white shadow-md" style="background-color: ${color}">
                 ${escapeHtml(formatInitials(t.name))}
               </div>`;

        return `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 group">
                <!-- Top Color Strip with Logo -->
                <div class="h-16 relative px-5 flex items-end justify-between" style="background: linear-gradient(135deg, ${color} 0%, ${adjustColorBrightness(color, -25)} 100%);">
                    <div class="absolute -bottom-6 left-5">
                        ${logoHtml}
                    </div>
                    <div class="mb-2 ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white text-xs font-mono font-bold">
                        <span class="w-2 h-2 rounded-full inline-block" style="background-color: ${color}"></span>
                        <span>${color.toUpperCase()}</span>
                    </div>
                </div>

                <!-- Card Body -->
                <div class="pt-8 px-5 pb-5 flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <h3 class="text-xl font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">${escapeHtml(t.name)}</h3>
                                <p class="text-xs font-semibold text-slate-400 mt-0.5">${count} Players in Squad</p>
                            </div>
                            <span class="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                Squad
                            </span>
                        </div>

                        <!-- Role breakdown pills -->
                        <div class="grid grid-cols-4 gap-1.5 mt-4 pt-4 border-t border-slate-100 text-center">
                            <div class="bg-blue-50/80 border border-blue-100 rounded-lg py-1.5 px-1">
                                <div class="text-[10px] font-bold text-blue-600 uppercase">Bat</div>
                                <div class="text-sm font-extrabold text-blue-950">${batCount}</div>
                            </div>
                            <div class="bg-emerald-50/80 border border-emerald-100 rounded-lg py-1.5 px-1">
                                <div class="text-[10px] font-bold text-emerald-600 uppercase">Bowl</div>
                                <div class="text-sm font-extrabold text-emerald-950">${bowlCount}</div>
                            </div>
                            <div class="bg-purple-50/80 border border-purple-100 rounded-lg py-1.5 px-1">
                                <div class="text-[10px] font-bold text-purple-600 uppercase">AR</div>
                                <div class="text-sm font-extrabold text-purple-950">${arCount}</div>
                            </div>
                            <div class="bg-amber-50/80 border border-amber-100 rounded-lg py-1.5 px-1">
                                <div class="text-[10px] font-bold text-amber-600 uppercase">WK</div>
                                <div class="text-sm font-extrabold text-amber-950">${wkCount}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Action Buttons -->
                    <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button onclick="openSquadManagerModal('${t.id}')" class="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-2.5 px-3 rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5">
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            <span>Manage Squad (${count})</span>
                        </button>
                        <div class="flex items-center gap-1">
                            <button onclick="openEditTeamModal('${t.id}')" title="Edit Team" class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button onclick="openDeleteTeamModal('${t.id}')" title="Delete Team" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = html;
};

window.openCreateTeamModal = function() {
    let presets = ['#dc2626', '#1e40af', '#059669', '#d97706', '#7c3aed', '#0891b2', '#0f172a', '#ff007f'];
    let swatches = presets.map(c => `
        <button type="button" onclick="setTeamColor('${c}')" class="w-7 h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform" style="background-color: ${c}"></button>
    `).join("");

    let html = `
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <h3 class="font-bold text-lg heading-font">Create New Team</h3>
            <button onclick="closeModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">✕</button>
        </div>
        <form onsubmit="handleTeamFormSubmit(event, false)" class="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
            <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Team Name *</label>
                <input id="team-form-name" type="text" required placeholder="e.g. Colombo Kings" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Theme Color</label>
                <div class="flex items-center gap-2 mb-2">
                    <input id="team-form-color-picker" type="color" value="#059669" oninput="document.getElementById('team-form-color').value = this.value" class="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer">
                    <input id="team-form-color" type="text" value="#059669" oninput="document.getElementById('team-form-color-picker').value = this.value" class="flex-1 font-mono font-bold text-sm border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-bold text-slate-400 uppercase">Presets:</span>
                    <div class="flex items-center gap-1.5">${swatches}</div>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Team Logo</label>
                <div class="flex items-center gap-4">
                    <div id="team-logo-preview" class="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden text-slate-400 text-xs">
                        No Logo
                    </div>
                    <div class="flex-1">
                        <input id="team-form-logo" type="file" accept="image/*" onchange="previewLogoFile(event)" class="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer">
                        <p class="text-[11px] text-slate-400 mt-1">PNG, JPG, SVG up to 5MB</p>
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" id="team-form-submit-btn" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-md shadow-emerald-600/20 active:scale-98 transition-all">Save Team</button>
            </div>
        </form>
    `;
    showModal(html, "w-[480px]");
};

window.openEditTeamModal = function(teamId) {
    let t = allTeamsData.find(item => item.id === teamId);
    if (!t) return;

    let presets = ['#dc2626', '#1e40af', '#059669', '#d97706', '#7c3aed', '#0891b2', '#0f172a', '#ff007f'];
    let swatches = presets.map(c => `
        <button type="button" onclick="setTeamColor('${c}')" class="w-7 h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform" style="background-color: ${c}"></button>
    `).join("");

    let currentLogoHtml = t.logo 
        ? `<img src="${t.logo}" class="w-full h-full object-contain">`
        : `No Logo`;

    let html = `
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <h3 class="font-bold text-lg heading-font">Edit Team</h3>
            <button onclick="closeModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">✕</button>
        </div>
        <form onsubmit="handleTeamFormSubmit(event, true, '${t.id}')" class="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
            <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Team Name *</label>
                <input id="team-form-name" type="text" required value="${escapeHtml(t.name)}" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Theme Color</label>
                <div class="flex items-center gap-2 mb-2">
                    <input id="team-form-color-picker" type="color" value="${t.theme_color || '#059669'}" oninput="document.getElementById('team-form-color').value = this.value" class="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer">
                    <input id="team-form-color" type="text" value="${t.theme_color || '#059669'}" oninput="document.getElementById('team-form-color-picker').value = this.value" class="flex-1 font-mono font-bold text-sm border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-bold text-slate-400 uppercase">Presets:</span>
                    <div class="flex items-center gap-1.5">${swatches}</div>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Change Team Logo</label>
                <div class="flex items-center gap-4">
                    <div id="team-logo-preview" class="w-16 h-16 rounded-2xl border border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden text-slate-400 text-xs">
                        ${currentLogoHtml}
                    </div>
                    <div class="flex-1">
                        <input id="team-form-logo" type="file" accept="image/*" onchange="previewLogoFile(event)" class="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer">
                        <p class="text-[11px] text-slate-400 mt-1">Leave empty to keep current logo</p>
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" id="team-form-submit-btn" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-md shadow-emerald-600/20 active:scale-98 transition-all">Update Team</button>
            </div>
        </form>
    `;
    showModal(html, "w-[480px]");
};

window.handleTeamFormSubmit = async function(e, isEdit, teamId = null) {
    e.preventDefault();
    let btn = document.getElementById("team-form-submit-btn");
    let name = document.getElementById("team-form-name").value.trim();
    let themeColor = document.getElementById("team-form-color").value.trim();
    let fileInput = document.getElementById("team-form-logo");
    let logoFile = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!name) {
        showToast("Team name is required", "error");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = "Saving...";
    }

    try {
        let logoBase64 = null;
        let logoFilename = null;
        if (logoFile) {
            logoBase64 = await new Promise((res, rej) => {
                let r = new FileReader();
                r.onload = () => res(r.result);
                r.onerror = rej;
                r.readAsDataURL(logoFile);
            });
            logoFilename = logoFile.name;
        }

        if (isEdit) {
            await eel.update_team(teamId, name, themeColor, logoBase64, logoFilename)();
            showToast(`Team "${name}" updated successfully!`);
        } else {
            await eel.create_team(name, themeColor, logoBase64, logoFilename)();
            showToast(`Team "${name}" created successfully!`);
        }

        closeModal();
        teamCache = null;
        await loadTeamsView();
        await initSetup();
    } catch(err) {
        console.error("Team save error:", err);
        showToast("Failed to save team: " + err.message, "error");
        if (btn) {
            btn.disabled = false;
            btn.innerText = isEdit ? "Update Team" : "Save Team";
        }
    }
};

window.openDeleteTeamModal = function(teamId) {
    let t = allTeamsData.find(item => item.id === teamId);
    if (!t) return;
    let teamPlayers = (allPlayersData || []).filter(p => p.team === teamId);

    let html = `
        <div class="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
            <h3 class="font-bold text-lg heading-font flex items-center gap-2">
                <span>⚠️</span>
                <span>Delete Team</span>
            </h3>
            <button onclick="closeModal()" class="text-red-200 hover:text-white p-1 rounded-lg">✕</button>
        </div>
        <div class="p-6">
            <p class="text-sm font-semibold text-slate-800">
                Are you sure you want to delete <strong class="text-red-600 font-extrabold">${escapeHtml(t.name)}</strong>?
            </p>
            <p class="text-xs text-slate-500 mt-2">
                This team currently has <strong>${teamPlayers.length} players</strong> in its squad. Deleting this team will also permanently remove all its players and matches.
            </p>
            <div class="flex justify-end gap-3 mt-6">
                <button onclick="closeModal()" class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button onclick="confirmDeleteTeam('${t.id}')" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md shadow-red-600/20 transition-all">
                    Delete Team
                </button>
            </div>
        </div>
    `;
    showModal(html, "w-[440px]");
};

window.confirmDeleteTeam = async function(teamId) {
    try {
        await eel.delete_team(teamId)();
        showToast("Team deleted successfully!");
        closeModal();
        teamCache = null;
        await loadTeamsView();
        await initSetup();
    } catch(err) {
        console.error("Team delete error:", err);
        showToast("Failed to delete team: " + err.message, "error");
    }
};

// =========================================================================
// SQUAD MANAGEMENT (ADD SQUAD / EDIT SQUAD)
// =========================================================================

window.openSquadManagerModal = async function(teamId, initialTab = 'roster') {
    let team = allTeamsData.find(t => t.id === teamId);
    if (!team) {
        showToast("Team not found", "error");
        return;
    }

    let teamPlayers = (allPlayersData || []).filter(p => p.team === teamId);
    let otherPlayers = (allPlayersData || []).filter(p => p.team !== teamId);

    let logoHtml = team.logo 
        ? `<img src="${team.logo}" class="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-sm">`
        : `<div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-sm" style="background-color: ${team.theme_color || '#059669'}">
             ${escapeHtml(formatInitials(team.name))}
           </div>`;

    // Render roster items
    let rosterHtml = "";
    if (teamPlayers.length === 0) {
        rosterHtml = `
            <div class="py-12 text-center text-slate-400">
                <div class="text-3xl mb-2">👥</div>
                <p class="font-bold text-slate-700">No Players in Squad</p>
                <p class="text-xs text-slate-400 mt-1">Switch to the "Add to Squad" tab to recruit or create players for this team.</p>
            </div>
        `;
    } else {
        rosterHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto p-1">
                ${teamPlayers.map(p => {
                    let roleBadge = getRoleBadgeHtml(p.role);
                    let imgHtml = p.image
                        ? `<img src="${p.image}" class="w-10 h-10 rounded-xl object-cover bg-slate-100">`
                        : `<div class="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs">#${p.jersey_number}</div>`;
                    
                    return `
                        <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:shadow-sm transition-all">
                            <div class="flex items-center gap-3">
                                ${imgHtml}
                                <div>
                                    <div class="font-bold text-sm text-slate-900">${escapeHtml(p.full_name || p.first_name + " " + p.last_name)}</div>
                                    <div class="flex items-center gap-1.5 mt-0.5">
                                        <span class="text-xs font-mono font-bold text-slate-500">#${p.jersey_number}</span>
                                        ${roleBadge}
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-1">
                                <button onclick="openEditPlayerModal('${p.id}', true, '${teamId}')" title="Edit Player" class="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
                                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                </button>
                                <button onclick="removePlayerFromSquad('${p.id}', '${teamId}', '${escapeHtml(p.full_name || p.first_name)}')" title="Remove Player" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    // Options for transferring players
    let transferOptions = otherPlayers.length > 0 
        ? otherPlayers.map(p => `<option value="${p.id}">${escapeHtml(p.full_name || p.first_name + ' ' + p.last_name)} (#${p.jersey_number} - ${p.role}) [From ${escapeHtml(p.team_name || 'Other Team')}]</option>`).join("")
        : `<option disabled>No other players available</option>`;

    let html = `
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
                ${logoHtml}
                <div>
                    <h3 class="font-extrabold text-lg heading-font">${escapeHtml(team.name)} Squad</h3>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="w-2 h-2 rounded-full" style="background-color: ${team.theme_color}"></span>
                        <span class="text-xs font-semibold text-slate-400">${teamPlayers.length} Players Registered</span>
                    </div>
                </div>
            </div>
            <button onclick="closeModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">✕</button>
        </div>

        <!-- Squad Modal Navigation Tabs -->
        <div class="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
            <button id="squad-tab-btn-roster" onclick="switchSquadModalTab('roster')" class="px-4 py-2.5 text-sm font-bold border-b-2 ${initialTab === 'roster' ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'} transition-all">
                Squad Roster (${teamPlayers.length})
            </button>
            <button id="squad-tab-btn-add" onclick="switchSquadModalTab('add')" class="px-4 py-2.5 text-sm font-bold border-b-2 ${initialTab === 'add' ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'} transition-all">
                + Add to Squad
            </button>
        </div>

        <div class="p-6">
            <!-- TAB 1: ROSTER -->
            <div id="squad-tab-roster-view" class="${initialTab === 'roster' ? '' : 'hidden'}">
                ${rosterHtml}
            </div>

            <!-- TAB 2: ADD TO SQUAD -->
            <div id="squad-tab-add-view" class="${initialTab === 'add' ? '' : 'hidden'} flex flex-col gap-6">
                <!-- Section A: Transfer Existing Player -->
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <h4 class="font-bold text-sm text-slate-800 mb-1">Transfer Existing Player</h4>
                    <p class="text-xs text-slate-500 mb-3">Assign a player currently in another team to this squad.</p>
                    <div class="flex gap-2">
                        <select id="transfer-player-select" class="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-emerald-500">
                            ${transferOptions}
                        </select>
                        <button onclick="transferSelectedPlayerToSquad('${teamId}')" ${otherPlayers.length === 0 ? 'disabled' : ''} class="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap shadow transition-all">
                            Transfer to Squad
                        </button>
                    </div>
                </div>

                <!-- Section B: Quick Create New Player Directly to this Squad -->
                <div class="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                    <h4 class="font-bold text-sm text-emerald-950 mb-1">Quick Add New Player</h4>
                    <p class="text-xs text-emerald-800 mb-3">Create and add a brand new player directly to ${escapeHtml(team.name)}.</p>
                    <form onsubmit="handleQuickCreatePlayerForSquad(event, '${teamId}')" class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">First Name *</label>
                            <input id="quick-player-first-name" type="text" required placeholder="First name" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Last Name *</label>
                            <input id="quick-player-last-name" type="text" required placeholder="Last name" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Jersey Number (0-999) *</label>
                            <input id="quick-player-jersey" type="number" min="0" max="999" required placeholder="e.g. 7" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Role *</label>
                            <select id="quick-player-role" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500">
                                <option value="BAT">Batsman (BAT)</option>
                                <option value="BOWL">Bowler (BOWL)</option>
                                <option value="AR">All-Rounder (AR)</option>
                                <option value="WK">Wicket Keeper (WK)</option>
                            </select>
                        </div>
                        <div class="col-span-2 flex justify-end mt-1">
                            <button type="submit" class="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all">
                                Create & Add to Squad
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button onclick="closeModal()" class="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors">
                Done
            </button>
        </div>
    `;

    showModal(html, "w-[680px]");
};

window.switchSquadModalTab = function(tab) {
    let rosterView = document.getElementById("squad-tab-roster-view");
    let addView = document.getElementById("squad-tab-add-view");
    let btnRoster = document.getElementById("squad-tab-btn-roster");
    let btnAdd = document.getElementById("squad-tab-btn-add");

    if (tab === 'roster') {
        rosterView.classList.remove("hidden");
        addView.classList.add("hidden");
        btnRoster.className = "px-4 py-2.5 text-sm font-bold border-b-2 border-emerald-600 text-emerald-700 bg-white rounded-t-lg transition-all";
        btnAdd.className = "px-4 py-2.5 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-all";
    } else {
        rosterView.classList.add("hidden");
        addView.classList.remove("hidden");
        btnRoster.className = "px-4 py-2.5 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-all";
        btnAdd.className = "px-4 py-2.5 text-sm font-bold border-b-2 border-emerald-600 text-emerald-700 bg-white rounded-t-lg transition-all";
    }
};

window.transferSelectedPlayerToSquad = async function(teamId) {
    let select = document.getElementById("transfer-player-select");
    if (!select || !select.value) return;
    let playerId = select.value;
    try {
        await eel.assign_player_to_team(playerId, teamId)();
        showToast("Player transferred to squad!");
        playerCache = {};
        await loadTeamsView();
        openSquadManagerModal(teamId, 'roster');
        await initSetup();
    } catch(err) {
        console.error("Transfer error:", err);
        showToast("Failed to transfer player: " + err.message, "error");
    }
};

window.handleQuickCreatePlayerForSquad = async function(e, teamId) {
    e.preventDefault();
    let firstName = document.getElementById("quick-player-first-name").value.trim();
    let lastName = document.getElementById("quick-player-last-name").value.trim();
    let jersey = parseInt(document.getElementById("quick-player-jersey").value);
    let role = document.getElementById("quick-player-role").value;

    if (!firstName || !lastName || isNaN(jersey)) {
        showToast("Please fill in all player fields", "error");
        return;
    }

    try {
        await eel.create_player(firstName, lastName, jersey, role, teamId)();
        showToast(`Player "${firstName} ${lastName}" added to squad!`);
        playerCache = {};
        await loadTeamsView();
        openSquadManagerModal(teamId, 'roster');
        await initSetup();
    } catch(err) {
        console.error("Quick create squad player error:", err);
        showToast("Failed to create player: " + err.message, "error");
    }
};

window.removePlayerFromSquad = async function(playerId, teamId, playerName) {
    if (!confirm(`Are you sure you want to remove ${playerName} from this squad?`)) {
        return;
    }
    try {
        await eel.delete_player(playerId)();
        showToast(`Removed ${playerName} from squad`);
        playerCache = {};
        await loadTeamsView();
        openSquadManagerModal(teamId, 'roster');
        await initSetup();
    } catch(err) {
        console.error("Remove from squad error:", err);
        showToast("Failed to remove player: " + err.message, "error");
    }
};

// =========================================================================
// PLAYERS DIRECTORY & CRUD
// =========================================================================

window.loadPlayersView = async function() {
    try {
        let container = document.getElementById("players-list-container");
        if (!container) return;
        container.innerHTML = `
            <div class="py-16 flex flex-col items-center justify-center text-slate-400">
                <div class="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="mt-3 text-sm font-semibold">Loading players roster...</p>
            </div>
        `;

        let [players, teams] = await Promise.all([
            eel.get_players()(),
            eel.get_teams()()
        ]);
        allPlayersData = players || [];
        allTeamsData = teams || [];

        updateSidebarBadges();

        // Populate team filter dropdown
        let filterTeamSelect = document.getElementById("players-filter-team");
        if (filterTeamSelect) {
            let currentVal = filterTeamSelect.value;
            filterTeamSelect.innerHTML = `<option value="ALL">All Teams (${allPlayersData.length})</option>` +
                allTeamsData.map(t => {
                    let cnt = allPlayersData.filter(p => p.team === t.id).length;
                    return `<option value="${t.id}">${escapeHtml(t.name)} (${cnt})</option>`;
                }).join("");
            if (currentVal) filterTeamSelect.value = currentVal;
        }

        filterPlayers();
    } catch(e) {
        console.error("Error in loadPlayersView:", e);
        showToast("Error loading players: " + e.message, "error");
    }
};

window.filterPlayers = function() {
    let searchInput = document.getElementById("players-search-input");
    let query = (searchInput ? searchInput.value : "").trim().toLowerCase();
    let teamSelect = document.getElementById("players-filter-team");
    let teamFilter = teamSelect ? teamSelect.value : "ALL";
    let roleSelect = document.getElementById("players-filter-role");
    let roleFilter = roleSelect ? roleSelect.value : "ALL";

    let filtered = allPlayersData.filter(p => {
        let fullName = (p.full_name || p.first_name + " " + p.last_name).toLowerCase();
        let jerseyStr = (p.jersey_number !== undefined && p.jersey_number !== null) ? p.jersey_number.toString() : "";
        let matchesQuery = !query || fullName.includes(query) || jerseyStr.includes(query);
        let matchesTeam = teamFilter === "ALL" || p.team === teamFilter;
        let matchesRole = roleFilter === "ALL" || p.role === roleFilter;
        return matchesQuery && matchesTeam && matchesRole;
    });

    let countLbl = document.getElementById("players-count-label");
    if (countLbl) {
        countLbl.innerText = `Showing ${filtered.length} of ${allPlayersData.length} players`;
    }

    renderPlayers(filtered);
};

window.renderPlayers = function(playersList) {
    let container = document.getElementById("players-list-container");
    if (!container) return;

    if (!playersList || playersList.length === 0) {
        container.innerHTML = `
            <div class="p-12 text-center text-slate-400 flex flex-col items-center">
                <div class="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center text-3xl mb-3">
                    🏏
                </div>
                <h3 class="text-lg font-bold text-slate-800">No Players Found</h3>
                <p class="text-sm text-slate-500 mt-1 max-w-sm">No players match your search filter. Create a new player or adjust your filters.</p>
                <button onclick="openCreatePlayerModal()" class="mt-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 text-sm">
                    + Add New Player
                </button>
            </div>
        `;
        return;
    }

    let rowsHtml = playersList.map(p => {
        let assignedTeam = allTeamsData.find(t => t.id === p.team);
        let teamColor = assignedTeam ? assignedTeam.theme_color : "#64748b";

        let roleBadge = getRoleBadgeHtml(p.role);

        let imgHtml = p.image
            ? `<img src="${p.image}" class="w-11 h-11 rounded-xl object-cover bg-slate-100 border border-slate-200 shadow-sm">`
            : `<div class="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-extrabold flex items-center justify-center text-sm shadow-sm">
                 ${escapeHtml(formatInitials(p.first_name + " " + p.last_name))}
               </div>`;

        // Team options for quick reassignment
        let teamOptions = allTeamsData.map(t => `
            <option value="${t.id}" ${t.id === p.team ? 'selected' : ''}>${escapeHtml(t.name)}</option>
        `).join("");

        return `
            <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                <!-- Player Photo & Name -->
                <td class="py-3 px-5">
                    <div class="flex items-center gap-3">
                        ${imgHtml}
                        <div>
                            <div class="font-extrabold text-sm text-slate-900">${escapeHtml(p.full_name || p.first_name + " " + p.last_name)}</div>
                            <div class="text-[11px] font-semibold text-slate-400 capitalize">${p.first_name} ${p.last_name}</div>
                        </div>
                    </div>
                </td>

                <!-- Jersey Number -->
                <td class="py-3 px-4 text-center">
                    <span class="inline-block px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg font-mono font-extrabold text-xs text-slate-800">
                        #${p.jersey_number}
                    </span>
                </td>

                <!-- Role -->
                <td class="py-3 px-4 text-center">
                    ${roleBadge}
                </td>

                <!-- Assigned Team + Quick Reassign -->
                <td class="py-3 px-5">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${teamColor}"></span>
                        <select onchange="quickAssignPlayerTeam('${p.id}', this.value)" class="text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 cursor-pointer text-slate-800 transition-colors">
                            ${teamOptions}
                        </select>
                    </div>
                </td>

                <!-- Actions -->
                <td class="py-3 px-5 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                        <button onclick="openEditPlayerModal('${p.id}')" title="Edit Player" class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        <button onclick="openDeletePlayerModal('${p.id}')" title="Delete Player" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    container.innerHTML = `
        <table class="w-full text-left">
            <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th class="py-3.5 px-5">Player</th>
                    <th class="py-3.5 px-4 text-center">Jersey</th>
                    <th class="py-3.5 px-4 text-center">Role</th>
                    <th class="py-3.5 px-5">Assigned Team</th>
                    <th class="py-3.5 px-5 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                ${rowsHtml}
            </tbody>
        </table>
    `;
};

window.openCreatePlayerModal = function(preselectedTeamId = null) {
    if (!allTeamsData || allTeamsData.length === 0) {
        showToast("Please create at least one team before creating players", "error");
        return;
    }

    let teamOptions = allTeamsData.map(t => `
        <option value="${t.id}" ${t.id === preselectedTeamId ? 'selected' : ''}>${escapeHtml(t.name)}</option>
    `).join("");

    let html = `
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <h3 class="font-bold text-lg heading-font">Add New Player</h3>
            <button onclick="closeModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">✕</button>
        </div>
        <form onsubmit="handlePlayerFormSubmit(event, false)" class="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-700 mb-1">First Name *</label>
                    <input id="player-form-first-name" type="text" required placeholder="First Name" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Last Name *</label>
                    <input id="player-form-last-name" type="text" required placeholder="Last Name" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Jersey Number *</label>
                    <input id="player-form-jersey" type="number" min="0" max="999" required placeholder="e.g. 18" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Assign to Team *</label>
                    <select id="player-form-team" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                        ${teamOptions}
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1.5">Player Role *</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <label class="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:bg-slate-50 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <input type="radio" name="player-form-role" value="BAT" checked class="hidden">
                        <span class="text-lg mb-1">🏏</span>
                        <span class="text-xs font-bold text-slate-800">Batsman</span>
                    </label>
                    <label class="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:bg-slate-50 transition-all has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                        <input type="radio" name="player-form-role" value="BOWL" class="hidden">
                        <span class="text-lg mb-1">⚾</span>
                        <span class="text-xs font-bold text-slate-800">Bowler</span>
                    </label>
                    <label class="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:bg-slate-50 transition-all has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50">
                        <input type="radio" name="player-form-role" value="AR" class="hidden">
                        <span class="text-lg mb-1">⚡</span>
                        <span class="text-xs font-bold text-slate-800">All-Rounder</span>
                    </label>
                    <label class="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:bg-slate-50 transition-all has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                        <input type="radio" name="player-form-role" value="WK" class="hidden">
                        <span class="text-lg mb-1">🧤</span>
                        <span class="text-xs font-bold text-slate-800">Keeper</span>
                    </label>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Player Photo</label>
                <div class="flex items-center gap-4">
                    <div id="player-image-preview" class="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden text-slate-400 text-xs">
                        No Photo
                    </div>
                    <div class="flex-1">
                        <input id="player-form-image" type="file" accept="image/*" onchange="previewPlayerImageFile(event)" class="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer">
                        <p class="text-[11px] text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" id="player-form-submit-btn" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-md shadow-emerald-600/20 active:scale-98 transition-all">Save Player</button>
            </div>
        </form>
    `;

    showModal(html, "w-[540px]");
};

window.openEditPlayerModal = function(playerId, fromSquadManager = false, squadTeamId = null) {
    let p = allPlayersData.find(item => item.id === playerId);
    if (!p) return;

    let teamOptions = allTeamsData.map(t => `
        <option value="${t.id}" ${t.id === p.team ? 'selected' : ''}>${escapeHtml(t.name)}</option>
    `).join("");

    let currentImgHtml = p.image 
        ? `<img src="${p.image}" class="w-full h-full object-cover">`
        : `No Photo`;

    let html = `
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <h3 class="font-bold text-lg heading-font">Edit Player</h3>
            <button onclick="closeModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">✕</button>
        </div>
        <form onsubmit="handlePlayerFormSubmit(event, true, '${p.id}', ${fromSquadManager}, '${squadTeamId}')" class="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-700 mb-1">First Name *</label>
                    <input id="player-form-first-name" type="text" required value="${escapeHtml(p.first_name)}" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Last Name *</label>
                    <input id="player-form-last-name" type="text" required value="${escapeHtml(p.last_name)}" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Jersey Number *</label>
                    <input id="player-form-jersey" type="number" min="0" max="999" required value="${p.jersey_number}" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Assign to Team *</label>
                    <select id="player-form-team" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                        ${teamOptions}
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1.5">Player Role *</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <label class="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:bg-slate-50 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <input type="radio" name="player-form-role" value="BAT" ${p.role === 'BAT' ? 'checked' : ''} class="hidden">
                        <span class="text-lg mb-1">🏏</span>
                        <span class="text-xs font-bold text-slate-800">Batsman</span>
                    </label>
                    <label class="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:bg-slate-50 transition-all has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                        <input type="radio" name="player-form-role" value="BOWL" ${p.role === 'BOWL' ? 'checked' : ''} class="hidden">
                        <span class="text-lg mb-1">⚾</span>
                        <span class="text-xs font-bold text-slate-800">Bowler</span>
                    </label>
                    <label class="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:bg-slate-50 transition-all has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50">
                        <input type="radio" name="player-form-role" value="AR" ${p.role === 'AR' ? 'checked' : ''} class="hidden">
                        <span class="text-lg mb-1">⚡</span>
                        <span class="text-xs font-bold text-slate-800">All-Rounder</span>
                    </label>
                    <label class="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:bg-slate-50 transition-all has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                        <input type="radio" name="player-form-role" value="WK" ${p.role === 'WK' ? 'checked' : ''} class="hidden">
                        <span class="text-lg mb-1">🧤</span>
                        <span class="text-xs font-bold text-slate-800">Keeper</span>
                    </label>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Change Player Photo</label>
                <div class="flex items-center gap-4">
                    <div id="player-image-preview" class="w-16 h-16 rounded-2xl border border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden text-slate-400 text-xs">
                        ${currentImgHtml}
                    </div>
                    <div class="flex-1">
                        <input id="player-form-image" type="file" accept="image/*" onchange="previewPlayerImageFile(event)" class="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer">
                        <p class="text-[11px] text-slate-400 mt-1">Leave empty to keep current photo</p>
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" id="player-form-submit-btn" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-md shadow-emerald-600/20 active:scale-98 transition-all">Update Player</button>
            </div>
        </form>
    `;

    showModal(html, "w-[540px]");
};

window.handlePlayerFormSubmit = async function(e, isEdit, playerId = null, fromSquadManager = false, squadTeamId = null) {
    e.preventDefault();
    let btn = document.getElementById("player-form-submit-btn");
    let firstName = document.getElementById("player-form-first-name").value.trim();
    let lastName = document.getElementById("player-form-last-name").value.trim();
    let jersey = parseInt(document.getElementById("player-form-jersey").value);
    let teamId = document.getElementById("player-form-team").value;
    let roleInput = document.querySelector('input[name="player-form-role"]:checked');
    let role = roleInput ? roleInput.value : 'BAT';

    let fileInput = document.getElementById("player-form-image");
    let imageFile = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!firstName || !lastName) {
        showToast("First name and Last name are required", "error");
        return;
    }
    if (isNaN(jersey)) {
        showToast("Valid jersey number is required", "error");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = "Saving...";
    }

    try {
        let imageBase64 = null;
        let imageFilename = null;
        if (imageFile) {
            imageBase64 = await new Promise((res, rej) => {
                let r = new FileReader();
                r.onload = () => res(r.result);
                r.onerror = rej;
                r.readAsDataURL(imageFile);
            });
            imageFilename = imageFile.name;
        }

        if (isEdit) {
            await eel.update_player(playerId, firstName, lastName, jersey, role, teamId, imageBase64, imageFilename)();
            showToast(`Player "${firstName} ${lastName}" updated!`);
        } else {
            await eel.create_player(firstName, lastName, jersey, role, teamId, imageBase64, imageFilename)();
            showToast(`Player "${firstName} ${lastName}" added!`);
        }

        playerCache = {};
        closeModal();

        if (fromSquadManager && squadTeamId) {
            await loadTeamsView();
            openSquadManagerModal(squadTeamId);
        } else {
            await loadPlayersView();
        }
        await initSetup();
    } catch(err) {
        console.error("Player save error:", err);
        showToast("Failed to save player: " + err.message, "error");
        if (btn) {
            btn.disabled = false;
            btn.innerText = isEdit ? "Update Player" : "Save Player";
        }
    }
};

window.openDeletePlayerModal = function(playerId) {
    let p = allPlayersData.find(item => item.id === playerId);
    if (!p) return;

    let html = `
        <div class="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
            <h3 class="font-bold text-lg heading-font flex items-center gap-2">
                <span>⚠️</span>
                <span>Delete Player</span>
            </h3>
            <button onclick="closeModal()" class="text-red-200 hover:text-white p-1 rounded-lg">✕</button>
        </div>
        <div class="p-6">
            <p class="text-sm font-semibold text-slate-800">
                Are you sure you want to delete <strong class="text-red-600 font-extrabold">${escapeHtml(p.full_name || p.first_name + " " + p.last_name)}</strong> (#${p.jersey_number})?
            </p>
            <p class="text-xs text-slate-500 mt-2">
                This action cannot be undone. All career statistics for this player will also be permanently removed.
            </p>
            <div class="flex justify-end gap-3 mt-6">
                <button onclick="closeModal()" class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button onclick="confirmDeletePlayer('${p.id}')" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md shadow-red-600/20 transition-all">
                    Delete Player
                </button>
            </div>
        </div>
    `;
    showModal(html, "w-[440px]");
};

window.confirmDeletePlayer = async function(playerId) {
    try {
        await eel.delete_player(playerId)();
        showToast("Player deleted successfully!");
        closeModal();
        playerCache = {};
        await loadPlayersView();
        await initSetup();
    } catch(err) {
        console.error("Player delete error:", err);
        showToast("Failed to delete player: " + err.message, "error");
    }
};

window.quickAssignPlayerTeam = async function(playerId, newTeamId) {
    try {
        await eel.assign_player_to_team(playerId, newTeamId)();
        showToast("Player squad reassigned!");
        playerCache = {};
        await loadPlayersView();
        await initSetup();
    } catch(err) {
        console.error("Quick assign error:", err);
        showToast("Failed to reassign player: " + err.message, "error");
    }
};

// =========================================================================
// UTILITIES & FEEDBACK
// =========================================================================

function showToast(message, type = 'success') {
    let container = document.getElementById("toast-container");
    if (!container) return;
    let toast = document.createElement("div");
    let bg = type === 'error' ? 'bg-red-600 text-white' : type === 'info' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white';
    let icon = type === 'error' ? '⚠️' : type === 'info' ? 'ℹ️' : '✅';
    toast.className = `${bg} px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-sm font-semibold animate-fade-in pointer-events-auto transition-all`;
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

function getRoleBadgeHtml(role) {
    switch (role) {
        case 'BAT':
            return `<span class="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">🏏 BAT</span>`;
        case 'BOWL':
            return `<span class="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">⚾ BOWL</span>`;
        case 'AR':
            return `<span class="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">⚡ AR</span>`;
        case 'WK':
            return `<span class="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">🧤 WK</span>`;
        default:
            return `<span class="inline-flex items-center text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">${role || 'Player'}</span>`;
    }
}

function formatInitials(name) {
    if (!name) return "HC";
    let parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

function adjustColorBrightness(col, percent) {
    if (!col || !col.startsWith("#") || col.length < 7) return col || "#059669";
    try {
        let num = parseInt(col.replace("#", ""), 16);
        let amt = Math.round(2.55 * percent);
        let R = (num >> 16) + amt;
        let B = ((num >> 8) & 0x00FF) + amt;
        let G = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
            (G < 255 ? (G < 1 ? 0 : G) : 255)).toString(16).slice(1);
    } catch(e) {
        return col;
    }
}

window.previewLogoFile = function(e) {
    let file = e.target.files[0];
    let preview = document.getElementById("team-logo-preview");
    if (file && preview) {
        let reader = new FileReader();
        reader.onload = (ev) => {
            preview.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-contain">`;
        };
        reader.readAsDataURL(file);
    }
};

window.previewPlayerImageFile = function(e) {
    let file = e.target.files[0];
    let preview = document.getElementById("player-image-preview");
    if (file && preview) {
        let reader = new FileReader();
        reader.onload = (ev) => {
            preview.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover">`;
        };
        reader.readAsDataURL(file);
    }
};

window.setTeamColor = function(color) {
    let colorInput = document.getElementById("team-form-color");
    let picker = document.getElementById("team-form-color-picker");
    if (colorInput) colorInput.value = color;
    if (picker) picker.value = color;
};

// =========================================================================
// BALL SPEED GUN HANDLERS
// =========================================================================

window.submitBallSpeed = async function() {
    const input = document.getElementById("input-ball-speed");
    if (!input) return;
    const val = input.value.trim();
    if (!val) {
        showToast("Please enter a ball speed value", "error");
        return;
    }
    try {
        await eel.set_ball_speed(val)();
        showToast(`Ball speed ${val} km/h sent to screen overlay`, "success");
        refreshUI();
    } catch (e) {
        console.error("Error setting ball speed:", e);
        showToast("Failed to send ball speed", "error");
    }
};

window.clearBallSpeed = async function() {
    const input = document.getElementById("input-ball-speed");
    if (input) input.value = "";
    try {
        await eel.set_ball_speed(null)();
        showToast("Ball speed cleared from overlay", "info");
        refreshUI();
    } catch (e) {
        console.error("Error clearing ball speed:", e);
    }
};

window.quickSetSpeed = async function(speed) {
    const input = document.getElementById("input-ball-speed");
    if (input) input.value = speed;
    await window.submitBallSpeed();
};

// =========================================================================
// RIGHT ADMIN PANEL: SPEED SCALE CONTROLLER & SPEED INDICATOR
// =========================================================================

window.toggleRightPanel = function() {
    // Right panel is permanently sticky in the scoring section
};

window.updateScaleIndicatorDisplay = function(val) {
    const num = parseFloat(val) || 0;
    const formatted = num.toFixed(1);

    const speedDisp = document.getElementById("scale-speed-display");
    if (speedDisp) speedDisp.innerText = formatted;

    const mphDisp = document.getElementById("scale-mph-display");
    if (mphDisp) {
        const mph = (num * 0.621371).toFixed(1);
        mphDisp.innerText = `${mph} mph`;
    }

    const badge = document.getElementById("scale-pace-badge");
    if (badge) {
        if (num < 105) {
            badge.innerText = "Spin / Slow 🌀";
            badge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30";
        } else if (num < 126) {
            badge.innerText = "Medium Pace 🎯";
            badge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
        } else if (num < 143) {
            badge.innerText = "Fast Pace ⚡";
            badge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30";
        } else {
            badge.innerText = "Express Fast 🔥";
            badge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse";
        }
    }
};

let autoSyncTimeout = null;
window.onScaleSliderInput = function(val) {
    window.updateScaleIndicatorDisplay(val);

    const autoSync = document.getElementById("auto-sync-speed-toggle");
    if (autoSync && autoSync.checked) {
        clearTimeout(autoSyncTimeout);
        autoSyncTimeout = setTimeout(async () => {
            await window.sendScaleSpeed(false);
        }, 120);
    }
};

window.onScaleSliderChange = async function(val) {
    window.updateScaleIndicatorDisplay(val);
    const autoSync = document.getElementById("auto-sync-speed-toggle");
    if (autoSync && autoSync.checked) {
        await window.sendScaleSpeed(false);
    }
};

window.sendScaleSpeed = async function(showFeedback = true) {
    const slider = document.getElementById("scale-slider");
    if (!slider) return;
    const val = parseFloat(slider.value).toFixed(1);
    try {
        await eel.set_ball_speed(val)();
        const statusBadge = document.getElementById("scale-overlay-status");
        if (statusBadge) {
            statusBadge.innerText = `${val} km/h (Live)`;
            statusBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30";
        }
        if (showFeedback) {
            showToast(`Ball speed ${val} km/h sent to screen overlay`, "success");
        }
        refreshUI();
    } catch (e) {
        console.error("Error broadcasting speed:", e);
    }
};

window.clearScaleSpeed = async function() {
    try {
        await eel.set_ball_speed(null)();
        const statusBadge = document.getElementById("scale-overlay-status");
        if (statusBadge) {
            statusBadge.innerText = "Cleared";
            statusBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
        }
        showToast("Ball speed cleared from overlay", "info");
        refreshUI();
    } catch (e) {
        console.error("Error clearing scale speed:", e);
    }
};

window.stepSpeed = function(delta) {
    const slider = document.getElementById("scale-slider");
    if (!slider) return;
    let cur = parseFloat(slider.value) || 140;
    let nextVal = Math.max(60, Math.min(165, cur + delta));
    slider.value = nextVal;
    window.onScaleSliderInput(nextVal);
    window.onScaleSliderChange(nextVal);
};

window.setScalePreset = function(preset) {
    const slider = document.getElementById("scale-slider");
    if (!slider) return;
    slider.value = preset;
    window.onScaleSliderInput(preset);
    window.onScaleSliderChange(preset);
    showToast(`Preset: ${preset} km/h applied`, "info");
};

// =========================================================================
// App Initialization & State Restoration
// =========================================================================
async function initApp() {
    try {
        let state = null;
        if (window.eel && typeof eel.get_state === 'function') {
            state = await eel.get_state()();
        }

        let hasActiveMatch = Boolean(
            state &&
            typeof state === 'object' &&
            state.team_1_name &&
            (state.striker || state.overs_completed !== undefined || state.innings_1_stats)
        );

        let resumeBanner = document.getElementById("setup-resume-banner");
        let resumeTitle = document.getElementById("resume-banner-title");
        let resumeSub = document.getElementById("resume-banner-subtitle");

        if (hasActiveMatch) {
            if (resumeBanner && resumeTitle && resumeSub) {
                resumeTitle.innerText = `Active Match: ${state.team_1_name} vs ${state.team_2_name}`;
                let oversText = `${state.overs_completed || 0}.${state.balls_this_over || 0} ov`;
                resumeSub.innerText = `Innings ${state.innings || 1} • ${state.runs || 0}/${state.wickets || 0} (${oversText}) in progress.`;
                resumeBanner.classList.remove("hidden");
            }

            document.getElementById("setup-screen").classList.add("hidden");

            if (state.match_over) {
                document.getElementById("scoring-screen").classList.add("hidden");
                document.getElementById("match-summary-screen").classList.remove("hidden");
                await showMatchOverPrompt();
            } else {
                document.getElementById("match-summary-screen").classList.add("hidden");
                document.getElementById("scoring-screen").classList.remove("hidden");
                await refreshUI();

                if (state.innings === 2 && !state.striker) {
                    showInnings2SetupPrompt(state.target || (state.innings_1_stats ? state.innings_1_stats.runs + 1 : 1));
                }
            }

            // Populate setup dropdowns in background for team/player management tabs
            initSetup();
        } else {
            if (resumeBanner) resumeBanner.classList.add("hidden");
            document.getElementById("match-summary-screen").classList.add("hidden");
            document.getElementById("scoring-screen").classList.add("hidden");
            document.getElementById("setup-screen").classList.remove("hidden");
            await initSetup();
        }
    } catch (err) {
        console.error("[initApp] App initialization error:", err);
        document.getElementById("match-summary-screen").classList.add("hidden");
        document.getElementById("scoring-screen").classList.add("hidden");
        document.getElementById("setup-screen").classList.remove("hidden");
        initSetup();
    }
}

// Initial startup
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// =========================================================================
// Native JavaScript EventSource API: Listen to SSE stream for UI updates
// =========================================================================
(function initMatchStreamSSE() {
    try {
        const streamUrl = "http://127.0.0.1:8000/api/stream/";
        const evtSource = new EventSource(streamUrl);

        evtSource.onmessage = function(e) {
            try {
                if (!e.data || !e.data.trim()) return;
                const matchState = JSON.parse(e.data);
                if (matchState && typeof matchState === 'object' && Object.keys(matchState).length > 0) {
                    if (matchState.team_1_name && (matchState.striker || matchState.overs_completed !== undefined || matchState.innings_1_stats)) {
                        let setupEl = document.getElementById("setup-screen");
                        if (setupEl && !setupEl.classList.contains("hidden")) {
                            setupEl.classList.add("hidden");
                            let scoreEl = document.getElementById("scoring-screen");
                            if (scoreEl && !matchState.match_over) scoreEl.classList.remove("hidden");
                        }
                    }
                    if (typeof refreshUI === 'function') {
                        refreshUI();
                    }
                }
            } catch (err) {
                console.warn("[SSE] Parse error in Eel web client:", err);
            }
        };

        evtSource.onerror = function() {
            // Native EventSource automatically retries connection
        };
    } catch (err) {
        console.warn("[SSE] EventSource init error in Eel frontend:", err);
    }
})();

// =========================================================================
// TOURNAMENT MANAGEMENT & GROUP POINTS TABLE SYSTEM
// =========================================================================

let allTournamentsData = [];
let selectedTournamentId = null;
let allGroupsData = [];
let selectedGroupId = null;
let currentStandingsData = [];

window.loadTournamentsView = async function() {
    try {
        let emptyEl = document.getElementById("tournaments-empty-state");
        let contentEl = document.getElementById("tournaments-main-content");
        let select = document.getElementById("tournament-select");

        let tourns = await TournamentAPI.getTournaments();
        allTournamentsData = tourns || [];
        updateSidebarBadges();

        if (allTournamentsData.length === 0) {
            if (emptyEl) emptyEl.classList.remove("hidden");
            if (contentEl) contentEl.classList.add("hidden");
            selectedTournamentId = null;
            selectedGroupId = null;
            return;
        }

        if (emptyEl) emptyEl.classList.add("hidden");
        if (contentEl) contentEl.classList.remove("hidden");

        if (select) {
            select.innerHTML = allTournamentsData.map(t => {
                let seasonLabel = t.season ? `(${t.season})` : `(${t.max_overs || 20} Ov)`;
                return `<option value="${t.id}">${escapeHtml(t.name)} ${seasonLabel}</option>`;
            }).join("");
        }

        if (!selectedTournamentId || !allTournamentsData.some(t => t.id === selectedTournamentId)) {
            selectedTournamentId = allTournamentsData[0].id;
        }

        if (select) select.value = selectedTournamentId;
        await window.onTournamentSelected(selectedTournamentId);

    } catch (err) {
        console.error("Error loading tournaments view:", err);
        showToast("Error loading tournaments: " + err.message, "error");
    }
};

window.onTournamentSelected = async function(tournId) {
    if (!tournId) return;
    selectedTournamentId = tournId;
    let t = allTournamentsData.find(x => x.id === tournId);

    let seasonVal = document.getElementById("tournament-meta-season-val");
    if (seasonVal) seasonVal.innerText = (t && t.season) ? `Season: ${t.season}` : "General Season";

    let oversVal = document.getElementById("tournament-meta-overs-val");
    if (oversVal) oversVal.innerText = `${(t && t.max_overs) ? t.max_overs : 20} Overs Quota`;

    try {
        let groups = await TournamentAPI.getGroups(tournId);
        allGroupsData = groups || [];

        let groupsVal = document.getElementById("tournament-meta-groups-val");
        if (groupsVal) groupsVal.innerText = `${allGroupsData.length} Group${allGroupsData.length === 1 ? '' : 's'}`;

        let groupsBadge = document.getElementById("groups-count-badge");
        if (groupsBadge) groupsBadge.innerText = allGroupsData.length;

        let tabsList = document.getElementById("group-tabs-list");
        if (!tabsList) return;

        if (allGroupsData.length === 0) {
            tabsList.innerHTML = `
                <div class="text-xs text-slate-400 py-1 italic">No groups in this tournament yet. Click "+ Add Group" to create one.</div>
            `;
            let groupContainer = document.getElementById("group-active-container");
            if (groupContainer) {
                groupContainer.innerHTML = `
                    <div class="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                        <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-3">📂</div>
                        <h4 class="font-bold text-slate-800 text-base">No Groups Created Yet</h4>
                        <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Create group stages (e.g. Group A, Pool 1) and assign competing teams to generate points tables.</p>
                        <button onclick="openCreateGroupModal()" class="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer">
                            + Create Group
                        </button>
                    </div>
                `;
            }
            selectedGroupId = null;
            return;
        }

        // Restore active container HTML if previously emptied
        let groupContainer = document.getElementById("group-active-container");
        if (groupContainer && !document.getElementById("points-table-tbody")) {
            groupContainer.innerHTML = `
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-3">
                            <h2 id="active-group-name" class="heading-font text-2xl font-black text-slate-900">Group</h2>
                            <span id="active-group-teams-count" class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">0 Teams Assigned</span>
                        </div>
                        <div id="active-group-teams-chips" class="flex flex-wrap items-center gap-2 mt-2"></div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button onclick="openAssignTeamsModal()" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer">
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                            <span>Assign Teams</span>
                        </button>
                        <button onclick="openRenameGroupModal()" title="Rename Group" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button onclick="confirmDeleteGroup()" title="Delete Group" class="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                        </button>
                    </div>
                </div>
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div class="flex items-center gap-2">
                            <span class="text-base font-bold text-slate-800 heading-font">Official Points Table</span>
                            <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">ICC NRR System</span>
                        </div>
                        <div class="flex items-center gap-3 text-xs text-slate-500">
                            <span class="flex items-center gap-1 font-medium"><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Win = 2 Pts</span>
                            <span class="flex items-center gap-1 font-medium"><span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Tie / NR = 1 Pt</span>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 select-none">
                                    <th class="py-3.5 px-4 w-16 text-center">Rank</th>
                                    <th class="py-3.5 px-4">Team</th>
                                    <th class="py-3.5 px-3 text-center" title="Played">P</th>
                                    <th class="py-3.5 px-3 text-center text-emerald-700" title="Won">W</th>
                                    <th class="py-3.5 px-3 text-center text-rose-600" title="Lost">L</th>
                                    <th class="py-3.5 px-3 text-center" title="No Result">NR</th>
                                    <th class="py-3.5 px-4 text-center font-extrabold text-slate-900 bg-slate-100/60" title="Total Points">Pts</th>
                                    <th class="py-3.5 px-4 text-center font-extrabold text-slate-800" title="Net Run Rate">NRR</th>
                                    <th class="py-3.5 px-4 text-right text-slate-400 font-mono text-[10px] hidden md:table-cell">Runs / Overs (Scored vs Conceded)</th>
                                </tr>
                            </thead>
                            <tbody id="points-table-tbody" class="divide-y divide-slate-100"></tbody>
                        </table>
                    </div>
                    <div class="px-6 py-3 bg-slate-50 border-t border-slate-200/80 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-1.5">
                            <span class="font-bold text-slate-700">Sorting Order:</span>
                            <span>Points DESC → Wins DESC → NRR DESC.</span>
                        </div>
                        <div>
                            <span class="font-bold text-slate-700">All-Out Rule Active:</span> If bowled out, overs faced is computed as the full match overs quota.
                        </div>
                    </div>
                </div>
            `;
        }

        if (!selectedGroupId || !allGroupsData.some(g => g.id === selectedGroupId)) {
            selectedGroupId = allGroupsData[0].id;
        }

        renderGroupTabsList();
        await window.onGroupSelected(selectedGroupId);

    } catch (err) {
        console.error("Error loading groups for tournament:", err);
        showToast("Error loading groups: " + err.message, "error");
    }
};

function renderGroupTabsList() {
    let tabsList = document.getElementById("group-tabs-list");
    if (!tabsList) return;

    tabsList.innerHTML = allGroupsData.map(g => {
        let isSel = (g.id === selectedGroupId);
        let activeClasses = isSel 
            ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20 border-emerald-600" 
            : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold border-slate-200";
        let count = g.team_count || (g.teams ? g.teams.length : 0);
        return `
            <button onclick="onGroupSelected('${g.id}')" class="px-4 py-2 rounded-xl text-xs border transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${activeClasses}">
                <span>${escapeHtml(g.name)}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${isSel ? 'bg-white/20 text-white font-bold' : 'bg-slate-100 text-slate-500'}">${count}</span>
            </button>
        `;
    }).join("") + `
        <button onclick="openCreateGroupModal()" class="px-3 py-2 rounded-xl text-xs border border-dashed border-slate-300 text-slate-500 hover:text-emerald-700 hover:border-emerald-500 transition-all whitespace-nowrap flex items-center gap-1 font-bold cursor-pointer">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            <span>Add Group</span>
        </button>
    `;
}

window.onGroupSelected = async function(groupId) {
    if (!groupId) return;
    selectedGroupId = groupId;
    renderGroupTabsList();

    let group = allGroupsData.find(g => g.id === groupId);
    if (!group) return;

    let groupNameEl = document.getElementById("active-group-name");
    if (groupNameEl) groupNameEl.innerText = group.name;

    let teamsCountEl = document.getElementById("active-group-teams-count");
    let count = group.team_count || (group.teams ? group.teams.length : 0);
    if (teamsCountEl) teamsCountEl.innerText = `${count} Team${count === 1 ? '' : 's'} Assigned`;

    let chipsEl = document.getElementById("active-group-teams-chips");
    if (chipsEl) {
        if (!group.team_details || group.team_details.length === 0) {
            chipsEl.innerHTML = `<span class="text-xs text-slate-400 italic">No teams assigned yet. Click "Assign Teams" to select clubs.</span>`;
        } else {
            chipsEl.innerHTML = group.team_details.map(td => {
                let logoHtml = td.logo
                    ? `<img src="${td.logo}" class="w-4 h-4 object-contain rounded-full bg-white">`
                    : `<span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${td.theme_color || '#059669'}"></span>`;
                return `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                        ${logoHtml}
                        <span>${escapeHtml(td.name)}</span>
                    </span>
                `;
            }).join("");
        }
    }

    let tbody = document.getElementById("points-table-tbody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="py-8 text-center text-slate-400">
                    <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span class="text-xs font-semibold">Calculating points and Net Run Rate...</span>
                </td>
            </tr>
        `;
    }

    try {
        let standings = await TournamentAPI.getGroupStandings(groupId);
        currentStandingsData = standings || [];
        window.renderPointsTable(currentStandingsData, group);
    } catch (err) {
        console.error("Error fetching standings:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-red-500 text-xs">Failed to calculate standings: ${escapeHtml(err.message)}</td></tr>`;
        }
    }
};

window.renderPointsTable = function(standings, group) {
    let tbody = document.getElementById("points-table-tbody");
    if (!tbody) return;

    if (!standings || standings.length === 0) {
        if (group && group.team_details && group.team_details.length > 0) {
            // Render default zeroed rows for assigned teams
            standings = group.team_details.map((t, idx) => ({
                rank: idx + 1,
                team_id: t.id,
                team_name: t.name,
                team_logo: t.logo,
                team_color: t.theme_color,
                played: 0,
                won: 0,
                lost: 0,
                tied: 0,
                no_result: 0,
                points: 0,
                nrr: 0.0,
                nrr_formatted: "0.000",
                runs_scored: 0,
                overs_faced_display: 0.0,
                runs_conceded: 0,
                overs_bowled_display: 0.0
            }));
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="py-12 text-center text-slate-400">
                        <div class="text-3xl mb-2">🏏</div>
                        <p class="font-bold text-slate-700 text-sm">No Teams in This Group</p>
                        <p class="text-xs text-slate-400 mt-1">Click "Assign Teams" above to select clubs and generate the points table.</p>
                    </td>
                </tr>
            `;
            return;
        }
    }

    tbody.innerHTML = standings.map(s => {
        let rankBadge = "";
        if (s.rank === 1) {
            rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs border border-amber-300 shadow-sm" title="1st Place">🥇 1</span>`;
        } else if (s.rank === 2) {
            rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-800 font-extrabold text-xs border border-slate-300 shadow-sm" title="2nd Place">🥈 2</span>`;
        } else if (s.rank === 3) {
            rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/10 text-amber-900 font-extrabold text-xs border border-amber-600/30 shadow-sm" title="3rd Place">🥉 3</span>`;
        } else {
            rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 text-slate-600 font-bold text-xs border border-slate-200">${s.rank}</span>`;
        }

        let logoHtml = s.team_logo
            ? `<img src="${s.team_logo}" class="w-8 h-8 rounded-xl object-contain bg-white p-0.5 border border-slate-200 shadow-sm">`
            : `<div class="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-sm" style="background-color: ${s.team_color || '#0f547c'}">
                 ${escapeHtml(formatInitials(s.team_name))}
               </div>`;

        let nrrPillClass = "bg-slate-100 text-slate-600 border-slate-200";
        if (s.nrr > 0) {
            nrrPillClass = "bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold";
        } else if (s.nrr < 0) {
            nrrPillClass = "bg-rose-50 text-rose-800 border-rose-200 font-extrabold";
        }

        let scoredText = `${s.runs_scored || 0} (${s.overs_faced_display || 0} ov)`;
        let concededText = `${s.runs_conceded || 0} (${s.overs_bowled_display || 0} ov)`;

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3 px-4 text-center font-bold">${rankBadge}</td>
                <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                        ${logoHtml}
                        <div>
                            <div class="font-extrabold text-slate-900 text-sm">${escapeHtml(s.team_name)}</div>
                            <div class="text-[10px] text-slate-400 font-medium md:hidden">Scored: ${scoredText} • Conceded: ${concededText}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-3 text-center font-bold text-slate-700">${s.played || 0}</td>
                <td class="py-3 px-3 text-center font-bold text-emerald-700">${s.won || 0}</td>
                <td class="py-3 px-3 text-center font-bold text-rose-600">${s.lost || 0}</td>
                <td class="py-3 px-3 text-center font-bold text-slate-500">${s.no_result || 0}</td>
                <td class="py-3 px-4 text-center bg-slate-50/60">
                    <span class="inline-block px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-900 font-black text-sm border border-emerald-500/20">${s.points || 0}</span>
                </td>
                <td class="py-3 px-4 text-center">
                    <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono border ${nrrPillClass}">${s.nrr_formatted || '0.000'}</span>
                </td>
                <td class="py-3 px-4 text-right font-mono text-[11px] text-slate-500 hidden md:table-cell">
                    <span>${scoredText}</span>
                    <span class="text-slate-300 mx-1">/</span>
                    <span>${concededText}</span>
                </td>
            </tr>
        `;
    }).join("");
};

// ---------------------------------------------------------------------------
// Tournament & Group Modals
// ---------------------------------------------------------------------------

window.openCreateTournamentModal = function() {
    let currentYear = new Date().getFullYear();
    let html = `
        <div class="p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">🏆</div>
                <div>
                    <div class="text-sm font-bold text-white">Create New Tournament</div>
                    <div class="text-[11px] text-emerald-200 font-normal">Championship league configuration</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-xl cursor-pointer">&times;</button>
        </div>
        
        <form onsubmit="submitCreateTournament(event)" class="p-6 bg-slate-50 flex flex-col gap-4">
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tournament Name *</label>
                <input id="create-tourn-name" type="text" required placeholder="e.g. Premier Cricket League, T20 World Trophy" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Season / Year</label>
                    <input id="create-tourn-season" type="text" value="${currentYear}" placeholder="e.g. 2026, Summer 2026" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Max Overs Quota *</label>
                    <input id="create-tourn-overs" type="number" value="20" min="1" max="100" required class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">
                </div>
            </div>

            <div class="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
                <svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <span>The maximum overs quota is used to calculate NRR and enforces the All-Out Rule when a team is bowled out early.</span>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all active:scale-98 cursor-pointer">Create Tournament</button>
            </div>
        </form>
    `;
    showModal(html, "w-[480px]");
};

window.submitCreateTournament = async function(e) {
    e.preventDefault();
    let name = document.getElementById("create-tourn-name").value.trim();
    let season = document.getElementById("create-tourn-season").value.trim();
    let overs = parseInt(document.getElementById("create-tourn-overs").value) || 20;

    if (!name) {
        showToast("Tournament name is required", "error");
        return;
    }

    try {
        let res = await TournamentAPI.createTournament(name, season, overs);
        showToast(`Tournament "${name}" created!`);
        closeModal();
        if (res && res.id) selectedTournamentId = res.id;
        await loadTournamentsView();
        await initSetup();
    } catch (err) {
        console.error("Error creating tournament:", err);
        showToast("Failed to create tournament: " + err.message, "error");
    }
};

window.openEditTournamentModal = function() {
    let t = allTournamentsData.find(x => x.id === selectedTournamentId);
    if (!t) return;

    let html = `
        <div class="p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">✏️</div>
                <div>
                    <div class="text-sm font-bold text-white">Edit Tournament</div>
                    <div class="text-[11px] text-emerald-200 font-normal">Modify tournament information</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-xl cursor-pointer">&times;</button>
        </div>
        
        <form onsubmit="submitEditTournament(event)" class="p-6 bg-slate-50 flex flex-col gap-4">
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tournament Name *</label>
                <input id="edit-tourn-name" type="text" required value="${escapeHtml(t.name)}" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Season / Year</label>
                    <input id="edit-tourn-season" type="text" value="${escapeHtml(t.season || '')}" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Max Overs Quota *</label>
                    <input id="edit-tourn-overs" type="number" value="${t.max_overs || 20}" min="1" max="100" required class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all active:scale-98 cursor-pointer">Save Changes</button>
            </div>
        </form>
    `;
    showModal(html, "w-[480px]");
};

window.submitEditTournament = async function(e) {
    e.preventDefault();
    let name = document.getElementById("edit-tourn-name").value.trim();
    let season = document.getElementById("edit-tourn-season").value.trim();
    let overs = parseInt(document.getElementById("edit-tourn-overs").value) || 20;

    try {
        await TournamentAPI.updateTournament(selectedTournamentId, name, season, overs);
        showToast("Tournament updated successfully!");
        closeModal();
        await loadTournamentsView();
        await initSetup();
    } catch (err) {
        console.error("Error updating tournament:", err);
        showToast("Failed to update tournament: " + err.message, "error");
    }
};

window.confirmDeleteTournament = function() {
    let t = allTournamentsData.find(x => x.id === selectedTournamentId);
    if (!t) return;

    let html = `
        <div class="p-5 bg-rose-600 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <span>⚠️</span>
                <span>Delete Tournament?</span>
            </div>
            <button onclick="closeModal()" class="text-white hover:text-slate-200 text-xl font-bold cursor-pointer">&times;</button>
        </div>
        <div class="p-6 flex flex-col gap-4">
            <p class="text-sm text-slate-600">
                Are you sure you want to delete <strong class="text-slate-900">${escapeHtml(t.name)}</strong>? All its groups and points tables will also be removed.
            </p>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer">Cancel</button>
                <button onclick="submitDeleteTournament('${t.id}')" class="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-98 cursor-pointer">Delete Tournament</button>
            </div>
        </div>
    `;
    showModal(html, "w-[440px]");
};

window.submitDeleteTournament = async function(tournId) {
    try {
        await TournamentAPI.deleteTournament(tournId);
        showToast("Tournament deleted!");
        closeModal();
        selectedTournamentId = null;
        await loadTournamentsView();
        await initSetup();
    } catch (err) {
        console.error("Error deleting tournament:", err);
        showToast("Failed to delete tournament: " + err.message, "error");
    }
};

window.openCreateGroupModal = function() {
    if (allTournamentsData.length === 0) {
        showToast("Please create a tournament first", "info");
        openCreateTournamentModal();
        return;
    }

    let tournOptions = allTournamentsData.map(t => {
        let sel = (t.id === selectedTournamentId) ? "selected" : "";
        return `<option value="${t.id}" ${sel}>${escapeHtml(t.name)}</option>`;
    }).join("");

    let teamsList = allTeamsData || [];
    let teamsCheckboxes = teamsList.map(t => {
        return `
            <label class="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all">
                <input type="checkbox" name="create-group-team-cb" value="${t.id}" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500">
                <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${t.theme_color || '#059669'}"></span>
                <span class="text-xs font-bold text-slate-800">${escapeHtml(t.name)}</span>
            </label>
        `;
    }).join("");

    let html = `
        <div class="p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">📂</div>
                <div>
                    <div class="text-sm font-bold text-white">Create New Group</div>
                    <div class="text-[11px] text-emerald-200 font-normal">Add group stage or pool to tournament</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-xl cursor-pointer">&times;</button>
        </div>
        
        <form onsubmit="submitCreateGroup(event)" class="p-6 bg-slate-50 flex flex-col gap-4">
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Championship Tournament *</label>
                <select id="create-grp-tourn" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">
                    ${tournOptions}
                </select>
            </div>
            
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Group Name *</label>
                <input id="create-grp-name" type="text" required placeholder="e.g. Group A, Pool 1, Super 8s" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">
            </div>

            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">Assign Participating Teams (Optional)</label>
                    <span class="text-[11px] text-slate-400 font-semibold">${teamsList.length} clubs available</span>
                </div>
                <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-100 rounded-xl border border-slate-200">
                    ${teamsCheckboxes || '<div class="col-span-2 text-xs text-slate-400 text-center py-4">No clubs found. Create teams first in the Teams tab.</div>'}
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all active:scale-98 cursor-pointer">Create Group</button>
            </div>
        </form>
    `;
    showModal(html, "w-[500px]");
};

window.submitCreateGroup = async function(e) {
    e.preventDefault();
    let tournId = document.getElementById("create-grp-tourn").value;
    let name = document.getElementById("create-grp-name").value.trim();

    let checkedBoxes = document.querySelectorAll('input[name="create-group-team-cb"]:checked');
    let teamIds = Array.from(checkedBoxes).map(cb => cb.value);

    if (!name) {
        showToast("Group name is required", "error");
        return;
    }

    try {
        let res = await TournamentAPI.createGroup(tournId, name, teamIds);
        showToast(`Group "${name}" created!`);
        closeModal();
        selectedTournamentId = tournId;
        if (res && res.id) selectedGroupId = res.id;
        await loadTournamentsView();
        await initSetup();
    } catch (err) {
        console.error("Error creating group:", err);
        showToast("Failed to create group: " + err.message, "error");
    }
};

window.openRenameGroupModal = function() {
    let group = allGroupsData.find(g => g.id === selectedGroupId);
    if (!group) return;

    let html = `
        <div class="p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">✏️</div>
                <div>
                    <div class="text-sm font-bold text-white">Rename Group</div>
                    <div class="text-[11px] text-emerald-200 font-normal">Change group label</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-xl cursor-pointer">&times;</button>
        </div>
        
        <form onsubmit="submitRenameGroup(event)" class="p-6 bg-slate-50 flex flex-col gap-4">
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Group Name *</label>
                <input id="rename-grp-name" type="text" required value="${escapeHtml(group.name)}" class="border border-slate-300 rounded-xl p-3 w-full bg-white font-semibold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm">
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all active:scale-98 cursor-pointer">Save</button>
            </div>
        </form>
    `;
    showModal(html, "w-[440px]");
};

window.submitRenameGroup = async function(e) {
    e.preventDefault();
    let name = document.getElementById("rename-grp-name").value.trim();
    if (!name) return;

    try {
        await TournamentAPI.updateGroup(selectedGroupId, name);
        showToast("Group renamed!");
        closeModal();
        await onTournamentSelected(selectedTournamentId);
    } catch (err) {
        console.error("Error renaming group:", err);
        showToast("Failed to rename group: " + err.message, "error");
    }
};

window.confirmDeleteGroup = function() {
    let group = allGroupsData.find(g => g.id === selectedGroupId);
    if (!group) return;

    let html = `
        <div class="p-5 bg-rose-600 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2">
                <span>⚠️</span>
                <span>Delete Group?</span>
            </div>
            <button onclick="closeModal()" class="text-white hover:text-slate-200 text-xl font-bold cursor-pointer">&times;</button>
        </div>
        <div class="p-6 flex flex-col gap-4">
            <p class="text-sm text-slate-600">
                Are you sure you want to delete <strong class="text-slate-900">${escapeHtml(group.name)}</strong>? All points table standings associated with this group will be removed.
            </p>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer">Cancel</button>
                <button onclick="submitDeleteGroup('${group.id}')" class="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-98 cursor-pointer">Delete Group</button>
            </div>
        </div>
    `;
    showModal(html, "w-[440px]");
};

window.submitDeleteGroup = async function(groupId) {
    try {
        await TournamentAPI.deleteGroup(groupId);
        showToast("Group deleted!");
        closeModal();
        selectedGroupId = null;
        await onTournamentSelected(selectedTournamentId);
    } catch (err) {
        console.error("Error deleting group:", err);
        showToast("Failed to delete group: " + err.message, "error");
    }
};

window.openAssignTeamsModal = function() {
    let group = allGroupsData.find(g => g.id === selectedGroupId);
    if (!group) return;

    let groupTeamIds = group.teams || [];
    let teamsList = allTeamsData || [];

    let checkboxesHtml = teamsList.map(t => {
        let isChecked = groupTeamIds.includes(t.id);
        let logoHtml = t.logo
            ? `<img src="${t.logo}" class="w-8 h-8 rounded-lg object-contain bg-white p-0.5 border border-slate-200">`
            : `<div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white" style="background-color: ${t.theme_color || '#059669'}">${escapeHtml(formatInitials(t.name))}</div>`;

        return `
            <label class="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all">
                <div class="flex items-center gap-3">
                    <input type="checkbox" name="assign-team-cb" value="${t.id}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500">
                    ${logoHtml}
                    <div>
                        <div class="text-sm font-bold text-slate-900">${escapeHtml(t.name)}</div>
                        <div class="text-[11px] text-slate-400 font-medium">${t.player_count || 0} players registered</div>
                    </div>
                </div>
            </label>
        `;
    }).join("");

    let html = `
        <div class="p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white font-bold text-base flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">👥</div>
                <div>
                    <div class="text-sm font-bold text-white">Assign Teams to ${escapeHtml(group.name)}</div>
                    <div class="text-[11px] text-emerald-200 font-normal">Select which teams participate in this group</div>
                </div>
            </div>
            <button onclick="closeModal()" class="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center text-xl cursor-pointer">&times;</button>
        </div>
        
        <form onsubmit="submitAssignTeams(event)" class="p-6 bg-slate-50 flex flex-col gap-4">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-600">Available Squads (${teamsList.length})</span>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="document.querySelectorAll('input[name=assign-team-cb]').forEach(cb => cb.checked = true)" class="text-xs font-bold text-emerald-700 hover:underline cursor-pointer">Select All</button>
                    <span class="text-slate-300">•</span>
                    <button type="button" onclick="document.querySelectorAll('input[name=assign-team-cb]').forEach(cb => cb.checked = false)" class="text-xs font-bold text-slate-500 hover:underline cursor-pointer">Clear All</button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto p-1 bg-slate-100 rounded-2xl border border-slate-200">
                ${checkboxesHtml || '<div class="col-span-2 text-xs text-slate-400 text-center py-8">No teams available. Create teams in the Teams tab first.</div>'}
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all active:scale-98 cursor-pointer">Save Assignments</button>
            </div>
        </form>
    `;
    showModal(html, "w-[560px]");
};

window.submitAssignTeams = async function(e) {
    e.preventDefault();
    let checkedBoxes = document.querySelectorAll('input[name="assign-team-cb"]:checked');
    let teamIds = Array.from(checkedBoxes).map(cb => cb.value);

    try {
        await TournamentAPI.assignTeamsToGroup(selectedGroupId, teamIds);
        showToast("Teams assigned successfully!");
        closeModal();
        await onTournamentSelected(selectedTournamentId);
    } catch (err) {
        console.error("Error assigning teams:", err);
        showToast("Failed to assign teams: " + err.message, "error");
    }
};


// =========================================================================
// TOURNAMENT STATS & LEADERBOARDS
// =========================================================================

window.loadStatsView = async function() {
    try {
        let tourns = await TournamentAPI.getTournaments();
        let tournSelect = document.getElementById("stats-tournament-select");
        if (tournSelect) {
            let curVal = tournSelect.value;
            tournSelect.innerHTML = `<option value="">-- Select a Tournament --</option>`;
            (tourns || []).forEach(t => {
                let opt = document.createElement("option");
                opt.value = t.id;
                opt.text = `${t.name} (${t.season || 'N/A'})`;
                tournSelect.add(opt);
            });
            if (curVal) tournSelect.value = curVal;
            else if (tourns && tourns.length > 0) {
                tournSelect.value = tourns[0].id;
            }
        }
        await refreshLeaderboards();
    } catch(e) {
        console.error("Error loading stats view:", e);
    }
};

window.onStatsTournamentSelected = async function(val) {
    await refreshLeaderboards();
};

window.refreshLeaderboards = async function() {
    let tournSelect = document.getElementById("stats-tournament-select");
    let tournId = tournSelect ? tournSelect.value : null;
    
    if (!tournId) {
        // Clear tables
        let tbodies = ['stats-mvp', 'stats-top-scorers', 'stats-top-wickets', 'stats-highest-score', 'stats-most-6s', 'stats-most-4s', 'stats-best-figures'];
        tbodies.forEach(id => {
            let el = document.getElementById(id);
            if (el) el.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-400 text-xs italic">Select a tournament to view stats</td></tr>`;
        });
        return;
    }
    
    try {
        let res = await fetch(`${TOURNAMENT_API_BASE}/tournaments/${tournId}/leaderboards/`);
        if (!res.ok) throw new Error("Failed to fetch leaderboards");
        let data = await res.json();
        
        let fmtPlayerInfo = (p) => {
            let img = p.image ? `<img src="${p.image}" class="w-8 h-8 rounded-lg object-cover bg-slate-100">` : `<div class="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs">${p.name.charAt(0)}</div>`;
            return `<div class="flex items-center gap-2">
                        ${img}
                        <div>
                            <div class="font-bold text-xs text-slate-900">${escapeHtml(p.name)}</div>
                            <div class="text-[10px] text-slate-500">${escapeHtml(p.team || '')}</div>
                        </div>
                    </div>`;
        };
        
        // MVP
        let elMvp = document.getElementById("stats-mvp");
        if (elMvp) {
            elMvp.innerHTML = (data.mvp && data.mvp.length > 0) ? data.mvp.map((item, idx) => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-2.5 px-4 text-center font-bold text-slate-400">#${idx+1}</td>
                    <td class="py-2.5 px-4">${fmtPlayerInfo(item.player)}</td>
                    <td class="py-2.5 px-4 text-xs font-semibold text-slate-600">${escapeHtml(item.player.team || '')}</td>
                    <td class="py-2.5 px-4 text-right font-black text-amber-600">${item.value} pts</td>
                </tr>
            `).join("") : `<tr><td colspan="4" class="py-4 text-center text-slate-400 text-xs">No data yet</td></tr>`;
        }

        // Top Scorers
        let elTopScorers = document.getElementById("stats-top-scorers");
        if (elTopScorers) {
            elTopScorers.innerHTML = (data.batting.top_scorers && data.batting.top_scorers.length > 0) ? data.batting.top_scorers.map((item, idx) => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-2 px-4 w-10 text-center font-bold text-slate-400">#${idx+1}</td>
                    <td class="py-2 px-4">${fmtPlayerInfo(item.player)}</td>
                    <td class="py-2 px-4 text-right font-black text-slate-800">${item.value}</td>
                </tr>
            `).join("") : `<tr><td colspan="3" class="py-4 text-center text-slate-400 text-xs">No data yet</td></tr>`;
        }

        // Highest Score
        let elHighestScore = document.getElementById("stats-highest-score");
        if (elHighestScore) {
            elHighestScore.innerHTML = (data.batting.highest_score && data.batting.highest_score.length > 0) ? data.batting.highest_score.map((item, idx) => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-2 px-4 w-10 text-center font-bold text-slate-400">#${idx+1}</td>
                    <td class="py-2 px-4">${fmtPlayerInfo(item.player)}</td>
                    <td class="py-2 px-4 text-right font-black text-slate-800">${item.runs}${item.not_out ? '*' : ''} <span class="text-[10px] text-slate-500 font-normal">(${item.balls})</span></td>
                </tr>
            `).join("") : `<tr><td colspan="3" class="py-4 text-center text-slate-400 text-xs">No data yet</td></tr>`;
        }
        
        // Most 6s
        let elMost6s = document.getElementById("stats-most-6s");
        if (elMost6s) {
            elMost6s.innerHTML = (data.batting.most_6s && data.batting.most_6s.length > 0) ? data.batting.most_6s.map((item, idx) => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-2 px-4 w-10 text-center font-bold text-slate-400">#${idx+1}</td>
                    <td class="py-2 px-4">${fmtPlayerInfo(item.player)}</td>
                    <td class="py-2 px-4 text-right font-black text-emerald-600">${item.value}</td>
                </tr>
            `).join("") : `<tr><td colspan="3" class="py-4 text-center text-slate-400 text-xs">No data yet</td></tr>`;
        }

        // Most 4s
        let elMost4s = document.getElementById("stats-most-4s");
        if (elMost4s) {
            elMost4s.innerHTML = (data.batting.most_4s && data.batting.most_4s.length > 0) ? data.batting.most_4s.map((item, idx) => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-2 px-4 w-10 text-center font-bold text-slate-400">#${idx+1}</td>
                    <td class="py-2 px-4">${fmtPlayerInfo(item.player)}</td>
                    <td class="py-2 px-4 text-right font-black text-cyan-600">${item.value}</td>
                </tr>
            `).join("") : `<tr><td colspan="3" class="py-4 text-center text-slate-400 text-xs">No data yet</td></tr>`;
        }

        // Top Wickets
        let elTopWickets = document.getElementById("stats-top-wickets");
        if (elTopWickets) {
            elTopWickets.innerHTML = (data.bowling.top_wickets && data.bowling.top_wickets.length > 0) ? data.bowling.top_wickets.map((item, idx) => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-2 px-4 w-10 text-center font-bold text-slate-400">#${idx+1}</td>
                    <td class="py-2 px-4">${fmtPlayerInfo(item.player)}</td>
                    <td class="py-2 px-4 text-right font-black text-purple-700">${item.value}</td>
                </tr>
            `).join("") : `<tr><td colspan="3" class="py-4 text-center text-slate-400 text-xs">No data yet</td></tr>`;
        }

        // Best Figures
        let elBestFigures = document.getElementById("stats-best-figures");
        if (elBestFigures) {
            elBestFigures.innerHTML = (data.bowling.best_figures && data.bowling.best_figures.length > 0) ? data.bowling.best_figures.map((item, idx) => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-2 px-4 w-10 text-center font-bold text-slate-400">#${idx+1}</td>
                    <td class="py-2 px-4">${fmtPlayerInfo(item.player)}</td>
                    <td class="py-2 px-4 text-right font-black text-indigo-700">${item.wickets}/${item.runs} <span class="text-[10px] text-slate-500 font-normal">(${item.overs})</span></td>
                </tr>
            `).join("") : `<tr><td colspan="3" class="py-4 text-center text-slate-400 text-xs">No data yet</td></tr>`;
        }

    } catch(err) {
        console.error("Error fetching leaderboards:", err);
        showToast("Error loading leaderboards", "error");
    }
};




