import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users, BarChart3, Mail, TrendingUp, Clock, ThumbsUp, ThumbsDown,
  Zap, Calendar, CheckCircle, XCircle, Send, RefreshCw, Sparkles,
  Settings, Facebook, Instagram, Play, Pause, Trash2, Edit3, Check,
  X, ChevronDown, ChevronRight, Bot, Loader2, Eye,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

interface Stats {
  waitlist: {
    total: number;
    recent: Array<{ email: string; created_at: string }>;
  };
  analytics: {
    today: number;
    todayEvents: Array<{ event: string; data: Record<string, unknown>; created_at: string }>;
    totals: Record<string, number>;
  };
}

interface AutopilotPost {
  id: string;
  content_type: string;
  platform: string;
  text_content: string;
  hashtags: string[];
  image_prompt: string | null;
  image_url: string | null;
  status: 'queued' | 'approved' | 'posted' | 'failed';
  scheduled_for: string | null;
  posted_at: string | null;
  meta_post_id: string | null;
  error_message: string | null;
  created_at: string;
}

interface AutopilotData {
  posts: AutopilotPost[];
  stats: {
    queued: number;
    approved: number;
    posted: number;
    failed: number;
    total: number;
    thisWeek: number;
    nextScheduled: string | null;
  };
  platforms: {
    facebook: boolean;
    instagram: boolean;
    autoApprove: boolean;
    postingEnabled: boolean;
  };
  contentTypes: Record<string, { label: string; description: string; emoji: string }>;
}

// ── Content type config ─────────────────────────────────────────────

const CONTENT_TYPE_COLORS: Record<string, string> = {
  vistip: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  spot_highlight: 'bg-green-500/20 text-green-400 border-green-500/30',
  seizoenstip: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  vangst_week: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  fun_fact: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  interactief: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  gear_tip: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  queued: { label: 'Wachtrij', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock },
  approved: { label: 'Goedgekeurd', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  posted: { label: 'Geplaatst', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', icon: Send },
  failed: { label: 'Mislukt', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
};

// ── Helper ──────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('nl-NL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// ── Main Component ──────────────────────────────────────────────────

const Admin = () => {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'autopilot' | 'instellingen'>('dashboard');

  // Dashboard state
  const [stats, setStats] = useState<Stats | null>(null);

  // Autopilot state
  const [autopilot, setAutopilot] = useState<AutopilotData | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateType, setGenerateType] = useState('vistip');

  // Settings state
  const [fbPageId, setFbPageId] = useState('');
  const [fbToken, setFbToken] = useState('');
  const [igAccountId, setIgAccountId] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [postingEnabled, setPostingEnabled] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAuth = useCallback(() => {
    return sessionStorage.getItem('stekfinder_admin') || password;
  }, [password]);

  // ── Fetch functions ─────────────────────────────────────────────

  const fetchStats = async (pass?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${pass || getAuth()}` },
      });
      if (!res.ok) {
        if (res.status === 401) { setError('Verkeerd wachtwoord.'); setAuthenticated(false); return; }
        throw new Error('Fout bij ophalen stats.');
      }
      setStats(await res.json());
      setAuthenticated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er ging iets mis.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAutopilot = async () => {
    try {
      const res = await fetch('/api/admin/autopilot', {
        headers: { Authorization: `Bearer ${getAuth()}` },
      });
      if (!res.ok) throw new Error('Fout bij ophalen autopilot data.');
      const data = await res.json();
      setAutopilot(data);

      // Sync settings state
      setAutoApprove(data.platforms.autoApprove);
      setPostingEnabled(data.platforms.postingEnabled);
    } catch (e) {
      console.error('Autopilot fetch error:', e);
    }
  };

  const handleGenerate = async (action: 'generate_single' | 'generate_week') => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/autopilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuth()}`,
        },
        body: JSON.stringify({
          action,
          type: action === 'generate_single' ? generateType : undefined,
        }),
      });
      if (!res.ok) throw new Error('Genereren mislukt');
      await fetchAutopilot();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Genereren mislukt');
    } finally {
      setGenerating(false);
    }
  };

  const handlePostAction = async (id: string, action: string, updates?: Record<string, unknown>) => {
    try {
      await fetch('/api/admin/autopilot', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuth()}`,
        },
        body: JSON.stringify({ id, action, updates }),
      });
      await fetchAutopilot();
      if (action === 'delete') setExpandedPost(null);
    } catch (e) {
      console.error('Post action error:', e);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch('/api/admin/autopilot', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuth()}`,
        },
        body: JSON.stringify({
          facebook_page_id: fbPageId || undefined,
          facebook_access_token: fbToken || undefined,
          instagram_account_id: igAccountId || undefined,
          auto_approve: autoApprove,
          posting_enabled: postingEnabled,
        }),
      });
      await fetchAutopilot();
    } catch (e) {
      console.error('Settings save error:', e);
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Effects ─────────────────────────────────────────────────────

  useEffect(() => {
    const saved = sessionStorage.getItem('stekfinder_admin');
    if (saved) {
      setPassword(saved);
      fetchStats(saved);
    }
  }, []);

  useEffect(() => {
    if (authenticated && activeTab === 'autopilot') fetchAutopilot();
    if (authenticated && activeTab === 'instellingen') fetchAutopilot();
  }, [authenticated, activeTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('stekfinder_admin', password);
    fetchStats();
  };

  // ── Login screen ──────────────────────────────────────────────────

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <Card className="bg-black/20 border-white/10 text-white w-full max-w-sm">
          <CardHeader>
            <CardTitle>StekFinder Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/30 border-white/10 text-white"
              />
              <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-600" disabled={loading}>
                {loading ? 'Laden...' : 'Inloggen'}
              </Button>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Filtered posts ──────────────────────────────────────────────

  const filteredPosts = autopilot?.posts.filter(p =>
    statusFilter === 'all' || p.status === statusFilter
  ) || [];

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-orange-400">
            StekFinder Admin
          </h1>
          <Button
            onClick={() => { fetchStats(); if (activeTab === 'autopilot') fetchAutopilot(); }}
            variant="outline" size="sm"
            className="border-white/10 text-white/70"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Ververs
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-black/20 p-1 rounded-lg border border-white/10 w-fit">
          {([
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { key: 'autopilot', label: 'Autopilot', icon: Bot },
            { key: 'instellingen', label: 'Instellingen', icon: Settings },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ DASHBOARD TAB ═══ */}
        {activeTab === 'dashboard' && stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-black/20 border-white/10 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-sky-400" />
                    <div>
                      <p className="text-2xl font-bold">{stats.waitlist.total}</p>
                      <p className="text-xs text-white/50">Waitlist</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/20 border-white/10 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-orange-400" />
                    <div>
                      <p className="text-2xl font-bold">{stats.analytics.totals.analysis_complete || 0}</p>
                      <p className="text-xs text-white/50">Totaal analyses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/20 border-white/10 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-green-400" />
                    <div>
                      <p className="text-2xl font-bold">{stats.analytics.today}</p>
                      <p className="text-xs text-white/50">Events vandaag</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/20 border-white/10 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <ThumbsUp className="h-5 w-5 text-green-400" />
                      <ThumbsDown className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.analytics.totals.feedback || 0}</p>
                      <p className="text-xs text-white/50">Feedback</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-black/20 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-sky-400" />
                    Waitlist ({stats.waitlist.total})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {stats.waitlist.recent.length === 0 && (
                      <p className="text-white/40 text-sm">Nog geen aanmeldingen.</p>
                    )}
                    {stats.waitlist.recent.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-gray-800/30 text-sm">
                        <span>{item.email}</span>
                        <span className="text-white/40 text-xs">
                          {new Date(item.created_at).toLocaleDateString('nl-NL')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/20 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-400" />
                    Vandaag ({stats.analytics.today} events)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {stats.analytics.todayEvents.length === 0 && (
                      <p className="text-white/40 text-sm">Nog geen events vandaag.</p>
                    )}
                    {stats.analytics.todayEvents.map((item, i) => (
                      <div key={i} className="p-2 rounded bg-gray-800/30 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sky-400">{item.event}</span>
                          <span className="text-white/40 text-xs">
                            {new Date(item.created_at).toLocaleTimeString('nl-NL')}
                          </span>
                        </div>
                        {item.data && Object.keys(item.data).length > 0 && (
                          <p className="text-white/50 text-xs mt-1">
                            {JSON.stringify(item.data).slice(0, 100)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* ═══ AUTOPILOT TAB ═══ */}
        {activeTab === 'autopilot' && (
          <>
            {/* Autopilot KPIs */}
            {autopilot && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-black/20 border-white/10 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-8 w-8 text-sky-400" />
                      <div>
                        <p className="text-2xl font-bold">{autopilot.stats.thisWeek}</p>
                        <p className="text-xs text-white/50">Deze week</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 border-white/10 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-yellow-400" />
                      <div>
                        <p className="text-2xl font-bold">{autopilot.stats.queued}</p>
                        <p className="text-xs text-white/50">In wachtrij</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 border-white/10 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-green-400" />
                      <div>
                        <p className="text-2xl font-bold">{autopilot.stats.approved}</p>
                        <p className="text-xs text-white/50">Goedgekeurd</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 border-white/10 text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Send className="h-8 w-8 text-purple-400" />
                      <div>
                        <p className="text-2xl font-bold">{autopilot.stats.posted}</p>
                        <p className="text-xs text-white/50">Geplaatst</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Generate buttons */}
            <Card className="bg-black/20 border-white/10 text-white mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-400" />
                    <span className="font-medium">Genereer content:</span>
                  </div>

                  <select
                    value={generateType}
                    onChange={(e) => setGenerateType(e.target.value)}
                    className="bg-black/30 border border-white/10 text-white rounded-md px-3 py-2 text-sm"
                  >
                    {autopilot && Object.entries(autopilot.contentTypes).map(([key, val]) => (
                      <option key={key} value={key}>{val.emoji} {val.label}</option>
                    ))}
                  </select>

                  <Button
                    onClick={() => handleGenerate('generate_single')}
                    disabled={generating}
                    className="bg-sky-500 hover:bg-sky-600 text-white"
                    size="sm"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    1 post
                  </Button>

                  <Button
                    onClick={() => handleGenerate('generate_week')}
                    disabled={generating}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    size="sm"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                    Hele week (7 posts)
                  </Button>

                  {autopilot && autopilot.stats.queued > 0 && (
                    <Button
                      onClick={() => handlePostAction('all', 'approve_all')}
                      variant="outline"
                      size="sm"
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Alles goedkeuren ({autopilot.stats.queued})
                    </Button>
                  )}
                </div>

                {/* Platform status */}
                {autopilot && (
                  <div className="flex items-center gap-4 mt-4 text-sm text-white/50">
                    <span className="flex items-center gap-1">
                      <Facebook className="h-4 w-4" />
                      {autopilot.platforms.facebook ? (
                        <span className="text-green-400">Verbonden</span>
                      ) : (
                        <span className="text-white/30">Niet verbonden</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Instagram className="h-4 w-4" />
                      {autopilot.platforms.instagram ? (
                        <span className="text-green-400">Verbonden</span>
                      ) : (
                        <span className="text-white/30">Niet verbonden</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      {autopilot.platforms.postingEnabled ? (
                        <><Play className="h-4 w-4 text-green-400" /> <span className="text-green-400">Posting actief</span></>
                      ) : (
                        <><Pause className="h-4 w-4 text-orange-400" /> <span className="text-orange-400">Posting gepauzeerd</span></>
                      )}
                    </span>
                    {autopilot.stats.nextScheduled && (
                      <span>Volgende: {formatDate(autopilot.stats.nextScheduled)}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: 'all', label: 'Alles', count: autopilot?.stats.total },
                { key: 'queued', label: 'Wachtrij', count: autopilot?.stats.queued },
                { key: 'approved', label: 'Goedgekeurd', count: autopilot?.stats.approved },
                { key: 'posted', label: 'Geplaatst', count: autopilot?.stats.posted },
                { key: 'failed', label: 'Mislukt', count: autopilot?.stats.failed },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    statusFilter === f.key
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'text-white/50 hover:text-white/80 border border-white/10'
                  }`}
                >
                  {f.label} {f.count !== undefined && f.count > 0 && (
                    <span className="ml-1 text-xs opacity-70">({f.count})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Posts list */}
            <div className="space-y-3">
              {filteredPosts.length === 0 && (
                <div className="text-center py-12 text-white/40">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nog geen posts. Genereer content om te beginnen!</p>
                </div>
              )}

              {filteredPosts.map(post => {
                const isExpanded = expandedPost === post.id;
                const isEditing = editingPost === post.id;
                const statusCfg = STATUS_CONFIG[post.status];
                const typeCfg = autopilot?.contentTypes[post.content_type];
                const typeColor = CONTENT_TYPE_COLORS[post.content_type] || 'bg-gray-500/20 text-gray-400';

                return (
                  <Card key={post.id} className="bg-black/20 border-white/10 text-white">
                    <CardContent className="p-4">
                      {/* Header row */}
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
                        }

                        <Badge variant="outline" className={`${typeColor} text-xs shrink-0`}>
                          {typeCfg?.emoji || '📝'} {typeCfg?.label || post.content_type}
                        </Badge>

                        <Badge variant="outline" className={`${statusCfg.color} text-xs shrink-0`}>
                          <statusCfg.icon className="h-3 w-3 mr-1" />
                          {statusCfg.label}
                        </Badge>

                        <span className="text-white/80 text-sm truncate flex-1">
                          {post.text_content.substring(0, 80)}...
                        </span>

                        <span className="text-white/40 text-xs shrink-0">
                          {formatDate(post.scheduled_for)}
                        </span>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="mt-4 ml-7 space-y-4">
                          {/* Post text */}
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={6}
                                className="w-full bg-black/30 border border-white/10 text-white rounded-lg p-3 text-sm resize-y"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => {
                                    handlePostAction(post.id, 'edit', { text_content: editText });
                                    setEditingPost(null);
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-1" /> Opslaan
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-white/50"
                                  onClick={() => setEditingPost(null)}
                                >
                                  <X className="h-4 w-4 mr-1" /> Annuleren
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-800/30 rounded-lg p-4">
                              <p className="text-white/80 text-sm whitespace-pre-wrap">{post.text_content}</p>
                              {post.hashtags?.length > 0 && (
                                <p className="text-sky-400/70 text-sm mt-2">
                                  {post.hashtags.join(' ')}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Image prompt */}
                          {post.image_prompt && (
                            <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-3">
                              <p className="text-xs text-purple-400 font-medium mb-1">Image prompt:</p>
                              <p className="text-white/60 text-xs">{post.image_prompt}</p>
                            </div>
                          )}

                          {/* Error message */}
                          {post.error_message && (
                            <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-3">
                              <p className="text-xs text-red-400">{post.error_message}</p>
                            </div>
                          )}

                          {/* Meta info */}
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span>Platform: {post.platform}</span>
                            <span>Aangemaakt: {formatDate(post.created_at)}</span>
                            {post.posted_at && <span>Gepost: {formatDate(post.posted_at)}</span>}
                          </div>

                          {/* Actions */}
                          {post.status !== 'posted' && (
                            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                              {post.status === 'queued' && (
                                <Button
                                  size="sm"
                                  className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                  onClick={() => handlePostAction(post.id, 'approve')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Goedkeuren
                                </Button>
                              )}
                              {post.status === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-yellow-400 hover:bg-yellow-500/10"
                                  onClick={() => handlePostAction(post.id, 'reject')}
                                >
                                  <Clock className="h-4 w-4 mr-1" /> Terug naar wachtrij
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-white/50 hover:text-white hover:bg-white/5"
                                onClick={() => {
                                  setEditingPost(post.id);
                                  setEditText(post.text_content);
                                }}
                              >
                                <Edit3 className="h-4 w-4 mr-1" /> Bewerken
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:bg-red-500/10"
                                onClick={() => handlePostAction(post.id, 'delete')}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Verwijderen
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* ═══ INSTELLINGEN TAB ═══ */}
        {activeTab === 'instellingen' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Social Media Koppelingen */}
            <Card className="bg-black/20 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Facebook className="h-5 w-5 text-blue-400" />
                  Facebook
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Page ID</label>
                  <Input
                    value={fbPageId}
                    onChange={(e) => setFbPageId(e.target.value)}
                    placeholder="123456789"
                    className="bg-black/30 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 block mb-1">Access Token</label>
                  <Input
                    type="password"
                    value={fbToken}
                    onChange={(e) => setFbToken(e.target.value)}
                    placeholder="EAA..."
                    className="bg-black/30 border-white/10 text-white"
                  />
                </div>
                <p className="text-xs text-white/30">
                  Gebruik de Meta Graph API Explorer om een Page Access Token te genereren met pages_manage_posts permissie.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/20 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-pink-400" />
                  Instagram
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Business Account ID</label>
                  <Input
                    value={igAccountId}
                    onChange={(e) => setIgAccountId(e.target.value)}
                    placeholder="17841..."
                    className="bg-black/30 border-white/10 text-white"
                  />
                </div>
                <p className="text-xs text-white/30">
                  Instagram Business Account ID vind je via: Graph API Explorer → GET me/accounts → instagram_business_account.
                  Gebruikt dezelfde Access Token als Facebook.
                </p>
              </CardContent>
            </Card>

            {/* Autopilot instellingen */}
            <Card className="bg-black/20 border-white/10 text-white md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-sky-400" />
                  Autopilot Instellingen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-approve</p>
                    <p className="text-sm text-white/50">
                      Gegenereerde posts automatisch goedkeuren (geen handmatige review nodig)
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoApprove(!autoApprove)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      autoApprove ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        autoApprove ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Posting actief</p>
                    <p className="text-sm text-white/50">
                      Goedgekeurde posts automatisch plaatsen op social media (dagelijks 9:00)
                    </p>
                  </div>
                  <button
                    onClick={() => setPostingEnabled(!postingEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      postingEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        postingEnabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="bg-sky-900/10 border border-sky-500/20 rounded-lg p-4 text-sm text-white/70">
                  <p className="font-medium text-sky-400 mb-2">Hoe werkt de autopilot?</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Elke <strong>maandag 7:00</strong> genereert de AI 7 posts voor de week</li>
                    <li>Posts komen in de wachtrij (of worden auto-approved)</li>
                    <li>Elke dag om <strong>10:00</strong> worden goedgekeurde posts geplaatst</li>
                    <li>Je krijgt een <strong>Telegram melding</strong> bij generatie en plaatsing</li>
                    <li>Je kunt altijd handmatig posts genereren, bewerken of verwijderen</li>
                  </ul>
                </div>

                <Button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="bg-sky-500 hover:bg-sky-600 text-white"
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  Instellingen opslaan
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
