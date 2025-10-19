/**
 * Tests for rounds parameter functionality
 */

import { NameThatArtistGame } from '../game.js';
import { config } from '../config.js';

// Test utilities
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

async function test(name, fn) {
    testsRun++;
    try {
        await fn();
        testsPassed++;
        console.log(`✅ ${name}`);
    } catch (error) {
        testsFailed++;
        console.error(`❌ ${name}`);
        console.error(`   ${error.message}`);
    }
}

// Mock tokens for testing
function createMockGame() {
    const game = new NameThatArtistGame();
    
    // Mock some data for testing
    game.tokens = Array.from({ length: 60 }, (_, i) => ({
        tokenId: i,
        name: `Token ${i}`,
        imageUrl: `https://example.com/image${i}.jpg`,
        primaryArtist: `tz1artist${i % 10}`,
    }));
    
    game.artists = Array.from({ length: 10 }, (_, i) => `tz1artist${i}`);
    
    game.artistInfo = {};
    game.artists.forEach((artist, i) => {
        game.artistInfo[artist] = {
            displayName: `Artist ${i}`,
            hasResolution: true,
        };
    });
    
    game.isInitialized = true;
    
    return game;
}

// Tests
async function testDefaultRounds() {
    const game = createMockGame();
    const result = await game.startGame('test-channel-1', 'user1', 'TestUser1');
    
    assert(result.success, 'Game should start successfully');
    assert(result.session.totalRounds === 20, `Game should default to 20 rounds, got ${result.session.totalRounds}`);
    assert(result.session.rounds.length === 20, 'Should have 20 rounds in the session');
    
    await game.endGame('test-channel-1');
}

async function testCustomRounds() {
    const game = createMockGame();
    const result = await game.startGame('test-channel-2', 'user2', 'TestUser2', 15);
    
    assert(result.success, 'Game should start successfully with custom rounds');
    assert(result.session.totalRounds === 15, `Game should have 15 rounds, got ${result.session.totalRounds}`);
    assert(result.session.rounds.length === 15, 'Should have 15 rounds in the session');
    
    await game.endGame('test-channel-2');
}

async function testMinimumRounds() {
    const game = createMockGame();
    const result = await game.startGame('test-channel-3', 'user3', 'TestUser3', 5);
    
    assert(result.success, 'Game should start successfully with minimum rounds');
    assert(result.session.totalRounds === 5, `Game should have 5 rounds, got ${result.session.totalRounds}`);
    assert(result.session.rounds.length === 5, 'Should have 5 rounds in the session');
    
    await game.endGame('test-channel-3');
}

async function testMaximumRounds() {
    const game = createMockGame();
    const result = await game.startGame('test-channel-4', 'user4', 'TestUser4', 50);
    
    assert(result.success, 'Game should start successfully with maximum rounds');
    assert(result.session.totalRounds === 50, `Game should have 50 rounds, got ${result.session.totalRounds}`);
    assert(result.session.rounds.length === 50, 'Should have 50 rounds in the session');
    
    await game.endGame('test-channel-4');
}

async function testNullRoundsUsesDefault() {
    const game = createMockGame();
    const result = await game.startGame('test-channel-5', 'user5', 'TestUser5', null);
    
    assert(result.success, 'Game should start successfully with null rounds');
    assert(result.session.totalRounds === 20, `Game should use default 20 rounds when null is passed, got ${result.session.totalRounds}`);
    
    await game.endGame('test-channel-5');
}

async function testInsufficientTokens() {
    const game = createMockGame();
    // Set tokens to only 3
    game.tokens = game.tokens.slice(0, 3);
    
    const result = await game.startGame('test-channel-6', 'user6', 'TestUser6', 20);
    
    assert(!result.success, 'Game should not start with insufficient tokens');
    assert(result.message.includes('Not enough tokens'), 'Error message should mention insufficient tokens');
}

async function testConfigDefault() {
    assert(config.game.roundsPerGame === 20, 'Config should default to 20 rounds');
}

// Run all tests
console.log('🧪 Running Rounds Parameter Tests\n');

(async () => {
    await test('testConfigDefault', testConfigDefault);
    await test('testDefaultRounds', testDefaultRounds);
    await test('testCustomRounds', testCustomRounds);
    await test('testMinimumRounds', testMinimumRounds);
    await test('testMaximumRounds', testMaximumRounds);
    await test('testNullRoundsUsesDefault', testNullRoundsUsesDefault);
    await test('testInsufficientTokens', testInsufficientTokens);
    
    console.log(`\n📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`);
    
    if (testsFailed > 0) {
        process.exit(1);
    }
})();
