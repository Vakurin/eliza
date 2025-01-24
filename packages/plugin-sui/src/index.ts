import { Plugin } from "@elizaos/core";
import transferToken from "./actions/transfer.ts";
import convertNameToAddress from "./actions/convertNameToAddress.ts";
import swapToken from "./actions/swap.ts";
import { WalletProvider, walletProvider } from "./providers/wallet.ts";
import tokenInfo from "./actions/tokenInfo.ts";

export { WalletProvider, transferToken as TransferSuiToken };

export const suiPlugin: Plugin = {
    name: "sui",
    description: "Sui Plugin for Eliza",
    actions: [transferToken, convertNameToAddress, swapToken, tokenInfo],
    evaluators: [],
    providers: [walletProvider],
};

export default suiPlugin;
