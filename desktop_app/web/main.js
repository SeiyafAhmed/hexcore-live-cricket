let currentSidebarTab = 'scoreboard';
let allTeamsData = [];
let allPlayersData = [];

window.onerror = function(msg, url, line, col, error) {
    if(window.eel && eel.console_log) {
        eel.console_log(`Global Error: ${msg} at ${line}:${col}`)();
    }
    return false;
};

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
        
        if(teams.length > 0) {
            battingSelect.onchange();
            bowlingSelect.onchange();
        }
    } catch(e) {
        if(window.eel && eel.console_log) eel.console_log("Failed to load teams: " + e);
        alert("Error loading teams: " + e.message);
    }
}

async function startMatch() {
    let batId = document.getElementById("setup-batting-team").value;
    let bowlId = document.getElementById("setup-bowling-team").value;
    let batName = document.getElementById("setup-batting-team").options[document.getElementById("setup-batting-team").selectedIndex].text;
    let bowlName = document.getElementById("setup-bowling-team").options[document.getElementById("setup-bowling-team").selectedIndex].text;
    
    let striker = document.getElementById("setup-striker").value;
    let nonstriker = document.getElementById("setup-nonstriker").value;
    let bowler = document.getElementById("setup-bowler").value;
    let overs = document.getElementById("setup-overs").value;
    
    if(striker === nonstriker) {
        alert("Striker and Non-Striker cannot be the same!");
        return;
    }
    
    await eel.start_match(batId, batName, bowlId, bowlName, striker, nonstriker, bowler, overs)();
    
    document.getElementById("setup-screen").classList.add("hidden");
    document.getElementById("scoring-screen").classList.remove("hidden");
    
    refreshUI();
}

let teamCache = null;
let playerCache = {};

async function populateImageCaches(state) {
    if (!teamCache) teamCache = await eel.get_teams()();
    
    let batTeamId = state.batting_team_id;
    let bowlTeamId = state.bowling_team_id;
    if (!batTeamId || !bowlTeamId) {
        let batTeam = teamCache.find(t => t.name === (state.innings === 1 ? state.team_1_name : state.team_2_name));
        let bowlTeam = teamCache.find(t => t.name === (state.innings === 1 ? state.team_2_name : state.team_1_name));
        if (batTeam) batTeamId = batTeam.id;
        if (bowlTeam) bowlTeamId = bowlTeam.id;
    }
    
    if (batTeamId && !playerCache[batTeamId]) playerCache[batTeamId] = await eel.get_players(batTeamId)();
    if (bowlTeamId && !playerCache[bowlTeamId]) playerCache[bowlTeamId] = await eel.get_players(bowlTeamId)();
    
    return {
        teams: teamCache,
        players: [...(playerCache[batTeamId] || []), ...(playerCache[bowlTeamId] || [])]
    };
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
    
    if (state.innings !== lastSeenInnings) {
        activeScorecardTab = state.innings;
        lastSeenInnings = state.innings;
    }
    
    let swap = false;
    
    let leftName = state.team_1_name;
    let rightName = state.team_2_name;
    let leftScore = state.innings === 1 ? `${state.runs}/${state.wickets}` : (state.innings_1_stats ? `${state.innings_1_stats.runs}/${state.innings_1_stats.wickets}` : "0/0");
    let rightScore = state.innings === 1 ? "0/0" : `${state.runs}/${state.wickets}`;
    let leftOvers = state.innings === 1 ? `(${state.overs_completed}.${state.balls_this_over})` : (state.innings_1_stats ? `(${state.innings_1_stats.overs_completed}.${state.innings_1_stats.balls_this_over})` : "(0.0)");
    let rightOvers = state.innings === 1 ? "(0.0)" : `(${state.overs_completed}.${state.balls_this_over})`;
    
    // Header updates
    document.getElementById("team1-name").innerText = leftName;
    document.getElementById("team2-name").innerText = rightName;
    
    let tLeft = meta.teams.find(t => t.name === leftName);
    if (tLeft && tLeft.logo) {
        document.getElementById("team1-img").src = tLeft.logo;
        document.getElementById("team1-img").classList.remove("hidden");
        document.getElementById("team1-placeholder").classList.add("hidden");
    } else {
        document.getElementById("team1-img").classList.add("hidden");
        document.getElementById("team1-placeholder").classList.remove("hidden");
    }
    
    let tRight = meta.teams.find(t => t.name === rightName);
    if (tRight && tRight.logo) {
        document.getElementById("team2-img").src = tRight.logo;
        document.getElementById("team2-img").classList.remove("hidden");
        document.getElementById("team2-placeholder").classList.add("hidden");
    } else {
        document.getElementById("team2-img").classList.add("hidden");
        document.getElementById("team2-placeholder").classList.remove("hidden");
    }
    
    document.getElementById("team1-score").innerText = leftScore;
    document.getElementById("team2-score").innerText = rightScore;
    document.getElementById("team1-overs").innerText = leftOvers;
    document.getElementById("team2-overs").innerText = rightOvers;
    
    document.getElementById("match-max-overs").innerText = `${state.max_overs} Overs`;
    
    document.getElementById("tab-team1").innerText = state.team_1_name || "Team A";
    document.getElementById("tab-team2").innerText = state.team_2_name || "Team B";
    
    if (activeScorecardTab === 1) {
        document.getElementById("tab-team1").className = "flex-1 px-4 py-2 bg-[#258a43] text-white cursor-pointer select-none";
        document.getElementById("tab-team2").className = "flex-1 px-4 py-2 bg-[#c8c9cc] text-black text-right cursor-pointer select-none";
    } else {
        document.getElementById("tab-team1").className = "flex-1 px-4 py-2 bg-[#c8c9cc] text-black cursor-pointer select-none";
        document.getElementById("tab-team2").className = "flex-1 px-4 py-2 bg-[#258a43] text-white text-right cursor-pointer select-none";
    }
    
    // RR / Target
    let bpo = state.balls_per_over || 6;
    let total_balls = (state.overs_completed * bpo) + state.balls_this_over;
    let rr = total_balls > 0 ? (state.runs / total_balls * bpo) : 0;
    document.getElementById("lbl-rr").innerText = `RR: ${rr.toFixed(2)}`;
    
    if (state.target) {
        document.getElementById("lbl-target").innerText = `Target: ${state.target}`;
        let runs_needed = state.target - state.runs;
        let balls_rem = (state.max_overs * bpo) - total_balls;
        let rrr = balls_rem > 0 ? (runs_needed / balls_rem * bpo) : 0;
        document.getElementById("lbl-rrr").innerText = `RRR: ${rrr.toFixed(2)}`;
        
        document.getElementById("lbl-equation").innerText = `${state.team_2_name} need ${runs_needed} runs from ${balls_rem} balls`;
    } else {
        document.getElementById("lbl-equation").innerText = "";
    }
    
    let updatePlayerImg = (imgId, playerName) => {
        let p = meta.players.find(x => (x.full_name || x.first_name + " " + x.last_name) === playerName);
        let el = document.getElementById(imgId);
        if (p && p.image) {
            el.src = p.image;
            el.classList.remove("hidden");
        } else {
            el.classList.add("hidden");
        }
    };
    
    // Active players
    document.getElementById("striker-name").innerText = state.striker.name + " *";
    document.getElementById("striker-score").innerHTML = `${state.striker.runs} <span class="text-xs font-normal">(${state.striker.balls})</span>`;
    
    document.getElementById("nonstriker-name").innerText = state.non_striker.name;
    document.getElementById("nonstriker-score").innerHTML = `${state.non_striker.runs} <span class="text-xs font-normal">(${state.non_striker.balls})</span>`;
    
    document.getElementById("bowler-name").innerText = state.bowler.name;
    document.getElementById("bowler-score").innerHTML = `${state.bowler.runs}-${state.bowler.wickets} <span class="text-xs font-normal">(${state.bowler.overs})</span>`;
    
    let targetState = state;
    if (activeScorecardTab !== state.innings) {
        if (activeScorecardTab === 1 && state.innings_1_stats) {
            targetState = state.innings_1_stats;
        } else if (activeScorecardTab === 2 && state.innings === 1) {
            targetState = {
                batting_team_id: state.bowling_team_id,
                batsmen_stats: {},
                bowler_stats: {},
                extras: {wd:0, nb:0, b:0, lb:0},
                this_over: [],
                out_batsmen: []
            };
        }
    }
    
    // Extras
    let ex = targetState.extras || {wd:0, nb:0, b:0, lb:0};
    let exTotal = ex.wd + ex.nb + ex.b + ex.lb;
    document.getElementById("extras-summary").innerText = `${exTotal} (Wd ${ex.wd}, Nb ${ex.nb}, B ${ex.b}, LB ${ex.lb})`;
    
    // Recent Balls (only show for current active innings)
    let recentHTML = "";
    if (targetState.this_over) {
        targetState.this_over.forEach(b => {
            let bg = "bg-white text-black border-gray-400 border";
            if(b.includes("W") && !b.includes("Wd")) bg = "bg-[#cc0000] text-white";
            recentHTML += `<div class="min-w-[2rem] px-1 w-auto h-8 flex items-center justify-center font-bold rounded ${bg}">${b}</div>`;
        });
    }
    document.getElementById("recent-balls").innerHTML = recentHTML;
    
    // Batting Table
    let batHTML = "";
    if (targetState.batsmen_stats) {
        Object.keys(targetState.batsmen_stats).forEach(name => {
            let p = targetState.batsmen_stats[name];
            let sr = p.balls > 0 ? (p.runs / p.balls * 100).toFixed(2) : "0.00";
            let color = p.status !== "not out" ? "text-gray-500" : "text-black font-bold";
            
            let pMeta = meta.players.find(x => (x.full_name || x.first_name + " " + x.last_name) === name);
            let imgTag = (pMeta && pMeta.image) ? `<img src="${pMeta.image}" class="w-8 h-8 rounded-full object-cover border border-gray-300 bg-white">` : `<div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">${name.charAt(0)}</div>`;
            
            batHTML += `
                <tr class="border-b ${color}">
                    <td class="py-2">
                        <div class="flex items-center gap-2">
                            ${imgTag}
                            <div>
                                <div>${name}</div>
                                <div class="text-xs text-gray-500 font-normal">${p.status}</div>
                            </div>
                        </div>
                    </td>
                    <td class="text-center">${p.runs}</td>
                    <td class="text-center">${p.balls}</td>
                    <td class="text-center">${p["4s"] || 0}</td>
                    <td class="text-center">${p["6s"] || 0}</td>
                    <td class="text-center">${sr}</td>
                </tr>
            `;
        });
    }
    document.getElementById("batting-table-body").innerHTML = batHTML;
    
    // Yet to bat
    let batTeamId = targetState.batting_team_id;
    let yetToBatStr = "";
    if (batTeamId) {
        let allBatters = meta.players.filter(p => p.team === batTeamId);
        let outBatsmen = targetState.out_batsmen || [];
        let currentlyBatting = targetState.batsmen_stats ? Object.keys(targetState.batsmen_stats) : [];
        
        let yetToBatNames = allBatters
            .map(p => p.full_name || p.first_name + " " + p.last_name)
            .filter(name => !currentlyBatting.includes(name) && !outBatsmen.includes(name));
            
        yetToBatStr = yetToBatNames.join(" . ");
    }
    let elYetToBat = document.getElementById("yet-to-bat");
    if (elYetToBat) elYetToBat.innerText = yetToBatStr;
    
    // Bowling Table
    let bowlHTML = "";
    if (targetState.bowler_stats) {
        Object.keys(targetState.bowler_stats).forEach(name => {
            let p = targetState.bowler_stats[name];
            let overs = p.overs || 0;
            let b_full = Math.floor(overs);
            let b_rem = Math.round((overs - b_full) * 10);
            let t_balls = b_full * bpo + b_rem;
            let econ = t_balls > 0 ? (p.runs / t_balls * bpo).toFixed(2) : "0.00";
            
            let pMeta = meta.players.find(x => (x.full_name || x.first_name + " " + x.last_name) === name);
            let imgTag = (pMeta && pMeta.image) ? `<img src="${pMeta.image}" class="w-8 h-8 rounded-full object-cover border border-gray-300 bg-white">` : `<div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">${name.charAt(0)}</div>`;

            bowlHTML += `
                <tr class="border-b">
                    <td class="py-2 flex items-center gap-2">
                        ${imgTag}
                        <div>${name}</div>
                    </td>
                    <td class="text-center">${p.overs}</td>
                    <td class="text-center">${p.maidens || 0}</td>
                    <td class="text-center">${p.runs}</td>
                    <td class="text-center">${p.wickets}</td>
                    <td class="text-center">${econ}</td>
                </tr>
            `;
        });
    }
    document.getElementById("bowling-table-body").innerHTML = bowlHTML;
    
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
    
    let bowlPlayers = meta.players;
    if (state.bowling_team_id) {
        bowlPlayers = bowlPlayers.filter(p => p.team === state.bowling_team_id);
    }
    
    let options = bowlPlayers
        .map(p => p.full_name || p.first_name + " " + p.last_name)
        .filter(name => name !== prevBowler)
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
    let batPlayers = meta.players.filter(p => p.team === state.batting_team_id);
    let bowlPlayers = meta.players.filter(p => p.team === state.bowling_team_id);
    
    let batOptions = batPlayers.map(p => p.full_name || p.first_name + " " + p.last_name).map(name => `<option value="${name}">${name}</option>`).join("");
    let bowlOptions = bowlPlayers.map(p => p.full_name || p.first_name + " " + p.last_name).map(name => `<option value="${name}">${name}</option>`).join("");

    let html = `
        <div class="p-4 bg-green-600 text-white font-bold text-lg">Innings 1 Over! Target: ${target}</div>
        <div class="p-6 flex flex-col gap-4">
            <div>
                <label class="block font-bold mb-1">New Striker</label>
                <select id="i2-striker" class="border p-2 w-full">${batOptions}</select>
            </div>
            <div>
                <label class="block font-bold mb-1">New Non-Striker</label>
                <select id="i2-nonstriker" class="border p-2 w-full">${batOptions}</select>
            </div>
            <div>
                <label class="block font-bold mb-1">Opening Bowler</label>
                <select id="i2-bowler" class="border p-2 w-full">${bowlOptions}</select>
            </div>
            <div class="flex justify-end gap-2 mt-4">
                <button onclick="submitInnings2Setup()" class="px-4 py-2 bg-green-600 text-white rounded font-bold">Start 2nd Innings</button>
            </div>
        </div>
    `;
    showModal(html);
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
    
    document.getElementById("scoring-screen").classList.add("hidden");
    let summaryScreen = document.getElementById("match-summary-screen");
    summaryScreen.classList.remove("hidden");
    
    // Sort players
    function getTopBatsmen(statsObj) {
        if (!statsObj) return [];
        let list = Object.values(statsObj).sort((a,b) => b.runs - a.runs).slice(0, 3);
        while(list.length < 3) list.push({name: "", runs: "", balls: "", empty: true});
        return list;
    }
    function getTopBowlers(statsObj) {
        if (!statsObj) return [];
        let list = Object.values(statsObj).sort((a,b) => {
            if (b.wickets !== a.wickets) return b.wickets - a.wickets;
            return a.runs - b.runs;
        }).slice(0, 3);
        while(list.length < 3) list.push({name: "", wickets: "", runs: "", overs: "", empty: true});
        return list;
    }
    
    let i1_bat = getTopBatsmen(state.innings_1_stats ? state.innings_1_stats.batsmen_stats : {});
    let i1_bowl = getTopBowlers(state.innings_1_stats ? state.innings_1_stats.bowler_stats : {});
    
    let i2_bat = getTopBatsmen(state.batsmen_stats);
    let i2_bowl = getTopBowlers(state.bowler_stats);
    
    let t1 = meta.teams.find(t => t.name === state.team_1_name);
    let t2 = meta.teams.find(t => t.name === state.team_2_name);
    
    let i1_score = state.innings_1_stats ? `${state.innings_1_stats.runs}/${state.innings_1_stats.wickets}` : "0/0";
    let i1_overs = state.innings_1_stats ? `${state.innings_1_stats.overs_completed}.${state.innings_1_stats.balls_this_over} overs` : "0 overs";
    
    let i2_score = `${state.runs}/${state.wickets}`;
    let i2_overs = `${state.overs_completed}.${state.balls_this_over} overs`;
    
    let result = "";
    if (state.runs >= state.target) {
        result = `${state.team_2_name.toUpperCase()} WON BY ${10 - state.wickets} WICKETS`;
    } else if (state.runs < state.target - 1) {
        result = `${state.team_1_name.toUpperCase()} WON BY ${(state.target - 1) - state.runs} RUNS`;
    } else {
        result = `MATCH TIED`;
    }
    
    function renderPlayerRow(p, isBat) {
        if (p.empty) return `<div class="h-8 bg-gray-300 w-full rounded"></div>`;
        if (isBat) {
            return `<div class="h-8 bg-gray-300 w-full rounded px-4 flex justify-between items-center font-bold">
                        <div>${p.name}</div>
                        <div>${p.runs} <span class="text-xs font-normal">(${p.balls})</span></div>
                    </div>`;
        } else {
            return `<div class="h-8 bg-gray-300 w-full rounded px-4 flex justify-between items-center font-bold">
                        <div>${p.name}</div>
                        <div>${p.wickets} - ${p.runs} <span class="text-xs font-normal">(${p.overs})</span></div>
                    </div>`;
        }
    }
    
    let html = `
        <div class="w-full text-center py-6 relative">
            <h1 class="text-4xl font-black uppercase tracking-wider">MATCH SUMMARY</h1>
            <button onclick="startNewMatch()" class="absolute right-8 top-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-98">New Match</button>
        </div>
        
        <div class="max-w-5xl mx-auto w-full px-8 flex flex-col gap-6">
            
            <!-- Innings 1 -->
            <div class="relative">
                <div class="absolute left-0 top-0 w-24 h-24 bg-gray-300 rounded-xl border-4 border-black z-10 flex items-center justify-center overflow-hidden">
                    ${t1 && t1.logo ? `<img src="${t1.logo}" class="w-full h-full object-contain bg-white">` : ''}
                </div>
                <div class="ml-20 mt-4 flex">
                    <div class="bg-[#0a361e] text-white flex-1 h-12 rounded-l flex items-center pl-10 pr-4 justify-between">
                        <div class="font-bold text-xl">${state.team_1_name}</div>
                        <div class="text-lg">${i1_overs}</div>
                    </div>
                    <div class="bg-[#f3a918] text-black font-black text-2xl h-12 flex items-center justify-center rounded-r w-36" style="clip-path: polygon(12% 0, 100% 0, 100% 100%, 0% 100%); padding-left: 16px;">
                        ${i1_score}
                    </div>
                </div>
                
                <div class="ml-24 mt-4 grid grid-cols-2 gap-8">
                    <div class="flex flex-col gap-2">
                        ${i1_bat.map(p => renderPlayerRow(p, true)).join("")}
                    </div>
                    <div class="flex flex-col gap-2">
                        ${i1_bowl.map(p => renderPlayerRow(p, false)).join("")}
                    </div>
                </div>
            </div>
            
            <!-- Innings 2 -->
            <div class="relative mt-4">
                <div class="absolute left-0 top-0 w-24 h-24 bg-gray-300 rounded-xl border-4 border-black z-10 flex items-center justify-center overflow-hidden">
                    ${t2 && t2.logo ? `<img src="${t2.logo}" class="w-full h-full object-contain bg-white">` : ''}
                </div>
                <div class="ml-20 mt-4 flex">
                    <div class="bg-[#0a361e] text-white flex-1 h-12 rounded-l flex items-center pl-10 pr-4 justify-between">
                        <div class="font-bold text-xl">${state.team_2_name}</div>
                        <div class="text-lg">${i2_overs}</div>
                    </div>
                    <div class="bg-[#f3a918] text-black font-black text-2xl h-12 flex items-center justify-center rounded-r w-36" style="clip-path: polygon(12% 0, 100% 0, 100% 100%, 0% 100%); padding-left: 16px;">
                        ${i2_score}
                    </div>
                </div>
                
                <div class="ml-24 mt-4 grid grid-cols-2 gap-8">
                    <div class="flex flex-col gap-2">
                        ${i2_bat.map(p => renderPlayerRow(p, true)).join("")}
                    </div>
                    <div class="flex flex-col gap-2">
                        ${i2_bowl.map(p => renderPlayerRow(p, false)).join("")}
                    </div>
                </div>
            </div>
            
        </div>
        
        <!-- Bottom Bar -->
        <div class="absolute bottom-0 left-0 w-full h-16 bg-[#0a361e] flex items-center justify-center text-white font-bold text-xl">
            ${result}
        </div>
    `;
    
    summaryScreen.innerHTML = html;
}

window.startNewMatch = function() {
    document.getElementById("match-summary-screen").classList.add("hidden");
    document.getElementById("scoring-screen").classList.add("hidden");
    document.getElementById("setup-screen").classList.remove("hidden");
    initSetup();
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
    if (batTeamId) batPlayers = await eel.get_players(batTeamId)();
    if (bowlTeamId) bowlPlayers = await eel.get_players(bowlTeamId)();

    let outBatsmen = state.out_batsmen || [];
    let batOptions = batPlayers
        .map(p => p.full_name || p.first_name + " " + p.last_name)
        .filter(name => name !== strikerName && name !== nonStrikerName && !outBatsmen.includes(name))
        .map(name => `<option value="${name}">${name}</option>`)
        .join("");
        
    let updateFielderDropdown = (method) => {
        let wkName = "";
        return bowlPlayers
            .filter(p => {
                let name = p.full_name || p.first_name + " " + p.last_name;
                if (p.role === 'WK') wkName = name;
                if (method === 'Stumped' && name === (state.bowler ? state.bowler.name : "")) return false;
                return true;
            })
            .map(p => {
                let name = p.full_name || p.first_name + " " + p.last_name;
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
    if (type === '5678' || type === 'bonus' || type === 'More') {
        alert("Advanced scoring coming soon.");
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
// SIDEBAR NAVIGATION & BADGES
// =========================================================================

window.switchSidebarTab = function(tabName) {
    currentSidebarTab = tabName;
    
    // Update nav button styling
    ['scoreboard', 'teams', 'players'].forEach(t => {
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

// Initial setup
initSetup();

