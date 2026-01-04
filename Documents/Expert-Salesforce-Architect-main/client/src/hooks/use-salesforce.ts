import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useLeads() {
  return useQuery({
    queryKey: [api.salesforce.leads.list.path],
    queryFn: async () => {
      const res = await fetch(api.salesforce.leads.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch leads");
      return api.salesforce.leads.list.responses[200].parse(await res.json());
    },
  });
}

export function useCases() {
  return useQuery({
    queryKey: [api.salesforce.cases.list.path],
    queryFn: async () => {
      const res = await fetch(api.salesforce.cases.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch cases");
      return api.salesforce.cases.list.responses[200].parse(await res.json());
    },
  });
}
