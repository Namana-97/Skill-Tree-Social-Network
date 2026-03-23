import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import NotFound from "@/pages/not-found";

// Pages
import AgentChat from "@/pages/AgentChat";
import Leads from "@/pages/Leads";
import Cases from "@/pages/Cases";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";

function Router() {
  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-black overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-full overflow-hidden bg-background relative">
        <Switch>
          <Route path="/" component={AgentChat} />
          <Route path="/leads" component={Leads} />
          <Route path="/cases" component={Cases} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
