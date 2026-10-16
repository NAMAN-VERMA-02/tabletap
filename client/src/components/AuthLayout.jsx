import Logo from './ui/Logo';
import Photo from './ui/Photo';

// Split screen: photograph on the left (desktop), quiet form on the right.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-sand lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Photo src="/images/auth.jpg" tone="clay" priority className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        <div className="absolute inset-x-0 top-0 p-10">
          <Logo light />
        </div>
        <p className="display absolute inset-x-0 bottom-0 max-w-lg p-10 text-4xl text-white">
          Quiet service, from the first scan to the last plate.
        </p>
      </div>

      <div className="flex flex-col px-4 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="display text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 text-stone-600">{subtitle}</p>}
          <div className="mt-10">{children}</div>
          {footer && <p className="mt-8 border-t border-stone-700/10 pt-6 text-sm text-stone-600">{footer}</p>}
        </div>
      </div>
    </div>
  );
}
