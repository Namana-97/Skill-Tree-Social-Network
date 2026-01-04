import { useCases } from "@/hooks/use-salesforce";
import { Loader2, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Cases() {
  const { data: cases, isLoading, error } = useCases();

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error) return <div className="p-8 text-destructive">Error loading cases: {error.message}</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Support Cases</h1>
          <p className="text-muted-foreground mt-1">Track and resolve customer issues.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-border text-sm font-medium">
            Active Cases: {cases?.length || 0}
        </div>
      </div>

      <div className="space-y-4">
        {cases?.map((c) => (
          <div 
            key={c.id} 
            className="group bg-card hover:bg-white dark:hover:bg-slate-800 p-6 rounded-xl border border-border/50 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
          >
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        #{c.sfId || `CASE-${c.id}`}
                    </span>
                    <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1",
                        c.priority === "High" && "bg-red-50 text-red-700 border-red-200",
                        c.priority === "Medium" && "bg-orange-50 text-orange-700 border-orange-200",
                        c.priority === "Low" && "bg-green-50 text-green-700 border-green-200",
                    )}>
                        <AlertCircle className="w-3 h-3" />
                        {c.priority}
                    </span>
                    <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1",
                        c.status === "New" && "bg-blue-50 text-blue-700 border-blue-200",
                        c.status === "Closed" && "bg-gray-50 text-gray-700 border-gray-200",
                    )}>
                        {c.status === 'Closed' ? <CheckCircle2 className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                        {c.status}
                    </span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{c.subject}</h3>
                <p className="text-muted-foreground text-sm mt-1 line-clamp-1">{c.description}</p>
            </div>
            
            <div className="text-right text-sm text-muted-foreground flex flex-col items-end min-w-[120px]">
                <span>Created</span>
                <span className="font-medium text-foreground">
                    {c.createdAt ? format(new Date(c.createdAt), 'MMM dd, HH:mm') : 'N/A'}
                </span>
            </div>
          </div>
        ))}

        {cases?.length === 0 && (
            <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                No cases found.
            </div>
        )}
      </div>
    </div>
  );
}
