import { useState } from 'react';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages((m) => [...m, { from: 'user', text }]);
    setInput('');

    // Mock bot response
    setTimeout(() => {
      setMessages((m) => [...m, { from: 'bot', text: `Mock reply: I received "${text}"` }]);
    }, 700);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="w-80 h-96 bg-white dark:bg-slate-900 shadow-lg rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 font-semibold">KSF Assistant</div>
          <div className="flex-1 p-3 overflow-auto space-y-2">
            {messages.length === 0 && <div className="text-sm text-muted-foreground">Say hi to KSF Assistant — demo only.</div>}
            {messages.map((m, i) => (
              <div key={i} className={`p-2 rounded ${m.from === 'user' ? 'bg-sky-100 self-end text-slate-900' : 'bg-slate-100 text-slate-800'}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="p-2 border-t dark:border-slate-700">
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 px-3 py-2 rounded bg-muted text-sm" placeholder="Ask the assistant..." />
              <button onClick={send} className="btn btn-primary px-3">Send</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(!open)} className="h-12 w-12 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center">
        {open ? '×' : 'AI'}
      </button>
    </div>
  );
}
