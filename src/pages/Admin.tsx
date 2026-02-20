import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, BarChart3, Mail, TrendingUp, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';

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

const Admin = () => {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async (pass?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${pass || password}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError('Verkeerd wachtwoord.');
          setAuthenticated(false);
          return;
        }
        throw new Error('Fout bij ophalen stats.');
      }
      const data = await res.json();
      setStats(data);
      setAuthenticated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er ging iets mis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('stekfinder_admin');
    if (saved) {
      setPassword(saved);
      fetchStats(saved);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('stekfinder_admin', password);
    fetchStats();
  };

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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-orange-400">
            StekFinder Admin
          </h1>
          <Button onClick={() => fetchStats()} variant="outline" size="sm" className="border-white/10 text-white/70">
            Ververs
          </Button>
        </div>

        {stats && (
          <>
            {/* KPI Cards */}
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
                      <p className="text-2xl font-bold">
                        {stats.analytics.totals.feedback || 0}
                      </p>
                      <p className="text-xs text-white/50">Feedback</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Waitlist */}
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

              {/* Recent events */}
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
      </div>
    </div>
  );
};

export default Admin;
