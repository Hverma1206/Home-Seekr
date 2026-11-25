import { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { siteService } from '../../services/siteService';

const NewsletterCTA = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'done' | 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;

    setStatus('sending');
    setMessage('');
    try {
      const { data } = await siteService.subscribe(email.trim());
      setStatus('done');
      setMessage(data?.message || "You're subscribed!");
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Could not subscribe right now. Please try again.');
    }
  };

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto mt-10">
      <div className="bg-emerald-500 rounded-[3rem] p-10 md:p-16 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl shadow-emerald-500/20">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-emerald-400 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-emerald-600 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="relative z-10 max-w-2xl text-center lg:text-left">
          <Badge variant="dark" className="mb-6 inline-block !px-4 !py-2 bg-slate-900">Newsletter</Badge>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
            Be the first to see <br className="hidden md:block" /> new listings.
          </h2>
          <p className="text-emerald-950 text-lg font-medium">
            Fresh properties, new projects and price updates from the cities you care about, straight to your inbox.
          </p>
        </div>

        <div className="relative z-10 w-full lg:w-auto flex-shrink-0 lg:min-w-[450px]">
          {status === 'done' ? (
            <div role="status" className="flex items-center gap-3 bg-white/90 rounded-[2rem] px-6 py-5 text-slate-900 font-bold">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              {message}
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 bg-emerald-600/20 p-2.5 rounded-[2.5rem] backdrop-blur-sm border border-emerald-400/30"
            >
              <label className="flex-1 flex items-center gap-3 px-4">
                <Mail className="w-5 h-5 text-emerald-900 shrink-0" />
                <span className="sr-only">Email address</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email..."
                  autoComplete="email"
                  className="w-full bg-transparent text-slate-900 placeholder-emerald-900 focus:outline-none font-bold py-3 sm:py-0"
                />
              </label>
              <Button
                type="submit"
                variant="primary"
                disabled={status === 'sending'}
                className="!py-4 !px-8 text-lg w-full sm:w-auto whitespace-nowrap disabled:opacity-70"
              >
                {status === 'sending' ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>
          )}
          {status === 'error' ? (
            <p role="alert" className="text-rose-900 text-sm mt-4 text-center lg:text-left font-bold">{message}</p>
          ) : status !== 'done' && (
            <p className="text-emerald-900/80 text-xs mt-4 text-center lg:text-left font-bold uppercase tracking-wider">
              Unsubscribe at any time. No spam.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default NewsletterCTA;
