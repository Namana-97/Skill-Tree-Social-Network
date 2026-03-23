import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Message } from "@shared/schema";

export function useAgentHistory(conversationId: number | undefined) {
  return useQuery({
    queryKey: [api.agent.history.path, conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const url = buildUrl(api.agent.history.path, { conversationId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch history");
      return api.agent.history.responses[200].parse(await res.json());
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { text: string; conversationId?: number; user?: string; channel?: 'web' | 'slack' }) => {
      const res = await fetch(api.agent.message.path, {
        method: api.agent.message.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to send message");
      return api.agent.message.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      // Invalidate history to show new messages
      if (data.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: [api.agent.history.path, data.conversationId] 
        });
      }
    },
  });
}

export function useSimulateSprint() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.agent.simulateSprint.path, {
        method: api.agent.simulateSprint.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to run simulation");
      return api.agent.simulateSprint.responses[200].parse(await res.json());
    },
  });
}

export function useAdminConfig() {
  return useMutation({
    mutationFn: async (data: { mode: 'mock' | 'real'; sfUsername?: string }) => {
      const res = await fetch(api.admin.config.path, {
        method: api.admin.config.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update config");
      return api.admin.config.responses[200].parse(await res.json());
    },
  });
}

export function useAdminStatus() {
    return useQuery({
        queryKey: [api.admin.status.path],
        queryFn: async () => {
            const res = await fetch(api.admin.status.path, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch status");
            return api.admin.status.responses[200].parse(await res.json());
        }
    })
}
