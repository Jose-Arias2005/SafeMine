# SafeMine AI — Plataforma de Acreditación Minera, Validación IA y Control de Acceso con EPPs

> **Sistema Corporativo Integral de Seguridad y Salud Ocupacional (SSO) para Minería**  
> Automatización de convocatorias de personal contratista, validación documental de Constancias Médicas (EMO) con **Google Gemini IA**, acreditación con **Fotocheck QR**, control de acceso con **detección de EPPs en tiempo real** (Casco, Guantes, Protección Facial) y señalización física mediante **Arduino IoT**.

---

## 🏛️ Arquitectura del Sistema

El proyecto está organizado en 3 componentes modulares e independientes:

```
SafeMine/
├── backend/            # API REST + WebSockets en Python FastAPI (Puerto 8000)
│   ├── app/            # Controladores, modelos SQLAlchemy, servicios y repositorios
│   ├── uploads/        # Directorio de constancias médicas subidas
│   └── safemine.db     # Base de datos SQLite local (preparada para AWS RDS)
├── frontend/           # Aplicación Web SPA en Next.js 15 + React 19 + Tailwind CSS (Puerto 3000)
│   └── src/            # App Router (/login, /, /proveedores, /trabajadores, /kiosco)
└── iot-arduino/        # Puente Serial WebSocket + Firmware Arduino C++ para Garita
    ├── arduino_bridge.py
    └── safemine_access_control/
```

---

## 📋 Requisitos Previos

Asegúrate de tener instalado en tu sistema (Windows / macOS / Linux):

1. **Python 3.10 o superior** (verificar con `python --version`).
2. **Node.js 18 o superior** y `npm` (verificar con `node -v` y `npm -v`).
3. *(Opcional)* **Arduino IDE** y cable USB si cuentas con un microcontrolador físico (Arduino UNO / Nano / ESP32).

---

## 🚀 Guía de Inicio Rápido (Paso a Paso)

Para ejecutar el sistema completo, abre **2 terminales** (una para el Backend y otra para el Frontend):

### Terminal 1: Iniciar el Backend (FastAPI — Puerto 8000)

```powershell
# 1. Entrar a la carpeta del backend
cd backend

# 2. Instalar dependencias requeridas (FastAPI, SQLAlchemy, google-genai, boto3, uvicorn, etc.)
pip install -r requirements.txt

# 3. (Opcional) Verificar o configurar variables de entorno
# Por defecto ya incluye .env con SQLite y modo simulación habilitado para probar sin API keys.
# Si deseas usar llaves reales de Gemini o AWS, edita backend/.env

# 4. Iniciar el servidor FastAPI con recarga automática
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

> **Verificación**:  
> - API Base: `http://localhost:8000/api/status`  
> - Documentación Interactiva Swagger UI: `http://localhost:8000/docs`

---

### Terminal 2: Iniciar el Frontend (Next.js — Puerto 3000)

```powershell
# 1. Entrar a la carpeta del frontend
cd frontend

# 2. Instalar dependencias de Node.js
# En Windows PowerShell, si aparece restricción de scripts de npm, usa: cmd /c "npm install"
npm install

# 3. Iniciar el servidor de desarrollo
# En Windows PowerShell con restricción: cmd /c "npm run dev"
npm run dev
```

> **Verificación**:  
> - Aplicación Web: Abre en tu navegador [http://localhost:3000](http://localhost:3000)  
> - El sistema te redirigirá automáticamente a la pantalla corporativa de **/login**.

---

### Terminal 3 (Opcional): Iniciar el Puente de Hardware Arduino

Si deseas probar la señalización física de la garita con luces LED y buzzer:

```powershell
cd iot-arduino

# 1. Instalar dependencias del puente
pip install -r requirements.txt

# 2. Ejecutar el puente conectado a tu Arduino (ej. COM3):
python arduino_bridge.py --port COM3 --ws ws://localhost:8000/ws/kiosco

# O ejecutar en modo SIMULACIÓN si no tienes el Arduino conectado (muestra luces en consola):
python arduino_bridge.py --simulate --ws ws://localhost:8000/ws/kiosco
```

- **Pin Digital 8**: LED Verde (Acceso Permitido — QR válido + EPPs completos).
- **Pin Digital 9**: LED Rojo + Buzzer (Acceso Denegado — Falta EPPs o no acreditado).

---

## 🔐 Matriz de Credenciales y Aislamiento de Vistas por Rol

El sistema implementa un **aislamiento estricto de vistas**. Cada usuario únicamente tiene acceso al módulo correspondiente a su rol:

| Rol | Usuario / Correo | Contraseña | Vista Exclusiva | Permisos & Alcance |
| :--- | :--- | :--- | :--- | :--- |
| **🏢 Minera (Admin)** | `minera@safemine.pe` | `minera123` | `/` | Gestiona requerimientos, acepta cuadrillas, califica desempeño (PETS/EPPs) y emite reportes PDF oficiales. También tiene acceso al Kiosco de Garita (`/kiosco`). |
| **🏗️ Proveedor Contratista** | `proveedor@contratistasperu.pe` | `proveedor123` | `/proveedores` | Postula cuadrillas de 10 especialistas a convocatorias abiertas, consulta las credenciales creadas automáticamente para sus operarios y descarga reportes de desempeño recibidos. |
| **👷 Trabajador (Autorizado con QR)** | `op.45891021`<br>*(o DNI `45891021`)* | `mina1021` | `/trabajadores` | Carlos Mendoza Prado. Perfil 100% acreditado con examen aprobado (100%), constancia médica validada por Gemini IA y Fotocheck QR digital generado. |
| **👷 Trabajador (En proceso de examen)** | `op.46102938`<br>*(o DNI `46102938`)* | `mina2938` | `/trabajadores` | Jorge Quispe Rojas. En Paso 1: pendiente de aprobar el examen de inducción SSO ($\ge 80\%$) para desbloquear la validación médica con IA. |
| **📷 Pantalla de Garita (Kiosco)** | Acceso directo sin login | — | `/kiosco` | Modo cámara para control físico: Fase 1 (Lectura QR del Fotocheck) $\rightarrow$ Fase 2 (Visión artificial de Casco, Guantes y Mascarilla) $\rightarrow$ Semáforo verde/rojo en tiempo real. |

> 💡 **Nota sobre Cuentas Autogeneradas**:  
> Al aceptar una propuesta en el Panel de la Minera, el sistema crea automáticamente 10 usuarios en la base de datos con el formato:  
> - **Usuario**: `op.<DNI>` (también acepta el DNI solo).  
> - **Contraseña Temporal**: `mina<últimos 4 dígitos del DNI>`.  
> Estas credenciales se muestran con botón de copiado rápido tanto en el portal del Proveedor como en el de la Minera.

---

## 🧪 Guión de Demostración para Presentación / Clase (Demo en 5 Minutos)

Sigue este flujo paso a paso para exhibir la solución de punta a punta:

### 1. Inicio de Sesión y Asistente Rápido
1. Ingresa a [http://localhost:3000](http://localhost:3000) (redirige a `/login`).
2. En la parte inferior verás el panel **"Asistente de Credenciales Demo (1 Clic)"**.
3. Haz clic en **Cuenta Minera (Admin)** $\rightarrow$ Rellena `minera@safemine.pe` / `minera123` $\rightarrow$ Clic en **"Ingresar al Sistema"**.

### 2. Panel Minera (Aceptar Cuadrilla y Crear Cuentas)
1. Estarás en `/`. Nota que el Sidebar **solo muestra Minera y Kiosco**.
2. En la propuesta *"Mantenimiento de Planta Concentradora"*, haz clic en **"Aceptar Propuesta y Generar 10 Cuentas"**.
3. Se abrirá el modal con las **10 cuentas creadas automáticamente** con sus usuarios (`op.<DNI>`) y contraseñas temporales (`mina<XXXX>`).
4. Haz clic en **"Cerrar Sesión"** en la esquina superior derecha (Header).

### 3. Portal de Proveedores (Seguimiento de Credenciales)
1. En `/login`, haz clic en el botón demo **Cuenta Proveedor Contratista** (`proveedor@contratistasperu.pe`).
2. Entrarás a `/proveedores`. El Sidebar **solo muestra el Portal Proveedor**.
3. Ve a la pestaña **"Tab 2: Nómina y Accesos Generados"**:
   - Observa la tabla con las columnas separadas de **Usuario** y **Contraseña Temporal**.
   - Usa el botón **"Copiar Ambos"** para copiar las credenciales de cualquier operario.
4. Cierra sesión desde el Header.

### 4. Portal del Trabajador (Acreditación con IA en 3 Pasos)
1. En `/login`, haz clic en uno de los operarios demo (por ejemplo, **Jorge Quispe** `op.46102938` / `mina2938`).
2. Entrarás a `/trabajadores`. La vista carga directamente su perfil individual sin selectores manuales:
   - **Paso 1 (Examen SSO)**: Responde las 5 preguntas del examen de inducción de seguridad (necesitas $\ge 80\%$ para aprobar).
   - **Paso 2 (Constancia Médica EMO con IA)**: Sube un archivo PDF o haz clic en *"Simular Validación IA (Apto)"*. Google Gemini analiza el dictamen médico y aprueba la constancia.
   - **Paso 3 (Fotocheck QR)**: Se desbloquea automáticamente su Fotocheck digital con Código QR listo para escanear en garita.
3. Cierra sesión desde el Header.

### 5. Control de Acceso en Garita (`/kiosco`)
1. Abre [http://localhost:3000/kiosco](http://localhost:3000/kiosco).
2. **Fase 1 (Escaneo QR)**: Selecciona un operario autorizado (ej. Carlos Mendoza) o escanea el QR en pantalla con la cámara.
3. **Fase 2 (Verificación de EPPs)**:
   - Prueba el botón *"Simular: Con Casco, Guantes y Mascarilla"* $\rightarrow$ **Semáforo VERDE** (Acceso Concedido, pulso al Arduino Pin 8).
   - Prueba el botón *"Simular: Sin Guantes ni Protección Facial"* $\rightarrow$ **Semáforo ROJO** (Acceso Denegado, alarma en Arduino Pin 9).
4. El incumplimiento de EPPs se transmite por WebSockets y se marca automáticamente en la ficha de desempeño del operario en el Panel de la Minera.

---

## ⚙️ Configuración de IA y Cloud (Opcional)

En el archivo `backend/.env`:

```env
# Modo Simulación (Ideal para evaluación sin costo de API keys)
USE_MOCK_AI=true
USE_MOCK_AWS=true

# Para conectar Google Gemini Cloud real:
USE_MOCK_AI=false
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
GEMINI_MODEL=gemini-3.8-flash

# Para conectar AWS Rekognition real:
USE_MOCK_AWS=false
AWS_ACCESS_KEY_ID=tu_aws_access_key
AWS_SECRET_ACCESS_KEY=tu_aws_secret_key
AWS_REGION=us-east-1
```

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, `qrcode.react`, `html5-qrcode`, `jspdf`, `jspdf-autotable`.
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, SQLite / PostgreSQL (AWS RDS), WebSockets nativos, `google-genai` (Gemini SDK), `boto3` (AWS SDK), `uvicorn`.
- **Hardware / IoT**: Python `pyserial` + `websockets`, Arduino C++ (Arduino UNO / Nano / ESP32).
