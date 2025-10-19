/**
 * Example Artists Data Structure
 * 
 * This file shows how to structure artist data for the Name That Artist game.
 * Replace the content in game.js SAMPLE_ARTISTS with real data following this format.
 */

export const exampleArtists = [
    {
        // Artist's full name or handle
        name: 'CryptoArtist',
        
        // Array of artwork image URLs
        // Tip: Use high-quality, publicly accessible image URLs
        artworks: [
            'https://example.com/artwork1.jpg',
            'https://example.com/artwork2.jpg',
            'https://example.com/artwork3.jpg',
        ],
        
        // Short bio about the artist (optional, for future features)
        bio: 'A talented digital artist creating amazing NFT art on Tezos.',
        
        // Additional metadata (optional, for future features)
        metadata: {
            tezosAddress: 'tz1...',
            twitter: '@cryptoartist',
            website: 'https://cryptoartist.com',
            style: 'Abstract Digital',
            activeYears: '2021-Present'
        }
    },
    
    {
        name: 'BlockchainCreator',
        artworks: [
            'https://example.com/creator-art1.jpg',
            'https://example.com/creator-art2.jpg',
        ],
        bio: 'Innovative artist exploring the intersection of blockchain and creativity.',
        metadata: {
            tezosAddress: 'tz1...',
            twitter: '@blockchaincreator',
            style: 'Generative Art',
        }
    },
    
    {
        name: 'NFT Master',
        artworks: [
            'https://example.com/nft-master-1.jpg',
        ],
        bio: 'Master of NFT art with a focus on community and culture.',
    },
];

/**
 * Tips for gathering artist data:
 * 
 * 1. Get Permission: Always get permission from artists before using their work
 * 2. Use Public URLs: Ensure image URLs are publicly accessible
 * 3. Image Quality: Use medium to high resolution images (400x400 or larger)
 * 4. Variety: Include diverse artists and art styles
 * 5. Attribution: Keep accurate artist information
 * 6. Update Regularly: Keep the artist list fresh with new additions
 * 
 * Where to find Tezos artists:
 * - objkt.com (primary Tezos NFT marketplace)
 * - teia.art (community-focused marketplace)
 * - fxhash.xyz (generative art platform)
 * - versum.xyz (curated marketplace)
 * 
 * How to use this data:
 * 1. Collect real artist data following this format
 * 2. Open game.js
 * 3. Replace SAMPLE_ARTISTS array with your real data
 * 4. Test the game with real artwork!
 */

// Example of how to add this to game.js:
/*
const SAMPLE_ARTISTS = [
    {
        name: 'Artist Name',
        artworks: ['url1', 'url2'],
        bio: 'Bio text'
    },
    // Add more artists...
];
*/
