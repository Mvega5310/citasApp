const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Marcos BarberShop';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="hidden md:block px-4 sm:px-6 lg:px-8 py-8 bg-cafe-bg border-t border-cafe-border">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 text-sm">
        <span className="font-display text-base text-cafe-goldlight">{APP_NAME}</span>
        <span className="text-cafe-subtle">
          © {year} {APP_NAME}. Todos los derechos reservados.
        </span>
      </div>
    </footer>
  );
}
