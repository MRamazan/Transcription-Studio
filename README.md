# Video Transcription Studio

AI-powered video transcription application using Whisper large-v3-turbo model.

## Features

- Upload video files for transcription
- Automatic speech recognition with language auto-detection
- Manual language selection (14 languages supported)
- Live subtitle display during video playback
- Timeline-based segment navigation
- Download Subtitle or video with embedded subtitles

## Requirements

- Python 3.8+
- FFmpeg (required for video and audio processing)

## Installation

### Step 1: Install FFmpeg

**Windows:**
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to C:\ffmpeg
3. Add C:\ffmpeg\bin to your system PATH

**Mac:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

### Step 2: Install Python Dependencies

```bash
pip install -r requirements.txt
```

Note: First installation will take some time as it downloads PyTorch and Whisper model files.

## Usage

1. Start the application:
```bash
python app.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

3. Upload a video file and select the language (or use auto-detect)

4. Wait for transcription to complete

5. View results with synchronized subtitles

6. Download the video with embedded subtitles

## Supported Languages

English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, Turkish

## Technology Stack

- Backend: Flask, Whisper, FFmpeg
- Frontend: HTML5, CSS3, JavaScript
- AI Model: OpenAI Whisper large-v3-turbo

## Notes

- First run will download the Whisper model (~1.5GB)
- Processing time depends on video length and hardware
- GPU acceleration is used automatically if CUDA is available
- FFmpeg must be installed and accessible in system PATH
