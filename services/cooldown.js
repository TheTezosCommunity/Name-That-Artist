/**
 * Cooldown Manager Service
 * Handles command rate limiting and spam prevention
 */

import { config } from '../config.js';

/**
 * CooldownManager class to track and enforce cooldowns
 */
export class CooldownManager {
    constructor() {
        // Map of command -> Map of userId -> timestamp
        this.userCooldowns = new Map();
        // Map of command -> Map of channelId -> timestamp
        this.channelCooldowns = new Map();
    }

    /**
     * Check if a user is on cooldown for a command
     * @param {string} commandName - Command name
     * @param {string} userId - Discord user ID
     * @returns {Object} { onCooldown: boolean, remainingTime: number }
     */
    checkUserCooldown(commandName, userId) {
        const cooldownDuration = config.cooldowns?.commands?.[commandName]?.user || 0;
        
        if (cooldownDuration === 0) {
            return { onCooldown: false, remainingTime: 0 };
        }

        if (!this.userCooldowns.has(commandName)) {
            this.userCooldowns.set(commandName, new Map());
        }

        const commandCooldowns = this.userCooldowns.get(commandName);
        const lastUsed = commandCooldowns.get(userId);

        if (!lastUsed) {
            return { onCooldown: false, remainingTime: 0 };
        }

        const timePassed = Date.now() - lastUsed;
        const cooldownMs = cooldownDuration * 1000;

        if (timePassed < cooldownMs) {
            return {
                onCooldown: true,
                remainingTime: Math.ceil((cooldownMs - timePassed) / 1000)
            };
        }

        return { onCooldown: false, remainingTime: 0 };
    }

    /**
     * Check if a channel is on cooldown for a command
     * @param {string} commandName - Command name
     * @param {string} channelId - Discord channel ID
     * @returns {Object} { onCooldown: boolean, remainingTime: number }
     */
    checkChannelCooldown(commandName, channelId) {
        const cooldownDuration = config.cooldowns?.commands?.[commandName]?.channel || 0;
        
        if (cooldownDuration === 0) {
            return { onCooldown: false, remainingTime: 0 };
        }

        if (!this.channelCooldowns.has(commandName)) {
            this.channelCooldowns.set(commandName, new Map());
        }

        const commandCooldowns = this.channelCooldowns.get(commandName);
        const lastUsed = commandCooldowns.get(channelId);

        if (!lastUsed) {
            return { onCooldown: false, remainingTime: 0 };
        }

        const timePassed = Date.now() - lastUsed;
        const cooldownMs = cooldownDuration * 1000;

        if (timePassed < cooldownMs) {
            return {
                onCooldown: true,
                remainingTime: Math.ceil((cooldownMs - timePassed) / 1000)
            };
        }

        return { onCooldown: false, remainingTime: 0 };
    }

    /**
     * Set cooldown for a user on a command
     * @param {string} commandName - Command name
     * @param {string} userId - Discord user ID
     */
    setUserCooldown(commandName, userId) {
        if (!this.userCooldowns.has(commandName)) {
            this.userCooldowns.set(commandName, new Map());
        }

        const commandCooldowns = this.userCooldowns.get(commandName);
        commandCooldowns.set(userId, Date.now());
    }

    /**
     * Set cooldown for a channel on a command
     * @param {string} commandName - Command name
     * @param {string} channelId - Discord channel ID
     */
    setChannelCooldown(commandName, channelId) {
        if (!this.channelCooldowns.has(commandName)) {
            this.channelCooldowns.set(commandName, new Map());
        }

        const commandCooldowns = this.channelCooldowns.get(commandName);
        commandCooldowns.set(channelId, Date.now());
    }

    /**
     * Clear cooldown for a user on a command (admin override)
     * @param {string} commandName - Command name
     * @param {string} userId - Discord user ID
     */
    clearUserCooldown(commandName, userId) {
        if (this.userCooldowns.has(commandName)) {
            this.userCooldowns.get(commandName).delete(userId);
        }
    }

    /**
     * Clear cooldown for a channel on a command (admin override)
     * @param {string} commandName - Command name
     * @param {string} channelId - Discord channel ID
     */
    clearChannelCooldown(commandName, channelId) {
        if (this.channelCooldowns.has(commandName)) {
            this.channelCooldowns.get(commandName).delete(channelId);
        }
    }

    /**
     * Clean up old cooldown entries to prevent memory leaks
     */
    cleanup() {
        const now = Date.now();
        const maxAge = 3600000; // 1 hour

        // Clean user cooldowns
        for (const [command, userMap] of this.userCooldowns.entries()) {
            const cooldownDuration = (config.cooldowns?.commands?.[command]?.user || 0) * 1000;
            const cutoff = now - Math.max(cooldownDuration, maxAge);

            for (const [userId, timestamp] of userMap.entries()) {
                if (timestamp < cutoff) {
                    userMap.delete(userId);
                }
            }

            if (userMap.size === 0) {
                this.userCooldowns.delete(command);
            }
        }

        // Clean channel cooldowns
        for (const [command, channelMap] of this.channelCooldowns.entries()) {
            const cooldownDuration = (config.cooldowns?.commands?.[command]?.channel || 0) * 1000;
            const cutoff = now - Math.max(cooldownDuration, maxAge);

            for (const [channelId, timestamp] of channelMap.entries()) {
                if (timestamp < cutoff) {
                    channelMap.delete(channelId);
                }
            }

            if (channelMap.size === 0) {
                this.channelCooldowns.delete(command);
            }
        }
    }

    /**
     * Check if a user has permission to bypass cooldowns
     * @param {Object} interaction - Discord interaction object
     * @returns {boolean} True if user can bypass cooldowns
     */
    canBypassCooldown(interaction) {
        // Server administrators can bypass cooldowns
        if (interaction.memberPermissions?.has('Administrator')) {
            return true;
        }

        // Check for specific bypass permissions defined in config
        const bypassPermissions = config.cooldowns?.bypassPermissions || ['ManageMessages'];
        for (const permission of bypassPermissions) {
            if (interaction.memberPermissions?.has(permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Format remaining time for user-friendly display
     * @param {number} seconds - Remaining seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (remainingSeconds === 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        
        return `${minutes}m ${remainingSeconds}s`;
    }
}

// Export singleton instance
export const cooldownManager = new CooldownManager();

// Start periodic cleanup (every 10 minutes)
setInterval(() => {
    cooldownManager.cleanup();
}, 600000);
