# Progressive Flat File Writing System

## Overview

The Name That Artist bot now implements a progressive flat file writing system with append-only logs for improved durability, reliability, and memory efficiency.

## Features

### 1. **Progressive Writes**
- Data is written immediately to append-only logs as it's received
- No more buffering all data in memory before writing
- Reduces memory usage and prevents data loss on crashes

### 2. **Append-Only Log Format**
- Each operation is appended to a log file as a single-line JSON entry
- Operations include: SET, DELETE, and CHECKPOINT
- Each entry includes a timestamp for audit and debugging

### 3. **Safe Serialization**
- Uses atomic append operations with Node.js `fs.appendFile` in append mode
- File system guarantees prevent race conditions and partial writes
- Each write operation is immediately flushed to disk

### 4. **Crash Recovery**
- If the bot crashes, data can be recovered from append logs
- The system automatically rebuilds state from logs on startup
- No data loss even if main JSON files are corrupted or missing

### 5. **Log Compaction**
- Background scheduler periodically compacts logs to optimize size
- Compaction merges all operations into a checkpoint
- Old backup files are maintained (last 3) for additional safety
- Default compaction threshold: 1MB per log file
- Default compaction interval: 1 hour

### 6. **Tombstone Records**
- DELETE operations create tombstone records in the log
- Ensures deleted data stays deleted after log replay
- Properly handles deletion scenarios in crash recovery

## Architecture

### Files Structure

```
data/
├── logs/
│   ├── players.log           # Progressive player stats updates
│   ├── tokens.log            # Token cache updates
│   ├── game_state.log        # Game state changes
│   ├── players.log.backup.*  # Backup files (kept for safety)
│   ├── tokens.log.backup.*
│   └── game_state.log.backup.*
├── players.json              # Main player data file
├── tokens.json               # Main token cache file
└── game_state.json           # Main game state file
```

### Log Entry Format

Each line in a log file is a JSON object:

```json
{"timestamp":"2025-01-15T12:34:56.789Z","op":"SET","key":"user123","value":{"score":100}}
{"timestamp":"2025-01-15T12:35:01.234Z","op":"DELETE","key":"channel456"}
{"timestamp":"2025-01-15T13:00:00.000Z","op":"CHECKPOINT","state":{...},"compactedAt":"2025-01-15T13:00:00.000Z"}
```

### Operation Types

- **SET**: Create or update a key-value pair
  - With `key` and `value`: Updates a specific entry
  - With `data`: Replaces entire state (used for tokens)
  
- **DELETE**: Mark a key as deleted (tombstone)
  - Used when clearing game states
  
- **CHECKPOINT**: Full state snapshot
  - Created during compaction
  - Allows fast recovery without replaying all operations

## Usage

### Automatic Operation

The progressive storage system works automatically with no code changes needed for basic usage:

```javascript
// Progressive write happens automatically
await updatePlayerStats(userId, username, score, isWinner);

// Data is immediately written to append log
// Then saved to main JSON file
```

### Manual Compaction

You can manually trigger compaction if needed:

```javascript
import { compactAllLogs } from './services/storage.js';

// Compact all logs immediately
await compactAllLogs();
```

### Background Scheduler

The compaction scheduler runs automatically:

```javascript
import { CompactionScheduler } from './services/append-log.js';

// Runs every hour by default
const scheduler = new CompactionScheduler(3600000);
scheduler.start(['players', 'tokens', 'game_state']);

// Stop when shutting down
scheduler.stop();
```

### Crash Recovery

Recovery is automatic on startup:

```javascript
// If main files are missing or corrupted
const players = await loadPlayers();

// Automatically rebuilds from append log
// Returns recovered data transparently
```

## Testing

Run the test suite to verify the progressive storage system:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:append-log      # Test append-log functionality
npm run test:storage         # Test storage integration
```

### Test Coverage

- ✅ Append log entry writing
- ✅ Log entry reading and parsing
- ✅ SET operations
- ✅ DELETE operations (tombstones)
- ✅ State rebuilding from logs
- ✅ Log compaction
- ✅ Checkpoint creation and recovery
- ✅ Crash recovery scenarios
- ✅ Progressive player updates
- ✅ Game state persistence
- ✅ Multiple concurrent-style updates

## Benefits

### Memory Efficiency
- **Before**: All data buffered in memory until write
- **After**: Data written progressively as received
- **Impact**: Lower memory footprint, especially with large datasets

### Durability
- **Before**: Data loss possible if crash before write completes
- **After**: Each operation persisted immediately
- **Impact**: Near-zero data loss risk

### Reliability
- **Before**: Corrupted JSON file = complete data loss
- **After**: Can rebuild from append log
- **Impact**: Highly fault-tolerant system

### Performance
- **Writes**: Slightly slower per operation (but progressive)
- **Reads**: Same performance (reads from main files)
- **Compaction**: Background process, no user impact

## Configuration

### Compaction Settings

Adjust compaction behavior in your initialization:

```javascript
// Custom compaction interval (2 hours)
const scheduler = new CompactionScheduler(7200000);

// Custom size threshold (500KB)
if (await needsCompaction('players', 524288)) {
    await compactLog('players');
}
```

### Disable Background Compaction

If you prefer manual compaction:

```javascript
// Don't start the scheduler
// compactionScheduler.start();

// Run compaction manually when needed
await compactAllLogs();
```

## Monitoring

### Log Size Monitoring

Check log sizes to understand growth:

```javascript
import { getLogSize, needsCompaction } from './services/append-log.js';

const size = await getLogSize('players');
console.log(`Players log size: ${size} bytes`);

if (await needsCompaction('players')) {
    console.log('Players log needs compaction');
}
```

### Log Entry Count

Count entries in a log:

```javascript
import { readLogEntries } from './services/append-log.js';

const entries = await readLogEntries('players');
console.log(`Players log has ${entries.length} entries`);
```

## Migration

Existing installations automatically work with the new system:

1. **First Run**: Creates append logs alongside existing files
2. **Subsequent Runs**: Uses both logs and main files
3. **Gradual Migration**: Old data preserved in main files
4. **Compaction**: Logs are automatically optimized

No manual migration steps required!

## Troubleshooting

### Issue: Log Files Growing Too Large

**Solution**: 
- Lower compaction threshold
- Increase compaction frequency
- Manually trigger compaction: `await compactAllLogs()`

### Issue: Main File Missing After Crash

**Solution**: 
- System automatically recovers from append log
- No action needed - recovery is automatic
- Check logs for recovery messages

### Issue: Slow Performance

**Solution**:
- Check log sizes with `getLogSize()`
- Run manual compaction if logs are large
- Adjust compaction settings

### Issue: Disk Space Concerns

**Solution**:
- Compaction automatically removes old backups (keeps last 3)
- Manually delete old backup files if needed
- Monitor log directory size

## Best Practices

1. **Let Background Compaction Run**: Don't disable unless you have a reason
2. **Monitor Log Sizes**: Keep an eye on growth patterns
3. **Test Recovery**: Periodically test crash recovery in development
4. **Keep Backups**: The system keeps 3 backup files automatically
5. **Don't Edit Logs Manually**: Log files are append-only for a reason

## Future Enhancements

Possible future improvements:

- Compression of old log entries
- Streaming log reading for very large logs
- Distributed log replication
- Log rotation based on time (daily/weekly)
- Real-time log monitoring dashboard

## Technical Details

### Atomicity Guarantees

- Uses `fs.appendFile()` with 'a' flag for atomic appends
- Single-line JSON format prevents partial entry writes
- File system level guarantees from Node.js fs module

### Concurrency

- Append operations are serialized by Node.js event loop
- No explicit locking needed for single-process bot
- Multi-process deployments would require additional coordination

### Data Consistency

- Append-only nature prevents corruption from partial writes
- Checkpoints provide consistent state snapshots
- Tombstones ensure deletion consistency

---

Built with ❤️ for The Tezos Community
