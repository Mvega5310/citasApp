const APP_NAME = 'BeautyTurno';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="hidden md:block py-6 px-4 text-center text-sm"
      style={{ background: '#0E1713', borderTop: '1px solid #2C3E36', color: '#5D7065' }}
    >
      © {year} {APP_NAME}. Todos los derechos reservados.
    </footer>
  );
}
