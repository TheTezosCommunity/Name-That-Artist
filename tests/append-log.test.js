/**
 * Tests for Append-Only Log Storage
 * Run with: node tests/append-log.test.js
 */

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    appendLogEntry,
    readLogEntries,
    rebuildStateFromLog,
    compactLog,
    getLogSize,
    needsCompaction,
    OpType
} from '../services/append-log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DATA_DIR = path.join(__dirname, '..', 'data', 'logs');

// Test log name
const TEST_LOG = 'test_log';

/**
 * Clean up test files
 */
async function cleanup() {
    try {
        const files = await fs.readdir(TEST_DATA_DIR);
        for (const file of files) {
            if (file.startsWith(TEST_LOG)) {
                await fs.unlink(path.join(TEST_DATA_DIR, file));
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
    console.log('🧪 Running Append-Only Log Tests\n');
    
    let passed = 0;
    let failed = 0;
    
    const tests = [
        testAppendLogEntry,
        testReadLogEntries,
        testSetOperations,
        testDeleteOperations,
        testRebuildState,
        testCompaction,
        testCheckpoint,
        testLogSize,
        testCrashRecovery
    ];
    
    for (const test of tests) {
        try {
            await cleanup();
            await test();
            console.log(`✅ ${test.name}`);
            passed++;
        } catch (error) {
            console.error(`❌ ${test.name}: ${error.message}`);
            failed++;
        }
    }
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    // Cleanup after all tests
    await cleanup();
    
    return failed === 0;
}

/**
 * Test: Append log entry
 */
async function testAppendLogEntry() {
    await appendLogEntry(TEST_LOG, {
        op: OpType.SET,
        key: 'test1',
        value: 'value1'
    });
    
    const entries = await readLogEntries(TEST_LOG);
    assert(entries.length === 1, 'Should have 1 entry');
    assert(entries[0].op === OpType.SET, 'Entry should be SET operation');
    assert(entries[0].key === 'test1', 'Entry should have correct key');
    assert(entries[0].value === 'value1', 'Entry should have correct value');
    assert(entries[0].timestamp, 'Entry should have timestamp');
}

/**
 * Test: Read log entries
 */
async function testReadLogEntries() {
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'k1', value: 'v1' });
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'k2', value: 'v2' });
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'k3', value: 'v3' });
    
    const entries = await readLogEntries(TEST_LOG);
    assert(entries.length === 3, 'Should have 3 entries');
}

/**
 * Test: SET operations
 */
async function testSetOperations() {
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'user1', value: { score: 100 } });
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'user2', value: { score: 200 } });
    
    const state = await rebuildStateFromLog(TEST_LOG);
    assert(state.user1.score === 100, 'User1 score should be 100');
    assert(state.user2.score === 200, 'User2 score should be 200');
}

/**
 * Test: DELETE operations (tombstones)
 */
async function testDeleteOperations() {
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'user1', value: { score: 100 } });
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'user2', value: { score: 200 } });
    await appendLogEntry(TEST_LOG, { op: OpType.DELETE, key: 'user1' });
    
    const state = await rebuildStateFromLog(TEST_LOG);
    assert(!state.user1, 'User1 should be deleted');
    assert(state.user2.score === 200, 'User2 should still exist');
}

/**
 * Test: Rebuild state from log
 */
async function testRebuildState() {
    // Simulate progressive writes
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'score', value: 0 });
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'score', value: 10 });
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'score', value: 20 });
    
    const state = await rebuildStateFromLog(TEST_LOG);
    assert(state.score === 20, 'Score should be latest value (20)');
}

/**
 * Test: Log compaction
 */
async function testCompaction() {
    // Add multiple operations
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'user1', value: { score: 100 } });
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'user2', value: { score: 200 } });
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'user1', value: { score: 150 } });
    
    const beforeSize = await getLogSize(TEST_LOG);
    
    // Compact the log
    await compactLog(TEST_LOG);
    
    const afterSize = await getLogSize(TEST_LOG);
    
    // Verify state is preserved
    const state = await rebuildStateFromLog(TEST_LOG);
    assert(state.user1.score === 150, 'User1 score should be 150 after compaction');
    assert(state.user2.score === 200, 'User2 score should be 200 after compaction');
    
    // Log should be smaller after compaction (or at least not larger)
    assert(afterSize <= beforeSize, 'Compacted log should not be larger');
}

/**
 * Test: Checkpoint operations
 */
async function testCheckpoint() {
    // Add some data
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'user1', value: { score: 100 } });
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'user2', value: { score: 200 } });
    
    // Create checkpoint
    await compactLog(TEST_LOG);
    
    // Add more data after checkpoint
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'user3', value: { score: 300 } });
    
    const state = await rebuildStateFromLog(TEST_LOG);
    assert(Object.keys(state).length === 3, 'Should have 3 users');
    assert(state.user3.score === 300, 'User3 should be in state');
}

/**
 * Test: Log size calculation
 */
async function testLogSize() {
    const initialSize = await getLogSize(TEST_LOG);
    assert(initialSize === 0, 'Initial size should be 0');
    
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'test', value: 'data' });
    
    const afterSize = await getLogSize(TEST_LOG);
    assert(afterSize > 0, 'Size should be greater than 0 after append');
}

/**
 * Test: Crash recovery simulation
 */
async function testCrashRecovery() {
    // Simulate progressive writes
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'player1', value: { score: 100 } });
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'player2', value: { score: 200 } });
    
    // Simulate crash - data only in log, not in main file
    
    // Recover state from log
    const recoveredState = await rebuildStateFromLog(TEST_LOG);
    assert(recoveredState.player1.score === 100, 'Player1 recovered correctly');
    assert(recoveredState.player2.score === 200, 'Player2 recovered correctly');
    
    // Add more data after recovery
    await appendLogEntry(TEST_LOG, { op: OpType.SET, key: 'player3', value: { score: 300 } });
    
    const finalState = await rebuildStateFromLog(TEST_LOG);
    assert(Object.keys(finalState).length === 3, 'Should have 3 players after recovery');
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
