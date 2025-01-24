import {
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    elizaLogger,
    generateObject,
    type Action,
} from "@elizaos/core";
import { z } from "zod";

import { walletProvider } from "../providers/wallet";

export interface TokenInfoContent extends Content {
    coinType: string;
}

function isTokenInfoContent(content: Content): content is TokenInfoContent {
    console.log("Content for token info", content);
    return typeof content.coinType === "string";
}

const tokenInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "coinType": "0x2::sui::SUI"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token:
- Coin type

Respond with a JSON markdown block containing only the extracted values.`;

const formatCoinDetails = (response: any[]): string => {
    if (!response) {
        return "Error: Data object is undefined or null.";
    }
    const data = response[0];

    const coinMetadata = data.coinMetadata || {};
    const decimals = Number(coinMetadata.decimals || 0);
    return `Coin Details:
  ID: ${data.id || "N/A"}
  Name: ${coinMetadata.name || "N/A"}
  Symbol: ${coinMetadata.symbol || "N/A"}
  Token Contract: ${coinMetadata.coinType || "N/A"}
  Description: ${coinMetadata.description || "N/A"}
  Decimals: ${decimals || "N/A"}
  Supply: ${data.coinSupply ? Number(data.coinSupply) / Math.pow(10, decimals) : "N/A"}

  Market Data:
  • Fully Diluted Market Cap: $${data.fullyDilutedMarketCap || "N/A"}
  • Market Cap: $${data.marketCap || "N/A"}
  • Total Liquidity (USD): $${data.totalLiquidityUsd || "N/A"}

  Token Burned:
  • Tokens Burned: ${data.tokensBurned ? Number(data.tokensBurned) / Math.pow(10, decimals) : "N/A"}
  • Burn Percentage: ${data.tokensBurnedPercentage || "N/A"}%
  • LP Burnt: ${data.lpBurnt ? "Yes" : "No"}

  Liquidity:
  • Tokens in Liquidity: ${data.tokensInLiquidity ? Number(data.tokensInLiquidity) / Math.pow(10, decimals) : "N/A"}
  • Tokens in Burnt LP: ${data.tokensInBurntLp ? Number(data.tokensInBurntLp) / Math.pow(10, decimals) : "N/A"}
  • SUI in Burnt LP: ${data.suiInBurntLp ? Number(data.suiInBurntLp) / Math.pow(10, 9) : "N/A"}
  • Percentage Token Supply in Liquidity: ${data.percentageTokenSupplyInLiquidity || "N/A"}%
  • Percentage Token Supply in Burnt LP: ${data.percentageTokenSupplyInBurntLp || "N/A"}%

  Holder Data:
  • Top 10 Holder Percentage: ${data.top10HolderPercentage || "N/A"}%
  • Top 20 Holder Percentage: ${data.top20HolderPercentage || "N/A"}%
  • Developer Holdings: ${data.coinDevHoldings ? Number(data.coinDevHoldings) / Math.pow(10, decimals) : "N/A"} (${data.coinDevHoldingsPercentage || "N/A"}%)

  Price Data:
  • Current Price: $${data.coinPrice || "N/A"}
  • 5m Change: ${data.percentagePriceChange5m || "N/A"}%
  • 1h Change: ${data.percentagePriceChange1h || "N/A"}%
  • 6h Change: ${data.percentagePriceChange6h || "N/A"}%
  • 24h Change: ${data.percentagePriceChange24h || "N/A"}%

  Volume (USD):
  • 5m: $${data.volume5m || "N/A"}
  • 1h: $${data.volume1h || "N/A"}
  • 6h: $${data.volume6h || "N/A"}
  • 24h: $${data.volume24h || "N/A"}

  Created:
  • Timestamp: ${data.timeCreated ? new Date(Number(data.timeCreated)).toISOString() : "N/A"}
  • Developer Address: ${data.coinDev || "N/A"}`;
};

export default {
    name: "TOKEN_INFO",
    similes: [
        "TOKEN_INFO",
        "TOKEN_INFO_SUI",
        "TOKEN_INFO_DETAILS",
        "TOKEN_INFO_SUI_DETAILS",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating token info from user:", message.userId);
        //add custom validate logic here
        /*
            const adminIds = runtime.getSetting("ADMIN_USER_IDS")?.split(",") || [];
            //console.log("Admin IDs from settings:", adminIds);

            const isAdmin = adminIds.includes(message.userId);

            if (isAdmin) {
                //console.log(`Authorized transfer from user: ${message.userId}`);
                return true;
            }
            else
            {
                //console.log(`Unauthorized transfer attempt from user: ${message.userId}`);
                return false;
            }
            */
        return true;
    },
    description: "Get information about a token",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting SEND_TOKEN handler...");

        const walletInfo = await walletProvider.get(runtime, message, state);
        state.walletInfo = walletInfo;

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Define the schema for the expected output
        const transferSchema = z.object({
            coinType: z.string(),
        });

        // Compose transfer context
        const transferContext = composeContext({
            state,
            template: tokenInfoTemplate,
        });

        // Generate transfer content with the schema
        const content = await generateObject({
            runtime,
            context: transferContext,
            schema: transferSchema,
            modelClass: ModelClass.SMALL,
        });

        const tokenInfoContent = content.object as TokenInfoContent;

        // Validate transfer content
        if (!isTokenInfoContent(tokenInfoContent)) {
            console.error("Invalid content for TOKEN_INFO action.");
            if (callback) {
                callback({
                    text: "Unable to process token info request. Invalid content provided.",
                    content: { error: "Invalid token info content" },
                });
            }
            return false;
        }

        async function fetchTokenInfo(coinType: string) {
            try {
                const response = await fetch(
                    `https://api.insidex.trade/external/coin-details?coins=${coinType}`
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(
                        `HTTP error! status: ${response.status}, message: ${errorText}`
                    );
                }

                const data = await response.json();
                return data;
            } catch (error) {
                console.error(`Attempt failed:`, error);
                return null;
            }
        }

        try {
            const tokenInfo = await fetchTokenInfo(tokenInfoContent.coinType);
            if (!tokenInfo) {
                console.error("Failed to fetch token info.");
                if (callback) {
                    callback({
                        text: "Failed to fetch token info.",
                        content: { error: "Failed to fetch token info" },
                    });
                }
                return false;
            }
            const formattedResponse = formatCoinDetails(tokenInfo);
            if (callback) {
                callback({
                    text: formattedResponse,
                    content: {
                        success: true,
                        tokenInfo: formattedResponse,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during token info:", error);
            if (callback) {
                callback({
                    text: `Error fetching token info: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is the token info for 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll fetch the token info now...",
                    action: "TOKEN_INFO",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully fetched token info for 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
