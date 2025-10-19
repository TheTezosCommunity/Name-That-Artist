# 🚀 Setup Guide - Name That Artist Bot

This guide will help you set up and run the Name That Artist Discord bot for The Tezos Community.

## Prerequisites

Before you begin, make sure you have:
- Node.js 18.x or higher installed
- A Discord account
- Access to the [Discord Developer Portal](https://discord.com/developers/applications)

## Step 1: Create a Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Give it a name (e.g., "Name That Artist - TTC")
4. Click "Create"

## Step 2: Create a Bot User

1. In your application, go to the "Bot" section (left sidebar)
2. Click "Add Bot" and confirm
3. Under "Privileged Gateway Intents", enable:
   - ✅ Message Content Intent
   - ✅ Server Members Intent (optional, for member counting)
4. Click "Save Changes"
5. Under "TOKEN", click "Reset Token" and copy it (save it securely!)

## Step 3: Get Your Application ID

1. Go to the "General Information" section (left sidebar)
2. Copy your "Application ID" (also called Client ID)

## Step 4: Configure the Bot

1. In the project directory, copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   DISCORD_TOKEN=your_token_from_step_2
   CLIENT_ID=your_application_id_from_step_3
   ```

## Step 5: Install Dependencies

```bash
npm install
```

## Step 6: Deploy Slash Commands

Before the bot can use slash commands, you need to register them with Discord:

```bash
npm run deploy-commands
```

You should see:
```
✅ Successfully reloaded application (/) commands.
```

## Step 7: Invite the Bot to Your Server

1. Go back to the Discord Developer Portal
2. Navigate to "OAuth2" → "URL Generator"
3. Select the following scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
4. Select the following bot permissions:
   - ✅ Send Messages
   - ✅ Send Messages in Threads
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ Add Reactions
   - ✅ Use Slash Commands
5. Copy the generated URL at the bottom
6. Open the URL in your browser
7. Select a server and click "Authorize"

## Step 8: Start the Bot

```bash
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎨 Name That Artist - TTC Edition                      ║
║   The Tezos Community Discord Game                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

✅ Logged in as Your Bot Name#1234
🌐 Connected to 1 server(s)
```

## Testing the Bot

In your Discord server, try these commands:

- `/help` - View all available commands
- `/ping` - Check if the bot is responsive
- `/namethatartist` - Start a game (currently uses placeholder data)

## Next Steps

### Adding Real Artist Data

To add real Tezos artists to the game:

1. Open `game.js`
2. Find the `SAMPLE_ARTISTS` array
3. Replace the placeholder data with real artist information:

```javascript
const SAMPLE_ARTISTS = [
    {
        name: 'Artist Name',
        artworks: [
            'https://example.com/artwork1.jpg',
            'https://example.com/artwork2.jpg'
        ],
        bio: 'Short bio about the artist'
    },
    // Add more artists...
];
```

### Development Mode

To run the bot with auto-restart on file changes:

```bash
npm run dev
```

This is useful when developing new features.

### Running with Bun (Alternative)

If you have [Bun](https://bun.sh) installed:

```bash
bun install
bun run index.js
```

Bun provides faster startup times and is fully compatible with this project.

## Troubleshooting

### Bot doesn't respond to commands

- Make sure you ran `npm run deploy-commands`
- Check that the bot has proper permissions in your Discord server
- Verify that "Message Content Intent" is enabled in the Discord Developer Portal

### "Invalid token" error

- Double-check your `DISCORD_TOKEN` in the `.env` file
- Make sure you copied the complete token without extra spaces
- You may need to regenerate the token in the Discord Developer Portal

### Bot connects but commands don't appear

- Run `npm run deploy-commands` again
- Wait a few minutes for Discord to update (can take up to an hour for global commands)
- Try kicking and re-inviting the bot

## Support

For issues or questions:
- Check the [main README](README.md)
- Review Discord.js documentation: https://discord.js.org/
- Open an issue in the GitHub repository

---

Made with ❤️ for The Tezos Community
