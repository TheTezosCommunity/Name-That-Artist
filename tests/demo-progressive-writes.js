/**
 * Demo Script: Progressive Writes Visualization
 * Shows how data is written progressively vs all at once
 * Run with: node tests/demo-progressive-writes.js
 */

import { updatePlayerStats } from '../services/storage.js';
import { readLogEntries } from '../services/append-log.js';

console.log('🎬 Progressive Writes Demo\n');
console.log('This demo shows how data is written progressively to logs.');
console.log('Each operation is immediately persisted, not buffered.\n');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function demo() {
    console.log('📝 Simulating game with 3 players...\n');
    
    // Player 1 finishes first
    console.log('👤 Player 1 completes game...');
    await updatePlayerStats('demo-player-1', 'SpeedyGamer', 250, true);
    let entries = await readLogEntries('players');
    console.log(`   Log entries: ${entries.length} | Latest: Player 1 update written ✅`);
    await sleep(500);
    
    // Player 2 finishes second
    console.log('\n👤 Player 2 completes game...');
    await updatePlayerStats('demo-player-2', 'SlowAndSteady', 180, false);
    entries = await readLogEntries('players');
    console.log(`   Log entries: ${entries.length} | Latest: Player 2 update written ✅`);
    await sleep(500);
    
    // Player 3 finishes last
    console.log('\n👤 Player 3 completes game...');
    await updatePlayerStats('demo-player-3', 'LastMinute', 200, false);
    entries = await readLogEntries('players');
    console.log(`   Log entries: ${entries.length} | Latest: Player 3 update written ✅`);
    
    console.log('\n📊 Summary:');
    console.log('   - Each player update was written immediately');
    console.log('   - No buffering - data persisted as it arrived');
    console.log('   - If crash occurred mid-game, previous players\' data would be safe');
    console.log(`   - Total log entries: ${entries.length}`);
    
    console.log('\n🔍 Log Entry Example:');
    const lastEntry = entries[entries.length - 1];
    console.log(JSON.stringify(lastEntry, null, 2).substring(0, 200) + '...');
    
    console.log('\n💡 Key Benefits:');
    console.log('   ✅ Memory efficient - no large buffers');
    console.log('   ✅ Crash resistant - each write is durable');
    console.log('   ✅ Progressive - data available immediately');
    console.log('   ✅ Recoverable - can rebuild from log');
    
    console.log('\n🎉 Demo complete!');
}

demo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
});
