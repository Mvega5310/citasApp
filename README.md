# BeautyTurno - Sistema de Reservas de Belleza y Barbería

Una aplicación web moderna y responsiva para gestionar reservas de servicios de belleza y barbería. Permite a los clientes reservar citas de manera fácil y rápida desde cualquier dispositivo móvil.

## 🚀 Características

### Para Clientes
- **Interfaz moderna y responsiva** - Optimizada para dispositivos móviles
- **PWA (Progressive Web App)** - Instálala como una app nativa en tu celular
- **Selección de servicios** - Manicure, Pedicure, Blower y Barbería con precios actualizados
- **Calendario interactivo** - Selección de fecha con disponibilidad en tiempo real
- **Selección de horarios** - Múltiples opciones de horarios disponibles
- **Formulario de reserva** - Captura de datos del cliente con validación
- **Confirmación automática** - Email de confirmación con detalles de la cita
- **Notificaciones** - Recordatorios por email y WhatsApp (opcional)

### Servicios Disponibles
- **💅 Manicure** - $25,000 (60 min)
- **🦶 Pedicure** - $30,000 (75 min)
- **💇‍♀️ Blower** - $20,000 (45 min)
- **✂️ Corte de Cabello** - $12,000 (30 min)
- **🧔 Corte y Barba** - $15,000 (45 min)
- **👁️ Cejas** - $3,000 (20 min)
- **🪒 Solo Barba** - $3,000 (25 min)

### Para Administradores
- **Panel de administración** - Gestión completa de citas
- **Dashboard con estadísticas** - Vista general de reservas y estados
- **Gestión de citas** - Ver, editar, confirmar y cancelar citas
- **Filtros y búsqueda** - Encontrar citas rápidamente
- **Exportación de datos** - Reportes y estadísticas

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Next.js 14** - Framework de React con App Router
- **TypeScript** - Tipado estático para mayor seguridad
- **Tailwind CSS** - Framework de CSS utilitario
- **React Hook Form** - Manejo de formularios
- **React Hot Toast** - Notificaciones elegantes
- **Lucide React** - Iconos modernos
- **Date-fns** - Manipulación de fechas

### Backend (Configuración)
- **Firebase Firestore** - Base de datos NoSQL
- **Firebase Auth** - Autenticación de usuarios
- **Nodemailer** - Envío de emails
- **Twilio** - Integración con WhatsApp (opcional)

## 📱 Optimizaciones Móviles

- **Mobile-First Design** - Diseño optimizado para móviles
- **Touch-Friendly** - Botones y elementos táctiles de 44px mínimo
- **PWA Ready** - Instalable como app nativa
- **Offline Support** - Funciona sin conexión
- **Fast Loading** - Carga rápida en conexiones lentas
- **Responsive Images** - Imágenes optimizadas para cada dispositivo

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Firebase (para base de datos)
- Cuenta de email (para envío de confirmaciones)

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/beautyturno.git
   cd beautyturno
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   # o
   yarn install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env.local
   ```
   
   Editar `.env.local` con tus credenciales:
   ```env
   # Firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

   # Email (opcional)
   EMAIL_SERVER_HOST=smtp.gmail.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=tu_email@gmail.com
   EMAIL_SERVER_PASSWORD=tu_password

   # Twilio (opcional)
   TWILIO_ACCOUNT_SID=tu_account_sid
   TWILIO_AUTH_TOKEN=tu_auth_token
   TWILIO_PHONE_NUMBER=+1234567890

   # Application Configuration
   NEXT_PUBLIC_APP_NAME=BeautyTurno
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   # o
   yarn dev
   ```

5. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 📁 Estructura del Proyecto

```
beautyturno/
├── app/                    # App Router de Next.js
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Página de inicio
│   ├── reservar/          # Página de reservas
│   ├── servicios/         # Página de servicios
│   ├── contacto/          # Página de contacto
│   └── admin/             # Panel de administración
├── components/            # Componentes reutilizables
│   ├── Header.tsx         # Header de navegación
│   ├── Footer.tsx         # Footer
│   ├── ServiceSelector.tsx # Selector de servicios
│   ├── Calendar.tsx       # Calendario interactivo
│   └── BookingForm.tsx    # Formulario de reserva
├── lib/                   # Utilidades y configuración
│   ├── firebase.ts        # Configuración de Firebase
│   └── services.ts        # Datos de servicios
├── types/                 # Definiciones de TypeScript
│   └── index.ts           # Interfaces y tipos
├── public/                # Archivos estáticos
│   └── manifest.json      # PWA manifest
└── package.json           # Dependencias y scripts
```

## 🎨 Personalización

### Colores
Los colores se pueden personalizar en `tailwind.config.js`:
```javascript
colors: {
  primary: {
    500: '#ec4899', // Color principal
  },
  secondary: {
    500: '#0ea5e9', // Color secundario
  },
  accent: {
    500: '#eab308', // Color de acento
  }
}
```

### Servicios
Los servicios se pueden modificar en `lib/services.ts`:
```typescript
export const services: Service[] = [
  {
    id: 'corte-cabello',
    name: 'Corte de Cabello',
    description: 'Corte de cabello profesional para hombres',
    duration: 30,
    price: 12000,
    icon: '✂️'
  }
];
```

### Horarios
Los horarios disponibles se configuran en `lib/services.ts`:
```typescript
export const availableHours = [
  '09:00', '09:30', '10:00', // etc.
];

export const workingHours = {
  start: '09:00',
  end: '20:00',
  daysOff: [0, 6] // 0 = domingo, 6 = sábado
};
```

## 📧 Configuración de Email

Para habilitar el envío de emails de confirmación:

1. **Configurar SMTP** en las variables de entorno
2. **Crear templates de email** en `lib/email-templates.ts`
3. **Implementar función de envío** en `lib/email-service.ts`

## 📱 Integración con WhatsApp

Para habilitar notificaciones por WhatsApp:

1. **Crear cuenta en Twilio**
2. **Configurar credenciales** en variables de entorno
3. **Implementar función de envío** en `lib/whatsapp-service.ts`

## 🚀 Despliegue

### Vercel (Recomendado)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Desplegar automáticamente

### Netlify
1. Conectar repositorio a Netlify
2. Configurar build command: `npm run build`
3. Configurar variables de entorno

### Firebase Hosting
```bash
npm run build
firebase deploy
```

## 🔧 Scripts Disponibles

```bash
npm run dev          # Ejecutar en desarrollo
npm run build        # Construir para producción
npm run start        # Ejecutar en producción
npm run lint         # Verificar código
```

## 📊 Funcionalidades Futuras

- [ ] Autenticación de usuarios
- [ ] Historial de citas para clientes
- [ ] Sistema de fidelización
- [ ] Integración con pasarelas de pago
- [ ] App móvil nativa
- [ ] Sistema de reviews y calificaciones
- [ ] Gestión de empleados y horarios
- [ ] Reportes avanzados y analytics
- [ ] Notificaciones push
- [ ] Modo offline completo

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@beautyturno.com
- WhatsApp: +57 300 123 4567
- Documentación: [docs.beautyturno.com](https://docs.beautyturno.com)

---

**BeautyTurno** - Tu belleza y barbería, nuestra prioridad ✨ 