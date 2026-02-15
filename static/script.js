let currentVideoFile = null;
let currentSegments = [];
let currentVideoFilename = '';

const fileInput = document.getElementById('videoInput');
const fileLabel = document.querySelector('.file-label');

fileLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileLabel.classList.add('dragging');
});

fileLabel.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileLabel.classList.remove('dragging');
});

fileLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileLabel.classList.remove('dragging');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('video/')) {
            fileInput.files = files;
            document.querySelector('.file-text').textContent = file.name;
        } else {
            alert('Please drop a video file');
        }
    }
});

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const videoInput = document.getElementById('videoInput');
    const languageSelect = document.getElementById('languageSelect');
    
    if (!videoInput.files[0]) {
        alert('Please select a video file');
        return;
    }
    
    currentVideoFile = videoInput.files[0];
    currentVideoFilename = currentVideoFile.name;
    
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('progressSection').style.display = 'block';
    
    const formData = new FormData();
    formData.append('video', currentVideoFile);
    
    const language = languageSelect.value;
    if (language !== 'auto') {
        formData.append('language', language);
    }
    
    try {
        const response = await fetch('/transcribe', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentVideoFilename = data.video_filename;
            displayResults(data);
        } else {
            alert('Error: ' + data.error);
            resetToUpload();
        }
    } catch (error) {
        alert('Error: ' + error.message);
        resetToUpload();
    }
});

function displayResults(data) {
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    
    const videoPlayer = document.getElementById('videoPlayer');
    const videoURL = URL.createObjectURL(currentVideoFile);
    videoPlayer.src = videoURL;
    
    document.getElementById('transcriptionText').textContent = data.transcription;
    document.getElementById('detectedLanguage').textContent = data.language.toUpperCase();
    
    currentSegments = data.segments;
    displaySegments(data.segments);
    
    videoPlayer.addEventListener('timeupdate', updateSubtitles);
}

function displaySegments(segments) {
    const segmentsList = document.getElementById('segmentsList');
    segmentsList.innerHTML = '';
    
    segments.forEach((segment, index) => {
        const segmentDiv = document.createElement('div');
        segmentDiv.className = 'segment-item';
        
        const timeSpan = document.createElement('div');
        timeSpan.className = 'segment-time';
        timeSpan.textContent = formatTime(segment.start);
        
        const textSpan = document.createElement('div');
        textSpan.className = 'segment-text';
        textSpan.textContent = segment.text;
        
        segmentDiv.appendChild(timeSpan);
        segmentDiv.appendChild(textSpan);
        
        segmentDiv.addEventListener('click', () => {
            const videoPlayer = document.getElementById('videoPlayer');
            videoPlayer.currentTime = segment.start;
            videoPlayer.play();
            
            const videoContainer = document.querySelector('.video-player-container');
            videoContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        
        segmentsList.appendChild(segmentDiv);
    });
}

function updateSubtitles() {
    const videoPlayer = document.getElementById('videoPlayer');
    const currentTime = videoPlayer.currentTime;
    const subtitlesOverlay = document.getElementById('subtitlesOverlay');
    
    const currentSegment = currentSegments.find(
        segment => currentTime >= segment.start && currentTime <= segment.end
    );
    
    if (currentSegment) {
        subtitlesOverlay.textContent = currentSegment.text;
        subtitlesOverlay.style.display = 'block';
    } else {
        subtitlesOverlay.style.display = 'none';
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

document.getElementById('newVideoBtn').addEventListener('click', () => {
    resetToUpload();
});

document.getElementById('downloadSrtBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/download-srt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                video_filename: currentVideoFilename,
                segments: currentSegments
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/download/' + data.srt_filename;
        } else {
            alert('Error generating SRT: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

document.getElementById('downloadBtn').addEventListener('click', async () => {
    const btn = document.getElementById('downloadBtn');
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span>Generating video...</span>';
    
    try {
        const response = await fetch('/generate-subtitled-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                video_filename: currentVideoFilename,
                segments: currentSegments
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/download/' + data.output_filename;
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        } else {
            alert('Error generating video: ' + data.error);
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    } catch (error) {
        alert('Error: ' + error.message);
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
});

function resetToUpload() {
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    
    document.getElementById('uploadForm').reset();
    document.getElementById('videoPlayer').src = '';
    currentVideoFile = null;
    currentSegments = [];
    currentVideoFilename = '';
}

document.getElementById('videoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        document.querySelector('.file-text').textContent = file.name;
    }
});
