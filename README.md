# SafeMine AI — Plataforma Multiplataforma de Acreditación Minera, Validación IA y Control de Acceso con EPPs

> **Sistema Corporativo Integral de Seguridad y Salud Ocupacional (SSO) para Minería**  
> Automatización de convocatorias de personal contratista, validación documental de Constancias Médicas (EMO) con **Google Gemini IA** bajo la normativa peruana **D.S. 024-2016-EM**, acreditación con **Fotocheck QR Digital con almacenamiento Offline**, control de acceso con **detección de EPPs en tiempo real** mediante **AWS Rekognition** y señalización física con microcontrolador **Arduino IoT**.

---

## 🌟 Novedades de la Versión 2.0 (Separación Web y Mobile)

El sistema ha evolucionado de una versión monolítica a un **ecosistema moderno y desacoplado** compuesto por aplicaciones especializadas según el entorno operativo:

1. **Plataforma Web Administrativa (`web/`)**:
   - Diseñada exclusivamente para la gestión corporativa de la **Minera** y los **Proveedores Contratistas**.
   - Gestión de convocatorias, postulación de cuadrillas, generación automática de accesos para operarios, auditoría de cumplimiento SSO/PETS y emisión oficial de reportes de desempeño en **PDF**.
   - Aislamiento estricto: los operarios no pueden ingresar a la consola web y son guiados automáticamente a la aplicación móvil.

2. **Aplicación Móvil Nativa (`mobile/`)**:
   - Construida con **React Native + Expo SDK 58** para teléfonos y tablets (Android / iOS).
   - **Módulo Operarios**: Flujo guiado en 3 pasos:
     - **Paso 1 (Inducción IPERC)**: Cuestionario interactivo de inducción en seguridad ($\ge 80\%$ para aprobar).
     - **Paso 2 (Auditoría Médica EMO con IA)**: Carga de certificado médico en PDF o imagen, analizado en tiempo real por **Google Gemini IA**.
     - **Paso 3 (Fotocheck QR Minero)**: Credencial digital holográfica con Código QR dinámico.
   - **Soporte Offline Nativo**: Almacenamiento local mediante `AsyncStorage` (`offlineStorage.ts`) para consultar y exhibir el Fotocheck QR en socavones o faenas sin cobertura de red.
   - **Modo Garita Móvil**: Escáner de Códigos QR con cámara nativa y captura fotográfica para inspección automática de EPPs mediante visión por computadora en tiempo real.

3. **Backend con Arquitectura en Capas y Seguridad Robusta (`backend/`)**:
   - Refactorizado bajo el patrón **Controller — Service — Repository — ORM Models**.
   - Autenticación criptográfica con **Tokens JWT (HS256)** y control de acceso basado en roles (**RBAC** con dependencias `require_role` y `require_own_worker_record`).
   - Endpoint de autorregistro corporativo para empresas contratistas con validación de RUC.
   - WebSockets bidireccionales en `/ws/kiosco` para sincronización instantánea entre la app móvil, el dashboard web y el hardware físico.

4. **Hardware IoT en Garita (`iot-arduino/`)**:
   - Puente serial WebSocket en Python (`arduino_bridge.py`) y firmware C++ (`safemine_access_control.ino`).
   - Semáforo físico: LED Verde (Pin 8 - Acceso Concedido) y LED Rojo + Buzzer de alerta intermitente (Pin 9 - Acceso Denegado por falta de EPPs o credencial inválida).

---

## 🏛️ Arquitectura del Sistema

```
SafeMine/
├── backend/            # API REST + WebSockets en Python FastAPI (Puerto 8000)
│   ├── app/
│   │   ├── controllers/    # Endpoints REST (Auth, Minera, Proveedor, Trabajador, Kiosco)
│   │   ├── core/           # Configuración, tokens JWT criptográficos, dependencias RBAC, WebSockets
│   │   ├── db/             # Conexión SQLAlchemy, Base y Seed de datos iniciales
│   │   ├── models/         # Modelos ORM (User, Worker, Proposal, AccessLog)
│   │   ├── repositories/   # Acceso y consultas a la base de datos
│   │   ├── schemas/        # Esquemas Pydantic v2 de validación de entrada/salida
│   │   └── services/       # Lógica de negocio, Google Gemini SDK y AWS Rekognition
│   ├── uploads/            # Almacenamiento local de constancias médicas (fallback a AWS S3)
│   └── safemine.db         # Base de datos SQLite local (preparada para AWS RDS PostgreSQL)
│
├── web/                # Portal Web Organizacional en Next.js 15 + React 19 + Tailwind (Puerto 3000)
│   ├── src/
│   │   ├── app/            # App Router (/login, /, /proveedores)
│   │   ├── components/     # Componentes modulares (layout, minera, proveedores, ui)
│   │   ├── context/        # Contexto de autenticación y sesión JWT corporativa
│   │   ├── services/       # Cliente HTTP con inyección automática de cabeceras Bearer
│   │   └── utils/          # Generador de reportes oficiales de auditoría en PDF (jspdf)
│   └── tailwind.config.js  # Configuración visual de Tailwind CSS
│
├── mobile/             # Aplicación Móvil en React Native + Expo SDK 58 (Metro / Expo Go)
│   ├── src/
│   │   ├── config/         # Autodetección y resolución de IP LAN para pruebas con móvil físico
│   │   ├── context/        # Autenticación móvil y sincronización de perfil de operario
│   │   ├── screens/        # Vistas nativas: Login, Quiz, MedicalUpload, DigitalBadge, GateScanner
│   │   ├── services/       # Consumo de API REST y conexión WebSocket móvil
│   │   └── utils/          # Almacenamiento offline del fotocheck con AsyncStorage
│   └── app.json            # Configuración de permisos de cámara y bundle pe.safemine.mobile
│
└── iot-arduino/        # Puente Serial WebSocket + Firmware Arduino C++ para Garita
    ├── arduino_bridge.py   # Script Python que traduce eventos WebSocket a comandos Serial
    └── safemine_access_control/
        └── safemine_access_control.ino  # Sketch para Arduino UNO / ESP32 (Pines 8 y 9)
```

---

## 📋 Requisitos Previos

Asegúrate de tener instalado en tu equipo de desarrollo:

1. **Python 3.10 o superior** (verificar con `python --version`).
2. **Node.js 18 o superior** y `npm` (verificar con `node -v` y `npm -v`).
3. **Expo CLI / Expo Go**:
   - En tu computadora: Se ejecuta mediante `npx expo start`.
   - En tu smartphone físico: Descarga la app **Expo Go** desde Google Play Store o Apple App Store para probar la cámara y el lector QR en vivo.
4. *(Opcional)* **Arduino IDE** y cable USB si cuentas con un microcontrolador físico (Arduino UNO / Nano / ESP32). Si no dispones de hardware, el puente incluye **modo emulación automática en consola**.

---

## 🚀 Guía de Inicio Rápido (Paso a Paso)

Para ejecutar el ecosistema completo, abre las terminales correspondientes:

### Terminal 1: Iniciar el Backend (FastAPI — Puerto 8000)

```powershell
# 1. Entrar a la carpeta del backend
cd backend

# 2. Instalar dependencias requeridas
pip install -r requirements.txt

# 3. Iniciar el servidor FastAPI con host 0.0.0.0 (permite conexión desde la app móvil en tu red WiFi)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> **Verificación**:  
> - Estado del Servicio: `http://localhost:8000/api/status`  
> - Documentación Interactiva Swagger UI: `http://localhost:8000/docs`

---

### Terminal 2: Iniciar la Consola Web (Next.js — Puerto 3000)

```powershell
# 1. Entrar a la carpeta web
cd web

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo en el puerto 3000
npm run dev
```

> **Verificación**:  
> - Abre en tu navegador [http://localhost:3000](http://localhost:3000).  
> - El sistema te dirigirá al login administrativo corporativo de Minera y Contratistas.

---

### Terminal 3: Iniciar la Aplicación Móvil (Expo / React Native)

```powershell
# 1. Entrar a la carpeta mobile
cd mobile

# 2. Instalar dependencias
npm install

# 3. Iniciar el bundler de Expo
npx expo start
```

> **¿Cómo probar la app móvil?**:  
> - **En tu teléfono físico (Recomendado para probar la cámara y QR)**: Abre **Expo Go** y escanea el código QR que aparece en la terminal (asegúrate de que el teléfono y la PC estén en la misma red Wi-Fi).
> - **En emulador Android**: Presiona la tecla `a` en la terminal.
> - **En simulador iOS (macOS)**: Presiona la tecla `i` en la terminal.
> - **En navegador Web**: Presiona la tecla `w` en la terminal para abrirlo en Chrome / Edge.

---

### Terminal 4 (Opcional): Iniciar el Puente de Hardware Arduino

```powershell
cd iot-arduino

# 1. Instalar dependencias del puente
pip install -r requirements.txt

# 2. Conectar al Arduino físico (ejemplo en puerto COM3):
python arduino_bridge.py --port COM3 --ws ws://localhost:8000/ws/kiosco

# O ejecutar en MODO SIMULACIÓN si no tienes el Arduino conectado (muestra luces y estados en consola):
python arduino_bridge.py --simulate --ws ws://localhost:8000/ws/kiosco
```

- **Pin 8**: LED Verde (Acceso Permitido — QR válido + EPPs completos).
- **Pin 9**: LED Rojo + Buzzer (Acceso Denegado — Falta EPPs o no acreditado).

---

## 🔐 Matriz de Credenciales y Aislamiento de Vistas por Rol

El sistema implementa **aislamiento estricto de vistas** y validación en API con tokens JWT:

| Rol | Plataforma | Usuario / Correo | Contraseña | Alcance & Permisos |
| :--- | :--- | :--- | :--- | :--- |
| **🏢 Minera (Admin)** | **SafeMine Web** (`/`) | `minera@safemine.pe` | `minera123` | Crea requerimientos, define EPPs obligatorios, acepta cuadrillas (genera automáticamente 10 cuentas de operarios), evalúa cumplimiento SSO y emite reportes PDF oficiales. |
| **🏗️ Proveedor Contratista** | **SafeMine Web** (`/proveedores`) | `proveedor@contratistasperu.pe` | `proveedor123` | Postula cuadrillas de 10 especialistas, consulta las credenciales creadas automáticamente para sus operarios y descarga reportes de evaluación recibidos. |
| **👷 Trabajador (Autorizado)** | **SafeMine Mobile** | `op.45891021`<br>*(o DNI `45891021`)* | `mina1021` | **Carlos Mendoza Prado**. Perfil 100% acreditado: Examen aprobado (100/100), constancia médica validada por Gemini IA y Fotocheck QR digital activo con copia local offline. |
| **👷 Trabajador (En Proceso)** | **SafeMine Mobile** | `op.46102938`<br>*(o DNI `46102938`)* | `mina2938` | **Jorge Quispe Rojas**. En Paso 1: pendiente de aprobar la inducción de seguridad ($\ge 80\%$) para desbloquear la validación de su examen médico con IA. |
| **📷 Garita / Escáner de Acceso** | **SafeMine Mobile** (`GateScanner`) | Acceso directo en 1 clic | — | Escáner móvil de garita: lectura QR con cámara nativa $\rightarrow$ verificación de EPPs en vivo con visión artificial $\rightarrow$ Semáforo verde/rojo y notificación a WebSockets/Arduino. |

> 💡 **Nota sobre Cuentas Autogeneradas**:  
> Al aceptar una propuesta en el Panel de la Minera, el sistema crea automáticamente 10 usuarios en la base de datos con el formato:  
> - **Usuario**: `op.<DNI>` (también acepta el DNI solo).  
> - **Contraseña Temporal**: `mina<últimos 4 dígitos del DNI>`.  
> Estas credenciales se muestran con botones de copiado rápido tanto en el portal del Proveedor como en el de la Minera.

---

## 📱 Módulo Móvil: Experiencia del Operario y Garita

La aplicación móvil (`mobile/`) concentra toda la operativa de campo:

### 1. Flujo de Acreditación del Trabajador (3 Pasos Consecutivos)
```
       [ Login con DNI / op.<DNI> ]
                    │
                    ▼
       ┌────────────────────────┐
       │ Paso 1: Inducción SSO  │ ──► Examen de 5 preguntas sobre IPERC, PETS y EPPs.
       │     (Quiz Screen)      │     Requiere aprobación mínima del 80% (4/5).
       └────────────┬───────────┘
                    ▼ (Aprobado)
       ┌────────────────────────┐
       │  Paso 2: Auditoría EMO │ ──► Carga de constancia médica (PDF/Imagen).
       │   (Medical Upload)     │     Auditoría con Google Gemini IA (D.S. 024-2016-EM).
       └────────────┬───────────┘
                    ▼ (Dictamen: APTO)
       ┌────────────────────────┐
       │ Paso 3: Fotocheck QR   │ ──► Credencial digital con Código QR interactivo.
       │    (Digital Badge)     │     Guardado automático en AsyncStorage (Modo Offline).
       └────────────────────────┘
```

### 2. Modo Offline para Zonas Remotas
En minería subterránea o faenas remotas sin señal móvil:
- El operario puede pulsar **"Abrir Fotocheck Offline (Sin Conexión)"** directamente desde la pantalla de login.
- El sistema recupera los datos y el Código QR de la memoria segura del dispositivo mediante `offlineStorage.ts`.
- El personal de garita puede escanear este QR sin requerir que el teléfono del trabajador cuente con internet.

### 3. Escáner de Garita Móvil (`GateScannerScreen`)
- **Fase 1 (Lectura QR)**: Escaneo con la cámara del dispositivo móvil o ingreso de DNI de respaldo. Valida vigencia de la acreditación, examen SSO y EMO.
- **Fase 2 (Inspección de EPPs con IA)**: Captura de fotografía del operario evaluada en el backend mediante **AWS Rekognition** (`detect_protective_equipment`) comprobando:
  - Casco de seguridad (`HEAD_COVER`)
  - Guantes protectores (`HAND_COVER`)
  - Protección facial o lentes (`FACE_COVER`)
- **Fase 3 (Resultado en Semáforo)**:
  - 🟢 **VERDE**: Acceso autorizado, registro en bitácora y pulso al Pin 8 del Arduino.
  - 🔴 **ROJO**: Acceso denegado, alarma acústica en Pin 9 del Arduino y registro automático de falta de EPP en el legajo del trabajador en el panel de la Minera.

---

## 💻 Módulo Web: Consola Administrativa Corporativa

La plataforma web (`web/`) está optimizada para la gestión de escritorio:

### Portal Minera (`/`)
- **Gestión de Requerimientos y Convocatorias**: Creación de nuevos proyectos mineros indicando fechas, especialidades requeridas y EPPs específicos exigidos.
- **Aprobación de Cuadrillas**: Revisión de propuestas de contratistas. Al hacer clic en *"Aceptar Propuesta"*, el backend crea automáticamente los 10 operarios con credenciales temporales.
- **Auditoría de Desempeño y Cumplimiento SSO**: Tabla en tiempo real donde se reflejan las asistencias, faltas de EPP detectadas por la cámara de garita, cumplimiento de PETS y observaciones.
- **Emisión Oficial de Reportes PDF**: Generación de informes formales con firmas de seguridad, tablas de desempeño y sellos de conformidad listos para auditorías de OSINERGMIN / SUNAFIL.

### Portal Proveedores Contratistas (`/proveedores`)
- **Registro Corporativo Autónomo**: Formulario de alta para empresas contratistas con validación de RUC de 11 dígitos y razón social.
- **Postulación de Cuadrillas**: Postulación formal de 10 trabajadores a requerimientos abiertos con indicación de cargos y DNI.
- **Bandeja de Credenciales**: Acceso inmediato a la nómina de accesos generados (`op.<DNI>` y `mina<XXXX>`) con botones de copiado en un clic para distribuir a los operarios.
- **Bandeja de Evaluaciones**: Recepción y descarga de reportes oficiales de desempeño remitidos por la minera.

---

## 🧪 Guión de Demostración Completo (Flujo End-to-End)

Sigue esta secuencia para una demostración integral del sistema de punta a punta:

### 1. Gestión en SafeMine Web (Minera y Proveedor)
1. Ingresa a [http://localhost:3000](http://localhost:3000) (redirige a `/login`).
2. Usa el botón rápido **Cuenta Minera (Admin)** e inicia sesión.
3. Observa la convocatoria *"Mantenimiento de Planta Concentradora"*.
4. Haz clic en **"Aceptar Propuesta y Generar 10 Cuentas"**. Se abrirá el modal con las 10 credenciales de los operarios recién creados.
5. Cierra sesión y entra con la **Cuenta Proveedor Contratista** (`proveedor@contratistasperu.pe`).
6. Ve a la pestaña **"Nómina y Accesos Generados"** y copia las credenciales de un operario (por ejemplo, Jorge Quispe `op.46102938` / `mina2938`).

### 2. Acreditación del Operario en SafeMine Mobile
1. En tu teléfono (con Expo Go) o en el emulador de SafeMine Mobile:
2. En la pantalla de login, pulsa el botón demo de **Jorge Quispe** (o ingresa su usuario y contraseña).
3. La app detectará automáticamente que no ha rendido el examen y abrirá el **Paso 1: Inducción IPERC**.
4. Responde las 5 preguntas (marca respuestas correctas sobre IPERC, PETS y EPPs) $\rightarrow$ Obtendrás 100% y se desbloqueará el siguiente paso.
5. En el **Paso 2: Auditoría EMO**, pulsa *"Simular Validación IA (Apto)"* (o sube una constancia en PDF). **Google Gemini** auditará el certificado y confirmará el dictamen de aptitud médica.
6. En el **Paso 3: Fotocheck Minero**, se generará su Fotocheck digital oficial con Código QR dinámico.
7. Vuelve a la pantalla de login de la app móvil y pulsa **"Abrir Fotocheck Offline (Sin Conexión)"**: verás que el fotocheck se abre instantáneamente sin necesidad de red.

### 3. Control de Acceso en Garita Móvil y Hardware Arduino
1. En SafeMine Mobile, desde la pantalla de login, pulsa **"Modo Garita · Escáner de Acceso"**.
2. **Fase 1 (Escaneo QR)**: Apunta la cámara al Fotocheck QR generado o ingresa el DNI del operario. La app validará su autorización en verde.
3. **Fase 2 (Verificación de EPPs)**:
   - Pulsa *"Simular: Con Casco, Guantes y Mascarilla"* $\rightarrow$ **Semáforo VERDE** (Acceso Autorizado, el Arduino enciende el LED Verde en Pin 8).
   - Pulsa *"Simular: Sin Guantes ni Protección Facial"* $\rightarrow$ **Semáforo ROJO** (Acceso Denegado, el Arduino activa el LED Rojo y la chicharra en Pin 9).
4. Regresa a **SafeMine Web** con la cuenta Minera y revisa la tabla de operarios: la infracción de EPP detectada en garita se habrá anotado automáticamente en el historial del operario con fecha y hora.
5. Haz clic en **"Generar Reporte Oficial PDF"** para exportar el acta de supervisión terminada.

---

## ⚙️ Variables de Entorno y Configuración Cloud / Mock

### Backend (`backend/.env`)

```env
# Base de Datos (SQLite local por defecto; compatible con PostgreSQL AWS RDS)
DATABASE_URL=sqlite:///./safemine.db

# Clave secreta para firma criptográfica de tokens JWT
JWT_SECRET_KEY=safemine-super-secret-key-2026

# Interruptores de Simulación (true = listo para demos sin costo; false = cloud real)
USE_MOCK_AI=true
USE_MOCK_AWS=true

# Google Gemini API (SDK google-genai)
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
GEMINI_MODEL=gemini-3.8-flash

# AWS Rekognition (Detección de EPPs) y AWS S3 (Almacenamiento de Constancias)
AWS_ACCESS_KEY_ID=tu_aws_access_key_id
AWS_SECRET_ACCESS_KEY=tu_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=safemine-documents-bucket
MIN_EPP_CONFIDENCE=80.0
```

### Frontend Web (`web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/kiosco
```

### Aplicación Móvil (`mobile/.env`)

```env
# Reemplaza con la dirección IP local de tu máquina en la red Wi-Fi para que el celular conecte con FastAPI
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```
> *Nota: Si no defines `EXPO_PUBLIC_API_URL`, la app móvil autodetectará dinámicamente la IP de tu computadora a través de Expo Go.*

---

## 🛠️ Tecnologías Utilizadas

| Capa / Módulo | Tecnologías y Librerías Principales |
| :--- | :--- |
| **Backend API** | Python 3.10+, **FastAPI**, **SQLAlchemy ORM**, **Pydantic v2**, Uvicorn, WebSockets nativos, Tokens JWT (HS256 criptográfico). |
| **Inteligencia Artificial** | **Google Gemini 3.8 Flash** (`google-genai` SDK con Structured Outputs y validación médica D.S. 024-2016-EM Anexo 16). |
| **Visión por Computadora** | **AWS Rekognition** (`detect_protective_equipment` para Casco, Guantes y Protección Facial) + **AWS S3** (`boto3`). |
| **Plataforma Web** | **Next.js 15** (App Router), **React 19**, TypeScript, **Tailwind CSS**, Lucide Icons, `jspdf`, `jspdf-autotable`. |
| **Aplicación Móvil** | **React Native**, **Expo SDK 58**, `@react-navigation/native-stack`, `expo-camera`, `expo-document-picker`, `@react-native-async-storage/async-storage`, `react-native-qrcode-svg`. |
| **Hardware / IoT** | Microcontroladores **Arduino UNO / ESP32**, C++ Firmware, Python `pyserial` y `websockets` para el puente de control de acceso. |
| **Base de Datos** | **SQLite** local (desarrollo rápido con seed automático) y preparado para **AWS RDS PostgreSQL** (producción). |

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Desarrollado como solución corporativa de innovación tecnológica aplicada a la Minería 4.0 y la Seguridad y Salud en el Trabajo.
