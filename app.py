# backend_multimodal.py - Versión básica para Render
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
# import whisper  # ← COMENTADO temporalmente
from openai import OpenAI
# import cv2  # ← COMENTADO temporalmente
import numpy as np
import logging
import tempfile
import json
import os
import time
import base64
from datetime import datetime
# import subprocess  # ← COMENTADO temporalmente
import sys
from typing import List, Dict, Any, Optional
import uuid
import threading
from queue import Queue
from werkzeug.utils import secure_filename

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

# Configuración Flask para archivos grandes y móviles
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200MB max para móviles
app.config['UPLOAD_TIMEOUT'] = 900  # 15 minutos timeout para móviles

# Configuración CORS mejorada
CORS(app, 
     origins="*",
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "ngrok-skip-browser-warning", "X-Device-Type", "X-Connection-Type"],
     supports_credentials=False
)

# Configurar Supabase y OpenAI
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Validar variables de entorno críticas
if not OPENAI_API_KEY:
    logger.error("❌ OPENAI_API_KEY no configurada")
    sys.exit(1)

# Inicializar OpenAI
client = OpenAI(api_key=OPENAI_API_KEY)

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("✅ Supabase conectado correctamente")
else:
    supabase = None
    logger.warning("⚠️ Supabase no configurado")

# Almacén temporal para resultados de análisis asíncrono
analysis_results_store = {}

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,ngrok-skip-browser-warning,X-Device-Type,X-Connection-Type")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        response.headers.add("Access-Control-Max-Age", "3600")
        return response

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,ngrok-skip-browser-warning,X-Device-Type,X-Connection-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Max-Age', '3600')
    return response

def check_dependencies():
    """Verifica que todas las dependencias estén disponibles - VERSIÓN BÁSICA"""
    status = {
        'ffmpeg': False,  # Deshabilitado temporalmente
        'opencv': False,  # Deshabilitado temporalmente
        'whisper': False, # Deshabilitado temporalmente
        'openai': False,
        'openai_credits': False
    }
    
    # Solo verificar OpenAI
    try:
        test_response = client.models.list()
        status['openai'] = True
        logger.info("✅ OpenAI API configurada")
        
        # Verificar créditos
        try:
            test_chat = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1
            )
            status['openai_credits'] = True
            logger.info("✅ OpenAI créditos disponibles")
        except Exception as credit_error:
            if 'quota' in str(credit_error).lower() or '429' in str(credit_error):
                logger.warning("⚠️ OpenAI sin créditos - Modo fallback activado")
                status['openai_credits'] = False
            else:
                status['openai_credits'] = True
        
    except Exception as e:
        logger.error(f"❌ OpenAI API error: {e}")
        status['openai'] = False
    
    return status

# Cargar dependencias al inicio
DEPENDENCIES = check_dependencies()

def create_mock_analysis(transcription: str = "", frames_count: int = 0) -> Dict[str, Any]:
    """Crea un análisis simulado para testing básico"""
    
    # Análisis simulado básico
    soft_skills_scores = {
        'liderazgo': 8.2,
        'comunicacion': 7.8,
        'pensamiento_critico': 8.5,
        'colaboracion': 7.9,
        'adaptabilidad': 8.1,
        'resolucion_problemas': 8.4,
        'inteligencia_emocional': 7.6,
        'persuasion': 7.7
    }
    
    gameplay_analysis = {
        'strategy': 'colaborativa',
        'decisions_count': 12,
        'social_interactions': 'alta',
        'pressure_behavior': 'calmado'
    }
    
    insights = "Análisis básico completado. El participante muestra habilidades balanceadas con fortalezas en pensamiento crítico y resolución de problemas. Se recomienda continuar desarrollando habilidades de comunicación en entornos digitales colaborativos."
    
    return {
        'soft_skills_scores': soft_skills_scores,
        'gameplay_analysis': gameplay_analysis,
        'insights': insights,
        'analysis_method': 'mock_basic_version'
    }

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de verificación del sistema - VERSIÓN BÁSICA"""
    return jsonify({
        'status': 'healthy',
        'message': 'Backend básico funcionando',
        'dependencies': DEPENDENCIES,
        'supabase_connected': supabase is not None,
        'openai_version': 'v1.0+',
        'mobile_optimized': True,
        'version': 'basic_no_video_analysis',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/mobile-check', methods=['GET'])
def mobile_check():
    """Endpoint específico para verificar conectividad desde móviles"""
    user_agent = request.headers.get('User-Agent', '').lower()
    is_mobile = any(mobile in user_agent for mobile in ['mobile', 'android', 'iphone', 'ipad'])
    
    return jsonify({
        'status': 'ok',
        'mobile_detected': is_mobile,
        'user_agent': user_agent,
        'timestamp': datetime.now().isoformat(),
        'recommended_max_size': '100MB' if is_mobile else '200MB',
        'backend_optimized': True,
        'version': 'basic'
    })

@app.route('/analyze-video', methods=['POST'])
def analyze_video():
    """Endpoint básico - simula análisis sin procesamiento real de video"""
    try:
        logger.info("🎥 Recibiendo solicitud de análisis (modo básico)")
        
        # Detectar si es móvil
        user_agent = request.headers.get('User-Agent', '').lower()
        is_mobile = any(mobile in user_agent for mobile in ['mobile', 'android', 'iphone', 'ipad'])
        device_type = request.headers.get('X-Device-Type', 'unknown')
        
        logger.info(f"📱 Dispositivo: {device_type}, Mobile: {is_mobile}")
        
        # Validar archivo de video (básico)
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
        
        logger.info(f"👤 Análisis básico para: {participant_data.get('name', 'Unknown')}")
        
        # Simular análisis (sin procesar video realmente)
        time.sleep(2)  # Simular procesamiento
        
        mock_analysis = create_mock_analysis()
        
        # Preparar respuesta
        response_data = {
            'success': True,
            'participant': participant_data['name'],
            'timestamp': datetime.now().isoformat(),
            'session_id': f"mock_{int(time.time())}",
            'analysis_summary': {
                'transcription_length': 245,
                'frames_analyzed': 6,
                'total_words': 89,
                'speaking_segments': 12
            },
            'soft_skills_scores': mock_analysis['soft_skills_scores'],
            'gameplay_analysis': mock_analysis['gameplay_analysis'],
            'communication_analysis': {
                'words_detected': 89,
                'questions_count': 6,
                'emotional_tone': 'positivo',
                'clarity_score': '8.3/10'
            },
            'total_score': sum(mock_analysis['soft_skills_scores'].values()),
            'average_score': sum(mock_analysis['soft_skills_scores'].values()) / len(mock_analysis['soft_skills_scores']),
            'insights': mock_analysis['insights'],
            'transcription': 'Transcripción simulada: El participante demuestra buenas habilidades de comunicación y liderazgo durante la partida de Among Us...',
            'database_saved': False,
            'device_optimized': True,
            'mobile_analysis': is_mobile,
            'version': 'basic_mock'
        }
        
        logger.info(f"✅ Análisis básico completado - Puntuación: {response_data['total_score']}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"❌ Error en análisis básico: {e}", exc_info=True)
        return jsonify({
            'error': 'Error en análisis básico',
            'details': str(e)
        }), 500

@app.route('/test-video-analysis', methods=['POST'])
def test_video_analysis():
    """Endpoint para probar el análisis con datos simulados"""
    try:
        mock_results = {
            'success': True,
            'participant': 'Usuario Test',
            'timestamp': datetime.now().isoformat(),
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
            'insights': 'El jugador demuestra excelente capacidad de liderazgo y pensamiento crítico. Su comunicación es clara y colaborativa, mostrando habilidades emprendedoras sólidas en entornos digitales colaborativos.',
            'transcription': 'Ejemplo de transcripción: Creo que deberíamos revisar las tareas pendientes. ¿Alguien vio algo sospechoso en electrical? Propongo que trabajemos en grupos para cubrir más área...',
            'database_saved': False,
            'test_mode': True,
            'mobile_optimized': True,
            'version': 'basic'
        }
        
        return jsonify(mock_results)
        
    except Exception as e:
        return jsonify({
            'error': 'Error en test de análisis',
            'details': str(e)
        }), 500

@app.route('/')
def home():
    """Página de inicio del backend - VERSIÓN BÁSICA"""
    deps_status = []
    for dep, status in DEPENDENCIES.items():
        icon = "✅" if status else "❌" if dep != 'openai_credits' else "⚠️"
        label = "Disponible" if status else "No disponible"
        if dep == 'openai_credits' and not status:
            label = "Sin créditos (Modo fallback)"
        deps_status.append(f"<li>{icon} {dep.upper().replace('_', ' ')}: {label}</li>")
    
    supabase_status = "✅ Conectada" if supabase else "❌ No configurada"
    
    return f"""
    <html>
    <head>
        <title>Among Us IA Backend - Versión Básica</title>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; }}
            .status {{ margin: 20px 0; padding: 15px; border-radius: 8px; }}
            .status-ok {{ background: #d4edda; border: 1px solid #c3e6cb; }}
            .status-warning {{ background: #fff3cd; border: 1px solid #ffeaa7; }}
            ul {{ list-style-type: none; }}
            li {{ margin: 8px 0; }}
            code {{ background: #f8f9fa; padding: 4px 8px; border-radius: 4px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🤖 Backend Among Us IA - Versión Básica</h1>
            <p>Sistema funcionando en Render (sin análisis de video completo)</p>
        </div>
        
        <div class="status status-ok">
            <p>✅ <strong>Servidor funcionando correctamente</strong></p>
            <p>🗄️ Base de datos: {supabase_status}</p>
            <p>🔄 OpenAI: Versión 1.0+</p>
            <p>📱 <strong>Optimización móvil: Activada</strong></p>
            <p>⚠️ <strong>Versión básica: Sin análisis real de video</strong></p>
        </div>
        
        <div class="status status-warning">
            <h3>⚠️ Versión Básica Activa</h3>
            <p>Esta es una versión simplificada que funciona sin FFmpeg, OpenCV o Whisper.</p>
            <p>Los análisis devuelven datos simulados para probar la conectividad.</p>
            <p>Una vez confirmado que funciona, podemos activar el análisis completo.</p>
        </div>
        
        <h3>📋 Dependencias:</h3>
        <ul>{''.join(deps_status)}</ul>
        
        <h3>🔗 Endpoints disponibles:</h3>
        <ul>
            <li><code>GET /health</code> - Verificar estado del sistema</li>
            <li><code>GET /mobile-check</code> - Verificar compatibilidad móvil</li>
            <li><code>POST /analyze-video</code> - Análisis simulado</li>
            <li><code>POST /test-video-analysis</code> - Test con datos simulados</li>
        </ul>
        
        <h3>🎯 Próximos pasos:</h3>
        <ul>
            <li>✅ Confirmar conectividad básica</li>
            <li>⏳ Activar Whisper para transcripción</li>
            <li>⏳ Activar OpenCV para análisis visual</li>
            <li>⏳ Activar FFmpeg para procesamiento</li>
        </ul>
    </body>
    </html>
    """

if __name__ == '__main__':
    print("🚀 Iniciando backend básico...")
    print(f"🤖 Dependencias: {DEPENDENCIES}")
    print("📱 Optimizaciones móviles: ACTIVADAS")
    print("⚠️ MODO BÁSICO: Sin análisis real de video")
    
    if not DEPENDENCIES['openai']:
        print("❌ CRÍTICO: OpenAI API no configurada")
    
    print("🎥 Sistema básico listo")
    
    # Para Render - usar variable PORT del entorno
    port = int(os.environ.get('PORT', 10000))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False
    )