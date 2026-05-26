import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTasks, useTaskMutations, usePillars, useCalendarEvents, useCalendarEventMutations, useUserSettings, useSettingsMutations } from '@/lib/useSyncnData';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const STARTERS = [
  "What should I focus on today and why?",
  "Am I spending time on what actually matters?",
  "Which pillar am I neglecting most?",
  "Give me an honest assessment of this week.",
  "What should I cut or park right now?",
  "What have I been avoiding?",
];

const SYSTEM_PROMPT = `You are Compass, Brendan "Beej" Mulholland's purpose coach and accountability partner inside Sync'n.

PERSONALITY:
- Never say "amazing", "fantastic", "great question", "absolutely"
- Never open with affirmation
- Call out gaps between stated priorities and actual time allocation
- Reference postponed tasks as patterns
- End every response with ONE specific next action
- Direct, calm, occasionally dry/witty
- You know Beej is an indie filmmaker, app developer, father of three (Madden, Hardey, Noa)

CAPABILITIES:
1. Morning briefing: 3 priorities, today's risk, focus recommendation, one warning, next action — max 200 words
2. Weekly reset: wins, misses, time distribution, next week focus
3. Check-in: on-track assessment based on actual schedule data
4. Task creation: When user asks to create tasks, extract them and return JSON with tasks array
5. Meeting creation: When user asks to schedule a meeting, return JSON with meeting object

TASK CREATION FORMAT (when creating tasks):
If the user asks you to create tasks, include this exact JSON block in your response:
\`\`\`json:tasks
[{"title": "...", "pillar_id": "...", "priority": "High|Medium|Low", "status": "active", "duration_mins": 30}]
\`\`\`

MEETING CREATION FORMAT (when creating meetings):
\`\`\`json:meeting
{"title": "...", "day_offset": 0, "start_hour": 10, "start_min": 0, "duration_mins": 60}
\`\`\`

Keep responses concise. No fluff. Be genuinely helpful.`;

export default function Compass() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: tasks } = useTasks();
  const { data: pillars } = usePillars();
  const { data: events } = useCalendarEvents();
  const { data: settings } = useUserSettings();
  const { create: createTask, bulkCreate } = useTaskMutations();
  const { create: createEvent } = useCalendarEventMutations();
  const { update: updateSettings } = useSettingsMutations();

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

PILLAR OVERVIEW:
${pillarSummary}

POSTPONED PATTERNS (2+ times):
${postponed.map(t => `- "${t.title}" (${t.postpone_count}x)`).join('\n') || 'None'}

STATED PRIORITIES:
${(compass.stated_priorities || []).join(', ') || 'None set'}

AVAILABLE PILLARS (for task creation):
${pillars.map(p => `${p.id}: ${p.label}`).join('\n')}`;
  };

  const processResponse = async (text) => {
    // Check for task creation
    const taskMatch = text.match(/```json:tasks\n([\s\S]*?)\n```/);
    if (taskMatch) {
      const tasksToCreate = JSON.parse(taskMatch[1]);
      await bulkCreate.mutateAsync(tasksToCreate);
      return {
        text: text.replace(/```json:tasks\n[\s\S]*?\n```/, ''),
        action: { type: 'tasks_created', count: tasksToCreate.length }
      };
    }

    // Check for meeting creation
    const meetingMatch = text.match(/```json:meeting\n([\s\S]*?)\n```/);
    if (meetingMatch) {
      const meeting = JSON.parse(meetingMatch[1]);
      await createEvent.mutateAsync({ ...meeting, cal_type: 'manual' });
      return {
        text: text.replace(/```json:meeting\n[\s\S]*?\n```/, ''),
        action: { type: 'meeting_created', title: meeting.title }
      };
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
    const conversationHistory = newMessages.map(m => `${m.role === 'user' ? 'Brendan' : 'Compass'}: ${m.content}`).join('\n\n');

    const prompt = `${SYSTEM_PROMPT}\n\n${context}\n\nCONVERSATION:\n${conversationHistory}\n\nCompass:`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });

    const { text: cleanText, action } = await processResponse(response);

    setMessages([...newMessages, {
      role: 'assistant',
      content: cleanText.trim(),
      action,
    }]);
    setLoading(false);
  };

  return (
    <div className="max-w-[720px] mx-auto px-4 pt-6 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      <h1 className="text-2xl font-semibold mb-4">Compass</h1>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground mb-6">Your purpose coach. Direct. Honest. Has your back.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-sm px-3 py-2.5 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border/50'
            }`}>
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.action?.type === 'tasks_created' && (
                <div className="mt-3 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 font-medium">✓ {msg.action.count} tasks added to your board</p>
                  <Link to="/life-map" className="text-xs text-primary hover:underline">View in Life Map →</Link>
                </div>
              )}
              {msg.action?.type === 'meeting_created' && (
                <div className="mt-3 p-2 rounded-md bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary font-medium">✓ Meeting added to your calendar</p>
                  <Link to="/calendar" className="text-xs text-primary hover:underline">View in Calendar →</Link>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border/50 rounded-lg px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 py-3 border-t border-border/50">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Compass anything..."
          className="flex-1"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={loading}
        />
        <Button size="icon" onClick={() => handleSend()} disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}