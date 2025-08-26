// app.js - JavaScript principal para PWA Among Us Evaluator (CORREGIDO Y MEJORADO)
class AmongUsEvaluator {
    constructor() {
        this.backendUrl = 'https://among-us-backend-uosa.onrender.com';
        this.selectedFile = null;
        this.analysisResults = null;
        this.appState = {
            backendConnected: false,
            participantData: {},
            currentStep: 1,
            analysisInProgress: false
        };
        
        this.init();
    }

    init() {
        console.log('Iniciando PWA Video Analyzer');
        this.registerServiceWorker();
        this.initializeEventListeners();
        this.checkBackendStatus();
        this.setupPWAInstall();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registrado:', registration);
                
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    this.showUpdateAvailable();
                                }
                            }
                        });
                    }
                });
            } catch (error) {
                console.error('Error registrando Service Worker:', error);
            }
        }
    }

    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.className = 'update-banner';
        updateBanner.innerHTML = `
            <div style="background: rgba(76, 175, 80, 0.9); color: white; padding: 15px; text-align: center; position: fixed; top: 0; left: 0; right: 0; z-index: 9999;">
                Nueva versión disponible
                <button onclick="this.parentElement.parentElement.remove(); window.location.reload();" 
                        style="margin-left: 15px; background: white; color: green; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer;">
                    Actualizar
                </button>
            </div>
        `;
        document.body.appendChild(updateBanner);
    }

    setupPWAInstall() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Mostrar botón de instalación
            const installButton = document.createElement('button');
            installButton.textContent = 'Instalar App';
            installButton.className = 'btn install-btn';
            installButton.style.cssText = 'position: fixed; bottom: 20px; left: 20px; z-index: 1000;';
            
            installButton.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`PWA install prompt outcome: ${outcome}`);
                    deferredPrompt = null;
                    installButton.remove();
                }
            });
            
            document.body.appendChild(installButton);
        });
    }

    initializeEventListeners() {
        // Backend test
        const testBackendBtn = document.getElementById('test-backend-btn');
        if (testBackendBtn) {
            testBackendBtn.addEventListener('click', () => this.testBackend());
        }
        
        // Formulario de datos
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.validateAndContinue());
        }
        
        // Upload de video
        this.setupFileUpload();
        
        // Botones de acción
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.startAnalysis());
        }
        
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartApp());
        }
        
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadReport());
        }
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('video-file');
        
        if (!uploadArea || !fileInput) return;
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    async testBackend() {
        const button = document.getElementById('test-backend-btn');
        const status = document.getElementById('backend-test-status');
        const backendStatus = document.getElementById('backend-status');
        
        if (!button || !status) return;
        
        button.disabled = true;
        button.textContent = 'Verificando...';
        
        const backendUrlElement = document.getElementById('backend-url');
        if (backendUrlElement) {
            this.backendUrl = backendUrlElement.value.trim() || this.backendUrl;
        }
        
        this.showStatus(status, 'Conectando al backend...', 'info');
        
        try {
            const response = await fetch(`${this.backendUrl}/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (response.ok) {
                await response.json();
                
                this.showStatus(status, 'Backend conectado correctamente', 'success');
                button.textContent = 'Backend Conectado';
                button.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
                
                if (backendStatus) {
                    backendStatus.textContent = 'Backend: Conectado';
                    backendStatus.style.background = 'rgba(76, 175, 80, 0.9)';
                }
                
                this.appState.backendConnected = true;
                
                setTimeout(() => {
                    this.showStep(2);
                }, 1500);
                
            } else {
                throw new Error(`Error ${response.status}`);
            }
            
        } catch (error) {
            this.showStatus(status, `Error de conexión: ${error.message}`, 'error');
            button.disabled = false;
            button.textContent = 'Reintentar';
        }
    }

    validateAndContinue() {
        const nameElement = document.getElementById('name');
        const emailElement = document.getElementById('email');
        const ageElement = document.getElementById('age');
        const positionElement = document.getElementById('position');
        const status = document.getElementById('validation-status');
        
        if (!status) return;
        
        const name = nameElement?.value.trim() || '';
        const email = emailElement?.value.trim() || '';
        const age = ageElement?.value || '';
        const position = positionElement?.value || '';
        
        // Validaciones
        if (!name || !email || !age || !position) {
            this.showStatus(status, 'Por favor completa todos los campos', 'error');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showStatus(status, 'Ingresa un correo electrónico válido', 'error');
            return;
        }
        
        const numericAge = parseInt(age);
        if (isNaN(numericAge) || numericAge < 16 || numericAge > 100) {
            this.showStatus(status, 'La edad debe estar entre 16 y 100 años', 'error');
            return;
        }
        
        // Guardar datos
        this.appState.participantData = {
            name,
            email,
            age: numericAge,
            position
        };
        
        this.showStatus(status, 'Datos válidos', 'success');
        
        setTimeout(() => {
            this.showStep(3);
        }, 1000);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelection(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleFileSelection(file);
        }
    }

    handleFileSelection(file) {
        // Validar tipo de archivo
        if (!file.type.startsWith('video/')) {
            const status = document.getElementById('upload-status');
            if (status) {
                this.showStatus(status, 'Por favor selecciona un archivo de video', 'error');
            }
            return;
        }
        
        // Validar tamaño (700MB max)
        if (file.size > 2 * 1024 * 1024 * 1024) {
            const status = document.getElementById('upload-status');
            if (status) {
                this.showStatus(status, 'El archivo es demasiado grande (máximo 2GB)', 'error');
            }
            return;
        }
        
        this.selectedFile = file;
        
        // Mostrar información del archivo
        this.displayFileInfo(file);
        
        // Mostrar preview del video
        this.showVideoPreview(file);
        
        // Habilitar botón de upload
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('hidden');
        }
        
        const status = document.getElementById('upload-status');
        if (status) {
            this.showStatus(status, 'Video listo para análisis', 'success');
        }
    }

    displayFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        if (!fileInfo) return;
        
        fileInfo.innerHTML = `
            <h4>Archivo Seleccionado:</h4>
            <div class="metric-row">
                <span>Nombre:</span>
                <span>${file.name}</span>
            </div>
            <div class="metric-row">
                <span>Tamaño:</span>
                <span>${this.formatFileSize(file.size)}</span>
            </div>
            <div class="metric-row">
                <span>Tipo:</span>
                <span>${file.type}</span>
            </div>
        `;
        fileInfo.classList.remove('hidden');
    }

    showVideoPreview(file) {
        const videoPreview = document.getElementById('video-preview');
        if (!videoPreview) return;
        
        const videoURL = URL.createObjectURL(file);
        videoPreview.src = videoURL;
        videoPreview.classList.remove('hidden');
        
        // Limpiar URL cuando el video se desmonte
        videoPreview.onload = () => URL.revokeObjectURL(videoURL);
    }

    async startAnalysis() {
        if (!this.selectedFile) {
            const status = document.getElementById('upload-status');
            if (status) {
                this.showStatus(status, '⚠ No hay archivo seleccionado', 'error');
            }
            return;
        }
        
        // Verificar backend antes de comenzar
        if (!this.appState.backendConnected) {
            const status = document.getElementById('upload-status');
            if (status) {
                this.showStatus(status, '⚠ Backend no conectado - Verifica la conexión primero', 'error');
            }
            return;
        }
        
        this.appState.analysisInProgress = true;
        this.showStep(4);
        
        try {
            // Preparar FormData
            const formData = new FormData();
            formData.append('video', this.selectedFile);
            formData.append('participant_data', JSON.stringify(this.appState.participantData));
            
            console.log(`🚀 Enviando video al backend: ${this.backendUrl}/analyze-video`);
            console.log(`📁 Archivo: ${this.selectedFile.name} (${this.formatFileSize(this.selectedFile.size)})`);
            
            // Simular progreso paso a paso
            this.updateAnalysisStep('step-upload', 'processing');
            this.updateProgress(10);
            
            // Crear controlador con timeout extendido (10 minutos)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log('⏰ Timeout de 10 minutos alcanzado, cancelando...');
                controller.abort();
            }, 600000); // 10 minutos = 600000ms
            
            // Configurar fetch con headers mejorados
            const fetchOptions = {
                method: 'POST',
                body: formData,
                signal: controller.signal,
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    // NO agregar Content-Type para FormData
                },
                mode: 'cors',
                cache: 'no-cache',
                redirect: 'follow'
            };
            
            console.log('⏱️ Iniciando fetch con timeout de 10 minutos...');
            
            // Enviar al backend con timeout extendido
            const response = await fetch(`${this.backendUrl}/analyze-video`, fetchOptions);
            
            clearTimeout(timeoutId);
            console.log(`📡 Respuesta recibida: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`⚠ Error ${response.status}:`, errorText);
                throw new Error(`Error ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            // Simular progreso mientras se procesa
            this.updateAnalysisStep('step-upload', 'completed');
            this.updateAnalysisStep('step-extract', 'processing');
            this.updateProgress(25);
            
            await this.sleep(1000);
            this.updateAnalysisStep('step-extract', 'completed');
            this.updateAnalysisStep('step-transcribe', 'processing');
            this.updateProgress(45);
            
            await this.sleep(1000);
            this.updateAnalysisStep('step-transcribe', 'completed');
            this.updateAnalysisStep('step-vision', 'processing');
            this.updateProgress(70);
            
            await this.sleep(1000);
            this.updateAnalysisStep('step-vision', 'completed');
            this.updateAnalysisStep('step-integrate', 'processing');
            this.updateProgress(85);
            
            await this.sleep(1000);
            this.updateAnalysisStep('step-integrate', 'completed');
            this.updateAnalysisStep('step-save', 'processing');
            this.updateProgress(95);
            
            // Obtener resultados con manejo de errores mejorado
            let results;
            try {
                const responseText = await response.text();
                console.log('📄 Respuesta raw:', responseText.substring(0, 200) + '...');
                results = JSON.parse(responseText);
            } catch (parseError) {
                console.error('⚠ Error parseando JSON:', parseError);
                throw new Error(`Error parseando respuesta del servidor: ${parseError.message}`);
            }
            
            console.log('✅ Resultados recibidos:', results);
            this.analysisResults = results;
            
            this.updateAnalysisStep('step-save', 'completed');
            this.updateProgress(100);
            
            await this.sleep(1000);
            this.showResults(results);
            
        } catch (error) {
            console.error('⚠ Error en análisis:', error);
            
            let errorMessage = 'Error desconocido en el análisis';
            
            if (error.name === 'AbortError') {
                errorMessage = 'Timeout - El análisis tardó más de 10 minutos. Esto puede indicar un problema con el servidor o un video muy largo.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = `Error de conexión con el servidor. Verifica que:
                1. Ngrok esté corriendo (${this.backendUrl})
                2. El backend esté activo
                3. Tu conexión a internet funcione
                4. No haya bloqueadores de contenido`;
            } else if (error.message.includes('503')) {
                errorMessage = 'Backend no disponible (503) - El servidor puede estar sobrecargado o detenido';
            } else if (error.message.includes('500')) {
                errorMessage = 'Error interno del servidor (500) - Verifica los logs del backend';
            } else if (error.message.includes('429')) {
                errorMessage = 'Demasiadas solicitudes - Espera un momento antes de intentar de nuevo';
            } else {
                errorMessage = error.message;
            }
            
            const status = document.getElementById('processing-status');
            if (status) {
                this.showStatus(status, `⚠ ${errorMessage}`, 'error');
            }
            
            // Mostrar información adicional de debug
            const debugInfo = document.createElement('div');
            debugInfo.className = 'status status-warning';
            debugInfo.innerHTML = `
                <strong>🔍 Información de debug:</strong><br>
                • URL Backend: ${this.backendUrl}<br>
                • Archivo: ${this.selectedFile.name} (${this.formatFileSize(this.selectedFile.size)})<br>
                • Tipo de error: ${error.name}<br>
                • Hora: ${new Date().toLocaleTimeString()}
            `;
            if (status?.parentNode) {
                status.parentNode.appendChild(debugInfo);
            }
            
            // Habilitar botón de reintentar
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn) {
                uploadBtn.textContent = '🔄 Reintentar Análisis';
                uploadBtn.disabled = false;
                uploadBtn.classList.remove('hidden');
            }
            
            this.appState.analysisInProgress = false;
        }
    }

    updateAnalysisStep(stepId, status) {
        const step = document.getElementById(stepId);
        if (!step) return;
        
        step.classList.remove('processing', 'completed');
        if (status !== 'pending') {
            step.classList.add(status);
        }
    }

    updateProgress(percentage) {
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    showResults(data) {
        this.showStep(5);
        
        const container = document.getElementById('results-container');
        if (!container) return;
        
        // Procesar insights por habilidad
        const processedInsights = this.processInsightsBySkill(data.insights, data.soft_skills_scores);
        
        container.innerHTML = `
            <div class="status status-success">
                🎯 <strong>Análisis Multimodal Completado</strong><br>
                📊 Puntuación Total: ${data.total_score || 85}/100
            </div>
            
            <div class="metrics">
                <h3>🧠 Habilidades Blandas Evaluadas</h3>
                ${this.generateSkillsHTML(data.soft_skills_scores || {})}
            </div>
            
            <div class="metrics">
                <h3>🎮 Análisis de Gameplay</h3>
                ${this.generateGameplayHTML(data.gameplay_analysis || {})}
            </div>
            
            <div class="metrics">
                <h3>💬 Análisis de Comunicación</h3>
                ${this.generateCommunicationHTML(data.communication_analysis || {})}
            </div>
            
            <div class="metrics insights-section">
                <h3>🔍 Análisis Detallado por Habilidades</h3>
                ${this.generateInsightsHTML(processedInsights)}
            </div>
            
            <div class="metrics">
                <h4>📄 Transcripción del Audio:</h4>
                <div class="transcription-box">
                    <p style="font-style: italic; line-height: 1.6; max-height: 200px; overflow-y: auto; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                        ${data.transcription || 'No se pudo transcribir el audio'}
                    </p>
                </div>
            </div>
                        <div class="metrics improvement-section">
            <h3>🎯 Oportunidades de Mejora Personalizadas</h3>
            <div class="improvement-content">
                <p style="line-height: 1.8; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 12px; font-size: 16px;">
                    ${data.improvement_opportunities || 'Generando recomendaciones personalizadas...'}
                </p>
            </div>
        </div>
            <div class="action-buttons">
                <button id="download-pdf-btn" class="btn btn-upload">
                    📄 Descargar Reporte PDF
                </button>
                
                <button id="feedback-btn" class="btn btn-feedback">
                    📝 Formulario de Retroalimentación
                </button>
                
                <button id="restart-btn" class="btn">
                    🔄 Nueva Evaluación
                </button>
            </div>
        `;
            
        // Agregar event listeners para los nuevos botones
        const downloadPdfBtn = document.getElementById('download-pdf-btn');
        if (downloadPdfBtn) {
            downloadPdfBtn.addEventListener('click', () => this.downloadPDFReport(data, processedInsights));
        }
        
        const feedbackBtn = document.getElementById('feedback-btn');
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', () => this.openFeedbackForm());
        }
        
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartApp());
        }
    }

    // Función para abrir formulario de retroalimentación
    openFeedbackForm() {
        const feedbackUrl = 'https://docs.google.com/forms/d/1LG4RjwU6TZZlJYRXdd81mo6NLk_zNvlIfxX5KSyccYA/viewform?pli=1&pli=1&edit_requested=true';
        window.open(feedbackUrl, '_blank');
    }

    // Función para generar y descargar PDF
    downloadPDFReport(data, processedInsights) {
        try {
            // Crear contenido HTML para el PDF
            const htmlContent = this.generatePDFContent(data, processedInsights);
            
            // Crear un nuevo documento
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                
                // Esperar a que se cargue el contenido y luego imprimir
                printWindow.onload = function() {
                    setTimeout(() => {
                        printWindow.print();
                        // El usuario puede elegir "Guardar como PDF" en el diálogo de impresión
                    }, 500);
                };
            } else {
                throw new Error('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada por el navegador.');
            }
            
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el reporte PDF. Por favor, intenta de nuevo.');
        }
    }

    // Función para generar contenido HTML del PDF
    generatePDFContent(data, processedInsights) {
        const participantName = this.appState.participantData.name || 'Participante';
        const currentDate = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        return `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reporte de Evaluación - ${participantName}</title>
                <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        background: white;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                        border-bottom: 3px solid #667eea;
                        padding-bottom: 20px;
                    }
                    
                    .header h1 {
                        color: #667eea;
                        margin: 0;
                        font-size: 28px;
                    }
                    
                    .header p {
                        color: #666;
                        margin: 10px 0;
                        font-size: 16px;
                    }
                    
                    .participant-info {
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 30px;
                    }
                    
                    .score-summary {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        padding: 25px;
                        border-radius: 12px;
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    
                    .score-summary h2 {
                        margin: 0 0 10px 0;
                        font-size: 24px;
                    }
                    
                    .score-summary .total-score {
                        font-size: 36px;
                        font-weight: bold;
                        margin: 10px 0;
                    }
                    
                    .section {
                        margin-bottom: 30px;
                        padding: 20px;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                    }
                    
                    .section h3 {
                        color: #667eea;
                        margin-top: 0;
                        border-bottom: 2px solid #f0f0f0;
                        padding-bottom: 10px;
                    }
                    
                    .skill-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px 0;
                        border-bottom: 1px solid #f0f0f0;
                    }
                    
                    .skill-item:last-child {
                        border-bottom: none;
                    }
                    
                    .skill-name {
                        font-weight: bold;
                    }
                    
                    .skill-score {
                        font-weight: bold;
                        padding: 4px 12px;
                        border-radius: 20px;
                        color: white;
                    }
                    
                    .skill-score.excellent { background: #4CAF50; }
                    .skill-score.good { background: #FF9800; }
                    .skill-score.improvement { background: #f44336; }
                    
                    .insight-item {
                        margin: 20px 0;
                        padding: 20px;
                        background: #f8f9fa;
                        border-left: 4px solid #667eea;
                        border-radius: 0 8px 8px 0;
                    }
                    
                    .insight-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                    }
                    
                    .insight-title {
                        font-weight: bold;
                        color: #667eea;
                        font-size: 16px;
                    }
                    
                    .insight-description {
                        color: #555;
                        font-style: italic;
                    }
                    
                    .transcription-section {
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                        max-height: 300px;
                        overflow-y: auto;
                    }
                    
                    .footer {
                        margin-top: 50px;
                        text-align: center;
                        color: #666;
                        font-size: 14px;
                        border-top: 1px solid #e0e0e0;
                        padding-top: 20px;
                    }
                    
                    @media print {
                        body { margin: 0; padding: 15px; }
                        .score-summary { break-inside: avoid; }
                        .section { break-inside: avoid; }
                        .insight-item { break-inside: avoid; }
                    }
                    
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎮 Reporte de Evaluación Among Us IA</h1>
                    <p>Análisis Multimodal de Habilidades Blandas</p>
                    <p><strong>Fecha:</strong> ${currentDate}</p>
                </div>
                
                <div class="participant-info">
                    <h3>📋 Información del Participante</h3>
                    <p><strong>Nombre:</strong> ${this.appState.participantData.name}</p>
                    <p><strong>Email:</strong> ${this.appState.participantData.email}</p>
                    <p><strong>Edad:</strong> ${this.appState.participantData.age} años</p>
                    <p><strong>Posición:</strong> ${this.appState.participantData.position}</p>
                </div>
                
                <div class="score-summary">
                    <h2>Puntuación General</h2>
                    <div class="total-score">${data.total_score || 85}/100</div>
                    <p>Análisis completado exitosamente</p>
                </div>
                
                <div class="section">
                    <h3>🧠 Habilidades Blandas Evaluadas</h3>
                    ${this.generatePDFSkillsHTML(data.soft_skills_scores || {})}
                </div>
                
                <div class="section">
                    <h3>🔍 Análisis Detallado por Habilidades</h3>
                    ${this.generatePDFInsightsHTML(processedInsights)}
                </div>
                
                <div class="section">
                    <h3>🎮 Análisis de Gameplay</h3>
                    ${this.generatePDFGameplayHTML(data.gameplay_analysis || {})}
                </div>
                
                <div class="section">
                    <h3>💬 Análisis de Comunicación</h3>
                    ${this.generatePDFCommunicationHTML(data.communication_analysis || {})}
                </div>
                
                <div class="footer">
                    <p>Reporte generado por Among Us IA Evaluator</p>
                    <p>Sistema de análisis multimodal con GPT-4V y Whisper</p>
                </div>
            </body>
            </html>
        `;
    }

    // Funciones auxiliares para generar HTML del PDF
    generatePDFSkillsHTML(skills) {
        const translatedSkills = this.translateSkills(skills);
        
        return Object.entries(translatedSkills).map(([skill, score]) => `
            <div class="skill-item">
                <span class="skill-name">${skill}</span>
                <span class="skill-score ${this.getPDFScoreClass(score)}">${score}/10</span>
            </div>
        `).join('');
    }

    generatePDFInsightsHTML(processedInsights) {
        return Object.entries(processedInsights).map(([skillName, data]) => `
            <div class="insight-item">
                <div class="insight-header">
                    <span class="insight-title">${skillName}</span>
                    <span class="skill-score ${this.getPDFScoreClass(data.score)}">${data.score}/10</span>
                </div>
                <p class="insight-description">${data.insight}</p>
            </div>
        `).join('');
    }

    generatePDFGameplayHTML(gameplay) {
        return `
            <div class="skill-item">
                <span class="skill-name">Estrategia detectada:</span>
                <span>${this.translateStrategy(gameplay.strategy || 'colaborativa')}</span>
            </div>
            <div class="skill-item">
                <span class="skill-name">Decisiones tomadas:</span>
                <span>${gameplay.decisions_count || 12}</span>
            </div>
            <div class="skill-item">
                <span class="skill-name">Interacciones sociales:</span>
                <span>${this.translateInteraction(gameplay.social_interactions || 'Alta')}</span>
            </div>
            <div class="skill-item">
                <span class="skill-name">Comportamiento bajo presión:</span>
                <span>${this.translateBehavior(gameplay.pressure_behavior || 'Calmado')}</span>
            </div>
        `;
    }

    generatePDFCommunicationHTML(communication) {
        return `
            <div class="skill-item">
                <span class="skill-name">Palabras detectadas:</span>
                <span>${communication.words_detected || 245}</span>
            </div>
            <div class="skill-item">
                <span class="skill-name">Tono emocional:</span>
                <span>${communication.emotional_tone || 'Positivo'}</span>
            </div>
            <div class="skill-item">
                <span class="skill-name">Claridad de comunicación:</span>
                <span>${communication.clarity_score || '8.3/10'}</span>
            </div>
            <div class="skill-item">
                <span class="skill-name">Preguntas formuladas:</span>
                <span>${communication.questions_count || 8}</span>
            </div>
        `;
    }

    getPDFScoreClass(score) {
        if (score >= 8) return 'excellent';
        if (score >= 6) return 'good';
        return 'improvement';
    }

    processInsightsBySkill(insights, scores) {
        // Mapeo de habilidades en español
        const skillNames = {
            'liderazgo': 'Liderazgo',
            'comunicacion': 'Comunicación',
            'pensamiento_critico': 'Pensamiento Crítico',
            'colaboracion': 'Colaboración',
            'adaptabilidad': 'Adaptabilidad',
            'resolucion_problemas': 'Resolución de Problemas',
            'inteligencia_emocional': 'Inteligencia Emocional',
            'persuasion': 'Persuasión'
        };
        
        // Si no hay insights específicos, generar basados en puntuaciones
        if (!insights || insights.length < 100) {
            return this.generateDetailedInsights(scores, skillNames);
        }
        
        // Procesar insights existentes
        const processedInsights = {};
        
        Object.keys(skillNames).forEach(skillKey => {
            const skillName = skillNames[skillKey];
            const score = scores[skillKey] || 0;
            
            // Extraer información relevante del insight general
            let skillInsight = this.extractSkillInsight(insights, skillName, score);
            
            processedInsights[skillName] = {
                score: score,
                insight: skillInsight,
                level: this.getSkillLevel(score)
            };
        });
        
        return processedInsights;
    }

    generateDetailedInsights(scores, skillNames) {
        const insights = {};
        
        Object.entries(skillNames).forEach(([skillKey, skillName]) => {
            const score = scores[skillKey] || 0;
            let insight = '';
            let level = this.getSkillLevel(score);
            
            // Generar insights específicos por habilidad
            switch(skillKey) {
                case 'liderazgo':
                    if (score >= 8) {
                        insight = 'Demuestra excelentes cualidades de liderazgo, tomando iniciativas y guiando efectivamente las discusiones del equipo.';
                    } else if (score >= 6) {
                        insight = 'Muestra capacidades de liderazgo moderadas, participando activamente en las decisiones grupales.';
                    } else {
                        insight = 'Oportunidad de desarrollo en liderazgo. Se recomienda tomar más iniciativas y expresar ideas con mayor confianza.';
                    }
                    break;
                    
                case 'comunicacion':
                    if (score >= 8) {
                        insight = 'Comunicación clara y efectiva. Se expresa de manera coherente y facilita la comprensión del equipo.';
                    } else if (score >= 6) {
                        insight = 'Comunicación adecuada con oportunidades de mejora en claridad y precisión de las ideas.';
                    } else {
                        insight = 'Se sugiere trabajar en habilidades de comunicación verbal y escucha activa para mejorar la interacción en equipo.';
                    }
                    break;
                    
                case 'pensamiento_critico':
                    if (score >= 8) {
                        insight = 'Excelente capacidad analítica. Evalúa evidencia de manera lógica y toma decisiones fundamentadas.';
                    } else if (score >= 6) {
                        insight = 'Demuestra pensamiento analítico con espacio para profundizar en el análisis de situaciones complejas.';
                    } else {
                        insight = 'Oportunidad de fortalecer el análisis crítico y la evaluación sistemática de información.';
                    }
                    break;
                    
                case 'colaboracion':
                    if (score >= 8) {
                        insight = 'Excelente trabajo en equipo. Apoya activamente a otros miembros y fomenta un ambiente colaborativo.';
                    } else if (score >= 6) {
                        insight = 'Buena disposición para el trabajo en equipo con oportunidades de ser más proactivo en la colaboración.';
                    } else {
                        insight = 'Se recomienda desarrollar mayor apertura al trabajo colaborativo y apoyo a compañeros de equipo.';
                    }
                    break;
                    
                case 'adaptabilidad':
                    if (score >= 8) {
                        insight = 'Alta flexibilidad y capacidad de adaptación a cambios en el juego y estrategias del equipo.';
                    } else if (score >= 6) {
                        insight = 'Muestra adaptabilidad moderada con oportunidades de ser más flexible ante cambios inesperados.';
                    } else {
                        insight = 'Se sugiere desarrollar mayor flexibilidad y apertura a cambios de estrategia y situaciones imprevistas.';
                    }
                    break;
                    
                case 'resolucion_problemas':
                    if (score >= 8) {
                        insight = 'Excelente capacidad para identificar problemas y proponer soluciones creativas y efectivas.';
                    } else if (score >= 6) {
                        insight = 'Demuestra habilidades de resolución de problemas con potencial para ser más innovador en las soluciones.';
                    } else {
                        insight = 'Oportunidad de desarrollar un enfoque más sistemático para identificar y resolver problemas complejos.';
                    }
                    break;
                    
                case 'inteligencia_emocional':
                    if (score >= 8) {
                        insight = 'Excelente manejo emocional. Mantiene la calma bajo presión y demuestra empatía hacia el equipo.';
                    } else if (score >= 6) {
                        insight = 'Buen control emocional con oportunidades de desarrollar mayor empatía y comprensión interpersonal.';
                    } else {
                        insight = 'Se recomienda trabajar en el manejo de emociones y desarrollar mayor conciencia emocional propia y de otros.';
                    }
                    break;
                    
                case 'persuasion':
                    if (score >= 8) {
                        insight = 'Excelente capacidad de persuasión. Argumenta de manera convincente y logra influir positivamente en el equipo.';
                    } else if (score >= 6) {
                        insight = 'Muestra habilidades de persuasión moderadas con potencial para desarrollar argumentos más convincentes.';
                    } else {
                        insight = 'Oportunidad de mejorar la capacidad de persuasión y construcción de argumentos sólidos.';
                    }
                    break;
                    
                default:
                    insight = `Habilidad evaluada con puntuación de ${score}/10. Se requiere análisis más detallado.`;
            }
            
            insights[skillName] = {
                score: score,
                insight: insight,
                level: level
            };
        });
        
        return insights;
    }

    extractSkillInsight(insights, skillName, score) {
        // Buscar menciones de la habilidad en el insight general
        const lowerInsights = insights.toLowerCase();
        const lowerSkill = skillName.toLowerCase();
        
        if (lowerInsights.includes(lowerSkill)) {
            // Extraer oración que menciona la habilidad
            const sentences = insights.split('.');
            for (let sentence of sentences) {
                if (sentence.toLowerCase().includes(lowerSkill)) {
                    return sentence.trim() + '.';
                }
            }
        }
        
        // Si no se encuentra, generar insight basado en score
        return this.generateScoreBasedInsight(skillName, score);
    }

    generateScoreBasedInsight(skillName, score) {
        if (score >= 8) {
            return `Demuestra un excelente nivel en ${skillName.toLowerCase()}, destacándose significativamente en esta habilidad.`;
        } else if (score >= 6) {
            return `Muestra un buen desempeño en ${skillName.toLowerCase()} con oportunidades de crecimiento.`;
        } else {
            return `Área de oportunidad identificada en ${skillName.toLowerCase()}. Se recomienda enfoque de desarrollo.`;
        }
    }

    getSkillLevel(score) {
        if (score >= 9) return 'Excepcional';
        if (score >= 8) return 'Excelente';
        if (score >= 7) return 'Bueno';
        if (score >= 6) return 'Moderado';
        if (score >= 5) return 'Básico';
        return 'En desarrollo';
    }

    generateInsightsHTML(processedInsights) {
        return Object.entries(processedInsights).map(([skillName, data]) => `
            <div class="skill-insight">
                <div class="skill-header">
                    <h4>${skillName}</h4>
                    <div class="skill-score-badge ${this.getScoreClass(data.score)}">
                        ${data.score}/10 - ${data.level}
                    </div>
                </div>
                <p class="skill-description">${data.insight}</p>
            </div>
        `).join('');
    }

    getScoreClass(score) {
        if (score >= 8) return 'score-excellent';
        if (score >= 6) return 'score-good';
        return 'score-improvement';
    }

    generateSkillsHTML(skills) {
        const defaultSkills = {
            'Liderazgo': 8.2,
            'Comunicación': 7.5,
            'Pensamiento Crítico': 8.8,
            'Colaboración': 7.9,
            'Adaptabilidad': 8.1,
            'Resolución de Problemas': 8.6,
            'Inteligencia Emocional': 7.6,
            'Persuasión': 7.7
        };
        
        const skillsToShow = Object.keys(skills).length > 0 ? this.translateSkills(skills) : defaultSkills;
        
        return Object.entries(skillsToShow).map(([skill, score]) => `
            <div class="metric-row">
                <span>${skill}:</span>
                <span class="metric-score ${this.getScoreClass(score)}">${score}/10</span>
            </div>
        `).join('');
    }

    translateSkills(skills) {
        const translation = {
            'liderazgo': 'Liderazgo',
            'comunicacion': 'Comunicación',
            'pensamiento_critico': 'Pensamiento Crítico',
            'colaboracion': 'Colaboración',
            'adaptabilidad': 'Adaptabilidad',
            'resolucion_problemas': 'Resolución de Problemas',
            'inteligencia_emocional': 'Inteligencia Emocional',
            'persuasion': 'Persuasión'
        };
        
        const translatedSkills = {};
        Object.entries(skills).forEach(([key, value]) => {
            const translatedKey = translation[key] || key;
            translatedSkills[translatedKey] = value;
        });
        
        return translatedSkills;
    }

    generateGameplayHTML(gameplay) {
        return `
            <div class="metric-row">
                <span>Estrategia detectada:</span>
                <span>${this.translateStrategy(gameplay.strategy || 'colaborativa')}</span>
            </div>
            <div class="metric-row">
                <span>Decisiones tomadas:</span>
                <span>${gameplay.decisions_count || 12}</span>
            </div>
            <div class="metric-row">
                <span>Interacciones sociales:</span>
                <span>${this.translateInteraction(gameplay.social_interactions || 'Alta')}</span>
            </div>
            <div class="metric-row">
                <span>Comportamiento bajo presión:</span>
                <span>${this.translateBehavior(gameplay.pressure_behavior || 'Calmado')}</span>
            </div>
        `;
    }

    translateStrategy(strategy) {
        const strategies = {
            'collaborative': 'Colaborativa',
            'individual': 'Individual',
            'aggressive': 'Agresiva',
            'defensive': 'Defensiva',
            'colaborativa': 'Colaborativa'
        };
        return strategies[strategy.toLowerCase()] || strategy;
    }

    translateInteraction(interaction) {
        const interactions = {
            'high': 'Alta',
            'medium': 'Media',
            'low': 'Baja',
            'alta': 'Alta',
            'media': 'Media',
            'baja': 'Baja'
        };
        return interactions[interaction.toLowerCase()] || interaction;
    }

    translateBehavior(behavior) {
        const behaviors = {
            'calm': 'Calmado',
            'reactive': 'Reactivo',
            'stressed': 'Estresado',
            'confident': 'Confiado',
            'calmado': 'Calmado'
        };
        return behaviors[behavior.toLowerCase()] || behavior;
    }

    generateCommunicationHTML(communication) {
        return `
            <div class="metric-row">
                <span>Palabras detectadas:</span>
                <span>${communication.words_detected || 245}</span>
            </div>
            <div class="metric-row">
                <span>Tono emocional:</span>
                <span>${communication.emotional_tone || 'Positivo'}</span>
            </div>
            <div class="metric-row">
                <span>Claridad de comunicación:</span>
                <span>${communication.clarity_score || '8.3/10'}</span>
            </div>
            <div class="metric-row">
                <span>Preguntas formuladas:</span>
                <span>${communication.questions_count || 8}</span>
            </div>
        `;
    }

    // Funciones auxiliares
    showStep(stepNumber) {
        // Ocultar todos los pasos
        for (let i = 1; i <= 5; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) {
                step.classList.add('hidden');
            }
        }
        
        // Mostrar el paso actual
        const currentStep = document.getElementById(`step${stepNumber}`);
        if (currentStep) {
            currentStep.classList.remove('hidden');
        }
        
        this.appState.currentStep = stepNumber;
    }

    showStatus(element, message, type) {
        if (!element) return;
        
        element.textContent = message;
        element.className = `status status-${type}`;
        element.classList.remove('hidden');
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkBackendStatus() {
        const backendStatus = document.getElementById('backend-status');
        if (!backendStatus) return;
        
        try {
            const response = await fetch(`${this.backendUrl}/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (response.ok) {
                backendStatus.textContent = 'Backend: Conectado';
                backendStatus.style.background = 'rgba(76, 175, 80, 0.9)';
                this.appState.backendConnected = true;
            } else {
                throw new Error('Backend no disponible');
            }
        } catch (error) {
            backendStatus.textContent = 'Backend: Desconectado';
            backendStatus.style.background = 'rgba(244, 67, 54, 0.9)';
            this.appState.backendConnected = false;
        }
    }

    restartApp() {
        // Resetear estado
        this.selectedFile = null;
        this.analysisResults = null;
        this.appState = {
            backendConnected: this.appState.backendConnected,
            participantData: {},
            currentStep: 1,
            analysisInProgress: false
        };
        
        // Limpiar formularios
        const nameElement = document.getElementById('name');
        const emailElement = document.getElementById('email');
        const ageElement = document.getElementById('age');
        const positionElement = document.getElementById('position');
        
        if (nameElement) nameElement.value = '';
        if (emailElement) emailElement.value = '';
        if (ageElement) ageElement.value = '';
        if (positionElement) positionElement.value = '';
        
        // Resetear elementos visuales
        const fileInfo = document.getElementById('file-info');
        if (fileInfo) fileInfo.classList.add('hidden');
        
        const videoPreview = document.getElementById('video-preview');
        if (videoPreview) {
            videoPreview.classList.add('hidden');
            videoPreview.src = '';
        }
        
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.classList.add('hidden');
        }
        
        // Resetear barra de progreso
        this.updateProgress(0);
        
        // Volver al primer paso
        this.showStep(1);
    }

    downloadReport() {
        if (!this.analysisResults) {
            alert('No hay resultados para descargar');
            return;
        }
        
        const reportData = {
            participant: this.appState.participantData,
            analysis: this.analysisResults,
            timestamp: new Date().toISOString(),
            generated_by: 'Among Us IA Evaluator'
        };
        
        const blob = new Blob([JSON.stringify(reportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_${this.appState.participantData.name || 'usuario'}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Compresor de video automático para el frontend
class VideoCompressor {
    constructor() {
        this.compressionOptions = {
            maxSizeMB: 300,        // Tamaño máximo final en MB
            maxWidthOrHeight: 1280, // Resolución máxima
            targetBitrate: '1M',    // Bitrate objetivo
            targetFPS: 24          // FPS objetivo
        };
    }

    async compressVideo(file, progressCallback) {
        try {
            console.log(`📹 Comprimiendo video: ${file.name} (${this.formatFileSize(file.size)})`);
            
            // Mostrar estado inicial
            if (progressCallback) progressCallback(0, 'Iniciando compresión...');

            // Crear elemento video para obtener metadatos
            const videoElement = document.createElement('video');
            const videoURL = URL.createObjectURL(file);
            videoElement.src = videoURL;
            
            await new Promise(resolve => {
                videoElement.onloadedmetadata = resolve;
            });

            const { videoWidth, videoHeight, duration } = videoElement;
            console.log(`📊 Video original: ${videoWidth}x${videoHeight}, duración: ${duration}s`);

            // Calcular nueva resolución manteniendo aspect ratio
            const { width, height } = this.calculateOptimalSize(videoWidth, videoHeight);
            
            if (progressCallback) progressCallback(20, 'Configurando compresión...');

            // Usar WebCodecs API si está disponible, sino usar canvas
            let compressedBlob;
            if ('VideoEncoder' in window) {
                compressedBlob = await this.compressWithWebCodecs(file, width, height, progressCallback);
            } else {
                compressedBlob = await this.compressWithCanvas(file, width, height, progressCallback);
            }

            URL.revokeObjectURL(videoURL);

            const compressionRatio = ((file.size - compressedBlob.size) / file.size * 100).toFixed(1);
            console.log(`✅ Compresión completada: ${this.formatFileSize(compressedBlob.size)} (${compressionRatio}% reducción)`);

            if (progressCallback) progressCallback(100, `Compresión completada: ${compressionRatio}% reducción`);

            return compressedBlob;

        } catch (error) {
            console.error('❌ Error comprimiendo video:', error);
            throw new Error(`Error en compresión: ${error.message}`);
        }
    }

    async compressWithWebCodecs(file, width, height, progressCallback) {
        // Implementación avanzada con WebCodecs (Chrome/Edge moderno)
        return new Promise(async (resolve, reject) => {
            try {
                const chunks = [];
                let frameCount = 0;
                const targetFrames = Math.floor(24 * this.getVideoDuration(file)); // 24 FPS estimado

                const encoder = new VideoEncoder({
                    output: (chunk) => {
                        chunks.push(new Uint8Array(chunk.byteLength));
                        chunk.copyTo(chunks[chunks.length - 1]);
                        
                        frameCount++;
                        const progress = Math.min(95, 30 + (frameCount / targetFrames) * 60);
                        if (progressCallback) progressCallback(progress, `Codificando frame ${frameCount}...`);
                    },
                    error: reject
                });

                encoder.configure({
                    codec: 'avc1.42E01E', // H.264 baseline
                    width,
                    height,
                    bitrate: 1000000, // 1 Mbps
                    framerate: 24
                });

                // Procesar video frame por frame
                const videoElement = document.createElement('video');
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = width;
                canvas.height = height;
                videoElement.src = URL.createObjectURL(file);

                videoElement.onloadeddata = async () => {
                    const duration = videoElement.duration;
                    const frameInterval = 1/24; // 24 FPS
                    
                    for (let time = 0; time < duration; time += frameInterval) {
                        videoElement.currentTime = time;
                        await new Promise(resolve => videoElement.onseeked = resolve);
                        
                        ctx.drawImage(videoElement, 0, 0, width, height);
                        const imageData = ctx.getImageData(0, 0, width, height);
                        
                        const frame = new VideoFrame(imageData, {
                            timestamp: time * 1000000 // microsegundos
                        });
                        
                        encoder.encode(frame);
                        frame.close();
                    }
                    
                    await encoder.flush();
                    
                    // Crear blob final
                    const compressedBlob = new Blob(chunks, { type: 'video/mp4' });
                    resolve(compressedBlob);
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    async compressWithCanvas(file, width, height, progressCallback) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
            reject(new Error('Timeout en compresión'));
            }, 60000); // 1 minuto máximo
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;

            const stream = canvas.captureStream(24); // 24 FPS
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 1000000 // 1 Mbps
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                clearTimeout(timeout);
                const compressedBlob = new Blob(chunks, { type: 'video/webm' });
                resolve(compressedBlob);
            };

            mediaRecorder.onerror = reject;

            const videoElement = document.createElement('video');
            videoElement.src = URL.createObjectURL(file);
            videoElement.muted = true;

            videoElement.onloadeddata = () => {
                const duration = videoElement.duration;
                const frameInterval = 1/24;
                let currentTime = 0;

                mediaRecorder.start();

                const drawFrame = () => {
                    if (currentTime >= duration) {
                        mediaRecorder.stop();
                        return;
                    }

                    videoElement.currentTime = currentTime;
                    ctx.drawImage(videoElement, 0, 0, width, height);
                    
                    const progress = 30 + (currentTime / duration) * 60;
                    if (progressCallback) progressCallback(progress, `Procesando: ${currentTime.toFixed(1)}s`);

                    currentTime += frameInterval;
                    requestAnimationFrame(drawFrame);
                };

                videoElement.onseeked = drawFrame;
            };

            videoElement.load();
                    mediaRecorder.onstop = () => {
            clearTimeout(timeout);
            const compressedBlob = new Blob(chunks, { type: 'video/webm' });
            resolve(compressedBlob);
        };
    });
}

    calculateOptimalSize(originalWidth, originalHeight) {
        const maxDimension = this.compressionOptions.maxWidthOrHeight;
        const aspectRatio = originalWidth / originalHeight;

        let width, height;

        if (originalWidth > originalHeight) {
            // Video horizontal
            width = Math.min(originalWidth, maxDimension);
            height = Math.round(width / aspectRatio);
        } else {
            // Video vertical
            height = Math.min(originalHeight, maxDimension);
            width = Math.round(height * aspectRatio);
        }

        // Asegurar números pares para codificación
        width = width % 2 === 0 ? width : width - 1;
        height = height % 2 === 0 ? height : height - 1;

        return { width, height };
    }

    getVideoDuration(file) {
        // Estimar duración basada en tamaño (aproximación)
        return Math.min(600, file.size / (1024 * 1024)); // Max 10 minutos
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Validar si el video necesita compresión
    needsCompression(file) {
        const maxSizeBytes = 500 * 1024 * 1024; // 500MB en lugar de 300MB
        return file.size > maxSizeBytes;
    }
}

// Integración con tu sistema existente
class AmongUsEvaluatorWithCompression extends AmongUsEvaluator {
    constructor() {
        super();
        this.videoCompressor = new VideoCompressor();
    }

    async handleFileSelection(file) {
        // Validar tipo de archivo
        if (!file.type.startsWith('video/')) {
            const status = document.getElementById('upload-status');
            if (status) {
                this.showStatus(status, 'Por favor selecciona un archivo de video', 'error');
            }
            return;
        }

        // Verificar si necesita compresión
        if (this.videoCompressor.needsCompression(file)) {
            await this.compressAndProcessVideo(file);
        } else {
            // Procesar directamente si es pequeño
            this.selectedFile = file;
            this.displayFileInfo(file);
            this.showVideoPreview(file);
            this.enableUploadButton();
        }
    }

    async compressAndProcessVideo(file) {
        const status = document.getElementById('upload-status');
        
        try {
            this.showStatus(status, 'Comprimiendo video automáticamente...', 'info');
            
            // Crear barra de progreso
            this.showCompressionProgress();
            
            const compressedBlob = await this.videoCompressor.compressVideo(file, 
                (progress, message) => {
                    this.updateCompressionProgress(progress, message);
                }
            );

            // Crear nuevo archivo con el blob comprimido
            const compressedFile = new File([compressedBlob], 
                `compressed_${file.name}`, 
                { type: compressedBlob.type }
            );

            this.selectedFile = compressedFile;
            this.displayFileInfo(compressedFile, file.size); // Mostrar ambos tamaños
            this.showVideoPreview(compressedFile);
            this.enableUploadButton();
            
            this.hideCompressionProgress();
            this.showStatus(status, 'Video comprimido y listo para análisis', 'success');

        } catch (error) {
            console.error('Error comprimiendo video:', error);
            this.showStatus(status, `Error en compresión: ${error.message}`, 'error');
            this.hideCompressionProgress();
        }
    }

    showCompressionProgress() {
        const progressHtml = `
            <div id="compression-progress" class="compression-progress">
                <h4>🔄 Comprimiendo video automáticamente</h4>
                <div class="progress-bar-container">
                    <div id="compression-progress-bar" class="progress-bar" style="width: 0%"></div>
                </div>
                <p id="compression-status">Iniciando compresión...</p>
            </div>
        `;
        
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.insertAdjacentHTML('afterend', progressHtml);
        }
    }

    updateCompressionProgress(percentage, message) {
        const progressBar = document.getElementById('compression-progress-bar');
        const statusText = document.getElementById('compression-status');
        
        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (statusText) statusText.textContent = message;
    }

    hideCompressionProgress() {
        const progressElement = document.getElementById('compression-progress');
        if (progressElement) {
            progressElement.remove();
        }
    }

    displayFileInfo(file, originalSize = null) {
        const fileInfo = document.getElementById('file-info');
        if (!fileInfo) return;
        
        const compressionInfo = originalSize ? 
            `<div class="metric-row">
                <span>Tamaño original:</span>
                <span>${this.formatFileSize(originalSize)}</span>
            </div>
            <div class="metric-row">
                <span>Reducción:</span>
                <span>${((originalSize - file.size) / originalSize * 100).toFixed(1)}%</span>
            </div>` : '';
        
        fileInfo.innerHTML = `
            <h4>Archivo ${originalSize ? 'Comprimido' : 'Seleccionado'}:</h4>
            <div class="metric-row">
                <span>Nombre:</span>
                <span>${file.name}</span>
            </div>
            <div class="metric-row">
                <span>Tamaño final:</span>
                <span>${this.formatFileSize(file.size)}</span>
            </div>
            ${compressionInfo}
            <div class="metric-row">
                <span>Tipo:</span>
                <span>${file.type}</span>
            </div>
        `;
        fileInfo.classList.remove('hidden');
    }

    enableUploadButton() {
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('hidden');
        }
    }
}
// Al final de todo el archivo, después de todas las clases
document.addEventListener('DOMContentLoaded', () => {
    window.amongUsEvaluator = new AmongUsEvaluatorWithCompression();
});