import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Check, Mail } from 'lucide-react';

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

const WaitlistModal = ({ open, onClose }: WaitlistModalProps) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;

    setStatus('loading');
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus('success');
      localStorage.setItem('stekfinder_waitlisted', 'true');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full animate-fade-in-up shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {status === 'success' ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
              <Check className="h-7 w-7 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Top, je staat erop!</h2>
            <p className="text-white/60 text-sm">
              We mailen je zodra StekFinder live gaat. Jij bent als eerst aan de beurt.
            </p>
            <Button onClick={onClose} className="mt-6 bg-sky-500 hover:bg-sky-600 text-white">
              Sluiten
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-1">Credits op voor vandaag</h2>
            <p className="text-white/60 text-sm mb-5">
              Laat je e-mail achter en wij laten je als eerst weten wanneer StekFinder live gaat.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  type="email"
                  placeholder="je@email.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 bg-black/30 border-white/10 text-white placeholder:text-white/30 h-12 text-base"
                  required
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={status === 'loading' || !email.includes('@')}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold h-12"
              >
                {status === 'loading' ? 'Even geduld...' : 'Houd me op de hoogte'}
              </Button>
            </form>

            {status === 'error' && (
              <p className="text-red-400 text-sm mt-3">Er ging iets mis, probeer het nog eens.</p>
            )}

            <p className="text-xs text-white/30 mt-4">
              Geen spam. Morgen heb je weer 3 credits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitlistModal;
