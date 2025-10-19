/**
 * Integration Tests for Storage Service with Append Log
 * Run with: node tests/storage-integration.test.js
 */

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    updatePlayerStats,
    getPlayerStats,
    loadPlayers,
    saveGameState,
    clearGameState,
    loadGameState
} from '../services/storage.js';
import { rebuildStateFromLog } from '../services/append-log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Clean up test files
 */
async function cleanup() {
    try {
        const logsDir = path.join(TEST_DATA_DIR, 'logs');
        const files = await fs.readdir(logsDir);
        for (const file of files) {
            if (file.includes('test') || file.includes('player') || file.includes('game')) {
                await fs.unlink(path.join(logsDir, file));
            }
        }
    } catch (error) {
        // Directory might not exist yet
    }
}

/**
 * Test suite runner
 */
async function runTests() {
    console.log('🧪 Running Storage Integration Tests\n');
    
    let passed = 0;
    let failed = 0;
    
    const tests = [
        testProgressivePlayerUpdates,
        testGameStatePersistence,
        testTombstoneRecords,
        testCrashRecovery,
        testMultipleUpdates
    ];
    
    for (const test of tests) {
        try {
            await cleanup();
            await test();
            console.log(`✅ ${test.name}`);
            passed++;
        } catch (error) {
            console.error(`❌ ${test.name}: ${error.message}`);
            console.error(error.stack);
            failed++;
        }
    }
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    // Cleanup after all tests
    await cleanup();
    
    return failed === 0;
}

/**
 * Test: Progressive player stats updates
 */
async function testProgressivePlayerUpdates() {
    const userId = 'test-user-1';
    const username = 'TestUser';
    
    // Update player stats progressively
    await updatePlayerStats(userId, username, 100, false);
    await updatePlayerStats(userId, username, 200, true);
    await updatePlayerStats(userId, username, 150, false);
    
    // Verify final stats
    const stats = await getPlayerStats(userId);
    assert(stats.totalGames === 3, 'Should have 3 games');
    assert(stats.totalScore === 450, 'Total score should be 450');
    assert(stats.totalWins === 1, 'Should have 1 win');
    assert(stats.bestScore === 200, 'Best score should be 200');
    
    // Verify data exists in append log
    const logState = await rebuildStateFromLog('players');
    assert(logState[userId], 'User should exist in append log');
    assert(logState[userId].totalGames === 3, 'Log should have correct game count');
}

/**
 * Test: Game state persistence with progressive writes
 */
async function testGameStatePersistence() {
    const channelId = 'test-channel-1';
    const gameState1 = {
        round: 1,
        players: ['player1', 'player2'],
        startTime: Date.now()
    };
    
    // Save initial state
    await saveGameState(channelId, gameState1);
    
    // Update state progressively
    const gameState2 = {
        ...gameState1,
        round: 2
    };
    await saveGameState(channelId, gameState2);
    
    // Load and verify
    const loaded = await loadGameState(channelId);
    assert(loaded.round === 2, 'Round should be 2');
    assert(loaded.players.length === 2, 'Should have 2 players');
    
    // Verify data in append log
    const logState = await rebuildStateFromLog('game_state');
    assert(logState[channelId], 'Game state should exist in log');
    assert(logState[channelId].round === 2, 'Log should have latest round');
}

/**
 * Test: Tombstone records for deletes
 */
async function testTombstoneRecords() {
    const channelId = 'test-channel-2';
    const gameState = {
        round: 1,
        active: true
    };
    
    // Create game state
    await saveGameState(channelId, gameState);
    
    // Verify it exists
    let loaded = await loadGameState(channelId);
    assert(loaded !== null, 'Game state should exist');
    
    // Clear game state (should create tombstone)
    await clearGameState(channelId);
    
    // Verify it's deleted
    loaded = await loadGameState(channelId);
    assert(loaded === null, 'Game state should be deleted');
    
    // Verify tombstone in log
    const logState = await rebuildStateFromLog('game_state');
    assert(!logState[channelId], 'Channel should not exist in rebuilt state');
}

/**
 * Test: Crash recovery scenario
 */
async function testCrashRecovery() {
    const userId = 'crash-test-user';
    const username = 'CrashTestUser';
    
    // Simulate multiple progressive writes before crash
    await updatePlayerStats(userId, username, 100, false);
    await updatePlayerStats(userId, username, 150, false);
    await updatePlayerStats(userId, username, 200, true);
    
    // Simulate crash - delete main file but keep log
    const playersFile = path.join(TEST_DATA_DIR, 'players.json');
    try {
        await fs.unlink(playersFile);
    } catch (error) {
        // File might not exist
    }
    
    // Recovery: rebuild from log
    const logState = await rebuildStateFromLog('players');
    assert(logState[userId], 'User should be recoverable from log');
    assert(logState[userId].totalGames === 3, 'Should have 3 games after recovery');
    assert(logState[userId].totalScore === 450, 'Should have correct total score');
    
    // Verify storage service can still load data
    const stats = await getPlayerStats(userId);
    assert(stats.totalGames === 3, 'Storage service should recover from log');
}

/**
 * Test: Multiple concurrent-style updates
 */
async function testMultipleUpdates() {
    // Simulate multiple players updating in sequence
    const updates = [
        { userId: 'player1', username: 'Player1', score: 100, isWinner: false },
        { userId: 'player2', username: 'Player2', score: 150, isWinner: true },
        { userId: 'player3', username: 'Player3', score: 120, isWinner: false },
        { userId: 'player1', username: 'Player1', score: 200, isWinner: true },
    ];
    
    for (const update of updates) {
        await updatePlayerStats(update.userId, update.username, update.score, update.isWinner);
    }
    
    // Verify all players
    const players = await loadPlayers();
    assert(Object.keys(players).length === 3, 'Should have 3 unique players');
    assert(players.player1.totalGames === 2, 'Player1 should have 2 games');
    assert(players.player2.totalGames === 1, 'Player2 should have 1 game');
    assert(players.player3.totalGames === 1, 'Player3 should have 1 game');
    
    // Verify log consistency
    const logState = await rebuildStateFromLog('players');
    assert(Object.keys(logState).length === 3, 'Log should have 3 players');
    assert(logState.player1.totalGames === 2, 'Player1 games should match');
}

// Run tests
runTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
