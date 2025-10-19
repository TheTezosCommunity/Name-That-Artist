/**
 * Local Storage Service
 * Manages JSON files for tokens, players, and game state
 * Now with progressive append-only log support for durability
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { appendLogEntry, rebuildStateFromLog, compactLog, OpType } from './append-log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

// File paths
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const GAME_STATE_FILE = path.join(DATA_DIR, 'game_state.json');

/**
 * Ensure data directory exists
 */
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

/**
 * Read JSON file
 * @param {string} filePath - Path to JSON file
 * @param {*} defaultValue - Default value if file doesn't exist
 * @returns {Promise<*>} Parsed JSON data
 */
async function readJSON(filePath, defaultValue = null) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return defaultValue;
        }
        throw error;
    }
}

/**
 * Write JSON file
 * @param {string} filePath - Path to JSON file
 * @param {*} data - Data to write
 */
async function writeJSON(filePath, data) {
    await ensureDataDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ===== TOKENS =====

/**
 * Save tokens to file with progressive append-only logging
 * @param {Array} tokens - Array of token objects
 * @param {Object} artistInfo - Optional artist info map (address -> info)
 */
export async function saveTokens(tokens, artistInfo = null) {
    const data = {
        lastUpdated: new Date().toISOString(),
        count: tokens.length,
        tokens: tokens
    };
    
    if (artistInfo) {
        data.artistInfo = artistInfo;
    }
    
    // Write to both append log (for durability) and main file (for compatibility)
    await appendLogEntry('tokens', {
        op: OpType.SET,
        data: data
    });
    
    await writeJSON(TOKENS_FILE, data);
}

/**
 * Load tokens from file with fallback to append log
 * @returns {Promise<Object|null>} Tokens data or null
 */
export async function loadTokens() {
    // Try loading from main file first
    const data = await readJSON(TOKENS_FILE, null);
    
    // If main file doesn't exist, try rebuilding from append log
    if (data === null) {
        try {
            const logState = await rebuildStateFromLog('tokens');
            if (Object.keys(logState).length > 0) {
                return logState;
            }
        } catch (error) {
            console.error('Failed to rebuild from log:', error);
        }
    }
    
    return data;
}

/**
 * Check if tokens need refresh (older than 24 hours)
 * @returns {Promise<boolean>} True if refresh needed
 */
export async function needsTokenRefresh() {
    const data = await loadTokens();
    if (!data || !data.lastUpdated) return true;
    
    const lastUpdate = new Date(data.lastUpdated);
    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceUpdate > 24;
}

// ===== PLAYERS =====

/**
 * Load all player data with fallback to append log
 * @returns {Promise<Object>} Player data keyed by user ID
 */
export async function loadPlayers() {
    // Try loading from main file first
    const data = await readJSON(PLAYERS_FILE, null);
    
    // If main file doesn't exist, try rebuilding from append log
    if (!data) {
        try {
            const logState = await rebuildStateFromLog('players');
            if (Object.keys(logState).length > 0) {
                return logState;
            }
        } catch (error) {
            console.error('Failed to rebuild from log:', error);
        }
        return {};
    }
    
    return data;
}

/**
 * Save player data with progressive append-only logging
 * @param {Object} players - Player data object
 */
export async function savePlayers(players) {
    // Write to append log for durability
    await appendLogEntry('players', {
        op: OpType.SET,
        data: players
    });
    
    await writeJSON(PLAYERS_FILE, players);
}

/**
 * Get player stats
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object>} Player stats
 */
export async function getPlayerStats(userId) {
    const players = await loadPlayers();
    return players[userId] || {
        userId,
        username: null,
        totalGames: 0,
        totalWins: 0,
        totalScore: 0,
        averageScore: 0,
        bestScore: 0,
        gamesHistory: []
    };
}

/**
 * Update player stats after a game with progressive writes
 * @param {string} userId - Discord user ID
 * @param {string} username - Discord username
 * @param {number} score - Score from the game
 * @param {boolean} isWinner - Whether player won
 */
export async function updatePlayerStats(userId, username, score, isWinner = false) {
    const players = await loadPlayers();
    const stats = players[userId] || {
        userId,
        username,
        totalGames: 0,
        totalWins: 0,
        totalScore: 0,
        averageScore: 0,
        bestScore: 0,
        gamesHistory: []
    };
    
    stats.username = username; // Update username if it changed
    stats.totalGames++;
    stats.totalScore += score;
    stats.averageScore = Math.round(stats.totalScore / stats.totalGames);
    stats.bestScore = Math.max(stats.bestScore, score);
    
    if (isWinner) {
        stats.totalWins++;
    }
    
    stats.gamesHistory.push({
        date: new Date().toISOString(),
        score,
        isWinner
    });
    
    // Keep only last 50 games
    if (stats.gamesHistory.length > 50) {
        stats.gamesHistory = stats.gamesHistory.slice(-50);
    }
    
    players[userId] = stats;
    
    // Progressive write: append individual player update to log immediately
    await appendLogEntry('players', {
        op: OpType.SET,
        key: userId,
        value: stats
    });
    
    await savePlayers(players);
    
    return stats;
}

/**
 * Get leaderboard
 * @param {string} sortBy - Sort field ('totalScore', 'totalWins', 'averageScore', 'bestScore')
 * @param {number} limit - Number of players to return
 * @returns {Promise<Array>} Sorted array of player stats
 */
export async function getLeaderboard(sortBy = 'totalScore', limit = 10) {
    const players = await loadPlayers();
    const playerArray = Object.values(players);
    
    playerArray.sort((a, b) => b[sortBy] - a[sortBy]);
    
    return playerArray.slice(0, limit);
}

// ===== GAME STATE =====

/**
 * Save current game state with progressive append-only logging
 * @param {string} channelId - Discord channel ID
 * @param {Object} state - Game state object
 */
export async function saveGameState(channelId, state) {
    const allStates = await readJSON(GAME_STATE_FILE, {});
    const updatedState = {
        ...state,
        lastUpdated: new Date().toISOString()
    };
    allStates[channelId] = updatedState;
    
    // Progressive write: append individual game state update immediately
    await appendLogEntry('game_state', {
        op: OpType.SET,
        key: channelId,
        value: updatedState
    });
    
    await writeJSON(GAME_STATE_FILE, allStates);
}

/**
 * Load game state for a channel
 * @param {string} channelId - Discord channel ID
 * @returns {Promise<Object|null>} Game state or null
 */
export async function loadGameState(channelId) {
    const allStates = await readJSON(GAME_STATE_FILE, {});
    return allStates[channelId] || null;
}

/**
 * Clear game state for a channel with tombstone record
 * @param {string} channelId - Discord channel ID
 */
export async function clearGameState(channelId) {
    const allStates = await readJSON(GAME_STATE_FILE, {});
    delete allStates[channelId];
    
    // Tombstone record: mark as deleted in append log
    await appendLogEntry('game_state', {
        op: OpType.DELETE,
        key: channelId
    });
    
    await writeJSON(GAME_STATE_FILE, allStates);
}

/**
 * Get all active game states with fallback to append log
 * @returns {Promise<Object>} All game states
 */
export async function getAllGameStates() {
    // Try loading from main file first
    const data = await readJSON(GAME_STATE_FILE, null);
    
    // If main file doesn't exist, try rebuilding from append log
    if (data === null) {
        try {
            const logState = await rebuildStateFromLog('game_state');
            if (Object.keys(logState).length > 0) {
                return logState;
            }
        } catch (error) {
            console.error('Failed to rebuild from log:', error);
        }
        return {};
    }
    
    return data;
}

/**
 * Manually trigger compaction for all logs
 * Can be called periodically or when needed
 */
export async function compactAllLogs() {
    console.log('🗜️ Starting manual compaction of all logs...');
    
    const logs = ['players', 'tokens', 'game_state'];
    for (const logName of logs) {
        try {
            await compactLog(logName);
            console.log(`✅ Compacted ${logName} log`);
        } catch (error) {
            console.error(`❌ Error compacting ${logName}:`, error);
        }
    }
    
    console.log('✅ Manual compaction complete');
}
