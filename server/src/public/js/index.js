import { io } from 'https://cdn.socket.io/4.3.2/socket.io.esm.min.js';

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
});

const myPeer = new Peer();

const audioPlayer = document.getElementById('audioplayer');
const soundToggle = document.getElementById('sound');
const messageInput = document.getElementById('chat-input');
const viewerCountDisplay = document.getElementById('viewerCount');
const messageList = document.getElementById('message-list');
const messages = document.getElementById('messages');
const chatSubmitButton = document.querySelector('.chat-input-container button');

/**
 * Socket Event Handlers
 */

socket.on('connect', () => {
  console.log('Connected as viewer');
});

myPeer.on('open', (viewerId) => {
  socket.emit('join-as-viewer', viewerId);
});

myPeer.on('call', (call) => {
  call.answer();
  call.on('stream', (stream) => {
    if (audioPlayer) {
      audioPlayer.srcObject = stream;
      audioPlayer.addEventListener('loadedmetadata', () => {
        audioPlayer.play();
      });
    } else {
      console.error('Audio player element not found');
    }
  });

  call.on('error', (err) => {
    console.error('Error during call:', err);
  });
});

myPeer.on('connection', (conn) => {
  conn.on('close', () => {
    setTimeout(reload, 1000);
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected viewer');
});

socket.on('streamer-disconnected', (streamerId) => {
  console.log(`${streamerId} Streamer has ended stream`);
  setTimeout(reload, 2000);
});

socket.on('streamer-joined', (streamerId) => {
  console.log('A streamer just joined!', streamerId);
  setTimeout(reload, 2000);
});

socket.on('new-message', (message) => {
  appendToChat(message);
  messages.scrollTop = messages.scrollHeight;
});

socket.on('viewer-count', (viewerCount) => {
  viewerCountDisplay.innerHTML = viewerCount;
});

socket.on('backfill-messages', (existingMessageList) => {
  existingMessageList.forEach((message) => {
    appendToChat(message);
  });

  messages.scrollTop = messages.scrollHeight;
});

/**
 * Input Event Handlers
 */

messageInput.addEventListener('keyup', function (event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    emitNewMessageAndResetInput();
  }
});

chatSubmitButton.addEventListener('click', function (event) {
  event.preventDefault();
  emitNewMessageAndResetInput();
});

soundToggle.addEventListener('click', () => {
  audioPlayer.muted = !audioPlayer.muted;
  soundToggle.innerText = audioPlayer.muted ? 'Unmute' : 'Mute';
});

/**
 * Helper Functions
 */
const reload = window.location.reload.bind(window.location);

function emitNewMessageAndResetInput() {
  const messageText = messageInput.value.trim();
  if (messageText) {
    socket.emit('add-message-to-live-chat', messageText);
    messageInput.value = '';
  }
}

function appendToChat(message) {
  const li = document.createElement('li');
  li.className = 'message';

  const messageText = document.createElement('div');
  messageText.className = 'message-text';
  messageText.appendChild(document.createTextNode(message.text));

  const date = new Date(message.date);

  const messageTime = document.createElement('div');
  messageTime.className = 'message-time';
  messageTime.appendChild(
    document.createTextNode(
      `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
    ),
  );

  li.appendChild(messageText);
  li.appendChild(messageTime);

  messageList.appendChild(li);
}
