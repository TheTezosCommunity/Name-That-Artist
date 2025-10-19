/**
 * objkt.com GraphQL API Integration
 * Fetches NFT tokens from The Tezos Community wallet
 */

import { GraphQLClient, gql } from 'graphql-request';

const OBJKT_GRAPHQL_ENDPOINT = 'https://data.objkt.com/v3/graphql';
const TTC_WALLET_ADDRESS = 'tz1RZN17j7FuPtDpGpXKgMXbx57WEhpZGF6B';

// GraphQL client
const client = new GraphQLClient(OBJKT_GRAPHQL_ENDPOINT);

/**
 * GraphQL query to fetch tokens from a wallet
 */
const TOKENS_QUERY = gql`
  query GetWalletTokens($address: String!, $limit: Int!, $offset: Int!) {
    holder(where: {address: {_eq: $address}}) {
      held_tokens(offset: $offset, limit: $limit, distinct_on: token_pk) {
        token {
          token_id
          name
          description
          artifact_uri
          display_uri
          thumbnail_uri
          fa_contract
          creators {
            creator_address
          }
        }
      }
    }
  }
`;

/**
 * Fetch tokens from the TTC wallet with pagination
 * @param {number} limit - Number of tokens per page
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of tokens
 */
export async function fetchTokensFromWallet(limit = 100, offset = 0) {
    try {
        const data = await client.request(TOKENS_QUERY, {
            address: TTC_WALLET_ADDRESS,
            limit,
            offset
        });

        if (!data.holder || !data.holder[0]) {
            return [];
        }

        return data.holder[0].held_tokens.map(ht => ht.token);
    } catch (error) {
        console.error('Error fetching tokens from objkt.com:', error);
        throw error;
    }
}

/**
 * Fetch all tokens from the TTC wallet (handles pagination)
 * @param {number} batchSize - Number of tokens to fetch per request
 * @returns {Promise<Array>} All tokens from the wallet
 */
export async function fetchAllTokens(batchSize = 100) {
    const allTokens = [];
    let offset = 0;
    let hasMore = true;

    console.log('📦 Fetching tokens from TTC wallet...');

    while (hasMore) {
        try {
            const tokens = await fetchTokensFromWallet(batchSize, offset);
            
            if (tokens.length === 0) {
                hasMore = false;
            } else {
                allTokens.push(...tokens);
                offset += tokens.length;
                console.log(`   Fetched ${allTokens.length} tokens so far...`);
                
                // If we got less than the batch size, we've reached the end
                if (tokens.length < batchSize) {
                    hasMore = false;
                }
            }
        } catch (error) {
            console.error(`Error at offset ${offset}:`, error.message);
            hasMore = false;
        }
    }

    console.log(`✅ Total tokens fetched: ${allTokens.length}`);
    return allTokens;
}

/**
 * Normalize token data for game use
 * @param {Object} token - Raw token data from API
 * @returns {Object} Normalized token data
 */
export function normalizeToken(token) {
    // Get the best available image URL
    const imageUrl = token.display_uri || token.thumbnail_uri || token.artifact_uri;
    
    // Extract artist addresses
    const artists = token.creators?.map(c => c.creator_address) || [];
    const primaryArtist = artists[0] || 'Unknown Artist';

    return {
        tokenId: token.token_id,
        name: token.name || 'Untitled',
        description: token.description || '',
        imageUrl: imageUrl?.replace('ipfs://', 'https://ipfs.io/ipfs/') || null,
        artists: artists,
        primaryArtist: primaryArtist,
        contract: token.fa_contract
    };
}

/**
 * Get unique artists from token list
 * @param {Array} tokens - Array of normalized tokens
 * @returns {Array} Array of unique artist addresses
 */
export function getUniqueArtists(tokens) {
    const artistSet = new Set();
    
    tokens.forEach(token => {
        if (token.artists && token.artists.length > 0) {
            token.artists.forEach(artist => artistSet.add(artist));
        }
    });
    
    return Array.from(artistSet);
}

/**
 * Get random distractors (wrong answers) for a token
 * @param {Object} correctToken - The correct token
 * @param {Array} allArtists - All available artists
 * @param {number} count - Number of distractors needed
 * @returns {Array} Array of distractor artist addresses
 */
export function getDistractors(correctToken, allArtists, count = 3) {
    const correctArtist = correctToken.primaryArtist;
    const availableArtists = allArtists.filter(artist => artist !== correctArtist);
    
    // Shuffle and pick random distractors
    const shuffled = availableArtists.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}
