import { useState, useRef, useEffect } from "react";
import { useAgentHistory, useSendMessage } from "@/hooks/use-agent";
import { Send, Bot, User, CheckCircle2, Search, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function AgentChat() {
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: history, isLoading: historyLoading } = useAgentHistory(conversationId);
  const sendMessage = useSendMessage();

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, sendMessage.isPending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMessage.isPending) return;

    const userMessage = input;
    setInput("");

    try {
      const result = await sendMessage.mutateAsync({ 
        text: userMessage, 
        conversationId,
        user: "demo-user"
      });
      if (!conversationId) setConversationId(result.conversationId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
                <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h1 className="text-lg font-bold font-display">Salesforce Agent</h1>
                <p className="text-xs text-muted-foreground">AI Assistant • Powered by RAG</p>
            </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {historyLoading ? (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        ) : history?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                <Sparkles className="w-16 h-16 text-muted-foreground" />
                <p className="text-lg font-medium">Start a conversation with your agent</p>
            </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            <AnimatePresence>
            {history?.map((msg, idx) => (
              <motion.div 
                key={msg.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "agent" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                )}
                
                <div className={cn(
                  "max-w-[80%] space-y-2",
                  msg.role === "user" ? "items-end flex flex-col" : "items-start"
                )}>
                    {/* Main Content Bubble */}
                    <div className={cn(
                        "p-4 rounded-2xl shadow-sm text-sm md:text-base",
                        msg.role === "user" 
                            ? "bg-primary text-primary-foreground rounded-br-none" 
                            : "bg-white dark:bg-slate-800 border border-border rounded-bl-none"
                    )}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>

                    {/* Agent Actions/Reasoning Display */}
                    {msg.role === "agent" && msg.metadata && (msg.metadata as any).actions && (
                        <div className="flex flex-col gap-2 w-full">
                            {(msg.metadata as any).actions.map((action: any, i: number) => (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * i }}
                                    key={i} 
                                    className="text-xs flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg border border-border/50 self-start"
                                >
                                    {action.type === 'createLead' && <User className="w-3 h-3 text-green-500" />}
                                    {action.type === 'queryKnowledge' && <Search className="w-3 h-3 text-blue-500" />}
                                    {action.type === 'updateCase' && <CheckCircle2 className="w-3 h-3 text-orange-500" />}
                                    <span className="font-medium text-muted-foreground">Action: {action.type}</span>
                                    {action.reasoning && (
                                        <span className="text-muted-foreground/50 border-l border-border pl-2 italic truncate max-w-[200px]">
                                            {action.reasoning}
                                        </span>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                )}
              </motion.div>
            ))}
            </AnimatePresence>
            
            {/* Loading Indicator */}
            {sendMessage.isPending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                     <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl rounded-bl-none p-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-75" />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-150" />
                    </div>
                </motion.div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about leads, cases, or general questions..."
            disabled={sendMessage.isPending}
            className="w-full pl-6 pr-14 py-4 rounded-full bg-secondary/50 border border-border focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
          />
          <button 
            type="submit"
            disabled={!input.trim() || sendMessage.isPending}
            className="absolute right-2 top-2 bottom-2 aspect-square rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:hover:shadow-none transition-all"
          >
            {sendMessage.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-3">
            AI can make mistakes. Verify critical information.
        </p>
      </div>
    </div>
  );
}
