import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    console.error('ERROR: DISCORD_TOKEN and CLIENT_ID must be set in .env file');
    process.exit(1);
}

// Define slash commands
const commands = [
    {
        name: 'ping',
        description: 'Check if the bot is alive and responsive',
    },
    {
        name: 'namethatartist',
        description: 'Start a new Name That Artist game - 10 rounds of trivia!',
    },
    {
        name: 'leaderboard',
        description: 'View the top players on the leaderboard',
    },
    {
        name: 'stats',
        description: 'View your personal game statistics',
    },
    {
        name: 'stopgame',
        description: 'Stop the current game in this channel',
    },
    {
        name: 'help',
        description: 'Get help and information about the Name That Artist game',
    },
];

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log('🚀 Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('✅ Successfully reloaded application (/) commands.');
        console.log('\nRegistered commands:');
        commands.forEach(cmd => {
            console.log(`  - /${cmd.name}: ${cmd.description}`);
        });
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        process.exit(1);
    }
})();
