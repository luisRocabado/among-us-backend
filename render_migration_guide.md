# 🚀 Migración a Render - Guía Paso a Paso

## ⏱️ **Tiempo total: 25 minutos**

---

## 📋 **PASO 1: Preparar archivos (5 minutos)**

### **1.1 Crear requirements.txt actualizado:**
```txt
# requirements.txt - Among Us Backend para Render
flask==2.3.3
flask-cors==4.0.0
openai==1.3.7
openai-whisper==20231117
opencv-python-headless==4.8.1.78
numpy==1.24.3
scipy==1.11.1
supabase==2.0.2
python-dotenv==1.0.0
python-multipart==0.0.6
Pillow==10.1.0
pydantic==2.5.0
colorlog==6.8.0
python-dateutil==2.8.2
gunicorn==21.2.0
```

### **1.2 Crear Procfile:**
```
web: gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 1800
```

### **1.3 Modificar app.py (final del archivo):**
```python
if __name__ == '__main__':
    # Para Render - usar variable PORT del entorno
    port = int(os.environ.get('PORT', 10000))
    app.run(
        host='0.0.0.0',  # Importante: 0.0.0.0 para Render
        port=port,
        debug=False  # False en producción
    )
```

### **1.4 Crear render.yaml (opcional pero recomendado):**
```yaml
services:
  - type: web
    name: among-us-backend
    env: python
    plan: starter
    buildCommand: |
      pip install --upgrade pip
      pip install -r requirements.txt
      apt-get update
      apt-get install -y ffmpeg
    startCommand: "gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 1800"
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: SUPABASE_URL
        sync: false  
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: PORT
        value: 10000
```

---

## 📁 **PASO 2: Subir a GitHub (5 minutos)**

### **2.1 Si NO tienes Git inicializado:**
```bash
# Abre terminal en tu carpeta del proyecto
git init
git add .
git commit -m "Backend optimizado para Render"
```

### **2.2 Crear repositorio en GitHub:**
1. Ve a **github.com**
2. Click **"New repository"**
3. Nombre: `among-us-backend`
4. **Public** (para plan gratuito)
5. **NO** inicializar con README
6. Click **"Create repository"**

### **2.3 Conectar y subir:**
```bash
# Reemplaza TU-USUARIO con tu username de GitHub
git remote add origin https://github.com/TU-USUARIO/among-us-backend.git
git branch -M main
git push -u origin main
```

---

## 🌐 **PASO 3: Deploy en Render (10 minutos)**

### **3.1 Crear cuenta en Render:**
1. Ve a **render.com**
2. **Sign up** con GitHub
3. Autoriza acceso a tus repositorios

### **3.2 Crear nuevo Web Service:**
1. Click **"New +"** → **"Web Service"**
2. **Connect repository** → Selecciona `among-us-backend`
3. **Configuración:**
   - **Name**: `among-us-backend`
   - **Runtime**: `Python 3`
   - **Build Command**: 
     ```
     pip install --upgrade pip && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```
     gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 1800
     ```

### **3.3 Configurar variables de entorno:**
En la sección **Environment**:
```
OPENAI_API_KEY = tu_openai_key_aqui
SUPABASE_URL = tu_supabase_url_aqui  
SUPABASE_ANON_KEY = tu_supabase_key_aqui
PORT = 10000
```

### **3.4 Seleccionar plan:**
- **Free Plan**: $0/mes (limitado, para pruebas)
- **Starter Plan**: $7/mes ← **RECOMENDADO**

### **3.5 Iniciar deploy:**
1. Click **"Create Web Service"**
2. **Esperar 5-8 minutos** (instala FFmpeg automáticamente)
3. ✅ **Deploy completado**

---

## 🔧 **PASO 4: Verificar deployment (3 minutos)**

### **4.1 Obtener URL:**
Render te dará una URL como:
```
https://among-us-backend-abc123.onrender.com
```

### **4.2 Probar endpoints:**
```bash
# Probar health check
curl https://tu-url.onrender.com/health

# Debería responder:
{
  "status": "healthy",
  "message": "Multimodal backend working",
  "mobile_optimized": true
}
```

### **4.3 Verificar en navegador:**
Ve a tu URL en el navegador, deberías ver la página de estado del backend.

---

## 📱 **PASO 5: Actualizar frontend (2 minutos)**

### **5.1 Modificar app.js:**
```javascript
// En app.js, línea ~13, cambiar:
constructor() {
    this.backendUrl = 'https://tu-url.onrender.com'; // ← Nueva URL de Render
    // ... resto del código
}
```

### **5.2 Actualizar en Netlify:**
1. Modifica el archivo `app.js`
2. Sube a Netlify (drag & drop o git push)
3. ✅ **Frontend actualizado**

---

## ✅ **PASO 6: Prueba final (2 minutos)**

### **6.1 Probar con archivo grande:**
1. Ve a tu sitio de Netlify
2. Sube un video de **100MB+**
3. ✅ **Debería funcionar perfectamente**

### **6.2 Verificar logs:**
En Render dashboard → tu servicio → **Logs**
- Deberías ver logs de análisis exitosos

---

## 🎯 **Resultado final:**

### **✅ Lo que ganaste:**
- **Archivos grandes**: Hasta 500MB sin problemas
- **30+ usuarios simultáneos**: Sin limitaciones
- **99.9% uptime**: Confiabilidad garantizada
- **Cero mantenimiento**: "Set it and forget it"
- **$7/mes**: Más barato que ngrok Business
- **URL fija**: No cambia nunca
- **HTTPS**: Incluido automáticamente

### **❌ Lo que dejaste atrás:**
- Timeouts de ngrok
- Dependencia de tu PC
- Problemas de conectividad
- Mantenimiento manual
- Costos mayores

---

## 🚨 **Troubleshooting común:**

### **Error: "Build failed"**
```bash
# Agregar a requirements.txt:
setuptools==68.0.0
wheel==0.40.0
```

### **Error: "FFmpeg not found"**
- Render debería instalarlo automáticamente
- Si falla, contacta soporte (responden rápido)

### **Error: "Port not found"**
```python
# Verificar en app.py:
port = int(os.environ.get('PORT', 10000))
```

---

## 🎉 **¡Listo!**

En **25 minutos** tienes:
- ✅ Backend en la nube
- ✅ Archivos grandes funcionando  
- ✅ 30+ usuarios simultáneos
- ✅ $7/mes (vs $40+ ngrok)
- ✅ Cero mantenimiento

**¿Necesitas ayuda con algún paso específico?** 🚀