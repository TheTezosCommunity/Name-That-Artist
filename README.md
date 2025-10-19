# 🎨 Name That Artist - TTC Edition

A Discord bot game for **The Tezos Community (TTC)** where players guess the artists behind Tezos artworks.

## 📋 Features

- 🤖 Discord.js v14 powered bot
- 🎮 Interactive slash commands
- 🎨 Tezos community themed
- ⚡ Built for Node.js (Bun compatible)
- 🔒 Environment-based configuration
- 🎯 Easy to deploy and extend

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

- `/namethatartist` - Start a Name That Artist game
- `/ping` - Check if the bot is responsive
- `/help` - Get help and information about the game

## 🏗️ Project Structure

```
Name-That-Artist/
├── index.js              # Main bot entry point
├── deploy-commands.js    # Command registration script
├── package.json          # Project dependencies
├── .env                  # Environment variables (not in git)
├── .env.example          # Example environment variables
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## 🛠️ Technology Stack

- **Discord.js v14** - Discord API wrapper
- **Node.js** - JavaScript runtime
- **dotenv** - Environment variable management
- Compatible with **Bun** runtime

## 🎨 About TTC

This bot is created for **The Tezos Community (TTC)**, celebrating the vibrant art scene on the Tezos blockchain. The game helps community members learn about and appreciate the talented artists in the ecosystem.

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
