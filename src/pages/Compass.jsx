import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTasks, useTaskMutations, usePillars, useCalendarEvents, useCalendarEventMutations, useUserSettings } from '@/lib/useSyncnData';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const STARTERS = [
  "What should I focus on today?",
  "Am I spending time on what matters?",
  "Which area am I neglecting?",
  "What should I cut or park?",
  "What have I been avoiding?",
];

const SYSTEM_PROMPT = `You are Compass, a calm and direct AI purpose coach inside Sync'n.

PERSONALITY:
- Never say "amazing", "fantastic", "great question", "absolutely"
- Never open with affirmation
- Direct, calm, occasionally dry
- Call out gaps between stated priorities and actual time allocation
- Reference postponed tasks as patterns
- End every response with ONE specific next action

RESPONSE FORMAT:
When asked for a daily read or briefing, ALWAYS structure your response as:

**Today's read**
One or two calm sentences about the overall situation.

**Risk**
One specific thing that's slipping or at risk.

**Recommendation**
One concrete suggestion.

**Next action**
One specific, actionable thing to do now.

Keep the whole response under 150 words. No bullet walls. No fluff.

For conversational follow-ups, respond naturally but stay concise.

TASK CREATION FORMAT (when asked to create tasks):
\`\`\`json:tasks
[{"title": "...", "pillar_id": "...", "priority": "High|Medium|Low", "status": "active", "duration_mins": 30}]
\`\`\`

MEETING CREATION FORMAT (when asked to schedule a meeting):
\`\`\`json:meeting
{"title": "...", "day_offset": 0, "start_hour": 10, "start_min": 0, "duration_mins": 60}
\`\`\``;

export default function Compass() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: tasks } = useTasks();
  const { data: pillars } = usePillars();
  const { data: events } = useCalendarEvents();
  const { data: settings } = useUserSettings();
  const { bulkCreate } = useTaskMutations();
  const { create: createEvent } = useCalendarEventMutations();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => {
    const activeTasks = tasks.filter(t => !t.archived && !t.done);
    const pillarSummary = pillars.map(p => {
      const pTasks = activeTasks.filter(t => t.pillar_id === p.id);
      return `${p.icon} ${p.label}: ${pTasks.length} active, ${pTasks.filter(t => t.priority === 'High').length} urgent`;
    }).join('\n');
    const scheduledToday = tasks.filter(t => t.scheduled && t.day_offset === 0 && !t.archived);
    const postponed = tasks.filter(t => (t.postpone_count || 0) >= 2 && !t.done && !t.archived);
    const compass = settings?.compass_memory || {};

    return `CURRENT STATE:
Date: ${new Date().toLocaleDateString()}
Active tasks: ${activeTasks.length}
Scheduled today: ${scheduledToday.length}
Calendar events today: ${events.filter(e => e.day_offset === 0 && !e.ignored).length}

PILLARS:
${pillarSummary}

POSTPONED (2+ times):
${postponed.map(t => `- "${t.title}" (${t.postpone_count}x)`).join('\n') || 'None'}

STATED PRIORITIES:
${(compass.stated_priorities || []).join(', ') || 'None set'}

AVAILABLE PILLARS:
${pillars.map(p => `${p.id}: ${p.label}`).join('\n')}`;
  };

  const processResponse = async (text) => {
    const taskMatch = text.match(/```json:tasks\n([\s\S]*?)\n```/);
    if (taskMatch) {
      const tasksToCreate = JSON.parse(taskMatch[1]);
      await bulkCreate.mutateAsync(tasksToCreate);
      return { text: text.replace(/```json:tasks\n[\s\S]*?\n```/, ''), action: { type: 'tasks_created', count: tasksToCreate.length } };
    }
    const meetingMatch = text.match(/```json:meeting\n([\s\S]*?)\n```/);
    if (meetingMatch) {
      const meeting = JSON.parse(meetingMatch[1]);
      await createEvent.mutateAsync({ ...meeting, cal_type: 'manual' });
      return { text: text.replace(/```json:meeting\n[\s\S]*?\n```/, ''), action: { type: 'meeting_created', title: meeting.title } };
    }
    return { text, action: null };
  };

  const handleSend = async (text) => {
    const message = text || input.trim();
    if (!message) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setLoading(true);
    const context = buildContext();
    const history = newMessages.map(m => `${m.role === 'user' ? 'You' : 'Compass'}: ${m.content}`).join('\n\n');
    const prompt = `${SYSTEM_PROMPT}\n\n${context}\n\nCONVERSATION:\n${history}\n\nCompass:`;
    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    const { text: cleanText, action } = await processResponse(response);
    setMessages([...newMessages, { role: 'assistant', content: cleanText.trim(), action }]);
    setLoading(false);
  };

  const handleDailyBriefing = async () => {
    setBriefingLoading(true);
    const context = buildContext();
    const prompt = `${SYSTEM_PROMPT}\n\n${context}\n\nProvide today's briefing in your structured format (Today's read / Risk / Recommendation / Next action).`;
    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    const { text: cleanText, action } = await processResponse(response);
    setMessages([{ role: 'assistant', content: cleanText.trim(), action }]);
    setBriefingLoading(false);
  };

  return (
    <div className="max-w-[680px] mx-auto px-4 pt-6 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Compass</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Your purpose coach. Direct. Calm. Has your back.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDailyBriefing}
          disabled={briefingLoading}
          className="gap-2 text-xs"
        >
          {briefingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Daily read
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && !briefingLoading && (
          <div className="py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm">
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-sm px-3.5 py-3 rounded-xl border border-border/40 bg-card/60 hover:bg-card hover:border-border/70 transition-all text-muted-foreground hover:text-foreground leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {briefingLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border/40 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground text-sm'
                : 'bg-card border border-border/40'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none
                  prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                  prose-p:my-1 prose-strong:font-semibold">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
              {msg.action?.type === 'tasks_created' && (
                <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 font-medium">✓ {msg.action.count} tasks added</p>
                  <Link to="/life-map" className="text-xs text-primary hover:underline">View in Life Map →</Link>
                </div>
              )}
              {msg.action?.type === 'meeting_created' && (
                <div className="mt-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary font-medium">✓ Meeting added to calendar</p>
                  <Link to="/calendar" className="text-xs text-primary hover:underline">View →</Link>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border/40 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 py-3 border-t border-border/40">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Compass anything..."
          className="flex-1 bg-card border-border/50 rounded-xl"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={loading || briefingLoading}
        />
        <Button size="icon" onClick={() => handleSend()} disabled={loading || briefingLoading || !input.trim()} className="rounded-xl">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}