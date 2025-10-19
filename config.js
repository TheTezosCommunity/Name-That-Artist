/**
 * Configuration file for Name That Artist bot
 * TTC (The Tezos Community) Edition
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Bot configuration
export const config = {
    // Discord credentials
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    
    // Environment
    environment: process.env.NODE_ENV || 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    
    // Bot settings
    bot: {
        name: 'Name That Artist',
        version: '1.0.0',
        description: 'Discord game for The Tezos Community',
        prefix: 'TTC',
    },
    
    // Game settings
    game: {
        maxAttempts: 3,
        timeoutMinutes: 10,
        hintCooldownSeconds: 30,
    },
    
    // Branding
    branding: {
        name: 'The Tezos Community',
        shortName: 'TTC',
        color: 0x2C7DF6, // Tezos blue
        emoji: '🎨',
    },
};

// Validate required configuration
export function validateConfig() {
    const errors = [];
    
    if (!config.token) {
        errors.push('DISCORD_TOKEN is not set');
    }
    
    if (!config.clientId) {
        errors.push('CLIENT_ID is not set (required for slash commands)');
    }
    
    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(error => console.error(`   - ${error}`));
        return false;
    }
    
    return true;
}

export default config;
