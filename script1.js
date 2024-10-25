// Replace this with your signaling server (e.g., using Socket.IO)
const socket = io.connect("https://your-signaling-server.com");

let localStream;
let remoteStream;
let peerConnection;
const configuration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "turn:your-turn-server.com", username: "user", credential: "password" }
    ]
};

const startCallButton = document.getElementById("startCall");
const endCallButton = document.getElementById("endCall");
const localAudio = document.getElementById("localAudio");
const remoteAudio = document.getElementById("remoteAudio");

startCallButton.onclick = async () => {
    startCallButton.disabled = true;
    endCallButton.disabled = false;

    try {
        // Get local audio stream
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localAudio.srcObject = localStream;

        // Create peer connection
        peerConnection = new RTCPeerConnection(configuration);

        // Add local stream to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            remoteAudio.srcObject = remoteStream;

            // Start translation on remote audio stream
            startTranslation(remoteAudio, 'en', 'es'); // Translate from English to Spanish (adjust as needed)
        };

        // ICE candidate handling
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", event.candidate);
            }
        };

        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("offer", offer);
    } catch (error) {
        console.error("Error starting the call", error);
        startCallButton.disabled = false;
        endCallButton.disabled = true;
    }
};

socket.on("offer", async (offer) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("answer", answer);
    } catch (error) {
        console.error("Error handling offer", error);
    }
});

socket.on("answer", async (answer) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
        console.error("Error handling answer", error);
    }
});

socket.on("ice-candidate", async (candidate) => {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (error) {
        console.error("Error adding received ICE candidate", error);
    }
});

endCallButton.onclick = () => {
    if (peerConnection) {
        peerConnection.close();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    startCallButton.disabled = false;
    endCallButton.disabled = true;
    localAudio.srcObject = null;
    remoteAudio.srcObject = null;
};

// Function to start translation
function startTranslation(audioElement, sourceLang, targetLang) {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = sourceLang;
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        console.log(Recognized text: ${transcript});

        // Translate recognized text
        const translatedText = await translateText(transcript, targetLang);
        console.log(Translated text : ${translatedText});

        // Speak the translated text
        speakText(translatedText, targetLang);
    };

    recognition.start();
    audioElement.onplay = () => recognition.start();
    audioElement.onpause = () => recognition.stop();
}

// Function to translate text
// Function to translate text
async function translateText(text, targetLang) {
    const apiKey = "YOUR_GOOGLE_TRANSLATE_API_KEY";
    const response = await fetch(https://translation.googleapis.com/language/translate/v2?key=${apiKey}), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            q: text,
            target: targetLang
        }
    });
    const result = await response.json();
    return result.data.translations[0].translatedText;
}

// Function to speak the translated text
function speakText(text, lang) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
}
