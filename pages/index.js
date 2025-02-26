"use client";
import React, { useEffect, useState } from "react";
import { createWalletClient, custom, publicActions } from "viem";
import {
  MantineProvider,
  Button,
  Container,
  Title,
  Text,
  Group,
  Loader,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";

// Define the correct INK Chain ID
const INK_CHAIN_ID = 57073;

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x74398b2a0ca8b01afa5b51658779ea85de4833c4";

const squidABI = [
  {
    inputs: [],
    name: "InkMe",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "checkInks",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

export default function Home() {
  return (
    <MantineProvider
      theme={{
        primaryShade: { dark: 9 },
        colors: {
          dark: [
            "#1a1a2e",
            "#16213e",
            "#0f3460",
            "#533483",
            "#6a0572",
            "#8a2be2",
            "#9b30ff",
            "#c71585",
            "#d2691e",
            "#ff4500", // Added to ensure 10 elements
          ],
        },
        primaryColor: "dark",
      }}
    >
      <App />
    </MantineProvider>
  );
}

function App() {
  const [walletClient, setWalletClient] = useState(null);
  const [account, setAccount] = useState(null);
  const [inkCount, setInkCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chainId, setChainId] = useState(null);

  useEffect(() => {
    async function connectWallet() {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const client = createWalletClient({
            chain: { id: INK_CHAIN_ID, name: "INK Mainnet" }, // Custom Chain
            transport: custom(window.ethereum),
          }).extend(publicActions);

          const [address] = await client.requestAddresses();
          setAccount(address);
          setWalletClient(client);

          // Get current network
          const network = await window.ethereum.request({
            method: "eth_chainId",
          });
          setChainId(parseInt(network, 16));

          // Listen for network changes
          window.ethereum.on("chainChanged", (newChainId) => {
            setChainId(parseInt(newChainId, 16));
            if (parseInt(newChainId, 16) !== INK_CHAIN_ID) {
              promptNetworkSwitch();
            }
          });
        } catch (error) {
          console.error("Wallet connection failed:", error);
          showNotification({
            title: "Error",
            message: "Failed to connect wallet.",
            color: "red",
          });
        }
      } else {
        showNotification({
          title: "MetaMask Required",
          message: "Please install or enable MetaMask.",
          color: "red",
        });
      }
    }
    connectWallet();
  }, []);

  async function promptNetworkSwitch() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${INK_CHAIN_ID.toString(16)}` }],
      });
      setChainId(INK_CHAIN_ID);
      showNotification({
        title: "Network Switched",
        message: "Switched to INK Mainnet ✅",
        color: "green",
      });
    } catch (error) {
      if (error.code === 4001) {
        showNotification({
          title: "Switch Rejected",
          message: "You need to switch to INK Mainnet manually.",
          color: "red",
        });
      } else {
        console.error("Failed to switch network:", error);
        showNotification({
          title: "Error",
          message: "Failed to switch to INK Mainnet.",
          color: "red",
        });
      }
    }
  }

  async function fetchInkCount() {
    if (!walletClient) return;
    setLoading(true);
    try {
      const count = await walletClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: squidABI,
        functionName: "checkInks",
      });
      setInkCount(Number(count));
    } catch (error) {
      console.error("Error fetching ink count:", error);
      showNotification({
        title: "Error",
        message: "Failed to fetch ink count.",
        color: "red",
      });
    }
    setLoading(false);
  }

  async function inkMe() {
    if (!walletClient || !account) return;
    setLoading(true);
    try {
      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: squidABI,
        functionName: "InkMe",
        account,
      });

      showNotification({
        title: "Transaction Sent",
        message: "Waiting for confirmation...",
        color: "blue",
      });

      // Wait for transaction confirmation
      const receipt = await waitForTransaction(txHash);
      if (receipt) {
        showNotification({
          title: "Transaction Confirmed",
          message: "InkMe() executed successfully!",
          color: "green",
        });
        fetchInkCount();
      } else {
        showNotification({
          title: "Transaction Failed",
          message: "InkMe() did not complete.",
          color: "red",
        });
      }
    } catch (error) {
      if (error.code === 4001) {
        showNotification({
          title: "Transaction Rejected",
          message: "User rejected the transaction.",
          color: "red",
        });
      } else {
        console.error("Transaction failed:", error);
        showNotification({
          title: "Error",
          message: "Failed to execute InkMe().",
          color: "red",
        });
      }
    }
    setLoading(false);
  }

  async function waitForTransaction(txHash) {
    try {
      let receipt = null;
      while (!receipt) {
        receipt = await window.ethereum.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        });
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before checking again
      }
      return receipt;
    } catch (error) {
      console.error("Error waiting for transaction:", error);
      return null;
    }
  }

  return (
    <Container size="xs" py={40} style={{ textAlign: "center" }}>
      <Title order={1} style={{ color: "#8a2be2" }}>
        🦑 Squid Contract Interaction
      </Title>

      {account ? (
        <>
          <Text mt="md" size="lg">
            Connected: <strong>{account}</strong>
          </Text>
          <Text
            mt="md"
            size="xl"
            style={{ color: chainId === INK_CHAIN_ID ? "lightgreen" : "red" }}
          >
            <strong>Current Network:</strong>{" "}
            {chainId === INK_CHAIN_ID ? "INK Mainnet ✅" : "Wrong Network ❌"}
          </Text>

          {chainId !== INK_CHAIN_ID && (
            <Button color="red" mt="md" onClick={promptNetworkSwitch}>
              Switch to INK Mainnet
            </Button>
          )}

          <Text mt="md" size="xl">
            <strong>Current Inks:</strong>{" "}
            {loading ? (
              <Loader size="sm" />
            ) : inkCount !== null ? (
              inkCount
            ) : (
              "Loading..."
            )}
          </Text>

          <Group mt="md">
            <Button color="violet" onClick={inkMe} loading={loading}>
              Ink Me
            </Button>
            <Button color="gray" onClick={fetchInkCount} loading={loading}>
              Refresh Count
            </Button>
          </Group>
        </>
      ) : (
        <Text mt="md" size="lg" color="red">
          🔌 MetaMask not detected. Please install or enable it.
        </Text>
      )}
    </Container>
  );
}
