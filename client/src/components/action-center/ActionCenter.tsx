import React, { useState, useMemo } from 'react';
import { Task, TaskStatus } from '../../types';
import {
  Plus,
  Calendar,
  Mail,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  X,
  ShieldAlert,
} from 'lucide-react';

interface ActionCenterProps {
  tasks: Task[];
  isLoading: boolean;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onCreateTask: (task: { title: string; description?: string; deadline?: string | null; priority?: string }) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectEmailById: (emailId: string) => void;
}

export function cleanTaskTitle(raw?: string | null): string {
  if (!raw) return '';
  let cleaned = raw
    // Remove extraction prefixes
    .replace(/^(?:Review\s+(?:job\s+)?details\s*(?:and\s+submit\s+application)?|Action\s+(?:needed|required|item)|Deliverable|Task)\s*:\s*/i, '')
    // Remove Telegram / channel / platform tag brackets like [TG @channel], [TG], [PlacementDrive], etc.
    .replace(/\[(?:TG\s*@[a-zA-Z0-9_]+|TG|[a-zA-Z0-9_\s@\.-]+)\]\s*/gi, '')
    // Remove leading bullet/emoji clutter
    .replace(/^[\s🚀🔥⚡📌👉•\-\*]+\s*/u, '')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || raw.trim();
}

export function cleanTaskDescription(desc?: string | null): string | null {
  if (!desc) return null;
  const trimmed = desc.trim();
  // Filter out automated email extraction boilerplate
  if (
    trimmed.startsWith('Extracted from email:') ||
    trimmed.toLowerCase().includes('high-priority job opening') ||
    trimmed.toLowerCase().includes('action needed from email')
  ) {
    return null;
  }
  return trimmed || null;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({
  tasks,
  isLoading,
  onUpdateStatus,
  onCreateTask,
  onDeleteTask,
  onSelectEmailById,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');

  // Filter out OTP, password reset, verification, spam, and expired deadline tasks
  const activeTasks = useMemo(() => {
    const now = Date.now();
    return tasks.filter((task) => {
      const fullText = `${task.title} ${task.description || ''} ${task.sourceEmail?.subject || ''}`.toLowerCase();
      
      const isSpamOrOtp =
        /\botp\b/.test(fullText) ||
        /verification (?:code|otp|pin)/.test(fullText) ||
        /verify (?:your|account|email)/.test(fullText) ||
        /enter verification/.test(fullText) ||
        /authenticat(?:e|ion)/.test(fullText) ||
        /password reset|reset (?:your )?password/.test(fullText) ||
        /security (?:code|alert|notice|pin)/.test(fullText) ||
        /login (?:code|pin|alert|attempt)/.test(fullText) ||
        /sign-in (?:code|attempt)/.test(fullText) ||
        /\b2fa\b|two-factor|passcode/.test(fullText) ||
        /confirm (?:your )?(?:account|email)/.test(fullText) ||
        /please anyone help me/.test(fullText);

      if (isSpamOrOtp) return false;

      // Filter out tasks whose deadline has already ended/passed
      if (task.deadline) {
        const d = new Date(task.deadline).getTime();
        if (!isNaN(d) && d < now) {
          return false;
        }
      }

      return true;
    });
  }, [tasks]);

  const columns: { id: TaskStatus; label: string; count: number; color: string; bg: string }[] = [
    {
      id: 'todo',
      label: 'To Do',
      count: activeTasks.filter((t) => t.status === 'todo').length,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      bg: 'bg-amber-500',
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      count: activeTasks.filter((t) => t.status === 'in_progress').length,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      bg: 'bg-blue-500',
    },
    {
      id: 'done',
      label: 'Done',
      count: activeTasks.filter((t) => t.status === 'done').length,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      bg: 'bg-emerald-500',
    },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    onCreateTask({
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : null,
      priority: newTaskPriority,
    });

    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDeadline('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Action Center Kanban</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-orange-950/60 text-blue-700 dark:text-orange-400 border border-blue-200 dark:border-orange-500/30 font-semibold">
              {activeTasks.length} Active Tasks
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            High-value contest rounds, job applications, and priority action items. Expired deadlines and OTP/spam are filtered out.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 dark:bg-gradient-to-r dark:from-orange-500 dark:to-orange-600 hover:bg-blue-500 dark:hover:from-orange-600 dark:hover:to-orange-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs dark:shadow-orange-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Action Task</span>
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {columns.map((col) => {
          const colTasks = activeTasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className="bg-slate-100/70 dark:bg-[#0c0d12] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-3.5 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.bg}`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {col.label}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">{col.count}</span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-[#222636] rounded-xl">
                    No tasks in {col.label}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const cleanTitle = cleanTaskTitle(task.title);
                    const cleanDesc = cleanTaskDescription(task.description);

                    return (
                      <div
                        key={task.id}
                        className="bg-white dark:bg-[#151722] border border-slate-200/80 dark:border-[#222636] hover:border-slate-300 dark:hover:border-orange-500/40 p-3 rounded-xl shadow-2xs space-y-2 transition-all group hover:shadow-xs"
                      >
                        {/* One-Liner Clean Title */}
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate flex-1"
                            title={cleanTitle}
                          >
                            {cleanTitle}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(task.id);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 transition-all flex-shrink-0 active:scale-90"
                            title="Delete task immediately"
                            aria-label="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Optional Clean User Note (if any) */}
                        {cleanDesc && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-relaxed">
                            {cleanDesc}
                          </p>
                        )}

                        {/* Footer Info & Move Buttons */}
                        <div className="pt-1.5 border-t border-slate-100 dark:border-[#1e2230] flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                            {task.deadline ? (
                              <span className="font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 whitespace-nowrap">
                                📅 {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            ) : null}

                            {task.sourceEmail && (
                              <button
                                onClick={() => onSelectEmailById(task.sourceEmail!.id)}
                                className="text-blue-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-medium truncate"
                                title={`Email: ${task.sourceEmail.subject}`}
                              >
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{cleanTaskTitle(task.sourceEmail.subject)}</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {col.id !== 'todo' && (
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateStatus(
                                    task.id,
                                    col.id === 'done' ? 'in_progress' : 'todo'
                                  )
                                }
                                className="p-1 rounded-lg border border-slate-200 dark:border-[#2a2f40] hover:bg-slate-100 dark:hover:bg-[#1e2230] text-slate-600 dark:text-slate-300 transition-colors active:scale-95"
                                title={col.id === 'done' ? 'Move back to In Progress' : 'Move back to To Do'}
                                aria-label={col.id === 'done' ? 'Move back to In Progress' : 'Move back to To Do'}
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {col.id !== 'done' && (
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateStatus(
                                    task.id,
                                    col.id === 'todo' ? 'in_progress' : 'done'
                                  )
                                }
                                className="p-1 rounded-lg border border-slate-200 dark:border-[#2a2f40] hover:bg-slate-100 dark:hover:bg-[#1e2230] text-slate-600 dark:text-slate-300 transition-colors active:scale-95"
                                title={col.id === 'todo' ? 'Move to In Progress' : 'Move forward to Done'}
                                aria-label={col.id === 'todo' ? 'Move to In Progress' : 'Move forward to Done'}
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white dark:bg-[#12141c] border border-slate-200 dark:border-[#222636] rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1e2230]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create Action Task</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Register for TVS Credit Treasure Hunt"
                  className="w-full bg-slate-50 dark:bg-[#161824] border border-slate-200 dark:border-[#262a3a] rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1a1d2a] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Add notes, requirements, or link..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-[#161824] border border-slate-200 dark:border-[#262a3a] rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1a1d2a] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#161824] border border-slate-200 dark:border-[#262a3a] rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1a1d2a] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#161824] border border-slate-200 dark:border-[#262a3a] rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#1a1d2a] focus:outline-none focus:border-blue-500 dark:focus:border-orange-500"
                  >
                    <option value="critical">Urgent</option>
                    <option value="high">Important</option>
                    <option value="medium">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1e2230]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1e2230]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 dark:bg-gradient-to-r dark:from-orange-500 dark:to-orange-600 hover:bg-blue-500 dark:hover:from-orange-600 dark:hover:to-orange-700 text-white text-xs font-bold shadow-xs dark:shadow-orange-500/20"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
