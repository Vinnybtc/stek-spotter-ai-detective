import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Sparkles, Mail, Check } from 'lucide-react';

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

const WaitlistModal = ({ open, onClose }: WaitlistModalProps) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setStatus('success');
      setMessage(data.message || 'Je bent aangemeld!');
      localStorage.setItem('stekfinder_waitlisted', 'true');
    } catch {
      setStatus('error');
      setMessage('Er ging iets mis. Probeer het later opnieuw.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-md w-full animate-fade-in-up shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {status === 'success' ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Je staat op de lijst!</h2>
            <p className="text-white/70">{message}</p>
            <p className="text-sm text-white/50 mt-4">
              We selecteren elke week een kleine groep vissers die toegang krijgen.
              Hoe eerder je je aanmeldt, hoe sneller je aan de beurt bent.
            </p>
            <Button
              onClick={onClose}
              className="mt-6 bg-sky-500 hover:bg-sky-600 text-white"
            >
              Sluiten
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/20 mb-4">
                <Sparkles className="h-8 w-8 text-sky-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Credits op voor vandaag
              </h2>
              <p className="text-white/70 mt-2">
                StekFinder is momenteel in exclusieve b&egrave;ta.
                Laat je e-mail achter en we nodigen je uit voor onbeperkt gebruik.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  type="email"
                  placeholder="jouw@email.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 bg-black/30 border-white/10 text-white placeholder:text-white/30 h-12"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={status === 'loading' || !email.includes('@')}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold h-12"
              >
                {status === 'loading' ? 'Aanmelden...' : 'Zet me op de lijst'}
              </Button>
              {status === 'error' && (
                <p className="text-red-400 text-sm text-center">{message}</p>
              )}
            </form>

            <div className="mt-6 text-center space-y-1">
              <p className="text-xs text-white/40">
                Beperkte plekken beschikbaar. Geen spam, beloofd.
              </p>
              <p className="text-xs text-sky-400/60">
                Je dagelijkse credits worden morgen weer aangevuld.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WaitlistModal;
