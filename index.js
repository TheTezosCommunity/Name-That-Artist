import { Client, GatewayIntentBits, Events, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
    console.error('ERROR: DISCORD_TOKEN is not set in .env file');
    process.exit(1);
}

// Create Discord client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Bot ready event
client.once(Events.ClientReady, (readyClient) => {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║   🎨 Name That Artist - TTC Edition                      ║');
    console.log('║   The Tezos Community Discord Game                       ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`\n✅ Logged in as ${readyClient.user.tag}`);
    console.log(`🌐 Connected to ${readyClient.guilds.cache.size} server(s)`);
    console.log(`\n⏰ Ready at: ${new Date().toLocaleString()}`);
});

// Handle errors
client.on(Events.Error, (error) => {
    console.error('❌ Discord client error:', error);
});

// Handle interactions (slash commands)
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // Basic ping command
    if (commandName === 'ping') {
        await interaction.reply({
            content: `🏓 Pong! Bot latency: ${client.ws.ping}ms`,
            ephemeral: true
        });
    }
    
    // Name That Artist game command
    if (commandName === 'namethatartist') {
        await interaction.reply({
            content: '🎨 **Name That Artist - TTC Edition**\n\nWelcome to The Tezos Community\'s art guessing game!\n\n_Game features coming soon..._',
            ephemeral: false
        });
    }
    
    // Help command
    if (commandName === 'help') {
        const helpEmbed = {
            color: 0x0099ff,
            title: '🎨 Name That Artist - Help',
            description: 'Welcome to TTC\'s Name That Artist game!',
            fields: [
                {
                    name: '📋 Commands',
                    value: '`/namethatartist` - Start a new game\n`/ping` - Check bot status\n`/help` - Show this help message',
                },
                {
                    name: '🎮 How to Play',
                    value: 'The game will show you artwork from Tezos artists. Your goal is to guess the artist\'s name!',
                },
                {
                    name: '🏆 About',
                    value: 'Created for **The Tezos Community (TTC)**\nCelebrating Tezos artists and creativity!',
                },
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'TTC - The Tezos Community',
            },
        };

        await interaction.reply({ embeds: [helpEmbed] });
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN)
    .catch((error) => {
        console.error('❌ Failed to login to Discord:', error);
        process.exit(1);
    });

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});
