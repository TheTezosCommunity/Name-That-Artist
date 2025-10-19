# 🎨 Name That Artist - TTC Edition

A Discord trivia bot that challenges players to identify artists behind NFTs from **The Tezos Community (TTC)** wallet. The game fetches real NFT data from objkt.com and runs timed, multi-round competitions with scoring based on speed and accuracy.

## 📋 Features

- 🎮 **Multi-round gameplay** - 10 rounds per game with timed responses
- 🖼️ **Real NFT data** - Fetches from TTC wallet via objkt.com GraphQL API
- 🔘 **Button-based UI** - Multiple choice answers (A/B/C/D)
- ⏱️ **Speed-based scoring** - Faster answers earn more points
- 🏆 **Persistent leaderboard** - Track top players across games
- 📊 **Player statistics** - View your stats and win rate
- 💾 **Token caching** - Automatic refresh every 24 hours
- 🎨 **TTC branding** - Tezos community themed throughout
- ⚡ **Built for Node.js** - Discord.js v14 with ES6 modules

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher (or Bun)
- A Discord Bot Token ([Create one here](https://discord.com/developers/applications))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/skullzarmy/Name-That-Artist.git
cd Name-That-Artist
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Discord bot credentials:
```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_client_id_here
```

### Getting Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section:
   - Click "Add Bot"
   - Copy the **Token** (this is your `DISCORD_TOKEN`)
   - Enable "Message Content Intent" under Privileged Gateway Intents
4. Go to "OAuth2" → "General":
   - Copy the **Application ID** (this is your `CLIENT_ID`)
5. Invite the bot to your server:
   - Go to OAuth2 → URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Send Messages`, `Embed Links`, `Read Messages/View Channels`
   - Copy and open the generated URL

### Deploy Commands

Register slash commands with Discord:
```bash
npm run deploy-commands
```

### Start the Bot

```bash
npm start
```

Or for development (auto-restart on changes):
```bash
npm run dev
```

## 🎮 Commands

- `/namethatartist` - Start a new game (10 rounds of trivia)
- `/leaderboard` - View top players by total score
- `/stats` - View your personal game statistics
- `/stopgame` - Stop the current game (starter or moderator only)
- `/ping` - Check if the bot is responsive
- `/help` - Get help and information about the game

## 🏗️ Project Structure

```
Name-That-Artist/
├── index.js              # Main bot entry point with Discord handlers
├── game.js               # Multi-round game logic and session management
├── config.js             # Configuration and game settings
├── deploy-commands.js    # Slash command registration
├── services/
│   ├── objkt-api.js      # objkt.com GraphQL API integration
│   └── storage.js        # Local JSON storage for data persistence
├── data/                 # Auto-generated data files (gitignored)
│   ├── tokens.json       # Cached NFT tokens
│   ├── players.json      # Player statistics
│   └── game_state.json   # Active game sessions
├── package.json          # Project dependencies
├── .env.example          # Example environment variables
└── README.md            # This file
```

## 🛠️ Technology Stack

- **Discord.js v14** - Discord API wrapper with button interactions
- **graphql-request** - objkt.com GraphQL API client
- **Node.js** - JavaScript runtime (ES6 modules)
- **dotenv** - Environment variable management
- **Local JSON storage** - Persistent data without database
- Compatible with **Bun** runtime

## 🎨 About TTC

This bot is created for **The Tezos Community (TTC)**, celebrating the vibrant art scene on the Tezos blockchain. The game fetches NFTs from the TTC community wallet (`tz1RZN17j7FuPtDpGpXKgMXbx57WEhpZGF6B`) and helps members discover and appreciate the talented artists in the ecosystem.

## 🎯 How It Works

1. **Initialization**: Bot fetches NFT tokens from the TTC wallet via objkt.com GraphQL API
2. **Token Caching**: Stores tokens locally for 24 hours to reduce API calls
3. **Game Start**: Player initiates a game with `/namethatartist`
4. **Rounds**: Each game has 10 rounds with random NFTs
5. **Multiple Choice**: Each round shows 4 artist options (1 correct, 3 distractors)
6. **Timed Answers**: Players have 15 seconds to click the correct button
7. **Scoring**: Points = 100 × (time_remaining / total_time)
8. **Leaderboard**: Scores are saved and tracked across games

## 📝 Development

### Running with Bun (optional)

If you have Bun installed:
```bash
bun install
bun run index.js
```

### Adding New Commands

1. Add command definition in `deploy-commands.js`
2. Add command handler in `index.js` under the `InteractionCreate` event
3. Run `npm run deploy-commands` to register the new command

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Discord.js Documentation](https://discord.js.org/)
- [Tezos](https://tezos.com/)
- [Discord Developer Portal](https://discord.com/developers/applications)

---

Made with ❤️ for The Tezos Community
