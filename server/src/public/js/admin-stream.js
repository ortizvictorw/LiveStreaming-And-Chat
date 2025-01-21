import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";

const socket = io('http://localhost:3000', {
    transports: ['websocket'],
});

const peerClient = new Peer();

// Buscar el elemento del DOM (opcional)
const audioRecorder = document.getElementById("audioRecording");
if (!audioRecorder) {
    console.warn('Audio recorder element not found in the DOM. Skipping stream playback.');
}

// Variable para almacenar el streamer ID
let streamerId;
let mediaStream = null;

// Captura solo audio
navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true
}).then(stream => {
    mediaStream = stream;

    if (audioRecorder) {
        addAudioStream(audioRecorder, stream); // Agrega el stream al reproductor de audio
    }

    // Conectar con nuevos espectadores
    socket.on('viewer-connected', viewerId => {
        console.log(`Viewer connected: ${viewerId}`);
        connectToNewViewer(viewerId, stream);
    });
}).catch(error => {
    console.error('Error accessing media devices:', error);
    alert('Could not access your microphone. Please check your device permissions.');
});

// Manejo de eventos de PeerJS
peerClient.on("open", id => {
    streamerId = id;
    console.log(`Streamer ID: ${streamerId}`);
    socket.emit('join-as-streamer', streamerId);
});

peerClient.on("close", () => {
    console.log('Peer connection closed.');
    socket.emit('disconnect-as-streamer', streamerId);
});

socket.on("disconnect", () => {
    console.log('Socket disconnected. Attempting to reconnect...');
    setTimeout(() => {
        socket.connect();
    }, 3000);
});

// Función para agregar audio al reproductor
function addAudioStream(audio, stream) {
    audio.srcObject = stream;
    audio.addEventListener('loadedmetadata', () => {
        audio.play();
        console.log('Audio stream playing.');
    });
}

// Conectar con nuevos espectadores
const activeViewers = new Set();

function connectToNewViewer(viewerId, stream) {
    if (activeViewers.has(viewerId)) {
        console.warn(`Viewer ${viewerId} is already connected.`);
        return;
    }

    activeViewers.add(viewerId);

    const call = peerClient.call(viewerId, stream);
    console.log(`Connecting to viewer: ${viewerId}`);

    call.on('close', () => {
        activeViewers.delete(viewerId);
        console.log(`Viewer ${viewerId} disconnected.`);
    });

    call.on('error', error => {
        console.error('Error during call:', error);
        activeViewers.delete(viewerId);
    });
}

// Opcional: Detener el stream y cerrar conexiones
function stopStream() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    peerClient.destroy();
    console.log('Stream and Peer connection closed.');
}
