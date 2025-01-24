import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";
import { BrowserRouter, Route, Routes } from "react-router";
import Chat from "./routes/chat";
import Overview from "./routes/overview";
import Home from "./routes/home";
import useVersion from "./hooks/use-version";
import {
    createNetworkConfig,
    SuiClientProvider,
    WalletProvider,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: Infinity,
        },
    },
});

const { networkConfig } = createNetworkConfig({
    localnet: { url: getFullnodeUrl("localnet") },
    mainnet: { url: getFullnodeUrl("mainnet") },
});

function App() {
    useVersion();
    return (
        <QueryClientProvider client={queryClient}>
            <div
                className="dark antialiased"
                style={{
                    colorScheme: "dark",
                }}
            >
                <QueryClientProvider client={queryClient}>
                    <SuiClientProvider
                        networks={networkConfig}
                        defaultNetwork="localnet"
                    >
                        <WalletProvider autoConnect={true}>
                            <BrowserRouter>
                                <TooltipProvider delayDuration={0}>
                                    <SidebarProvider>
                                        <div className="flex flex-1 flex-col gap-4 size-full container">
                                            <Routes>
                                                <Route
                                                    path="/"
                                                    element={<Home />}
                                                />
                                                <Route
                                                    path="chat/:agentId"
                                                    element={<Chat />}
                                                />
                                                <Route
                                                    path="settings/:agentId"
                                                    element={<Overview />}
                                                />
                                            </Routes>
                                        </div>
                                    </SidebarProvider>
                                    <Toaster />
                                </TooltipProvider>
                            </BrowserRouter>
                        </WalletProvider>
                    </SuiClientProvider>
                </QueryClientProvider>
            </div>
        </QueryClientProvider>
    );
}

export default App;
