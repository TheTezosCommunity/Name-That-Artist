/**
 * Local Storage Service
 * Manages JSON files for tokens, players, and game state
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
 * Save tokens to file
 * @param {Array} tokens - Array of token objects
 */
export async function saveTokens(tokens) {
    await writeJSON(TOKENS_FILE, {
        lastUpdated: new Date().toISOString(),
        count: tokens.length,
        tokens: tokens
    });
}

/**
 * Load tokens from file
 * @returns {Promise<Object|null>} Tokens data or null
 */
export async function loadTokens() {
    return await readJSON(TOKENS_FILE, null);
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
 * Load all player data
 * @returns {Promise<Object>} Player data keyed by user ID
 */
export async function loadPlayers() {
    return await readJSON(PLAYERS_FILE, {});
}

/**
 * Save player data
 * @param {Object} players - Player data object
 */
export async function savePlayers(players) {
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
 * Update player stats after a game
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
 * Save current game state
 * @param {string} channelId - Discord channel ID
 * @param {Object} state - Game state object
 */
export async function saveGameState(channelId, state) {
    const allStates = await readJSON(GAME_STATE_FILE, {});
    allStates[channelId] = {
        ...state,
        lastUpdated: new Date().toISOString()
    };
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
 * Clear game state for a channel
 * @param {string} channelId - Discord channel ID
 */
export async function clearGameState(channelId) {
    const allStates = await readJSON(GAME_STATE_FILE, {});
    delete allStates[channelId];
    await writeJSON(GAME_STATE_FILE, allStates);
}

/**
 * Get all active game states
 * @returns {Promise<Object>} All game states
 */
export async function getAllGameStates() {
    return await readJSON(GAME_STATE_FILE, {});
}
