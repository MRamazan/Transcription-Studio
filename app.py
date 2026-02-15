from flask import Flask, render_template, request, jsonify, send_file, url_for
import whisper
import os
import tempfile
import subprocess
import json

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()

model = None

def load_model():
    global model
    if model is None:
        print("Loading Whisper model...")
        model = whisper.load_model("large-v3-turbo")
        print("Model loaded successfully!")
    return model

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    video_file = request.files['video']
    language = request.form.get('language', None)
    
    if video_file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    temp_video_path = os.path.join(app.config['UPLOAD_FOLDER'], 'temp_video_' + video_file.filename)
    video_file.save(temp_video_path)
    
    try:
        audio_path = os.path.join(app.config['UPLOAD_FOLDER'], 'temp_audio.mp3')
        
        subprocess.run([
            'ffmpeg', '-i', temp_video_path, '-vn', '-acodec', 'mp3',
            '-ar', '16000', '-ac', '1', '-y', audio_path
        ], check=True, capture_output=True)
        
        whisper_model = load_model()
        
        transcribe_options = {"task": "transcribe", "verbose": False}
        if language and language != "auto":
            transcribe_options["language"] = language
        
        print("Starting transcription...")
        result = whisper_model.transcribe(audio_path, **transcribe_options)
        print("Transcription complete!")
        
        if os.path.exists(audio_path):
            os.remove(audio_path)
        
        return jsonify({
            'success': True,
            'transcription': result['text'],
            'segments': result['segments'],
            'language': result['language'],
            'video_filename': video_file.filename
        })
    
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/generate-subtitled-video', methods=['POST'])
def generate_subtitled_video():
    data = request.json
    video_filename = data.get('video_filename')
    segments = data.get('segments')
    
    temp_video_path = os.path.join(app.config['UPLOAD_FOLDER'], 'temp_video_' + video_filename)
    
    if not os.path.exists(temp_video_path):
        return jsonify({'error': 'Video file not found'}), 404
    
    try:
        srt_filename = os.path.splitext(video_filename)[0] + '.srt'
        srt_path = os.path.join(app.config['UPLOAD_FOLDER'], srt_filename)
        
        with open(srt_path, 'w', encoding='utf-8') as f:
            for i, segment in enumerate(segments, 1):
                start = format_srt_time(segment['start'])
                end = format_srt_time(segment['end'])
                text = segment['text'].strip()
                
                f.write(f"{i}\n")
                f.write(f"{start} --> {end}\n")
                f.write(f"{text}\n\n")
        
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], 'subtitled_' + video_filename)
        
        srt_for_filter = srt_path.replace('\\', '/').replace(':', '\\\\:')
        
        cmd = [
            'ffmpeg', '-i', temp_video_path,
            '-vf', f"subtitles={srt_for_filter}",
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'copy', '-y', output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"FFmpeg stderr: {result.stderr}")
            return jsonify({'error': 'Failed to burn subtitles into video'}), 500
        
        return jsonify({
            'success': True,
            'output_filename': 'subtitled_' + video_filename,
            'srt_filename': srt_filename
        })
    
    except Exception as e:
        print(f"Error generating subtitled video: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/download-srt', methods=['POST'])
def download_srt():
    data = request.json
    video_filename = data.get('video_filename')
    segments = data.get('segments')
    
    try:
        srt_filename = os.path.splitext(video_filename)[0] + '.srt'
        srt_path = os.path.join(app.config['UPLOAD_FOLDER'], srt_filename)
        
        with open(srt_path, 'w', encoding='utf-8') as f:
            for i, segment in enumerate(segments, 1):
                start = format_srt_time(segment['start'])
                end = format_srt_time(segment['end'])
                text = segment['text'].strip()
                
                f.write(f"{i}\n")
                f.write(f"{start} --> {end}\n")
                f.write(f"{text}\n\n")
        
        return jsonify({
            'success': True,
            'srt_filename': srt_filename
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def format_srt_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

@app.route('/download/<filename>')
def download_video(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    print("Starting Video Transcription Studio...")
    print("Server will be available at http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
