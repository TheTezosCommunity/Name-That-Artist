/**
 * Name That Artist - Game Logic
 * TTC (The Tezos Community) Edition
 * Multi-round, multiple-choice trivia game
 */

import { config } from "./config.js";
import { loadTokens, needsTokenRefresh } from "./services/storage.js";
import {
    fetchAllTokens,
    normalizeToken,
    getUniqueArtists,
    getDistractors,
    batchResolveArtistNames,
} from "./services/objkt-api.js";

/**
 * Game class to manage Name That Artist game sessions
 */
export class NameThatArtistGame {
    constructor() {
        this.activeSessions = new Map();
        this.tokens = [];
        this.artists = [];
        this.artistInfo = {}; // Map of address -> artist info (alias, tzdomain, etc.)
        this.isInitialized = false;
    }

    /**
     * Initialize game data (fetch/load tokens)
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log("🎮 Initializing Name That Artist game...");

        try {
            // Check if we need to refresh tokens
            const needsRefresh = await needsTokenRefresh();

            if (needsRefresh) {
                console.log("📥 Fetching fresh token data from objkt.com...");
                const rawTokens = await fetchAllTokens();
                this.tokens = rawTokens.map(normalizeToken).filter((t) => t.imageUrl);

                // Extract unique artists
                const allArtists = getUniqueArtists(this.tokens);

                // Resolve artist names (alias/tzdomain)
                console.log("🔍 Resolving artist information...");
                this.artistInfo = await batchResolveArtistNames(allArtists);

                // Save to cache with artist info
                const { saveTokens } = await import("./services/storage.js");
                await saveTokens(this.tokens, this.artistInfo);
            } else {
                console.log("📂 Loading tokens from cache...");
                const data = await loadTokens();
                this.tokens = data.tokens;
                this.artistInfo = data.artistInfo || {};

                // If no artist info in cache, resolve it now
                if (Object.keys(this.artistInfo).length === 0) {
                    const allArtists = getUniqueArtists(this.tokens);
                    console.log("🔍 Resolving artist information (not in cache)...");
                    this.artistInfo = await batchResolveArtistNames(allArtists);

                    // Update cache with artist info
                    const { saveTokens } = await import("./services/storage.js");
                    await saveTokens(this.tokens, this.artistInfo);
                }
            }

            // Filter artists based on config
            const allArtists = getUniqueArtists(this.tokens);
            if (config.game.excludeUnresolvedArtists) {
                this.artists = allArtists.filter((address) => this.artistInfo[address]?.hasResolution);
                console.log(`   Filtered to ${this.artists.length} artists with alias/domain`);

                // Filter tokens to only include those with resolved artists
                this.tokens = this.tokens.filter((token) => this.artistInfo[token.primaryArtist]?.hasResolution);
                console.log(`   Filtered to ${this.tokens.length} tokens with resolved artists`);
            } else {
                this.artists = allArtists;
            }

            console.log(
                `✅ Game initialized with ${this.tokens.length} tokens and ${this.artists.length} unique artists`
            );
            this.isInitialized = true;
        } catch (error) {
            console.error("❌ Failed to initialize game:", error);
            throw error;
        }
    }

    /**
     * Start a new game session
     * @param {string} channelId - Discord channel ID
     * @param {string} userId - Discord user ID who started the game
     * @param {string} username - Discord username
     * @param {number} rounds - Number of rounds to play (optional, defaults to config value)
     * @returns {Object} Game session data
     */
    async startGame(channelId, userId, username, rounds = null) {
        // Check if game is initialized
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Check if there's already an active game in this channel
        if (this.activeSessions.has(channelId)) {
            return {
                success: false,
                message: "A game is already in progress in this channel! Wait for it to finish.",
            };
        }

        // Use provided rounds or default to config value
        const totalRounds = rounds || config.game.roundsPerGame;

        // Check if we have enough tokens
        if (this.tokens.length < totalRounds) {
            return {
                success: false,
                message: `Not enough tokens to start a game. Need at least ${totalRounds} tokens.`,
            };
        }

        // Select random tokens for this game (no repeats)
        const gameTokens = this.selectRandomTokens(totalRounds);

        // Create game session
        const session = {
            channelId,
            startedBy: userId,
            startedByUsername: username,
            startTime: Date.now(),
            currentRound: 0,
            totalRounds: totalRounds,
            rounds: gameTokens.map((token) => ({
                token,
                choices: this.generateChoices(token),
                startTime: null,
                endTime: null,
                correctAnswer: token.primaryArtist,
                answered: new Set(), // Users who have answered
            })),
            players: new Map(), // userId -> {username, score, correctAnswers, incorrectAnswers}
            isActive: true,
            messageId: null, // Discord message ID for the current round
        };

        this.activeSessions.set(channelId, session);

        return {
            success: true,
            session,
        };
    }

    /**
     * Select random tokens for the game
     * @param {number} count - Number of tokens to select
     * @returns {Array} Array of random tokens
     */
    selectRandomTokens(count) {
        const shuffled = [...this.tokens].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    /**
     * Generate multiple choice answers for a token
     * @param {Object} token - The token to generate choices for
     * @returns {Array} Array of choices with labels (A, B, C, D)
     */
    generateChoices(token) {
        const distractors = getDistractors(token, this.artists, config.game.multipleChoiceCount - 1);
        const choices = [token.primaryArtist, ...distractors];

        // Shuffle choices
        const shuffled = choices.sort(() => 0.5 - Math.random());

        // Add labels (1, 2, 3, 4) using keycap digit emojis
        const labels = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];
        return shuffled.map((artist, index) => ({
            label: labels[index],
            artist,
            isCorrect: artist === token.primaryArtist,
        }));
    }

    /**
     * Process a player's answer for the current round
     * @param {string} channelId - Discord channel ID
     * @param {string} userId - Discord user ID
     * @param {string} username - Discord username
     * @param {string} choiceLabel - Choice label (A, B, C, D)
     * @returns {Object} Result of the answer
     */
    async processAnswer(channelId, userId, username, choiceLabel) {
        const session = this.activeSessions.get(channelId);

        if (!session || !session.isActive) {
            return {
                success: false,
                message: "No active game in this channel.",
            };
        }

        const currentRound = session.rounds[session.currentRound];

        // Check if user already answered this round
        if (currentRound.answered.has(userId)) {
            return {
                success: false,
                message: "You have already answered this round!",
                alreadyAnswered: true,
            };
        }

        // Find the selected choice
        const selectedChoice = currentRound.choices.find((c) => c.label === choiceLabel);
        if (!selectedChoice) {
            return {
                success: false,
                message: "Invalid choice.",
            };
        }

        // Mark as answered
        currentRound.answered.add(userId);

        // Initialize player if not exists
        if (!session.players.has(userId)) {
            session.players.set(userId, {
                username,
                score: 0,
                correctAnswers: 0,
                incorrectAnswers: 0,
            });
        }

        const player = session.players.get(userId);
        const isCorrect = selectedChoice.isCorrect;

        // Calculate score if correct
        if (isCorrect) {
            const timeElapsed = (Date.now() - currentRound.startTime) / 1000;
            const timeRemaining = Math.max(0, config.game.roundTimeSeconds - timeElapsed);
            const score = Math.round(config.game.baseScore * (timeRemaining / config.game.roundTimeSeconds));

            player.score += score;
            player.correctAnswers++;

            return {
                success: true,
                correct: true,
                score,
                totalScore: player.score,
                message: `✅ Correct! +${score} points`,
            };
        } else {
            player.incorrectAnswers++;

            return {
                success: true,
                correct: false,
                message: `❌ Wrong answer!`,
            };
        }
    }

    /**
     * Start the next round
     * @param {string} channelId - Discord channel ID
     * @returns {Object} Next round data or game end data
     */
    nextRound(channelId) {
        const session = this.activeSessions.get(channelId);

        if (!session) {
            return {
                success: false,
                message: "No active game in this channel.",
            };
        }

        // Move to next round
        session.currentRound++;

        // Check if game is over
        if (session.currentRound >= session.totalRounds) {
            return {
                success: true,
                gameOver: true,
                finalScores: this.getFinalScores(session),
            };
        }

        // Start timing for the new round
        const currentRound = session.rounds[session.currentRound];
        currentRound.startTime = Date.now();

        return {
            success: true,
            gameOver: false,
            round: currentRound,
            roundNumber: session.currentRound + 1,
            totalRounds: session.totalRounds,
        };
    }

    /**
     * Get current round data
     * @param {string} channelId - Discord channel ID
     * @returns {Object|null} Current round data
     */
    getCurrentRound(channelId) {
        const session = this.activeSessions.get(channelId);
        if (!session) return null;

        const currentRound = session.rounds[session.currentRound];

        // Start timing if not started
        if (!currentRound.startTime) {
            currentRound.startTime = Date.now();
        }

        return {
            round: currentRound,
            roundNumber: session.currentRound + 1,
            totalRounds: session.totalRounds,
            players: Array.from(session.players.values()),
        };
    }

    /**
     * Get final scores and determine winners
     * @param {Object} session - Game session
     * @returns {Object} Final results
     */
    getFinalScores(session) {
        const scores = Array.from(session.players.entries()).map(([userId, data]) => ({
            userId,
            username: data.username,
            score: data.score,
            correctAnswers: data.correctAnswers,
            incorrectAnswers: data.incorrectAnswers,
        }));

        // Sort by score (descending)
        scores.sort((a, b) => b.score - a.score);

        // Determine winners (handle ties)
        const topScore = scores[0]?.score || 0;
        const winners = scores.filter((s) => s.score === topScore);

        return {
            scores,
            winners,
            totalPlayers: scores.length,
        };
    }

    /**
     * End a game session
     * @param {string} channelId - Discord channel ID
     * @returns {boolean} Success status
     */
    async endGame(channelId) {
        const session = this.activeSessions.get(channelId);
        if (session) {
            session.isActive = false;

            // Save final scores to storage
            const { updatePlayerStats } = await import("./services/storage.js");
            const finalScores = this.getFinalScores(session);

            for (const player of finalScores.scores) {
                const isWinner = finalScores.winners.some((w) => w.userId === player.userId);
                await updatePlayerStats(
                    player.userId,
                    player.username,
                    player.score,
                    isWinner,
                    player.correctAnswers,
                    player.incorrectAnswers
                );
            }
        }

        return this.activeSessions.delete(channelId);
    }

    /**
     * Get active game session for a channel
     * @param {string} channelId - Discord channel ID
     * @returns {Object|null} Game session or null
     */
    getSession(channelId) {
        return this.activeSessions.get(channelId) || null;
    }

    /**
     * Check if round time has expired
     * @param {string} channelId - Discord channel ID
     * @returns {boolean} True if time expired
     */
    isRoundTimeExpired(channelId) {
        const session = this.activeSessions.get(channelId);
        if (!session) return false;

        const currentRound = session.rounds[session.currentRound];
        if (!currentRound.startTime) return false;

        const elapsed = (Date.now() - currentRound.startTime) / 1000;
        return elapsed >= config.game.roundTimeSeconds;
    }

    /**
     * Get display name for an artist (with failover)
     * Priority: alias -> tzdomain -> shortened wallet address
     * @param {string} address - Tezos wallet address
     * @returns {string} Display name
     */
    getArtistDisplayName(address) {
        const info = this.artistInfo[address];
        if (info?.displayName) {
            return info.displayName;
        }
        return this.formatArtistAddress(address);
    }

    /**
     * Format artist address for display (shorten)
     * @param {string} address - Tezos address
     * @returns {string} Formatted address
     */
    formatArtistAddress(address) {
        if (address.length <= 12) return address;
        return `${address.slice(0, 7)}...${address.slice(-5)}`;
    }
}

// Export singleton instance
export const gameManager = new NameThatArtistGame();
