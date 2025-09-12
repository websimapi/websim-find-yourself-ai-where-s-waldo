class FindYourselfGame {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.photoData = null;
        this.targetArea = null;
        this.attempts = 0;
        this.gameCanvas = null;
        this.gameCtx = null;
        this.hintsGiven = 0;
        
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('takePhoto').addEventListener('click', () => this.takePhoto());
        document.getElementById('uploadPhoto').addEventListener('click', () => this.uploadPhoto());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('proceedToGame').addEventListener('click', () => this.generateWaldoScene());
        document.getElementById('retakePhoto').addEventListener('click', () => this.retakePhoto());
        document.getElementById('giveHint').addEventListener('click', () => this.giveHint());
        document.getElementById('resetGame').addEventListener('click', () => this.resetGame());
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' },
                audio: false 
            });
            this.video.srcObject = stream;
            
            document.getElementById('startCamera').style.display = 'none';
            document.getElementById('takePhoto').style.display = 'inline-block';
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Unable to access camera. Please use the upload option instead.');
        }
    }

    takePhoto() {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.ctx.drawImage(this.video, 0, 0);
        
        this.photoData = this.canvas.toDataURL('image/jpeg', 0.8);
        this.showPhotoPreview();
    }

    uploadPhoto() {
        document.getElementById('fileInput').click();
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.photoData = e.target.result;
                this.showPhotoPreview();
            };
            reader.readAsDataURL(file);
        }
    }

    showPhotoPreview() {
        document.getElementById('photoPreview').src = this.photoData;
        document.getElementById('capturedPhoto').style.display = 'block';
        
        // Hide video and camera controls
        this.video.style.display = 'none';
        document.querySelector('.camera-controls').style.display = 'none';
        
        // Stop camera stream
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
    }

    retakePhoto() {
        document.getElementById('capturedPhoto').style.display = 'none';
        document.getElementById('photoPreview').src = '';
        this.video.style.display = 'block';
        document.querySelector('.camera-controls').style.display = 'flex';
        document.getElementById('startCamera').style.display = 'inline-block';
        document.getElementById('takePhoto').style.display = 'none';
        this.photoData = null;
    }

    async generateWaldoScene() {
        this.showStage('loadingStage');
        
        try {
            // Analyze the photo with AI
            const analysis = await this.analyzePhoto();
            
            // Generate the Where's Waldo scene
            const waldoImage = await this.createWaldoScene(analysis);
            
            this.setupGame(waldoImage, analysis);
            
        } catch (error) {
            console.error('Error generating scene:', error);
            alert('Sorry, there was an error generating your scene. Please try again.');
            this.showStage('photoStage');
        }
    }

    async analyzePhoto() {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this photo and describe:
1. The main subject/person and their key visual characteristics (clothing, pose, distinctive features)
2. The setting/environment where they are
3. A creative scenario for a "Where's Waldo" style scene where this person would blend into a crowd

Respond with JSON in this format:
{
  "subject": "detailed description of the main person/subject",
  "setting": "description of the environment/setting",
  "waldoScenario": "creative crowded scene description where they'd fit in",
  "subjectKeyFeatures": "distinctive visual elements to help identify them"
}`
                        },
                        {
                            type: "image_url",
                            image_url: { url: this.photoData }
                        }
                    ]
                }
            ],
            json: true
        });

        return JSON.parse(completion.content);
    }

    async createWaldoScene(analysis) {
        const prompt = `Create a detailed "Where's Waldo" style crowded scene: ${analysis.waldoScenario}. 
        Include many people in various activities, but prominently feature someone matching this description: ${analysis.subject}. 
        The scene should be busy and colorful with lots of visual complexity, similar to classic Where's Waldo illustrations. 
        Make sure the target person (${analysis.subjectKeyFeatures}) is clearly visible but challenging to spot among the crowd.`;

        const result = await websim.imageGen({
            prompt: prompt,
            aspect_ratio: "16:9"
        });

        return result.url;
    }

    setupGame(imageUrl, analysis) {
        document.getElementById('generatedImage').src = imageUrl;
        document.getElementById('gameDescription').textContent = `Look for: ${analysis.subjectKeyFeatures}`;
        
        // Wait for image to load before setting up canvas
        document.getElementById('generatedImage').onload = () => {
            this.setupGameCanvas();
            this.showStage('gameStage');
        };
        
        this.analysis = analysis;
        this.attempts = 0;
        this.hintsGiven = 0;
        this.updateAttempts();
    }

    setupGameCanvas() {
        const img = document.getElementById('generatedImage');
        this.gameCanvas = document.getElementById('gameCanvas');
        this.gameCtx = this.gameCanvas.getContext('2d');
        
        // Set canvas size to match image
        this.gameCanvas.width = img.offsetWidth;
        this.gameCanvas.height = img.offsetHeight;
        
        // Generate random target area (simulating where the person might be)
        this.generateTargetArea();
        
        // Add click handler
        this.gameCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    generateTargetArea() {
        const width = this.gameCanvas.width;
        const height = this.gameCanvas.height;
        
        // Random position for the target area
        const targetSize = 60; // Radius of the target area
        this.targetArea = {
            x: Math.random() * (width - targetSize * 2) + targetSize,
            y: Math.random() * (height - targetSize * 2) + targetSize,
            radius: targetSize
        };
    }

    handleCanvasClick(event) {
        const rect = this.gameCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.attempts++;
        this.updateAttempts();
        
        // Check if click is within target area
        const distance = Math.sqrt(
            Math.pow(x - this.targetArea.x, 2) + 
            Math.pow(y - this.targetArea.y, 2)
        );
        
        if (distance <= this.targetArea.radius) {
            this.showSuccess(x, y);
        } else {
            this.showNearMiss(x, y, distance);
        }
    }

    showSuccess(x, y) {
        // Draw success indicator
        this.gameCtx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        this.gameCtx.beginPath();
        this.gameCtx.arc(this.targetArea.x, this.targetArea.y, this.targetArea.radius, 0, 2 * Math.PI);
        this.gameCtx.fill();
        
        this.gameCtx.strokeStyle = '#00ff00';
        this.gameCtx.lineWidth = 3;
        this.gameCtx.stroke();
        
        document.getElementById('gameResult').innerHTML = `
            🎉 Congratulations! You found yourself in ${this.attempts} attempts!<br>
            <button class="btn btn-primary" onclick="location.reload()">Play Again</button>
        `;
        document.getElementById('gameResult').className = 'game-result success';
        document.getElementById('gameResult').style.display = 'block';
        
        this.gameCanvas.removeEventListener('click', this.handleCanvasClick);
    }

    showNearMiss(x, y, distance) {
        // Draw click indicator
        this.gameCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        this.gameCtx.beginPath();
        this.gameCtx.arc(x, y, 10, 0, 2 * Math.PI);
        this.gameCtx.fill();
        
        let message = '';
        if (distance < this.targetArea.radius * 2) {
            message = '🔥 Very close! Try nearby.';
        } else if (distance < this.targetArea.radius * 3) {
            message = '🎯 Getting warmer!';
        } else {
            message = '❄️ Not quite there. Keep looking!';
        }
        
        document.getElementById('gameResult').innerHTML = message;
        document.getElementById('gameResult').className = 'game-result failure';
        document.getElementById('gameResult').style.display = 'block';
        
        setTimeout(() => {
            document.getElementById('gameResult').style.display = 'none';
        }, 2000);
    }

    giveHint() {
        this.hintsGiven++;
        
        if (this.hintsGiven === 1) {
            // Draw a general area hint
            this.gameCtx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
            this.gameCtx.lineWidth = 3;
            this.gameCtx.setLineDash([10, 10]);
            this.gameCtx.beginPath();
            this.gameCtx.arc(this.targetArea.x, this.targetArea.y, this.targetArea.radius * 3, 0, 2 * Math.PI);
            this.gameCtx.stroke();
            this.gameCtx.setLineDash([]);
            
            document.getElementById('gameResult').innerHTML = '💡 Look in the highlighted area!';
        } else if (this.hintsGiven === 2) {
            // Draw a closer hint
            this.gameCtx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            this.gameCtx.lineWidth = 3;
            this.gameCtx.beginPath();
            this.gameCtx.arc(this.targetArea.x, this.targetArea.y, this.targetArea.radius * 1.5, 0, 2 * Math.PI);
            this.gameCtx.stroke();
            
            document.getElementById('gameResult').innerHTML = '💡💡 Much closer! Look for: ' + this.analysis.subjectKeyFeatures;
        } else {
            // Final hint - show exact location
            this.gameCtx.fillStyle = 'rgba(255, 255, 0, 0.4)';
            this.gameCtx.beginPath();
            this.gameCtx.arc(this.targetArea.x, this.targetArea.y, this.targetArea.radius, 0, 2 * Math.PI);
            this.gameCtx.fill();
            
            document.getElementById('gameResult').innerHTML = '💡💡💡 Final hint - click in the yellow circle!';
        }
        
        document.getElementById('gameResult').className = 'game-result hint';
        document.getElementById('gameResult').style.display = 'block';
    }

    updateAttempts() {
        document.getElementById('attempts').textContent = `Attempts: ${this.attempts}`;
    }

    showStage(stageId) {
        const stages = ['photoStage', 'loadingStage', 'gameStage'];
        stages.forEach(id => {
            document.getElementById(id).style.display = id === stageId ? 'block' : 'none';
        });
    }

    resetGame() {
        this.showStage('photoStage');
        this.retakePhoto();
        
        // Clear game canvas
        if (this.gameCtx) {
            this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
        }
        
        // Reset game state
        this.attempts = 0;
        this.hintsGiven = 0;
        this.photoData = null;
        this.targetArea = null;
        document.getElementById('gameResult').style.display = 'none';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FindYourselfGame();
});

