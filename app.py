# app.py - Versión con CORS arreglado
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from openai import OpenAI
import logging
import json
import os
import time
from datetime import datetime
import sys
from typing import Dict, Any

# Imports para Supabase
from supabase import create_client, Client
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuración CORS CORREGIDA - Solo una vez
CORS(app, 
     origins="*",
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "ngrok-skip-browser-warning"])

# Configurar Supabase y OpenAI
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Inicializar OpenAI
try:
    client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
except Exception as e:
    logger.error(f"Error inicializando OpenAI: {e}")
    client = None

# Inicializar Supabase
try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Supabase conectado correctamente")
    else:
        supabase = None
        logger.warning("⚠️ Supabase no configurado")
except Exception as e:
    logger.error(f"Error conectando Supabase: {e}")
    supabase = None

# ELIMINAR las funciones @app.before_request y @app.after_request 
# que estaban duplicando los headers

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de verificación del sistema"""
    return jsonify({
        'status': 'healthy',
        'message': 'Backend funcionando en Render',
        'openai_available': client is not None,
        'supabase_available': supabase is not None,
        'timestamp': datetime.now().isoformat(),
        'version': 'minimal_cors_fixed'
    })

@app.route('/mobile-check', methods=['GET'])
def mobile_check():
    """Endpoint específico para verificar conectividad desde móviles"""
    user_agent = request.headers.get('User-Agent', '').lower()
    is_mobile = any(mobile in user_agent for mobile in ['mobile', 'android', 'iphone', 'ipad'])
    
    return jsonify({
        'status': 'ok',
        'mobile_detected': is_mobile,
        'timestamp': datetime.now().isoformat(),
        'version': 'minimal_cors_fixed'
    })

@app.route('/analyze-video', methods=['POST'])
def analyze_video():
    """Endpoint básico - devuelve análisis simulado"""
    try:
        logger.info("🎥 Recibiendo solicitud de análisis (modo básico)")
        
        # Validar que hay archivo
        if 'video' not in request.files:
            return jsonify({'error': 'No se encontró archivo de video'}), 400
        
        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({'error': 'Archivo de video vacío'}), 400
        
        # Obtener datos del participante
        participant_data_str = request.form.get('participant_data', '{}')
        try:
            participant_data = json.loads(participant_data_str)
        except json.JSONDecodeError:
            return jsonify({'error': 'Datos del participante inválidos'}), 400
        
        logger.info(f"👤 Análisis simulado para: {participant_data.get('name', 'Unknown')}")
        
        # Simular procesamiento
        time.sleep(3)
        
        # Respuesta simulada
        response_data = {
            'success': True,
            'participant': participant_data.get('name', 'Usuario'),
            'timestamp': datetime.now().isoformat(),
            'session_id': f"render_{int(time.time())}",
            'analysis_summary': {
                'transcription_length': 245,
                'frames_analyzed': 6,
                'total_words': 89,
                'speaking_segments': 12
            },
            'soft_skills_scores': {
                'liderazgo': 8.2,
                'comunicacion': 7.8,
                'pensamiento_critico': 8.5,
                'colaboracion': 7.9,
                'adaptabilidad': 8.1,
                'resolucion_problemas': 8.4,
                'inteligencia_emocional': 7.6,
                'persuasion': 7.7
            },
            'gameplay_analysis': {
                'strategy': 'colaborativa',
                'decisions_count': 14,
                'social_interactions': 'alta',
                'pressure_behavior': 'calmado'
            },
            'communication_analysis': {
                'words_detected': 89,
                'questions_count': 6,
                'emotional_tone': 'positivo',
                'clarity_score': '8.3/10'
            },
            'total_score': 64.2,
            'average_score': 8.0,
            'insights': 'El participante demuestra excelente capacidad de liderazgo y pensamiento crítico. Su comunicación es clara y colaborativa, mostrando habilidades emprendedoras sólidas en entornos digitales.',
            'transcription': 'Transcripción simulada: El participante muestra buenas habilidades de comunicación durante la partida, proponiendo estrategias efectivas y colaborando con el equipo de manera constructiva.',
            'database_saved': False,
            'version': 'render_simulation',
            'backend_url': 'https://among-us-backend-uosa.onrender.com'
        }
        
        logger.info(f"✅ Análisis simulado completado para {participant_data.get('name')}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"❌ Error en análisis: {e}")
        return jsonify({
            'error': 'Error en análisis simulado',
            'details': str(e)
        }), 500

@app.route('/test-video-analysis', methods=['POST'])
def test_video_analysis():
    """Endpoint de test"""
    return jsonify({
        'success': True,
        'message': 'Test endpoint funcionando en Render',
        'timestamp': datetime.now().isoformat(),
        'version': 'render_minimal'
    })

@app.route('/')
def home():
    """Página de inicio"""
    return f"""
    <html>
    <head>
        <title>Among Us Backend - Render</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .header {{ background: #667eea; color: white; padding: 20px; border-radius: 10px; }}
            .status {{ margin: 20px 0; padding: 15px; background: #d4edda; border-radius: 8px; }}
            .success {{ background: #d4edda; border: 1px solid #c3e6cb; }}
            .warning {{ background: #fff3cd; border: 1px solid #ffeaa7; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚀 Among Us Backend - Render</h1>
            <p>Servidor funcionando correctamente</p>
        </div>
        
        <div class="status success">
            <h3>✅ Sistema Operativo</h3>
            <p><strong>OpenAI:</strong> {'✅ Disponible' if client else '❌ No configurado'}</p>
            <p><strong>Supabase:</strong> {'✅ Conectado' if supabase else '❌ No configurado'}</p>
            <p><strong>CORS:</strong> ✅ Configurado correctamente</p>
            <p><strong>Costo:</strong> $7/mes</p>
            <p><strong>Usuarios simultáneos:</strong> 30+</p>
        </div>
        
        <div class="status warning">
            <h3>ℹ️ Modo Actual: Análisis Simulado</h3>
            <p>El sistema devuelve datos de prueba realistas.</p>
            <p>Para análisis real de video, se pueden agregar Whisper y OpenCV.</p>
        </div>
        
        <h3>📡 Endpoints Disponibles:</h3>
        <ul>
            <li><code>GET /health</code> - Estado del sistema</li>
            <li><code>POST /analyze-video</code> - Análisis simulado</li>
            <li><code>GET /mobile-check</code> - Verificación móvil</li>
            <li><code>POST /test-video-analysis</code> - Endpoint de prueba</li>
        </ul>
        
        <h3>🎯 Ventajas actuales:</h3>
        <ul>
            <li>✅ Sin timeouts de ngrok</li>
            <li>✅ 99.9% uptime garantizado</li>
            <li>✅ Escalado automático</li>
            <li>✅ Archivos grandes (200MB+)</li>
            <li>✅ HTTPS incluido</li>
            <li>✅ Cero mantenimiento</li>
        </ul>
    </body>
    </html>
    """

if __name__ == '__main__':
    print("🚀 Iniciando backend en Render...")
    print("🌐 CORS configurado correctamente")
    
    # Para Render
    port = int(os.environ.get('PORT', 10000))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False
    )