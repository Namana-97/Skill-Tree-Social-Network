import { useLeads } from "@/hooks/use-salesforce";
import { Loader2, Mail, Building, Target, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Leads() {
  const { data: leads, isLoading, error } = useLeads();

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error) return <div className="p-8 text-destructive">Error loading leads: {error.message}</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">Manage and track potential opportunities.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-border text-sm font-medium">
            Total Leads: {leads?.length || 0}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leads?.map((lead) => (
          <div 
            key={lead.id} 
            className="group bg-card hover:bg-white dark:hover:bg-slate-800 p-6 rounded-2xl border border-border/50 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-bold">
                {lead.firstName[0]}{lead.lastName[0]}
              </div>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                lead.status === "New" && "bg-blue-50 text-blue-700 border-blue-200",
                lead.status === "Contacted" && "bg-yellow-50 text-yellow-700 border-yellow-200",
                lead.status === "Qualified" && "bg-green-50 text-green-700 border-green-200",
                lead.status === "Closed" && "bg-gray-50 text-gray-700 border-gray-200",
              )}>
                {lead.status}
              </span>
            </div>

            <h3 className="text-lg font-bold text-foreground mb-1">{lead.firstName} {lead.lastName}</h3>
            
            <div className="space-y-2 mt-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Building className="w-4 h-4 mr-2 opacity-70" />
                {lead.company || "No Company"}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="w-4 h-4 mr-2 opacity-70" />
                {lead.email}
              </div>
               <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2 opacity-70" />
                {lead.createdAt ? format(new Date(lead.createdAt), 'MMM dd, yyyy') : 'N/A'}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Score: {lead.score}</span>
                </div>
                <button className="text-sm font-medium text-primary hover:underline">View Details</button>
            </div>
          </div>
        ))}
        {leads?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                No leads found. Ask the agent to create one!
            </div>
        )}
      </div>
    </div>
  );
}
