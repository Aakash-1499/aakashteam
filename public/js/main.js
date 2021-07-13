// client server

import * as state from "./state.js";

import * as socketlistener from "./socketlistener.js";

import * as webRTCHandler from "./webRTCHandler.js";
import * as constants from "./constants.js";
import * as UI from "./UI.js";
import * as mediarecorder from "./mediarecorder.js"


//starting of socketio connection
const socket=io('/');
socketlistener.socketevent(socket);

// local preview

webRTCHandler.getLocalPreview() 


//copy button

const CopyButton = document.getElementById(
    "copy_button"
);
CopyButton.addEventListener("click", () => {
    console.log("copy button clicked");
    const personalCode = state.getState().socketId;
    navigator.clipboard && navigator.clipboard.writeText(personalCode);
    
    
});

// connection buttons
const personalCodeChatButton = document.getElementById(
    "chat"
);

const personalCodeVideoButton = document.getElementById(
    "video"
);
personalCodeChatButton.addEventListener("click", () => {
    console.log("chat button clicked");

    const calleePersonalCode = document.getElementById(
        "personal_code_input"
    ).value;
    const callType = constants.callType.CHAT_PERSONAL_CODE; 
    webRTCHandler.sendPreOffer(callType,calleePersonalCode)
});

    personalCodeVideoButton.addEventListener("click", () => {
        console.log("video button clicked");
        const calleePersonalCode = document.getElementById(
            "personal_code_input"
        ).value;
        const callType = constants.callType.VIDEO_PERSONAL_CODE;
        webRTCHandler.sendPreOffer(callType, calleePersonalCode)
    });

    //event listeners for video call buttons



const micButton = document.getElementById("mic_button");
micButton.addEventListener("click", () => {
    const localStream = state.getState().localStream;
    const micEnabled = localStream.getAudioTracks()[0].enabled;
    localStream.getAudioTracks()[0].enabled = !micEnabled;
    UI.updateMicButton(micEnabled);
});

const cameraButton = document.getElementById("camera_button");
cameraButton.addEventListener("click", () => {
    const localStream = state.getState().localStream;
    const cameraEnabled = localStream.getVideoTracks()[0].enabled;
    localStream.getVideoTracks()[0].enabled = !cameraEnabled;
    UI.updateCameraButton(cameraEnabled);
});

const switchForScreenSharingButton = document.getElementById(
    "screen_sharing_button"
);
switchForScreenSharingButton.addEventListener("click", () => {
    const screenSharingActive = state.getState().screenSharingActive;
    webRTCHandler.ScreenSharing(screenSharingActive);
});

 // messenger

const newMessageInput = document.getElementById("new_message_input");
newMessageInput.addEventListener("keydown", (event) => {
    console.log("change occured");
    const key = event.key;

    if (key === "Enter") {
        webRTCHandler.sendMessageUsingDataChannel(event.target.value);
        UI.appendMessage(event.target.value, true);
        newMessageInput.value = "";
    }
});

const sendMessageButton = document.getElementById("send_message_button");
sendMessageButton.addEventListener("click", () => {
    const message = newMessageInput.value;
    webRTCHandler.sendMessageUsingDataChannel(message);
    UI.appendMessage(message, true);
    newMessageInput.value = "";
});

// mediarecording

const startRecordingButton = document.getElementById("start_recording_button");
startRecordingButton.addEventListener("click", () => {
    mediarecorder.startRecording();
    UI.showRecordingPanel();
});

const stopRecordingButton = document.getElementById("stop_recording_button");
stopRecordingButton.addEventListener("click", () => {
    mediarecorder.stopRecording();
    UI.resetRecordingButtons();
});

const pauseRecordingButton = document.getElementById("pause_recording_button");
pauseRecordingButton.addEventListener("click", () => {
    mediarecorder.pauseRecording();
    UI.switchRecordingButtons(true);
});

const resumeRecordingButton = document.getElementById(
    "resume_recording_button"
);
resumeRecordingButton.addEventListener("click", () => {
    mediarecorder.resumeRecording();
    UI.switchRecordingButtons();
});

// hang up possibility

const hangUpButton = document.getElementById("hang_up_button");
hangUpButton.addEventListener("click", () => {
    webRTCHandler.handleHangUp();
});

const hangUpChatButton = document.getElementById("finish_chat_call_button");
hangUpChatButton.addEventListener("click", () => {
    webRTCHandler.handleHangUp();
});
