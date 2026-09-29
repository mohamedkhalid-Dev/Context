'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  LogOut,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import {
  createConversation,
  deleteConversation,
  getConversation,
  getCustomInstructions,
  CUSTOM_INSTRUCTIONS_CHANGED_EVENT,
  loadConversations,
  renameConversation,
  setActiveConversationId,
  type StoredConversation,
} from '@/lib/storage';
import { handleLogout } from '@/lib/settingsHandlers';
import ApiKeyStatus from './ApiKeyStatus';
import ModelPicker from './ModelPicker';
import SettingsDialog, { OPEN_SETTINGS_EVENT } from './SettingsDialog';

export const TOGGLE_SIDEBAR_EVENT = 'understoodchat:toggle-sidebar';

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function Sidebar({
  activeId,
  onNavigate,
}: {
  activeId?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { profile } = useProfile();
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customPreview, setCustomPreview] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setConversations(loadConversations());
  }, []);

  const refreshCustom = useCallback(() => {
    try {
      setCustomPreview(getCustomInstructions());
    } catch {
      setCustomPreview(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    refreshCustom();
    const toggle = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 640) {
        setMobileOpen((v) => !v);
      } else {
        setDesktopCollapsed((v) => !v);
      }
    };
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('understoodchat:conversations-changed', refresh);
    window.addEventListener(TOGGLE_SIDEBAR_EVENT, toggle);
    window.addEventListener(OPEN_SETTINGS_EVENT, openSettings);
    window.addEventListener(CUSTOM_INSTRUCTIONS_CHANGED_EVENT, refreshCustom);
    window.addEventListener('understoodchat:settings-changed', refreshCustom);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('understoodchat:conversations-changed', refresh);
      window.removeEventListener(TOGGLE_SIDEBAR_EVENT, toggle);
      window.removeEventListener(OPEN_SETTINGS_EVENT, openSettings);
      window.removeEventListener(CUSTOM_INSTRUCTIONS_CHANGED_EVENT, refreshCustom);
      window.removeEventListener('understoodchat:settings-changed', refreshCustom);
    };
  }, [refresh, refreshCustom]);

  // Keep the list fresh when the active conversation changes route.
  useEffect(() => {
    refresh();
  }, [activeId, refresh]);

  function handleNewChat() {
    const conv = createConversation();
    refresh();
    setMobileOpen(false);
    onNavigate?.();
    router.push(`/chat/${conv.id}`);
  }

  function handleSelect(id: string) {
    setActiveConversationId(id);
    setMobileOpen(false);
    onNavigate?.();
    router.push(`/chat/${id}`);
  }

  function handleDelete(id: string) {
    const wasActive = id === activeId;
    deleteConversation(id);
    const remaining = loadConversations();
    setConversations(remaining);
    setEditingId((cur) => (cur === id ? null : cur));
    if (wasActive) {
      const next = remaining[0] ?? createConversation();
      // Ensure the fallback exists in storage before navigating.
      if (!getConversation(next.id)) {
        setConversations(loadConversations());
      }
      setActiveConversationId(next.id);
      router.push(`/chat/${next.id}`);
    }
    onNavigate?.();
  }

  function startRename(c: StoredConversation) {
    setEditingId(c.id);
    setDraft(c.title);
  }

  function commitRename(id: string) {
    if (draft.trim()) {
      renameConversation(id, draft);
      refresh();
    }
    setEditingId(null);
    setDraft('');
  }

  function cancelRename() {
    setEditingId(null);
    setDraft('');
  }

  // Sub-handler delegation: log out lives in lib/settingsHandlers.ts
  // (sign-out + wipe device key/history) so Sidebar + dialog share one path.
  async function logout() {
    await handleLogout();
    router.push('/login');
  }

  const displayName = profile?.name ?? profile?.display_name ?? null;
  const age = typeof profile?.age === 'number' ? profile.age : null;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? conversations.filter((c) => (c.title || '').toLowerCase().includes(q))
    : conversations;

  const panel = (
    <div className="flex h-full w-64 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={handleNewChat}
          aria-label="Start new chat"
          title="Start new chat"
          className="flex w-full items-center justify-center gap-2 rounded-md bg-black px-3 py-2 text-sm text-white"
        >
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" /> New chat
        </button>
        <button
          type="button"
          onClick={() => setDesktopCollapsed(true)}
          aria-label="Close sidebar"
          title="Close sidebar"
          className="hidden shrink-0 rounded-md p-2 hover:bg-neutral-100 sm:block"
        >
          <PanelLeftClose size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div className="px-3">
        <label htmlFor="sidebar-search" className="sr-only">
          Search conversations
        </label>
        <div className="relative">
          <Search
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            id="sidebar-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            aria-label="Search conversations"
            autoComplete="off"
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-8 text-sm outline-none focus:border-black focus:bg-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              title="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-black"
            >
              <X size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <nav aria-label="Conversation history" className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-1 text-[11px] uppercase tracking-wide text-neutral-500">
          History · on this device
        </p>
        {filtered.length === 0 ? (
          <p className="mt-2 px-1 text-xs text-neutral-500">
            {conversations.length === 0
              ? 'No chats yet. Start a new chat — history stays in this browser only.'
              : 'No matches. Try another search.'}
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {filtered.map((c) => {
              const isActive = c.id === activeId;
              const isEditing = editingId === c.id;
              return (
                <li key={c.id}>
                  <div
                    className={`group flex items-center gap-1 rounded-md px-2 py-2 text-sm ${
                      isActive ? 'bg-neutral-100 font-medium' : 'hover:bg-neutral-50'
                    }`}
                  >
                    {isEditing ? (
                      <input
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(c.id);
                          if (e.key === 'Escape') cancelRename();
                        }}
                        onBlur={() => commitRename(c.id)}
                        aria-label={`Rename ${c.title || 'chat'}`}
                        maxLength={60}
                        className="min-w-0 flex-1 rounded border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:border-black"
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSelect(c.id)}
                          aria-current={isActive ? 'true' : undefined}
                          title={c.title}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <MessageSquare size={14} strokeWidth={1.75} className="shrink-0 text-neutral-500" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{c.title || 'Untitled chat'}</span>
                          <span className="shrink-0 text-[10px] text-neutral-400">
                            {c.updatedAt ? shortDate(c.updatedAt) : ''}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => startRename(c)}
                          aria-label={`Rename ${c.title || 'chat'}`}
                          title="Rename chat"
                          className="shrink-0 rounded p-1.5 text-neutral-400 hover:bg-white hover:text-black sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        >
                          <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          aria-label={`Delete ${c.title || 'chat'}`}
                          title="Delete chat"
                          className="shrink-0 rounded p-1.5 text-neutral-400 hover:bg-white hover:text-black sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        >
                          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="space-y-2 border-t border-neutral-200 p-3">
        <ModelPicker />
        <ApiKeyStatus />
        {(displayName || age !== null) && (
          <p className="flex items-center gap-2 px-2 text-xs text-neutral-600" aria-live="polite">
            <User size={14} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
            <span className="truncate">
              {displayName ?? 'Profile'}
              {age !== null ? ` · ${age}` : ''}
            </span>
          </p>
        )}
        {customPreview && (
          <p
            className="flex items-start gap-2 px-2 text-[11px] text-neutral-500"
            title={customPreview}
          >
            <SlidersHorizontal size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2 min-w-0 flex-1 break-words">
              Instructions: {customPreview.slice(0, 80)}
              {customPreview.length > 80 ? '…' : ''}
            </span>
          </p>
        )}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-haspopup="dialog"
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-neutral-50"
        >
          <Settings size={16} strokeWidth={1.75} aria-hidden="true" /> Settings
        </button>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-neutral-50"
        >
          <LogOut size={16} strokeWidth={1.75} aria-hidden="true" /> Log out
        </button>
      </div>
    </div>
  );

  const collapsedRail = (
    <div className="hidden h-full w-14 flex-col items-center gap-2 border-r border-neutral-200 bg-white py-3 sm:flex">
      <button
        type="button"
        onClick={() => setDesktopCollapsed(false)}
        aria-label="Open sidebar"
        title="Open sidebar"
        aria-expanded="false"
        className="rounded-md p-2 hover:bg-neutral-100"
      >
        <PanelLeftOpen size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={handleNewChat}
        aria-label="Start new chat"
        title="Start new chat"
        className="rounded-md bg-black p-2 text-white"
      >
        <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile toggle: sidebar hidden by default, opens as overlay drawer. */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? 'Close chat history' : 'Open chat history'}
        className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-sm sm:hidden"
      >
        <MessageSquare size={14} strokeWidth={1.75} aria-hidden="true" />
        {mobileOpen ? 'Close' : 'History'}
      </button>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden" role="dialog" aria-label="Chat history">
          <button
            type="button"
            aria-label="Close chat history overlay"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0">{panel}</div>
        </div>
      )}
      {/* Desktop: collapsible sidebar or slim rail */}
      <aside className="hidden h-full shrink-0 sm:block">
        {desktopCollapsed ? collapsedRail : panel}
      </aside>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialUsername={displayName}
      />
    </>
  );
}
