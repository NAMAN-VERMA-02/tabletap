import { Link } from 'react-router-dom';
import SiteHeader from '../components/ui/SiteHeader';
import Photo from '../components/ui/Photo';
import Logo from '../components/ui/Logo';
import useReveal from '../hooks/useReveal';

const img = (name) => `/images/${name}`;

const STEPS = [
  {
    n: '01',
    title: 'Scan',
    text: 'A small card on every table. One scan opens your menu, with no app and no sign-up.',
    src: img('step-scan.jpg'),
    tone: 'clay',
  },
  {
    n: '02',
    title: 'Order',
    text: 'Guests browse at their own pace, add notes like "less spicy", and send the order when they are ready.',
    src: img('step-order.jpg'),
    tone: 'dusk',
  },
  {
    n: '03',
    title: 'Savour',
    text: 'The kitchen sees it instantly. The guest watches it go from preparing to served, live on their phone.',
    src: img('step-savour.jpg'),
    tone: 'sand',
  },
];

const FEATURES = [
  { tag: 'Menu', title: 'A menu that is always right', text: 'Mark a dish sold out and it disappears from every table at once. Prices are checked on the server, never trusted from the phone.' },
  { tag: 'Tables', title: 'A QR code for every table', text: 'Number your tables, print a ready-to-cut sheet, and regenerate any code in a second if a photo of it gets shared.' },
  { tag: 'Insights', title: 'Know your night by its numbers', text: 'Revenue per day, your best-selling dishes and your busiest hours, in your own timezone.' },
  { tag: 'Team', title: 'Owners and staff, kept apart', text: 'Staff run the kitchen and mark dishes sold out. Only owners can change the menu, cancel orders or see the numbers.' },
];

const KITCHEN_POINTS = [
  'New, Preparing and Ready columns that update on their own',
  'A timer on every ticket, with late orders gently flagged',
  'A soft chime the moment a new order arrives',
  'One tap to move an order along; guests see it instantly',
];

export default function Landing() {
  useReveal();

  return (
    <div className="bg-sand">
      <SiteHeader />

      {/* Hero */}
      <section className="relative h-[100svh] min-h-[560px] w-full">
        <Photo src={img('hero.jpg')} tone="dusk" priority className="absolute inset-0" imgClassName="scale-105 animate-[heroZoom_14s_ease-out_forwards]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/75" />
        <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-end px-4 pb-16 sm:px-8 sm:pb-24">
          <p className="eyebrow text-white/80">QR ordering &amp; live kitchen display</p>
          <h1 className="display mt-4 max-w-4xl text-5xl text-white sm:text-7xl lg:text-[88px]">
            Every table, a little more attentive.
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link to="/register" className="btn bg-white px-6 py-3 text-stone-800 hover:bg-stone-100">Set up your restaurant</Link>
            <Link to="/login?demo=1" className="link-arrow text-white">Explore the live demo <span aria-hidden>→</span></Link>
          </div>
        </div>
      </section>

      {/* Statement */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:py-36">
        <p className="eyebrow reveal text-stone-500">TableTap</p>
        <h2 className="display reveal mt-6 text-4xl sm:text-6xl">
          Guests order the moment they are ready. Your kitchen knows the second they do.
        </h2>
        <p className="reveal mx-auto mt-8 max-w-xl leading-relaxed text-stone-600">
          No waving for a menu, no lost tickets, no shouting across the pass. Just a calm, quiet flow from the table
          to the kitchen and back again.
        </p>
        <a href="#how" className="link-arrow reveal mt-10">See how it works <span aria-hidden>→</span></a>
      </section>

      <Photo src={img('intro-wide.jpg')} tone="sand" className="reveal mx-4 aspect-[16/10] sm:mx-8 lg:aspect-[16/8]" />

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1440px] scroll-mt-16 px-4 py-24 sm:px-8 sm:py-36">
        <div className="mb-14 flex flex-col justify-between gap-6 border-b border-stone-700/10 pb-8 sm:flex-row sm:items-end">
          <h2 className="display reveal max-w-xl text-4xl sm:text-6xl">From table to kitchen, in three quiet steps</h2>
          <p className="reveal max-w-sm text-stone-600">Nothing to install for your guests. Nothing complicated for your team.</p>
        </div>
        <ol className="grid gap-12 md:grid-cols-3 md:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.n} className="reveal" style={{ transitionDelay: `${i * 120}ms` }}>
              <Photo src={s.src} tone={s.tone} className="aspect-[5/8] w-full" />
              <div className="mt-6 flex items-baseline gap-4">
                <span className="text-xs tabular-nums text-stone-500">{s.n}</span>
                <h3 className="display text-4xl">{s.title}</h3>
              </div>
              <p className="mt-3 max-w-sm pl-8 leading-relaxed text-stone-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Kitchen */}
      <section id="kitchen" className="scroll-mt-16 bg-stone-950 text-stone-100">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-24 sm:px-8 sm:py-32 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <Photo src={img('kitchen-wide.jpg')} tone="night" className="reveal aspect-[16/10]" />
          <div>
            <p className="eyebrow reveal text-stone-400">For the kitchen</p>
            <h2 className="display reveal mt-5 text-4xl sm:text-6xl">An invisible thread from table to pass</h2>
            <ul className="mt-10 divide-y divide-white/10 border-y border-white/10">
              {KITCHEN_POINTS.map((p, i) => (
                <li key={p} className="reveal flex gap-5 py-4 text-stone-300" style={{ transitionDelay: `${i * 80}ms` }}>
                  <span className="text-xs tabular-nums text-stone-500">0{i + 1}</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Principle */}
      <section className="mx-auto max-w-5xl px-4 py-24 text-center sm:py-36">
        <p className="display reveal text-4xl italic sm:text-6xl">
          “The best service is the kind your guests never have to ask for.”
        </p>
        <p className="eyebrow reveal mt-8 text-stone-500">The idea behind TableTap</p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-[1440px] scroll-mt-16 px-4 pb-24 sm:px-8 sm:pb-36">
        <div className="grid gap-px overflow-hidden border border-stone-700/10 bg-stone-700/10 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="reveal bg-sand p-8 sm:p-12" style={{ transitionDelay: `${(i % 2) * 120}ms` }}>
              <p className="eyebrow text-stone-500">{f.tag}</p>
              <h3 className="mt-6 text-2xl font-medium tracking-tight text-stone-800">{f.title}</h3>
              <p className="mt-3 max-w-md leading-relaxed text-stone-600">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Owner insight */}
      <section className="mx-auto grid max-w-[1440px] gap-12 px-4 pb-24 sm:px-8 sm:pb-36 lg:grid-cols-2 lg:items-center">
        <Photo src={img('owner.jpg')} tone="clay" className="reveal aspect-[4/5] lg:order-2" />
        <div className="lg:pr-16">
          <p className="eyebrow reveal text-stone-500">For owners</p>
          <h2 className="display reveal mt-5 text-4xl sm:text-6xl">The end of the night, already summed up</h2>
          <p className="reveal mt-6 max-w-md leading-relaxed text-stone-600">
            Every order feeds a clear dashboard: what you earned, what sold, and when the room was at its fullest.
          </p>
          <dl className="reveal mt-10 grid grid-cols-3 gap-6 border-t border-stone-700/10 pt-8">
            {[
              ['Revenue', 'per day'],
              ['Top dishes', 'by quantity'],
              ['Peak hours', 'in your timezone'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="display text-2xl sm:text-3xl">{k}</dt>
                <dd className="mt-1 text-sm text-stone-500">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="relative">
        <Photo src={img('cta.jpg')} tone="night" className="absolute inset-0" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative mx-auto max-w-3xl px-4 py-32 text-center text-white sm:py-44">
          <h2 className="display reveal text-4xl sm:text-6xl">A table is waiting.</h2>
          <h2 className="display reveal text-4xl italic text-white/80 sm:text-6xl">Set yours in minutes.</h2>
          <div className="reveal mt-10 flex flex-wrap items-center justify-center gap-6">
            <Link to="/register" className="btn bg-white px-6 py-3 text-stone-800 hover:bg-stone-100">Get started</Link>
            <Link to="/login?demo=1" className="link-arrow">Explore the demo <span aria-hidden>→</span></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8">
        <div className="flex flex-col justify-between gap-10 border-b border-stone-700/10 pb-12 md:flex-row">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-stone-600">QR ordering and a live kitchen display, built for restaurants that care about the details.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div className="space-y-3">
              <p className="eyebrow text-stone-500">Product</p>
              <a href="#how" className="block hover:opacity-60">How it works</a>
              <a href="#kitchen" className="block hover:opacity-60">Kitchen display</a>
              <a href="#features" className="block hover:opacity-60">Features</a>
            </div>
            <div className="space-y-3">
              <p className="eyebrow text-stone-500">Account</p>
              <Link to="/login" className="block hover:opacity-60">Log in</Link>
              <Link to="/register" className="block hover:opacity-60">Get started</Link>
              <Link to="/login?demo=1" className="block hover:opacity-60">Live demo</Link>
            </div>
          </div>
        </div>
        <p className="mt-8 text-xs text-stone-500">© {new Date().getFullYear()} TableTap · A portfolio project built with MongoDB, Express, React and Node.</p>
      </footer>
    </div>
  );
}
