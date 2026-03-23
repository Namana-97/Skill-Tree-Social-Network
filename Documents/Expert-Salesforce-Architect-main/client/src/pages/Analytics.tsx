import { useSimulateSprint } from "@/hooks/use-agent";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Loader2, Zap, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function Analytics() {
  const { mutate: runSimulation, data: stats, isPending } = useSimulateSprint();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Agent Analytics</h1>
          <p className="text-muted-foreground mt-1">Performance simulation and metrics.</p>
        </div>
        <button
          onClick={() => runSimulation()}
          disabled={isPending}
          className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-accent to-purple-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          Run Sprint Simulation
        </button>
      </div>

      {!stats ? (
        <div className="bg-card rounded-3xl border border-border/50 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
                Run a sprint simulation to see how the agent handles ticket blockers, resolution times, and efficiency metrics.
            </p>
        </div>
      ) : (
        <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Blockers / Month</span>
                    </div>
                    <div className="text-3xl font-bold font-display">{stats.blockersPerMonth}</div>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Resolution Rate</span>
                    </div>
                    <div className="text-3xl font-bold font-display">{(stats.resolutionRate * 100).toFixed(1)}%</div>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Avg. Resolution Time</span>
                    </div>
                    <div className="text-3xl font-bold font-display">{stats.resolutionTime}h</div>
                </div>

                 <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                            <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">Velocity Impact</span>
                    </div>
                    <div className="text-3xl font-bold font-display">+14%</div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm h-[400px]">
                    <h3 className="text-lg font-bold mb-6">Resolution Trend ( Simulated)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                            { name: 'Week 1', value: 45 },
                            { name: 'Week 2', value: 52 },
                            { name: 'Week 3', value: 48 },
                            { name: 'Week 4', value: 61 },
                            { name: 'Week 5', value: 55 },
                            { name: 'Week 6', value: 67 },
                        ]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line type="monotone" dataKey="value" stroke="hsl(262 83% 58%)" strokeWidth={3} dot={{ r: 4, fill: "white", strokeWidth: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm h-[400px]">
                     <h3 className="text-lg font-bold mb-6">Efficiency by Category</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { name: 'Bugs', value: 85 },
                            { name: 'Features', value: 65 },
                            { name: 'Support', value: 92 },
                            { name: 'Refactor', value: 45 },
                        ]}>
                             <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                             <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" fill="hsl(210 100% 50%)" radius={[6, 6, 0, 0]} barSize={50} />
                        </BarChart>
                     </ResponsiveContainer>
                </div>
            </div>
        </>
      )}
    </div>
  );
}
