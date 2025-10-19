# 🎮 Name That Artist - Game Guide

## Quick Start

1. Run `/namethatartist` in any Discord channel
2. Wait for Round 1 to appear (shows NFT artwork)
3. Click one of the 4 buttons (A/B/C/D) to guess the artist
4. Faster correct answers = more points!
5. Play through 10 rounds
6. See final scores and winner announcement

## Game Rules

### Rounds
- Each game has **10 rounds**
- Each round shows a different NFT from the TTC wallet
- You have **15 seconds** to answer each round

### Scoring
- Correct answer: **Up to 100 points** (based on speed)
- Wrong answer: **0 points**
- Score formula: `100 × (time_remaining / 15)`
- Example: Answer in 10 seconds = 33 points
- Example: Answer in 3 seconds = 80 points

### Rules
- **One guess per round** - Can't change answer after clicking
- **No duplicate guesses** - You can only answer once
- **Time limit enforced** - Auto-advances after 15 seconds
- **Multiple players** - Everyone competes in the same game

## Commands

### `/namethatartist`
Starts a new game in the current channel.
- Only one game per channel at a time
- Automatically fetches NFTs from TTC wallet
- First run may take 1-2 minutes to fetch data

### `/leaderboard`
Shows top 10 players by total score.
- Displays total score, wins, and games played
- Updated after each game
- Persistent across bot restarts

### `/stats`
View your personal statistics.
- Total games played
- Total wins
- Best score
- Average score
- Win rate percentage

### `/stopgame`
Stops the current game (moderator or starter only).
- Clears the active game session
- Does not save partial results
- Use only if game is stuck

### `/ping`
Check if the bot is responsive.

### `/help`
Display help information.

## Gameplay Example

**Round 1/10**
```
🎨 Round 1/10
Untitled #4523

[Image of NFT artwork]

Who created this artwork?

🅰️ tz1abc...def  🅱️ tz1ghi...jkl
🅲 tz1mno...pqr  🅳 tz1stu...vwx

⏱️ You have 15 seconds to answer!
```

**You click button B in 8 seconds**

```
✅ Correct! +53 points (Total: 53 points)
```

**After 15 seconds or all players answer**

```
⏰ Time's Up!
The correct answer was: 🅱️ tz1ghi...jkl

Get ready for the next round!

📊 Current Scores
1. YourName: 53 pts
2. Player2: 45 pts
3. Player3: 0 pts
```

**... 9 more rounds ...**

**After Round 10**

```
🎮 Game Over!

🏆 Winner: YourName
580 points • 7/10 correct

📊 Final Scores
1. YourName - 580 pts (7 correct)
2. Player2 - 450 pts (6 correct)
3. Player3 - 320 pts (5 correct)

The Tezos Community • 3 player(s)
```

## Tips & Strategy

### Maximize Your Score
1. **Study the artwork** quickly (first 2-3 seconds)
2. **Eliminate wrong answers** if you recognize the style
3. **Click fast** once you're confident
4. **Don't guess randomly** - 0 points is better than wasting time

### Learn the Artists
- Pay attention to artist addresses throughout games
- Check out the NFTs on objkt.com after games
- Recognize patterns in art styles
- Build familiarity with TTC wallet artists

### Compete Fairly
- No external tools or lookups during rounds
- Play honestly for the community
- Celebrate others' wins
- Have fun learning about Tezos artists!

## NFT Data Source

All NFTs are fetched from **The Tezos Community wallet**:
- Wallet: `tz1RZN17j7FuPtDpGpXKgMXbx57WEhpZGF6B`
- Source: objkt.com GraphQL API
- Cache: Refreshed every 24 hours
- Images: Displayed via IPFS gateway

## Troubleshooting

### "Not enough tokens to start a game"
The bot needs at least 10 NFTs in the wallet. If you see this, wait for the token cache to refresh or contact an admin.

### "A game is already in progress"
Only one game per channel at a time. Wait for it to finish or use `/stopgame` (if you're the starter or moderator).

### "You have already answered this round"
You can only answer once per round. Your first click is final!

### Bot is slow on first run
The first time the bot starts, it fetches all NFTs from the TTC wallet. This takes 1-2 minutes. Subsequent runs use cached data and start instantly.

### Buttons don't work
Make sure the bot has proper permissions:
- Send Messages
- Embed Links
- Use Application Commands
- Read Message History

## Data & Privacy

### What's Stored
- Your Discord user ID and username
- Your game scores and win/loss record
- Game history (last 50 games)

### What's NOT Stored
- Messages or chat history
- Personal information
- Voice or video data

### Data Location
All data is stored locally in JSON files on the bot server. No external database or third-party services (except objkt.com for NFT data).

## Credits

**Created for The Tezos Community (TTC)**
- NFT wallet: tz1RZN17j7FuPtDpGpXKgMXbx57WEhpZGF6B
- Data source: objkt.com
- Built with: Node.js + Discord.js + GraphQL

Celebrating Tezos artists and creativity! 🎨

---

**Have fun and good luck!** 🏆
