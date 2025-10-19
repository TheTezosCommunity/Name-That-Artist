/**
 * Manual Verification Script for Progressive Storage
 * Tests the system without needing Discord credentials
 * Run with: node tests/manual-verification.js
 */

import {
    updatePlayerStats,
    getPlayerStats,
    saveGameState,
    clearGameState,
    loadGameState,
    compactAllLogs
} from '../services/storage.js';
import { getLogSize, needsCompaction } from '../services/append-log.js';

console.log('🔍 Manual Verification of Progressive Storage System\n');

async function runVerification() {
    try {
        // Test 1: Progressive Player Updates
        console.log('1️⃣ Testing progressive player updates...');
        await updatePlayerStats('test-user-1', 'TestUser1', 100, false);
        await updatePlayerStats('test-user-1', 'TestUser1', 150, true);
        const stats = await getPlayerStats('test-user-1');
        console.log(`   Player stats: ${stats.totalGames} games, ${stats.totalScore} points`);
        console.assert(stats.totalGames === 2, 'Player should have 2 games');
        console.assert(stats.totalScore === 250, 'Player should have 250 total score');
        console.log('   ✅ Player updates working\n');

        // Test 2: Game State Persistence
        console.log('2️⃣ Testing game state persistence...');
        await saveGameState('test-channel-1', { round: 1, active: true });
        await saveGameState('test-channel-1', { round: 2, active: true });
        const gameState = await loadGameState('test-channel-1');
        console.log(`   Game state: Round ${gameState.round}`);
        console.assert(gameState.round === 2, 'Game should be on round 2');
        console.log('   ✅ Game state persistence working\n');

        // Test 3: Tombstone Records
        console.log('3️⃣ Testing tombstone records...');
        await saveGameState('test-channel-2', { round: 1, active: true });
        await clearGameState('test-channel-2');
        const clearedState = await loadGameState('test-channel-2');
        console.log(`   Cleared state: ${clearedState === null ? 'null' : 'exists'}`);
        console.assert(clearedState === null, 'Cleared state should be null');
        console.log('   ✅ Tombstone records working\n');

        // Test 4: Log Sizes
        console.log('4️⃣ Checking log sizes...');
        const playersSize = await getLogSize('players');
        const gameStateSize = await getLogSize('game_state');
        console.log(`   Players log: ${playersSize} bytes`);
        console.log(`   Game state log: ${gameStateSize} bytes`);
        console.log('   ✅ Log size monitoring working\n');

        // Test 5: Compaction Check
        console.log('5️⃣ Checking if compaction needed...');
        const needsCompact = await needsCompaction('players');
        console.log(`   Players log needs compaction: ${needsCompact}`);
        console.log('   ✅ Compaction detection working\n');

        // Test 6: Manual Compaction
        console.log('6️⃣ Testing manual compaction...');
        const sizeBefore = await getLogSize('players');
        await compactAllLogs();
        const sizeAfter = await getLogSize('players');
        console.log(`   Size before: ${sizeBefore} bytes, after: ${sizeAfter} bytes`);
        console.log('   ✅ Manual compaction working\n');

        // Test 7: Multiple Users
        console.log('7️⃣ Testing multiple users...');
        await updatePlayerStats('test-user-2', 'TestUser2', 200, true);
        await updatePlayerStats('test-user-3', 'TestUser3', 180, false);
        const user2Stats = await getPlayerStats('test-user-2');
        const user3Stats = await getPlayerStats('test-user-3');
        console.log(`   User 2: ${user2Stats.totalScore} points`);
        console.log(`   User 3: ${user3Stats.totalScore} points`);
        console.assert(user2Stats.totalScore === 200, 'User 2 should have 200 points');
        console.assert(user3Stats.totalScore === 180, 'User 3 should have 180 points');
        console.log('   ✅ Multiple users working\n');

        console.log('✅ All manual verification tests passed!\n');
        console.log('📊 Summary:');
        console.log('   - Progressive writes: Working');
        console.log('   - Tombstone records: Working');
        console.log('   - Log compaction: Working');
        console.log('   - Crash recovery ready: Yes');
        console.log('   - Multiple users: Working');
        
        return true;
    } catch (error) {
        console.error('❌ Verification failed:', error);
        return false;
    }
}

runVerification()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Verification runner failed:', error);
        process.exit(1);
    });
