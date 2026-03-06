import { Mail } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

const NewsletterCTA = () => (
  <section className="px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto mt-10">
    <div className="bg-emerald-500 rounded-[3rem] p-10 md:p-16 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl shadow-emerald-500/20">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-emerald-400 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-emerald-600 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="relative z-10 max-w-2xl text-center lg:text-left">
        <Badge variant="dark" className="mb-6 inline-block !px-4 !py-2 bg-slate-900">VIP Access</Badge>
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
          Unlock off-market <br className="hidden md:block"/> premium listings.
        </h2>
        <p className="text-emerald-950 text-lg font-medium">
          Join 10,000+ investors receiving our highly curated, private portfolio of luxury homes every week.
        </p>
      </div>

      <div className="relative z-10 w-full lg:w-auto flex-shrink-0 lg:min-w-[450px]">
        <div className="flex flex-col sm:flex-row gap-3 bg-emerald-600/20 p-2.5 rounded-[2.5rem] backdrop-blur-sm border border-emerald-400/30">
          <div className="flex-1 flex items-center gap-3 px-4">
            <Mail className="w-5 h-5 text-emerald-900 shrink-0" />
            <input
              type="email"
              placeholder="Enter your email..."
              className="w-full bg-transparent text-slate-900 placeholder-emerald-900 focus:outline-none font-bold"
            />
          </div>
          <Button variant="primary" className="!py-4 !px-8 text-lg w-full sm:w-auto whitespace-nowrap">
            Get Access
          </Button>
        </div>
        <p className="text-emerald-900/80 text-xs mt-4 text-center lg:text-left font-bold uppercase tracking-wider">
          Unsubscribe at any time. No spam.
        </p>
      </div>
    </div>
  </section>
);

export default NewsletterCTA;
