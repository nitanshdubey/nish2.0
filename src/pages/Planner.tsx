import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, BellRing, CalendarClock, Check, Info, Plus, SkipForward, Trash2, Undo2 } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import {
  Banner,
  Chip,
  ConfirmButton,
  PageHeader,
  Panel,
  Segmented,
  Toggle,
  btnGhost,
  btnPrimary,
} from '../components/ui/Primitives';
import type { PlanOccurrence, StatusTone } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function rel(ms: number): string {
  const m = Math.max(1, Math.ceil(ms / 60000));
  if (m < 60) return `IN ${m} MIN`;
  return `IN ${Math.floor(m / 60)}H ${m % 60}M`;
}

function fmtDur(min: number): string {
  if (min < 60) return `${min} MIN`;
  return `${Math.floor(min / 60)}H${min % 60 ? ` ${min % 60}M` : ''}`;
}

function stateOf(o: PlanOccurrence, now: number): { label: string; tone: StatusTone } {
  if (o.state === 'done') return { label: 'DONE', tone: 'ok' };
  if (o.state === 'skipped') return { label: 'SKIPPED', tone: 'idle' };
  if (now < o.startAt) return { label: rel(o.startAt - now), tone: 'busy' };
  const end = o.endAt ?? o.startAt + 30 * 60000;
  if (now < end) return { label: 'IN PROGRESS', tone: 'ok' };
  return { label: 'PAST DUE · NOT MARKED', tone: 'warn' };
}

const iconBtn =
  'grid h-8 w-8 place-items-center rounded-lg border border-line text-mute transition-colors hover:border-accent/50 hover:text-ink';

export default function Planner() {
  const plan = usePlan();
  const [now, setNow] = useState(() => Date.now());
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [dur, setDur] = useState('');
  const [date, setDate] = useState(todayStr);
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekdays'>('none');
  const [nn, setNn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: StatusTone; text: string } | null>(null);

  // The live clock only drives the labels. Reminders themselves fire from the Chrome connector.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 10000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const header = (
    <PageHeader
      icon={CalendarClock}
      title="Planner"
      subtitle="Your day, with reminders by notification and voice. You can also just tell NISH your plan."
    />
  );

  if (plan.status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        {header}
        <p className="text-sm text-mute">Checking the Chrome connector…</p>
      </div>
    );
  }

  if (plan.status !== 'ready' || !plan.snapshot) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        {header}
        <Banner tone="bad" icon={AlertTriangle}>
          {plan.status === 'outdated'
            ? 'Your NISH Chrome connector is an older version. Replace its files with version 0.3.0, reload it on chrome://extensions, then refresh this page.'
            : 'The NISH Chrome connector was not detected. Reminders can only fire through the extension, so nothing will be announced until it is installed and enabled. Install it, then refresh this page.'}
        </Banner>
      </div>
    );
  }

  const snap = plan.snapshot;
  const upcoming = snap.items
    .filter((i) => i.repeat !== 'none' || i.date > snap.dateStr)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !title.trim() || !time) return;
    setBusy(true);
    setMsg(null);
    const err = await plan.add([
      {
        title: title.trim(),
        start: time,
        durationMin: dur ? Number(dur) : undefined,
        date,
        repeat,
        nonNegotiable: nn,
      },
    ]);
    if (err) {
      setMsg({ tone: 'bad', text: err });
    } else {
      setMsg({ tone: 'ok', text: 'Added to your plan.' });
      setTitle('');
      setDur('');
    }
    setBusy(false);
  };

  const sendTest = async () => {
    setMsg(null);
    const err = await plan.test();
    setMsg(
      err
        ? { tone: 'bad', text: err }
        : {
            tone: 'idle',
            text: 'Test sent. You should see a notification and hear a voice. If not, check Windows notification settings and Focus Assist.',
          },
    );
  };

  const inputCls =
    'w-full rounded-lg border border-line bg-base2/80 px-3 py-2 text-sm placeholder:text-mute focus:border-accent/60 focus:outline-none';

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      {header}

      <div className="mb-4 space-y-3">
        <Banner tone="idle" icon={Info}>
          Reminders run inside the Chrome connector, so they keep working without internet and even if this tab is
          closed. Chrome must be running. If the computer was asleep, late reminders are announced when it wakes.
        </Banner>
        {msg && (
          <Banner tone={msg.tone} icon={msg.tone === 'bad' ? AlertTriangle : Info} onDismiss={() => setMsg(null)}>
            {msg.text}
          </Banner>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <Panel title={`Today · ${snap.dateStr}`} icon={CalendarClock}>
          {snap.today.length === 0 ? (
            <div className="grid place-items-center gap-2 py-12 text-center">
              <CalendarClock className="h-8 w-8 text-mute" />
              <p className="text-sm font-medium">Nothing planned for today</p>
              <p className="max-w-xs text-xs leading-relaxed text-mute">
                Add a task on the right, or tell NISH: “Plan my day: study at 7 pm for 2 hours, gym at 6 am daily.”
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {snap.today.map((o) => {
                const s = stateOf(o, now);
                const closed = o.state !== 'pending';
                return (
                  <li
                    key={o.key}
                    className={`flex flex-wrap items-center gap-3 rounded-lg border border-line bg-base2/60 px-3 py-2.5 ${
                      closed ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="w-14 shrink-0 font-mono text-sm tabular-nums">{o.start}</div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${o.state === 'done' ? 'line-through' : ''}`}>
                        {o.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Chip tone={s.tone}>{s.label}</Chip>
                        {o.nn && <Chip tone="warn">NON-NEGOTIABLE</Chip>}
                        {o.dur > 0 && <Chip tone="idle">{fmtDur(o.dur)}</Chip>}
                        {o.repeat !== 'none' && <Chip tone="idle">{o.repeat === 'daily' ? 'DAILY' : 'WEEKDAYS'}</Chip>}
                        {o.snoozedUntil && o.state === 'pending' && <Chip tone="busy">SNOOZED</Chip>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {closed ? (
                        <button
                          type="button"
                          className={iconBtn}
                          aria-label={`Reopen ${o.title}`}
                          title="Reopen"
                          onClick={() => void plan.setStatus(o.id, snap.dateStr, 'pending')}
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={iconBtn}
                            aria-label={`Mark ${o.title} done`}
                            title="Done"
                            onClick={() => void plan.setStatus(o.id, snap.dateStr, 'done')}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className={iconBtn}
                            aria-label={`Skip ${o.title} today`}
                            title="Skip today"
                            onClick={() => void plan.setStatus(o.id, snap.dateStr, 'skipped')}
                          >
                            <SkipForward className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <ConfirmButton
                        label="Delete"
                        confirmLabel={o.repeat === 'none' ? 'Sure?' : 'Delete all days?'}
                        icon={Trash2}
                        onConfirm={() => void plan.remove(o.id)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Add a task" icon={Plus}>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label htmlFor="plan-title" className="mb-1 block text-xs text-mute">
                  Task
                </label>
                <input
                  id="plan-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Physics revision"
                  maxLength={120}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="plan-time" className="mb-1 block text-xs text-mute">
                    Start time
                  </label>
                  <input id="plan-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="plan-dur" className="mb-1 block text-xs text-mute">
                    Minutes (optional)
                  </label>
                  <input
                    id="plan-dur"
                    type="number"
                    min={5}
                    max={600}
                    value={dur}
                    onChange={(e) => setDur(e.target.value)}
                    placeholder="60"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="plan-date" className="mb-1 block text-xs text-mute">
                    Date
                  </label>
                  <input
                    id="plan-date"
                    type="date"
                    min={todayStr()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="plan-repeat" className="mb-1 block text-xs text-mute">
                    Repeat
                  </label>
                  <select
                    id="plan-repeat"
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as 'none' | 'daily' | 'weekdays')}
                    className={inputCls}
                  >
                    <option value="none">Once</option>
                    <option value="daily">Every day</option>
                    <option value="weekdays">Weekdays</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={nn} onChange={(e) => setNn(e.target.checked)} />
                Non-negotiable
              </label>
              <button type="submit" disabled={busy || !title.trim() || !time} className={`${btnPrimary} w-full`}>
                <Plus className="h-4 w-4" /> Add to plan
              </button>
            </form>
          </Panel>

          <Panel title="Reminder settings" icon={BellRing}>
            <Toggle
              label="Speak reminders"
              description="Uses an offline system voice, so reminders work without internet."
              checked={snap.prefs.speak}
              onChange={(v) => void plan.setPrefs({ speak: v })}
            />
            <Segmented
              label="Default heads-up"
              value={String(snap.prefs.defaultLead)}
              onChange={(v) => void plan.setPrefs({ defaultLead: Number(v) })}
              options={[
                { value: '0', label: 'None' },
                { value: '5', label: '5 min' },
                { value: '10', label: '10 min' },
                { value: '15', label: '15 min' },
              ]}
            />
            <button type="button" className={`${btnGhost} mt-2`} onClick={() => void sendTest()}>
              <BellRing className="h-4 w-4" /> Send a test reminder
            </button>
          </Panel>
        </div>
      </div>

      <div className="mt-4">
        <Panel title="Repeating and upcoming">
          {upcoming.length === 0 ? (
            <p className="py-4 text-center text-xs text-mute">No repeating or future tasks.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-base2/60 px-3 py-2">
                  <span className="w-14 shrink-0 font-mono text-sm tabular-nums">{i.start}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{i.title}</span>
                  <Chip tone="idle">
                    {i.repeat === 'daily' ? 'EVERY DAY' : i.repeat === 'weekdays' ? 'WEEKDAYS' : i.date}
                  </Chip>
                  {i.nn && <Chip tone="warn">NON-NEGOTIABLE</Chip>}
                  <ConfirmButton label="Delete" confirmLabel="Sure?" icon={Trash2} onConfirm={() => void plan.remove(i.id)} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}