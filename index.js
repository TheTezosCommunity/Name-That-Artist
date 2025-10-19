import { Client, GatewayIntentBits, Events } from 'discord.js';
import { config, validateConfig } from './config.js';
import { gameManager } from './game.js';

// Validate required environment variables
if (!validateConfig()) {
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

// Handle message for game guesses
client.on(Events.MessageCreate, async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Check if there's an active game in this channel
    const session = gameManager.getSession(message.channelId);
    if (!session || session.solved) return;
    
    // Check the guess
    const result = gameManager.checkGuess(message.channelId, message.content);
    
    if (result.correct) {
        await message.reply({
            content: result.message,
            allowedMentions: { repliedUser: true }
        });
        // Clean up the game session after a short delay
        setTimeout(() => {
            gameManager.endGame(message.channelId);
        }, 5000);
    } else if (result.gameOver) {
        await message.reply({
            content: result.message,
            allowedMentions: { repliedUser: true }
        });
        // Clean up the game session
        setTimeout(() => {
            gameManager.endGame(message.channelId);
        }, 5000);
    } else if (result.success) {
        await message.reply({
            content: result.message,
            allowedMentions: { repliedUser: true }
        });
    }
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
        const result = gameManager.startGame(interaction.channelId, interaction.user.id);
        
        if (!result.success) {
            await interaction.reply({
                content: `⚠️ ${result.message}`,
                ephemeral: true
            });
            return;
        }

        const gameEmbed = {
            color: config.branding.color,
            title: '🎨 Name That Artist - TTC Edition',
            description: 'Can you guess the artist behind this artwork?\n\n_Note: This is a demo. Add real Tezos artist data to `game.js` for a full experience._',
            fields: [
                {
                    name: '📋 How to Play',
                    value: 'Type your guess in the chat!\nYou have **3 attempts** to guess correctly.',
                },
                {
                    name: '💡 Need Help?',
                    value: 'Use `/hint` to get a clue (coming soon)',
                },
            ],
            image: {
                url: result.artwork || 'https://via.placeholder.com/400x400?text=Artwork+Placeholder',
            },
            footer: {
                text: `${config.branding.name} • Started by ${interaction.user.username}`,
            },
            timestamp: new Date().toISOString(),
        };

        await interaction.reply({ embeds: [gameEmbed] });
    }
    
    // Hint command
    if (commandName === 'hint') {
        const result = gameManager.getHint(interaction.channelId);
        
        if (!result.success) {
            await interaction.reply({
                content: `⚠️ ${result.message}`,
                ephemeral: true
            });
            return;
        }

        await interaction.reply({
            content: result.message,
            ephemeral: false
        });
    }
    
    // Stop game command
    if (commandName === 'stopgame') {
        const session = gameManager.getSession(interaction.channelId);
        
        if (!session) {
            await interaction.reply({
                content: '⚠️ No active game in this channel.',
                ephemeral: true
            });
            return;
        }

        // Only the person who started the game or someone with manage messages permission can stop it
        const canStop = interaction.user.id === session.startedBy || 
                       interaction.memberPermissions?.has('ManageMessages');

        if (!canStop) {
            await interaction.reply({
                content: '⚠️ Only the person who started the game or moderators can stop it.',
                ephemeral: true
            });
            return;
        }

        gameManager.endGame(interaction.channelId);
        await interaction.reply({
            content: `🛑 Game stopped. The artist was **${session.artist}**.`,
            ephemeral: false
        });
    }
    
    // Help command
    if (commandName === 'help') {
        const helpEmbed = {
            color: config.branding.color,
            title: '🎨 Name That Artist - Help',
            description: 'Welcome to TTC\'s Name That Artist game!',
            fields: [
                {
                    name: '📋 Commands',
                    value: '`/namethatartist` - Start a new game\n`/hint` - Get a hint for the current game\n`/stopgame` - Stop the current game\n`/ping` - Check bot status\n`/help` - Show this help message',
                },
                {
                    name: '🎮 How to Play',
                    value: 'The game will show you artwork from Tezos artists. Your goal is to guess the artist\'s name!\n\nSimply type your guess in the chat when a game is active. You have 3 attempts!',
                },
                {
                    name: '🏆 About',
                    value: 'Created for **The Tezos Community (TTC)**\nCelebrating Tezos artists and creativity!',
                },
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: config.branding.name,
            },
        };

        await interaction.reply({ embeds: [helpEmbed] });
    }
});

// Login to Discord
client.login(config.token)
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
