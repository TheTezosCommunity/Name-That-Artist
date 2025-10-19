import { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { config, validateConfig } from './config.js';
import { gameManager } from './game.js';
import { getLeaderboard, getPlayerStats } from './services/storage.js';
import { cooldownManager } from './services/cooldown.js';
import { CompactionScheduler } from './services/append-log.js';

// Initialize compaction scheduler for periodic log optimization
const compactionScheduler = new CompactionScheduler(3600000); // Run every hour

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
client.once(Events.ClientReady, async (readyClient) => {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║   🎨 Name That Artist - TTC Edition                      ║');
    console.log('║   The Tezos Community Discord Game                       ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`\n✅ Logged in as ${readyClient.user.tag}`);
    console.log(`🌐 Connected to ${readyClient.guilds.cache.size} server(s)`);
    console.log(`\n⏰ Ready at: ${new Date().toLocaleString()}`);
    
    // Initialize game data in background
    console.log('\n🔄 Initializing game data...');
    try {
        await gameManager.initialize();
    } catch (error) {
        console.error('⚠️ Warning: Failed to initialize game data:', error.message);
    }
    
    // Start background compaction scheduler
    console.log('\n🗜️ Starting background compaction scheduler...');
    compactionScheduler.start(['players', 'tokens', 'game_state']);
});

// Handle errors
client.on(Events.Error, (error) => {
    console.error('❌ Discord client error:', error);
});

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
    // Handle button clicks for game answers
    if (interaction.isButton()) {
        const [action, channelId, choice] = interaction.customId.split('_');
        
        if (action === 'answer') {
            const result = await gameManager.processAnswer(
                channelId,
                interaction.user.id,
                interaction.user.username,
                choice
            );

            if (!result.success) {
                await interaction.reply({
                    content: result.message,
                    ephemeral: true
                });
                return;
            }

            if (result.alreadyAnswered) {
                await interaction.reply({
                    content: '⚠️ You already answered this round!',
                    ephemeral: true
                });
                return;
            }

            // Send feedback
            await interaction.reply({
                content: result.correct ? 
                    `${result.message} (Total: ${result.totalScore} points)` : 
                    result.message,
                ephemeral: true
            });
        }
        return;
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;

    await handleSlashCommand(interaction);
});

/**
 * Handle slash commands
 */
async function handleSlashCommand(interaction) {
    const { commandName } = interaction;

    // Check if user can bypass cooldowns (admins/moderators)
    const canBypass = cooldownManager.canBypassCooldown(interaction);

    // Check user cooldown (unless bypassed)
    if (!canBypass) {
        const userCooldown = cooldownManager.checkUserCooldown(commandName, interaction.user.id);
        if (userCooldown.onCooldown) {
            await interaction.reply({
                content: `⏱️ Please wait ${cooldownManager.formatTime(userCooldown.remainingTime)} before using this command again.`,
                ephemeral: true
            });
            return;
        }

        // Check channel cooldown (unless bypassed)
        const channelCooldown = cooldownManager.checkChannelCooldown(commandName, interaction.channelId);
        if (channelCooldown.onCooldown) {
            await interaction.reply({
                content: `⏱️ This command was recently used in this channel. Please wait ${cooldownManager.formatTime(channelCooldown.remainingTime)}.`,
                ephemeral: true
            });
            return;
        }
    }

    // Set cooldowns after validation (before command execution)
    if (!canBypass) {
        cooldownManager.setUserCooldown(commandName, interaction.user.id);
        cooldownManager.setChannelCooldown(commandName, interaction.channelId);
    }

    // Ping command
    if (commandName === 'ping') {
        await interaction.reply({
            content: `🏓 Pong! Bot latency: ${client.ws.ping}ms`,
            ephemeral: true
        });
        return;
    }

    // Start game command
    if (commandName === 'namethatartist') {
        await interaction.deferReply();

        const result = await gameManager.startGame(
            interaction.channelId,
            interaction.user.id,
            interaction.user.username
        );

        if (!result.success) {
            await interaction.editReply({
                content: `⚠️ ${result.message}`
            });
            return;
        }

        // Show game start message
        const startEmbed = new EmbedBuilder()
            .setColor(config.branding.color)
            .setTitle('🎨 Name That Artist - Game Starting!')
            .setDescription(`**${config.game.roundsPerGame} rounds** of Tezos NFT trivia!\n\nGet ready to guess the artists behind NFTs from The Tezos Community wallet.`)
            .addFields(
                { name: '⏱️ Time per Round', value: `${config.game.roundTimeSeconds} seconds`, inline: true },
                { name: '🎯 Scoring', value: `Up to ${config.game.baseScore} points per round`, inline: true },
                { name: '👥 Started by', value: interaction.user.username, inline: true }
            )
            .setFooter({ text: config.branding.name })
            .setTimestamp();

        await interaction.editReply({ embeds: [startEmbed] });

        // Start first round after a short delay
        setTimeout(async () => {
            await displayRound(interaction.channel, result.session.channelId);
        }, 3000);
        return;
    }

    // Leaderboard command
    if (commandName === 'leaderboard') {
        await interaction.deferReply();
        
        const leaderboard = await getLeaderboard('totalScore', 10);
        
        if (leaderboard.length === 0) {
            await interaction.editReply({
                content: '📊 No games played yet! Start a game with `/namethatartist`'
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(config.branding.color)
            .setTitle('🏆 Name That Artist - Leaderboard')
            .setDescription('Top players by total score')
            .setFooter({ text: config.branding.name })
            .setTimestamp();

        const medals = ['🥇', '🥈', '🥉'];
        const leaderboardText = leaderboard.map((player, index) => {
            const medal = medals[index] || `${index + 1}.`;
            return `${medal} **${player.username}** - ${player.totalScore} pts (${player.totalWins} wins, ${player.totalGames} games)`;
        }).join('\n');

        embed.setDescription(leaderboardText);

        await interaction.editReply({ embeds: [embed] });
        return;
    }

    // Stats command
    if (commandName === 'stats') {
        await interaction.deferReply({ ephemeral: true });
        
        const stats = await getPlayerStats(interaction.user.id);
        
        if (stats.totalGames === 0) {
            await interaction.editReply({
                content: '📊 You haven\'t played any games yet! Start one with `/namethatartist`'
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(config.branding.color)
            .setTitle(`📊 Stats for ${interaction.user.username}`)
            .addFields(
                { name: '🎮 Games Played', value: stats.totalGames.toString(), inline: true },
                { name: '🏆 Wins', value: stats.totalWins.toString(), inline: true },
                { name: '📈 Total Score', value: stats.totalScore.toString(), inline: true },
                { name: '⭐ Best Score', value: stats.bestScore.toString(), inline: true },
                { name: '📊 Average Score', value: stats.averageScore.toString(), inline: true },
                { name: '🎯 Win Rate', value: `${Math.round((stats.totalWins / stats.totalGames) * 100)}%`, inline: true },
                { name: '✅ Correct Answers', value: stats.totalCorrectAnswers.toString(), inline: true },
                { name: '❌ Incorrect Answers', value: stats.totalIncorrectAnswers.toString(), inline: true },
                { name: '🎯 Accuracy', value: `${stats.accuracyRate}%`, inline: true }
            )
            .setFooter({ text: config.branding.name })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
    }

    // All-time leaderboard command
    if (commandName === 'alltime') {
        await interaction.deferReply();
        
        const sortBy = interaction.options.getString('sort') || 'totalScore';
        const leaderboard = await getLeaderboard(sortBy, 10);
        
        if (leaderboard.length === 0) {
            await interaction.editReply({
                content: '📊 No games played yet! Start a game with `/namethatartist`'
            });
            return;
        }

        // Map sort fields to display names
        const sortNames = {
            totalScore: 'Total Score',
            totalWins: 'Total Wins',
            averageScore: 'Average Score',
            bestScore: 'Best Score',
            accuracyRate: 'Accuracy Rate',
            totalGames: 'Games Played',
            totalCorrectAnswers: 'Correct Answers'
        };

        // Map sort fields to emojis
        const sortEmojis = {
            totalScore: '📈',
            totalWins: '🏆',
            averageScore: '📊',
            bestScore: '⭐',
            accuracyRate: '🎯',
            totalGames: '🎮',
            totalCorrectAnswers: '✅'
        };

        const embed = new EmbedBuilder()
            .setColor(config.branding.color)
            .setTitle(`${sortEmojis[sortBy]} All-Time Leaderboard - ${sortNames[sortBy]}`)
            .setDescription(`Top players sorted by ${sortNames[sortBy]}`)
            .setFooter({ text: config.branding.name })
            .setTimestamp();

        const medals = ['🥇', '🥈', '🥉'];
        const leaderboardText = leaderboard.map((player, index) => {
            const medal = medals[index] || `${index + 1}.`;
            const mainValue = player[sortBy];
            
            // Format the display based on sort type
            let displayValue;
            if (sortBy === 'accuracyRate') {
                displayValue = `${mainValue}%`;
            } else {
                displayValue = mainValue.toString();
            }
            
            // Add context stats
            const contextStats = [];
            if (sortBy !== 'totalScore') contextStats.push(`${player.totalScore} pts`);
            if (sortBy !== 'totalWins') contextStats.push(`${player.totalWins} wins`);
            if (sortBy !== 'totalGames') contextStats.push(`${player.totalGames} games`);
            if (sortBy !== 'accuracyRate') contextStats.push(`${player.accuracyRate}% accuracy`);
            
            const context = contextStats.length > 0 ? ` (${contextStats.join(', ')})` : '';
            
            return `${medal} **${player.username}** - ${displayValue}${context}`;
        }).join('\n');

        embed.setDescription(leaderboardText);

        await interaction.editReply({ embeds: [embed] });
        return;
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

        const canStop = interaction.user.id === session.startedBy || 
                       interaction.memberPermissions?.has('ManageMessages');

        if (!canStop) {
            await interaction.reply({
                content: '⚠️ Only the person who started the game or moderators can stop it.',
                ephemeral: true
            });
            return;
        }

        await gameManager.endGame(interaction.channelId);
        await interaction.reply({
            content: '🛑 Game stopped by moderator.',
            ephemeral: false
        });
        return;
    }

    // Help command
    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(config.branding.color)
            .setTitle('🎨 Name That Artist - Help')
            .setDescription('Welcome to TTC\'s Name That Artist game!')
            .addFields(
                {
                    name: '📋 Commands',
                    value: '`/namethatartist` - Start a new game\n`/leaderboard` - View top players by score\n`/alltime` - View all-time leaderboards with sorting options\n`/stats` - View your personal stats\n`/stopgame` - Stop current game\n`/ping` - Check bot status\n`/help` - Show this message',
                },
                {
                    name: '🎮 How to Play',
                    value: `• Each game has ${config.game.roundsPerGame} rounds\n• You have ${config.game.roundTimeSeconds} seconds per round\n• Click the correct artist button\n• Faster answers = more points!\n• Only one answer per round`,
                },
                {
                    name: '⏱️ Cooldowns',
                    value: 'Commands have cooldowns to prevent spam:\n• Game start: 30s per user, 5s per channel\n• Leaderboard: 10s per user\n• Stats: 5s per user\n• Admins/Moderators bypass cooldowns',
                },
                {
                    name: '🏆 About',
                    value: 'NFTs from The Tezos Community wallet\nCelebrating Tezos artists and creativity!',
                }
            )
            .setFooter({ text: config.branding.name })
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed] });
        return;
    }
}

/**
 * Display a round with artwork and answer buttons
 */
async function displayRound(channel, channelId) {
    const roundData = gameManager.getCurrentRound(channelId);
    
    if (!roundData) {
        return;
    }

    const { round, roundNumber, totalRounds } = roundData;
    
    // Create embed with artwork
    const embed = new EmbedBuilder()
        .setColor(config.branding.color)
        .setTitle(`🎨 Round ${roundNumber}/${totalRounds}`)
        .setDescription(`**${round.token.name || 'Untitled'}**\n\nWho created this artwork?`)
        .setImage(round.token.imageUrl)
        .setFooter({ text: `⏱️ You have ${config.game.roundTimeSeconds} seconds to answer!` })
        .setTimestamp();

    // Create answer buttons
    const row = new ActionRowBuilder();
    round.choices.forEach(choice => {
        const button = new ButtonBuilder()
            .setCustomId(`answer_${channelId}_${choice.label}`)
            .setLabel(`${choice.label} ${gameManager.getArtistDisplayName(choice.artist)}`)
            .setStyle(ButtonStyle.Primary);
        row.addComponents(button);
    });

    const message = await channel.send({ embeds: [embed], components: [row] });
    
    // Store message ID
    const session = gameManager.getSession(channelId);
    if (session) {
        session.messageId = message.id;
    }

    // Start round timer
    setTimeout(async () => {
        await endRound(channel, channelId, message);
    }, config.game.roundTimeSeconds * 1000);
}

/**
 * End a round and show results
 */
async function endRound(channel, channelId, message) {
    const session = gameManager.getSession(channelId);
    if (!session || !session.isActive) return;

    const currentRound = session.rounds[session.currentRound];
    
    // Disable buttons
    try {
        const disabledRow = new ActionRowBuilder();
        currentRound.choices.forEach(choice => {
            const button = new ButtonBuilder()
                .setCustomId(`answer_${channelId}_${choice.label}`)
                .setLabel(`${choice.label} ${gameManager.getArtistDisplayName(choice.artist)}`)
                .setStyle(choice.isCorrect ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(true);
            disabledRow.addComponents(button);
        });
        
        await message.edit({ components: [disabledRow] });
    } catch (error) {
        console.error('Error updating message:', error);
    }

    // Show correct answer
    const correctChoice = currentRound.choices.find(c => c.isCorrect);
    const resultEmbed = new EmbedBuilder()
        .setColor(config.branding.color)
        .setTitle('⏰ Time\'s Up!')
        .setDescription(`The correct answer was: **${correctChoice.label} ${gameManager.getArtistDisplayName(correctChoice.artist)}**`)
        .setFooter({ text: 'Get ready for the next round!' });

    await channel.send({ embeds: [resultEmbed] });

    // Show round scores
    if (session.players.size > 0) {
        const scores = Array.from(session.players.values())
            .sort((a, b) => b.score - a.score)
            .map((p, i) => `${i + 1}. **${p.username}**: ${p.score} pts`)
            .join('\n');
        
        const scoreEmbed = new EmbedBuilder()
            .setColor(config.branding.color)
            .setTitle('📊 Current Scores')
            .setDescription(scores || 'No one has scored yet!')
            .setTimestamp();
        
        await channel.send({ embeds: [scoreEmbed] });
    }

    // Move to next round or end game
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const nextResult = gameManager.nextRound(channelId);
    
    if (nextResult.gameOver) {
        await endGame(channel, channelId, nextResult.finalScores);
    } else {
        await displayRound(channel, channelId);
    }
}

/**
 * End the game and show final results
 */
async function endGame(channel, channelId, finalScores) {
    await gameManager.endGame(channelId);

    const { winners, scores, totalPlayers } = finalScores;

    // Create winners announcement
    const winnerText = winners.length > 1 ?
        `🎉 **It's a tie!**\n${winners.map(w => `🏆 **${w.username}** - ${w.score} points`).join('\n')}` :
        `🏆 **Winner: ${winners[0].username}**\n${winners[0].score} points • ${winners[0].correctAnswers}/${config.game.roundsPerGame} correct`;

    const embed = new EmbedBuilder()
        .setColor(config.branding.color)
        .setTitle('🎮 Game Over!')
        .setDescription(winnerText)
        .setFooter({ text: `${config.branding.name} • ${totalPlayers} player(s)` })
        .setTimestamp();

    // Add final leaderboard
    if (scores.length > 1) {
        const leaderboardText = scores
            .slice(0, 10)
            .map((p, i) => `${i + 1}. **${p.username}** - ${p.score} pts (${p.correctAnswers} correct)`)
            .join('\n');
        
        embed.addFields({ name: '📊 Final Scores', value: leaderboardText });
    }

    await channel.send({ embeds: [embed] });
}

// Login to Discord
client.login(config.token)
    .catch((error) => {
        console.error('❌ Failed to login to Discord:', error);
        process.exit(1);
    });

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    compactionScheduler.stop();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    compactionScheduler.stop();
    client.destroy();
    process.exit(0);
});
