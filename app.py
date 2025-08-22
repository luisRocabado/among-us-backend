# app.py - Versión súper básica para Render
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

# Configuración CORS
CORS(app, 
     origins="*",
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
     supports_credentials=False
)

# Configurar Supabase y OpenAI
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Validar variables de entorno críticas
if not OPENAI_API_KEY:
    logger.error("❌ OPENAI_API_KEY no configurada")
    # No salir, seguir con funcionalidad básica

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

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,ngrok-skip-browser-warning")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        response.headers.add("Access-Control-Max-Age", "3600")
        return response

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,ngrok-skip-browser-warning')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de verificación del sistema - VERSIÓN SÚPER BÁSICA"""
    return jsonify({
        'status': 'healthy',
        'message': 'Backend súper básico funcionando en Render',
        'openai_available': client is not None,
        'supabase_available': supabase is not None,
        'timestamp': datetime.now().isoformat(),
        'version': 'minimal'
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
        'version': 'minimal'
    })

@app.route('/analyze-video', methods=['POST'])
def analyze_video():
    """Endpoint súper básico - devuelve análisis simulado"""
    try:
        logger.info("🎥 Recibiendo solicitud de análisis (modo súper básico)")
        
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
            'session_id': f"test_{int(time.time())}",
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
            'transcription': 'Transcripción simulada: El participante muestra buenas habilidades de comunicación durante la partida, proponiendo estrategias efectivas y colaborando con el equipo.',
            'database_saved': False,
            'version': 'minimal_simulation'
        }
        
        logger.info(f"✅ Análisis simulado completado")
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
        'message': 'Test endpoint funcionando',
        'timestamp': datetime.now().isoformat(),
        'version': 'minimal'
    })

@app.route('/')
def home():
    """Página de inicio"""
    return f"""
    <html>
    <head>
        <title>Among Us Backend - Minimal</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .header {{ background: #667eea; color: white; padding: 20px; border-radius: 10px; }}
            .status {{ margin: 20px 0; padding: 15px; background: #d4edda; border-radius: 8px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚀 Among Us Backend - Versión Minimal</h1>
            <p>Funcionando en Render</p>
        </div>
        
        <div class="status">
            <h3>✅ Sistema funcionando</h3>
            <p>OpenAI: {'✅ Disponible' if client else '❌ No configurado'}</p>
            <p>Supabase: {'✅ Conectado' if supabase else '❌ No configurado'}</p>
            <p>Versión: Minimal (solo análisis simulado)</p>
        </div>
        
        <h3>Endpoints:</h3>
        <ul>
            <li><code>/health</code> - Estado del sistema</li>
            <li><code>/analyze-video</code> - Análisis simulado</li>
            <li><code>/test-video-analysis</code> - Test</li>
        </ul>
    </body>
    </html>
    """

if __name__ == '__main__':
    print("🚀 Iniciando backend minimal...")
    
    # Para Render
    port = int(os.environ.get('PORT', 10000))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False
    )