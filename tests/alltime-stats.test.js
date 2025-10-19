/**
 * Integration Tests for All-Time Statistics Features
 * Run with: node tests/alltime-stats.test.js
 */

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    updatePlayerStats,
    getPlayerStats,
    getLeaderboard,
    loadPlayers
} from '../services/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Clean up test files
 */
async function cleanup() {
    try {
        // Clear players file for clean test
        const playersFile = path.join(TEST_DATA_DIR, 'players.json');
        await fs.writeFile(playersFile, '{}', 'utf8');
        
        // Clear logs
        const logsDir = path.join(TEST_DATA_DIR, 'logs');
        const files = await fs.readdir(logsDir);
        for (const file of files) {
            if (file.includes('players')) {
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
    console.log('🧪 Running All-Time Statistics Tests\n');
    
    let passed = 0;
    let failed = 0;
    
    const tests = [
        testCorrectIncorrectAnswersTracking,
        testAccuracyRateCalculation,
        testLeaderboardSorting,
        testNewMetricsInHistory,
        testMigrationFromOldFormat
    ];
    
    for (const test of tests) {
        try {
            await cleanup();
            await test();
            console.log(`✅ ${test.name}`);
            passed++;
        } catch (error) {
            console.error(`❌ ${test.name}`);
            console.error(`   ${error.message}`);
            failed++;
        }
    }
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

/**
 * Test: Correct/Incorrect answers are properly tracked
 */
async function testCorrectIncorrectAnswersTracking() {
    // Player 1: 8 correct, 2 incorrect
    await updatePlayerStats('user1', 'Player1', 100, false, 8, 2);
    const stats1 = await getPlayerStats('user1');
    
    assert(stats1.totalCorrectAnswers === 8, 'Should have 8 correct answers');
    assert(stats1.totalIncorrectAnswers === 2, 'Should have 2 incorrect answers');
    assert(stats1.totalAnswers === 10, 'Should have 10 total answers');
    
    // Player 1 plays another game: 6 correct, 4 incorrect
    await updatePlayerStats('user1', 'Player1', 80, false, 6, 4);
    const stats2 = await getPlayerStats('user1');
    
    assert(stats2.totalCorrectAnswers === 14, 'Should have 14 total correct answers');
    assert(stats2.totalIncorrectAnswers === 6, 'Should have 6 total incorrect answers');
    assert(stats2.totalAnswers === 20, 'Should have 20 total answers');
}

/**
 * Test: Accuracy rate is calculated correctly
 */
async function testAccuracyRateCalculation() {
    // Player with perfect accuracy
    await updatePlayerStats('user2', 'Player2', 100, true, 10, 0);
    const perfectStats = await getPlayerStats('user2');
    assert(perfectStats.accuracyRate === 100, 'Perfect accuracy should be 100%');
    
    // Player with 80% accuracy
    await updatePlayerStats('user3', 'Player3', 90, false, 8, 2);
    const goodStats = await getPlayerStats('user3');
    assert(goodStats.accuracyRate === 80, 'Should have 80% accuracy');
    
    // Player with 50% accuracy
    await updatePlayerStats('user4', 'Player4', 70, false, 5, 5);
    const averageStats = await getPlayerStats('user4');
    assert(averageStats.accuracyRate === 50, 'Should have 50% accuracy');
    
    // Player with no answers
    await updatePlayerStats('user5', 'Player5', 0, false, 0, 0);
    const noAnswersStats = await getPlayerStats('user5');
    assert(noAnswersStats.accuracyRate === 0, 'Should have 0% accuracy when no answers');
}

/**
 * Test: Leaderboard sorting by different metrics
 */
async function testLeaderboardSorting() {
    // Create diverse player stats
    await updatePlayerStats('player1', 'HighScore', 500, true, 10, 0);
    await updatePlayerStats('player2', 'ManyWins', 300, true, 8, 2);
    await updatePlayerStats('player2', 'ManyWins', 300, true, 9, 1);
    await updatePlayerStats('player2', 'ManyWins', 350, true, 10, 0);
    await updatePlayerStats('player3', 'HighAccuracy', 200, false, 10, 0);
    await updatePlayerStats('player4', 'ManyGames', 150, false, 6, 4);
    await updatePlayerStats('player4', 'ManyGames', 160, false, 7, 3);
    await updatePlayerStats('player4', 'ManyGames', 140, false, 5, 5);
    await updatePlayerStats('player4', 'ManyGames', 155, false, 6, 4);
    
    // Test sorting by total score
    const scoreBoard = await getLeaderboard('totalScore', 10);
    assert(scoreBoard[0].username === 'ManyWins', 'ManyWins should have highest total score');
    
    // Test sorting by total wins
    const winsBoard = await getLeaderboard('totalWins', 10);
    assert(winsBoard[0].username === 'ManyWins', 'ManyWins should have most wins');
    assert(winsBoard[0].totalWins === 3, 'ManyWins should have 3 wins');
    
    // Test sorting by accuracy rate
    const accuracyBoard = await getLeaderboard('accuracyRate', 10);
    const topAccuracy = accuracyBoard[0];
    assert(topAccuracy.accuracyRate === 100, 'Top accuracy should be 100%');
    
    // Test sorting by games played
    const gamesBoard = await getLeaderboard('totalGames', 10);
    assert(gamesBoard[0].username === 'ManyGames', 'ManyGames should have most games');
    assert(gamesBoard[0].totalGames === 4, 'ManyGames should have 4 games');
    
    // Test sorting by correct answers
    const correctBoard = await getLeaderboard('totalCorrectAnswers', 10);
    assert(correctBoard[0].totalCorrectAnswers >= 24, 'Should have highest correct answers');
}

/**
 * Test: Game history includes new metrics
 */
async function testNewMetricsInHistory() {
    await updatePlayerStats('user6', 'Player6', 150, true, 9, 1);
    await updatePlayerStats('user6', 'Player6', 120, false, 7, 3);
    
    const stats = await getPlayerStats('user6');
    
    assert(stats.gamesHistory.length === 2, 'Should have 2 games in history');
    
    const game1 = stats.gamesHistory[0];
    assert(game1.correctAnswers === 9, 'First game should have 9 correct');
    assert(game1.incorrectAnswers === 1, 'First game should have 1 incorrect');
    assert(game1.isWinner === true, 'First game should be a win');
    
    const game2 = stats.gamesHistory[1];
    assert(game2.correctAnswers === 7, 'Second game should have 7 correct');
    assert(game2.incorrectAnswers === 3, 'Second game should have 3 incorrect');
    assert(game2.isWinner === false, 'Second game should not be a win');
}

/**
 * Test: Migration from old format without new metrics
 */
async function testMigrationFromOldFormat() {
    // Simulate old format player data (without new metrics)
    const oldFormatPlayer = {
        userId: 'oldUser',
        username: 'OldPlayer',
        totalGames: 5,
        totalWins: 2,
        totalScore: 450,
        averageScore: 90,
        bestScore: 120,
        gamesHistory: [
            { date: '2024-01-01T00:00:00.000Z', score: 100, isWinner: true },
            { date: '2024-01-02T00:00:00.000Z', score: 90, isWinner: false }
        ]
    };
    
    // Manually save old format
    const players = {};
    players['oldUser'] = oldFormatPlayer;
    const playersFile = path.join(TEST_DATA_DIR, 'players.json');
    await fs.writeFile(playersFile, JSON.stringify(players, null, 2), 'utf8');
    
    // Load and verify defaults are applied
    const stats = await getPlayerStats('oldUser');
    assert(stats.totalCorrectAnswers === 0, 'Should default to 0 correct answers');
    assert(stats.totalIncorrectAnswers === 0, 'Should default to 0 incorrect answers');
    assert(stats.totalAnswers === 0, 'Should default to 0 total answers');
    assert(stats.accuracyRate === 0, 'Should default to 0% accuracy');
    
    // Update with new game to verify migration works
    await updatePlayerStats('oldUser', 'OldPlayer', 95, false, 8, 2);
    const updatedStats = await getPlayerStats('oldUser');
    
    assert(updatedStats.totalGames === 6, 'Should have 6 games now');
    assert(updatedStats.totalCorrectAnswers === 8, 'Should have 8 correct answers');
    assert(updatedStats.totalIncorrectAnswers === 2, 'Should have 2 incorrect answers');
    assert(updatedStats.accuracyRate === 80, 'Should have 80% accuracy');
}

// Run tests
runTests();
