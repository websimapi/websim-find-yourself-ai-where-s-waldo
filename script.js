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
            document.getElementById('loadingTitle').textContent = '🤔 Analyzing your photo...';
            document.getElementById('loadingText').textContent = 'The AI is learning your key features to create the game.';
            const analysis = await this.analyzePhoto();
            
            // Generate the Where's Waldo scene
            document.getElementById('loadingTitle').textContent = '🎨 AI is creating your scene...';
            document.getElementById('loadingText').textContent = 'This is the magic part! Building a crowded world just for you.';
            const waldoImageURL = await this.createWaldoScene(analysis);
            
            // Locate the target in the generated scene
            document.getElementById('loadingTitle').textContent = '🎯 Pinpointing your location...';
            document.getElementById('loadingText').textContent = 'The AI is now finding where it hid you in the scene to set up the game.';
            const location = await this.locateTargetInScene(waldoImageURL, analysis);

            // Pass the image URL, analysis, and location data to the setup function
            this.setupGame(waldoImageURL, analysis, location);
            
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
                            text: `Analyze this photo for a "Where's Waldo" style game. I need detailed information to create a scene where this person can be hidden in a crowd.

Describe:
1. Physical appearance: age, gender, hair color/style, clothing colors and style, body build, distinctive accessories
2. Current setting/background in the photo
3. Pose and body position
4. Any unique visual elements that would help identify them
5. Suggested crowd scenario where they would naturally blend in

Be very specific about colors, clothing details, and physical characteristics.

Respond with ONLY JSON, no other text before or after the JSON block:
{
  "physicalDescription": "detailed physical appearance including age, gender, build, hair",
  "clothingDescription": "specific clothing items, colors, patterns, accessories", 
  "pose": "current body position and pose",
  "distinctiveFeatures": "unique identifying elements",
  "currentSetting": "background/environment in photo",
  "suggestedScenario": "specific crowd scene where they'd fit naturally",
  "searchInstructions": "what the player should look for to find them"
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
        const prompt = `Create a challenging "Where's Waldo" style illustration.

SCENE TYPE: ${analysis.suggestedScenario}

VISUAL STYLE: A classic Where's Waldo illustration. It must be extremely crowded, colorful, and packed with detail. Many overlapping characters and objects are essential.

TARGET PERSON TO HIDE:
- Description: ${analysis.physicalDescription}
- Clothing: ${analysis.clothingDescription}
- Pose: Try to adapt this pose: ${analysis.pose}
- Key Features: ${analysis.distinctiveFeatures}

HIDING INSTRUCTIONS (CRITICAL):
- The target person MUST be well-hidden and difficult to find.
- DO NOT place them in the center or near the focal point of the image.
- Place them in an unexpected location, perhaps in the upper third, lower third, or near the edges of the scene.
- They should be partially obscured by another person, an object, or a piece of the environment.
- Make them small, around 1/30th of the image height.
- Ensure they are integrated into an activity within the scene, not just standing there.
- The target person should not be looking directly at the camera/viewer.

SCENE REQUIREMENTS:
- A massive crowd of 50-100+ people engaged in various activities.
- Deep scene with foreground, middle ground, and background elements all filled with characters.
- Bright, vibrant colors and tons of visual noise.
- Include several "red herring" characters who look similar to the target person (e.g., similar hair color, shirt color, or general appearance).
- The scene must be chaotic and full of distractions like animals, funny situations, and weird objects.

The final image should be a fun and challenging puzzle where finding the target person takes real effort.`;

        const result = await websim.imageGen({
            prompt: prompt,
            aspect_ratio: "16:9"
        });

        return result.url;
    }

    async locateTargetInScene(imageUrl, analysis) {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `This is a "Where's Waldo" style image I created. I need you to find the person who was hidden in it.

The person to find is described as:
- Physical appearance: ${analysis.physicalDescription}
- Clothing: ${analysis.clothingDescription}
- Pose: ${analysis.pose}
- Distinctive features: ${analysis.distinctiveFeatures}

Carefully examine the image and locate this person. Once you find them, provide their coordinates. The coordinate system's origin (0,0) is the top-left corner of the image.

Respond with ONLY a JSON object with the following structure, and no other text:
{
  "found": boolean,
  "x": number, // The x-coordinate of the center of the person (from 0.0 to 1.0, representing percentage of width)
  "y": number  // The y-coordinate of the center of the person (from 0.0 to 1.0, representing percentage of height)
}

If you cannot find a person matching the description, set "found" to false and x/y to 0.5.`
                        },
                        {
                            type: "image_url",
                            image_url: { url: imageUrl }
                        }
                    ]
                }
            ],
            json: true
        });

        return JSON.parse(completion.content);
    }

    setupGame(imageUrl, analysis, location) {
        document.getElementById('generatedImage').src = imageUrl;
        document.getElementById('gameDescription').innerHTML = `
            <strong>Find the person who matches this description:</strong><br>
            👤 ${analysis.physicalDescription}<br>
            👕 ${analysis.clothingDescription}<br>
            🎯 ${analysis.searchInstructions}
        `;
        
        // Wait for image to load before setting up canvas
        document.getElementById('generatedImage').onload = () => {
            this.setupGameCanvas(location);
            this.showStage('gameStage');
        };
        
        this.analysis = analysis;
        this.attempts = 0;
        this.hintsGiven = 0;
        this.updateAttempts();
    }

    setupGameCanvas(location) {
        const img = document.getElementById('generatedImage');
        this.gameCanvas = document.getElementById('gameCanvas');
        this.gameCtx = this.gameCanvas.getContext('2d');
        
        // Set canvas size to match image
        this.gameCanvas.width = img.offsetWidth;
        this.gameCanvas.height = img.offsetHeight;
        
        // Use the coordinates from the AI to set the target area
        if (location && location.found) {
             const targetSize = this.gameCanvas.width / 30; // Make target size relative
             this.targetArea = {
                x: location.x * this.gameCanvas.width,
                y: location.y * this.gameCanvas.height,
                radius: targetSize 
            };
        } else {
            // Fallback if AI can't find the person (should be rare)
            console.warn("AI couldn't locate the target. Falling back to random placement.");
            const targetSize = this.gameCanvas.width / 30;
            this.targetArea = {
                x: Math.random() * (this.gameCanvas.width - targetSize * 2) + targetSize,
                y: Math.random() * (this.gameCanvas.height - targetSize * 2) + targetSize,
                radius: targetSize
            };
            alert("The AI had trouble pinpointing the hidden person. The game might be a bit off this round, sorry!");
        }
        
        // Add click handler
        this.gameCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));
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
            this.showSuccess();
        } else {
            this.showNearMiss(x, y, distance);
        }
    }

    showSuccess() {
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
        
        // This is a bit of a hack to prevent re-binding if handleCanvasClick is an arrow function
        const newCanvas = this.gameCanvas.cloneNode(true);
        this.gameCanvas.parentNode.replaceChild(newCanvas, this.gameCanvas);
        this.gameCanvas = newCanvas;
        this.gameCtx = this.gameCanvas.getContext('2d');
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
        this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height); // Clear previous hints
        
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
            this.gameCtx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
            this.gameCtx.lineWidth = 3;
            this.gameCtx.setLineDash([5, 5]);
            this.gameCtx.beginPath();
            this.gameCtx.arc(this.targetArea.x, this.targetArea.y, this.targetArea.radius * 1.5, 0, 2 * Math.PI);
            this.gameCtx.stroke();
            this.gameCtx.setLineDash([]);
            
            document.getElementById('gameResult').innerHTML = '💡💡 Getting very close now!';
        } else {
            // Final hint - show exact location
            this.gameCtx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            this.gameCtx.lineWidth = 4;
            this.gameCtx.setLineDash([5, 5]);
            this.gameCtx.beginPath();
            this.gameCtx.arc(this.targetArea.x, this.targetArea.y, this.targetArea.radius, 0, 2 * Math.PI);
            this.gameCtx.stroke();
            this.gameCtx.setLineDash([]);
            
            document.getElementById('gameResult').innerHTML = '💡💡💡 Last chance! Click in the red circle!';
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