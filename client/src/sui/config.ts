import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import * as process from "process";

export const NETWORK: "mainnet" | "testnet" | "devnet" =
    (process.env.NEXT_PUBLIC_NETWORK as any) || "mainnet";
export const CUSTOM_SUI_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

// DEVELOP
export const ENV_DEVELOPMENT: "development" | "production" =
    (process.env.NEXT_PUBLIC_ENV as any) || "production";
// todo: replace to useSuiClient
export const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });
