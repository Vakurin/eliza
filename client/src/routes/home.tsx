import { useQuery } from "@tanstack/react-query";
import { Cog } from "lucide-react";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import { NavLink } from "react-router";
import { UUID } from "@elizaos/core";
import { formatAgentName } from "@/lib/utils";
import {
    ConnectButton,
    useCurrentAccount,
    useCurrentWallet,
} from "@mysten/dapp-kit";
import { useEffect } from "react";
import { suiClient } from "../sui/config.ts";

// todo: change later
const NFT_COLLECTION_TYPE =
    "0x862810efecf0296db2e9df3e075a7af8034ba374e73ff1098e88cc4bb7c15437::doubleup_citizens::DoubleUpCitizen";
// aggregator from walrus list https://docs.walrus.site/usage/web-api.html
const AGGREGATOR_URL = "https://aggregator.walrus-testnet.walrus.space";
// test blob id on walrus for character
const blobId = "V6GeZTHluUyS7PGAaWJE3XtvnHbWcA_T2oLaw-nSy6w";

export default function Home() {
    const query = useQuery({
        queryKey: ["agents"],
        queryFn: () => apiClient.getAgents(),
        refetchInterval: 5_000,
    });

    const currentAccount = useCurrentAccount();

    // TODO: add pagination logic ?
    // fetch nfts by collection
    const { data: nftObjects, isLoading: isNftObjectsLoading } = useQuery({
        queryKey: ["nfts-by-collection"],
        queryFn: async () => {
            const result = await suiClient.getOwnedObjects({
                owner: currentAccount?.address || "",
                filter: {
                    StructType: NFT_COLLECTION_TYPE,
                },
                options: {
                    showType: true,
                    showContent: true,
                },
            });
            return result;
        },
    });

    // example of fetching json by blob id
    useEffect(() => {
        const fetchAndParseJsonBlob = async (blobId: string) => {
            try {
                const response = await fetch(
                    `${AGGREGATOR_URL}/v1/blobs/${blobId}`
                );

                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }

                const blob = await response.blob();
                const text = await blob.text();
                const jsonData = JSON.parse(text);

                return jsonData;
            } catch (error) {
                console.error("Error fetching or parsing JSON blob:", error);
            }
        };

        // Example usage
        fetchAndParseJsonBlob(blobId).then((jsonData) => {
            // parsed character
            console.log("Parsed JSON data:", jsonData);
            // Use the jsonData in your application
        });
    }, [nftObjects]);

    const agents = query?.data?.agents;

    return (
        <div className="flex flex-col gap-4 h-full p-4">
            <ConnectButton />
            {currentAccount && (
                <>
                    <h2>Choose agent:</h2>
                    <div className="grid grid-cols-4 gap-3">
                        {nftObjects ? (
                            nftObjects.data.map((object) => {
                                return (
                                    <button className="rounded-lg overflow-hidden">
                                        {/* TODO: change image url path for different nft collection */}
                                        <img
                                            src={
                                                object.data?.content?.fields
                                                    ?.img_url
                                            }
                                        />
                                    </button>
                                );
                            })
                        ) : isNftObjectsLoading ? (
                            // TODO: add skeleton
                            <div>skeleton</div>
                        ) : (
                            <div>You don't have any nfts</div>
                        )}
                    </div>
                </>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {agents?.map((agent: { id: UUID; name: string }) => (
                    <Card key={agent.id}>
                        <CardHeader>
                            <CardTitle>{agent?.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md bg-muted aspect-square w-full grid place-items-center">
                                <div className="text-6xl font-bold uppercase">
                                    {formatAgentName(agent?.name)}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <div className="flex items-center gap-4 w-full">
                                <NavLink
                                    to={`/chat/${agent.id}`}
                                    className="w-full grow"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full grow"
                                    >
                                        Chat
                                    </Button>
                                </NavLink>
                                <NavLink
                                    to={`/settings/${agent.id}`}
                                    key={agent.id}
                                >
                                    <Button size="icon" variant="outline">
                                        <Cog />
                                    </Button>
                                </NavLink>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
