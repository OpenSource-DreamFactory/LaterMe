"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";

import { monadTestnet } from "@/lib/chain";
import {
  mealPactAbi,
  mealPactAddress,
  mealPactDeploymentBlock,
} from "@/lib/contracts/meal-pact";
import { createBlockRanges, type PactRecord } from "@/lib/pact-records";

export function useMealPacts(owner: Address | undefined) {
  const publicClient = usePublicClient({ chainId: monadTestnet.id });

  return useQuery({
    queryKey: ["meal-pacts", monadTestnet.id, mealPactAddress, owner],
    queryFn: async (): Promise<PactRecord[]> => {
      const contractAddress = mealPactAddress;
      if (!publicClient || !contractAddress || !owner) return [];

      const latestBlock = await publicClient.getBlockNumber();
      const ranges = createBlockRanges(mealPactDeploymentBlock, latestBlock);
      const logBatches = await Promise.all(
        ranges.map((range) =>
          publicClient.getContractEvents({
            abi: mealPactAbi,
            address: contractAddress,
            eventName: "PactCreated",
            args: { owner },
            fromBlock: range.fromBlock,
            toBlock: range.toBlock,
            strict: true,
          }),
        ),
      );
      const logs = logBatches.flat();

      if (logs.length === 0) return [];

      const pacts = await Promise.all(
        logs.map((log) =>
          publicClient.readContract({
            abi: mealPactAbi,
            address: contractAddress,
            functionName: "getPact" as const,
            args: [log.args.pactId],
          }),
        ),
      );

      return logs
        .map((log, index) => {
          const pact = pacts[index];
          if (!pact) throw new Error(`Missing state for pact ${log.args.pactId}`);

          return {
            id: log.args.pactId,
            owner: pact.owner,
            deadline: pact.deadline,
            amount: pact.amount,
            proposalHash: pact.proposalHash,
            completionHash: pact.completionHash,
            status: pact.status,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
          };
        })
        .sort((first, second) => Number(second.id - first.id));
    },
    enabled: Boolean(publicClient && mealPactAddress && owner),
    refetchInterval: 5_000,
    staleTime: 3_000,
  });
}
