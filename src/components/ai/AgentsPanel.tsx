import ChatWidget from './ChatWidget';

function AgentCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-4 border rounded-lg bg-white/50 dark:bg-slate-800/60">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground mt-2">{desc}</div>
      <div className="mt-3">
        <button className="btn btn-outline">Try</button>
      </div>
    </div>
  );
}

export default function AgentsPanel() {
  return (
    <aside className="p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold">AI Agents</h3>
        <p className="text-sm text-muted-foreground">Explore agentic features — demo-only cards and chatbot.</p>
      </div>

      <div className="grid gap-3">
        <AgentCard title="Agentic" desc="Autonomous agents for hosting tasks: provisioning, backups, automation (demo)." />
        <AgentCard title="Generative" desc="Generate site copy, templates, and email responses using generative models (demo)." />
        <AgentCard title="Search Assistant" desc="Domain search assistant and DNS helper — improves results with context (demo)." />
      </div>

      <div className="mt-6">
        <h4 className="font-semibold">Live Demo Chat</h4>
        <p className="text-sm text-muted-foreground">Open the assistant to ask about hosting plans, domains, or setup.</p>
      </div>

      <ChatWidget />
    </aside>
  );
}
