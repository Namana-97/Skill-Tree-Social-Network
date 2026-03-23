import { useAdminConfig, useAdminStatus } from "@/hooks/use-agent";
import { Loader2, Settings as SettingsIcon, Database, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { data: status, isLoading: statusLoading } = useAdminStatus();
  const { mutate: updateConfig, isPending } = useAdminConfig();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<'mock' | 'real'>('mock');
  const [sfUsername, setSfUsername] = useState("");

  useEffect(() => {
    if (status) {
        setMode(status.mode);
    }
  }, [status]);

  const handleSave = () => {
    updateConfig({ mode, sfUsername }, {
        onSuccess: () => {
            toast({
                title: "Settings Saved",
                description: `Successfully switched to ${mode} mode.`,
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to update settings.",
                variant: "destructive",
            });
        }
    });
  };

  if (statusLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-muted rounded-xl">
            <SettingsIcon className="w-6 h-6 text-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure Salesforce connection and agent parameters.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/50">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Data Source Configuration
            </h2>
        </div>
        
        <div className="p-6 space-y-6">
            <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">Operation Mode</label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setMode('mock')}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            mode === 'mock' 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                            : 'border-border hover:border-border/80 hover:bg-muted/50'
                        }`}
                    >
                        <div className="font-semibold text-foreground mb-1">Mock Data</div>
                        <div className="text-xs text-muted-foreground">
                            Use generated local data. Perfect for testing without credentials.
                        </div>
                    </button>
                    <button
                        onClick={() => setMode('real')}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            mode === 'real' 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                            : 'border-border hover:border-border/80 hover:bg-muted/50'
                        }`}
                    >
                        <div className="font-semibold text-foreground mb-1">Real Salesforce</div>
                        <div className="text-xs text-muted-foreground">
                            Connect to a live Salesforce instance via API.
                        </div>
                    </button>
                </div>
            </div>

            {mode === 'real' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-medium text-foreground">Salesforce Username (Optional)</label>
                    <input 
                        type="text" 
                        value={sfUsername}
                        onChange={(e) => setSfUsername(e.target.value)}
                        placeholder="user@example.com.sandbox"
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                    />
                    <p className="text-xs text-muted-foreground">
                        Note: Full OAuth flow would be implemented in a production environment.
                    </p>
                </div>
            )}
        </div>

        <div className="p-6 bg-muted/30 border-t border-border/50 flex justify-end">
            <button
                onClick={handleSave}
                disabled={isPending}
                className="px-6 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
            >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
            </button>
        </div>
      </div>
    </div>
  );
}
