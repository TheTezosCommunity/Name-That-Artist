/**
 * Name That Artist - Game Logic
 * TTC (The Tezos Community) Edition
 */

// Sample artists data structure (to be expanded with real Tezos artists)
const SAMPLE_ARTISTS = [
    {
        name: 'Artist Name',
        artworks: [
            'https://example.com/artwork1.jpg'
        ],
        bio: 'Sample artist bio'
    }
];

/**
 * Game class to manage Name That Artist game sessions
 */
export class NameThatArtistGame {
    constructor() {
        this.activeSessions = new Map();
        this.artists = SAMPLE_ARTISTS;
    }

    /**
     * Start a new game session
     * @param {string} channelId - Discord channel ID
     * @param {string} userId - Discord user ID who started the game
     * @returns {Object} Game session data
     */
    startGame(channelId, userId) {
        // Check if there's already an active game in this channel
        if (this.activeSessions.has(channelId)) {
            return {
                success: false,
                message: 'A game is already in progress in this channel!'
            };
        }

        // Select a random artist
        const artist = this.getRandomArtist();
        
        // Create game session
        const session = {
            channelId,
            startedBy: userId,
            artist: artist.name,
            artwork: artist.artworks[0],
            startTime: Date.now(),
            attempts: 0,
            maxAttempts: 3,
            hints: [],
            solved: false
        };

        this.activeSessions.set(channelId, session);

        return {
            success: true,
            session,
            artwork: artist.artworks[0],
            message: '🎨 **Name That Artist!**\n\nLook at this artwork and try to guess the artist!'
        };
    }

    /**
     * Check if a guess is correct
     * @param {string} channelId - Discord channel ID
     * @param {string} guess - Player's guess
     * @returns {Object} Result of the guess
     */
    checkGuess(channelId, guess) {
        const session = this.activeSessions.get(channelId);
        
        if (!session) {
            return {
                success: false,
                message: 'No active game in this channel. Start one with `/namethatartist`!'
            };
        }

        if (session.solved) {
            return {
                success: false,
                message: 'This game has already been solved!'
            };
        }

        session.attempts++;

        // Normalize both strings for comparison
        const normalizedGuess = guess.toLowerCase().trim();
        const normalizedAnswer = session.artist.toLowerCase().trim();

        // Check if the guess is correct
        if (normalizedGuess === normalizedAnswer) {
            session.solved = true;
            const timeTaken = Math.floor((Date.now() - session.startTime) / 1000);
            
            return {
                success: true,
                correct: true,
                message: `🎉 **Correct!** The artist is **${session.artist}**!\n\n⏱️ Time: ${timeTaken}s | 🎯 Attempts: ${session.attempts}`,
                artist: session.artist,
                attempts: session.attempts,
                timeTaken
            };
        }

        // Incorrect guess
        const attemptsLeft = session.maxAttempts - session.attempts;
        
        if (attemptsLeft <= 0) {
            session.solved = true;
            return {
                success: true,
                correct: false,
                gameOver: true,
                message: `❌ Game Over! The artist was **${session.artist}**.\n\nBetter luck next time!`,
                artist: session.artist
            };
        }

        return {
            success: true,
            correct: false,
            message: `❌ Not quite! You have ${attemptsLeft} attempt(s) left.`,
            attemptsLeft
        };
    }

    /**
     * End a game session
     * @param {string} channelId - Discord channel ID
     * @returns {boolean} Success status
     */
    endGame(channelId) {
        return this.activeSessions.delete(channelId);
    }

    /**
     * Get a random artist from the database
     * @returns {Object} Artist data
     */
    getRandomArtist() {
        const index = Math.floor(Math.random() * this.artists.length);
        return this.artists[index];
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
     * Get hint for current game
     * @param {string} channelId - Discord channel ID
     * @returns {Object} Hint result
     */
    getHint(channelId) {
        const session = this.activeSessions.get(channelId);
        
        if (!session) {
            return {
                success: false,
                message: 'No active game in this channel.'
            };
        }

        if (session.solved) {
            return {
                success: false,
                message: 'This game has already been solved!'
            };
        }

        // Generate hints based on artist name
        const artistName = session.artist;
        const hintNumber = session.hints.length + 1;

        let hint;
        if (hintNumber === 1) {
            hint = `The artist's name has ${artistName.length} characters.`;
        } else if (hintNumber === 2) {
            hint = `The artist's name starts with "${artistName[0]}".`;
        } else if (hintNumber === 3) {
            const letters = artistName.split('').filter(c => c !== ' ').length;
            hint = `The artist's name has ${letters} letters (excluding spaces).`;
        } else {
            return {
                success: false,
                message: 'No more hints available!'
            };
        }

        session.hints.push(hint);

        return {
            success: true,
            hint,
            message: `💡 **Hint ${hintNumber}:** ${hint}`
        };
    }
}

// Export singleton instance
export const gameManager = new NameThatArtistGame();
