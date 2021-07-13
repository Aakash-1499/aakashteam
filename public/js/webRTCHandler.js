import * as socketlistener from "./socketlistener.js";
import * as constants from "./constants.js" 
import * as UI from "./UI.js";
import * as state from "./state.js";



let connectedUserDetails;
let peerConection;
let dataChannel;


const defaultOption ={
  audio :true,
  video:true
}

const configuration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:13902",
    },
  ],
};

export const getLocalPreview=() =>{
  navigator.mediaDevices.getUserMedia(defaultOption).then((stream)=>{
    UI.updateLocalVideo(stream);
    state.setCallState(constants.callState.CALL_AVAILABLE);
    state.setLocalStream(stream);
  })
    .catch((error) => {
      console.log("A camera access error occurred");
      console.log(error);
    });
  
};

const createPeerConnection = () => {
  peerConection = new RTCPeerConnection(configuration);


  //data channel for chat
  
  
  dataChannel = peerConection.createDataChannel('chat');

  peerConection.ondatachannel = (event) => {
    const dataChannel = event.channel;

    dataChannel.onopen = () => {
      console.log("peer connection is ready to receive data channel messages");
    };

    dataChannel.onmessage = (event) => {
      console.log("message came from data channel");
      const message = JSON.parse(event.data);
      console.log(message);
      UI.appendMessage(message);
    };
  };


  peerConection.onicecandidate = (event) => {
    console.log("getting ice candidates from stun server");
    if (event.candidate) {
      // sending our ice candidates to callee
      socketlistener.sendDataUsingWebRTCSignaling({
        connectedUserSocketId: connectedUserDetails.socketId,
        type: constants.webRTCSignaling.ICE_CANDIDATE,
        candidate: event.candidate,
      });
    }
  };
  peerConection.onconnectionstatechange = (event) => {
    if (peerConection.connectionState === "connected") {
      console.log("succesfully connected with other peer");
    }
  };


  // receiving id
  const remoteStream = new MediaStream();
  state.setRemoteStream(remoteStream);
  UI.updateRemoteVideo(remoteStream);

  peerConection.ontrack = (event) => {
    remoteStream.addTrack(event.track);
  };

  // adding our stream to peer connection

  if (
    connectedUserDetails.callType === constants.callType.VIDEO_PERSONAL_CODE
  ) {
    const localStream = state.getState().localStream;

    for (const track of localStream.getTracks()) {
      peerConection.addTrack(track, localStream);
    }
  }
};

export const sendMessageUsingDataChannel = (message) => {
  const stringifiedMessage = JSON.stringify(message);
  dataChannel.send(stringifiedMessage);
};
 


export const sendPreOffer = (callType,calleePersonalCode)=>{
 
  connectedUserDetails = {
    callType,
    socketId: calleePersonalCode,
  };

  if (
    callType === constants.callType.CHAT_PERSONAL_CODE ||
    callType === constants.callType.VIDEO_PERSONAL_CODE
  ) {
    const data = {
      callType,
      calleePersonalCode,
    };
    UI.showCallingDialog(callingDialogRejectCallHandler);
    state.setCallState(constants.callState.CALL_UNAVAILABLE)
    socketlistener.sendPreOffer(data);
  }


};

export const handlePreOffer = (data) => {

  const { callType, callerSocketId } = data;

  if (!checkCallPossibility()) {
    return sendPreOfferAnswer(
      constants.preOfferAnswer.CALL_UNAVAILABLE
    , callerSocketId);
  }

  connectedUserDetails = {
    socketId: callerSocketId,
    callType,
  };

  state.setCallState(constants.callState.CALL_UNAVAILABLE)

  if (
    callType === constants.callType.CHAT_PERSONAL_CODE ||
    callType === constants.callType.VIDEO_PERSONAL_CODE
  ) {
    console.log("showing call dialog");
    UI.showIncomingCallDialog(callType,acceptCallHandler,rejectCallHandler);
  }

};

const acceptCallHandler = () => {
  console.log("call accepted");
  createPeerConnection();
  sendPreOfferAnswer(constants.preOfferAnswer.CALL_ACCEPTED);
  UI.showCallElements(connectedUserDetails.callType);
  
};

const rejectCallHandler = () => {
  console.log("call rejected");
  sendPreOfferAnswer();
  setIncomingCallsAvailable();
  sendPreOfferAnswer(constants.preOfferAnswer.CALL_REJECTED);
};


const callingDialogRejectCallHandler = () => {
  const data = {
    connectedUserSocketId: connectedUserDetails.socketId,
  };
  closePeerConnectionAndResetState();

  socketlistener.sendUserHangedUp(data);
  console.log("rejecting the call")
};
const sendPreOfferAnswer = (preOfferAnswer, callerSocketId = null) => {
  const socketId = callerSocketId
    ? callerSocketId
    : connectedUserDetails.socketId;
  const data = {
    callerSocketId: socketId,
    preOfferAnswer,
  };
  UI.removeAllDialogs();
  socketlistener.sendPreOfferAnswer(data);
};


export const handlePreOfferAnswer = (data) => {
  const { preOfferAnswer } = data;

  console.log('pre offer ans came');
  console.log(data);

  UI.removeAllDialogs();

  if (preOfferAnswer === constants.preOfferAnswer.CALLEE_NOT_FOUND) {
    UI.showInfoDialog(preOfferAnswer);
    setIncomingCallsAvailable();
    // show dialog that callee has not been found
  }

  if (preOfferAnswer === constants.preOfferAnswer.CALL_UNAVAILABLE) {
    setIncomingCallsAvailable();
    UI.showInfoDialog(preOfferAnswer);
    
    // show dialog that callee is not able to connect
  }

  if (preOfferAnswer === constants.preOfferAnswer.CALL_REJECTED) {
    setIncomingCallsAvailable();
    UI.showInfoDialog(preOfferAnswer);
    // show dialog that call is rejected by the callee
  }

  if (preOfferAnswer === constants.preOfferAnswer.CALL_ACCEPTED) {
    UI.showCallElements(connectedUserDetails.callType)
    createPeerConnection();
    // send webRTC offer

    sendWebRTCOffer();
  }
};

const sendWebRTCOffer = async() => {
  const offer = await peerConection.createOffer();
  await peerConection.setLocalDescription(offer);
  socketlistener.sendDataUsingWebRTCSignaling({
    connectedUserSocketId: connectedUserDetails.socketId,
    type: constants.webRTCSignaling.OFFER,
    offer: offer,
  });
};

export const handleWebRTCOffer =  async(data) => {
  console.log("webRTC offer came");
  console.log(data)
  
  await peerConection.setRemoteDescription(data.offer);
  const answer = await peerConection.createAnswer();
  await peerConection.setLocalDescription(answer);
  socketlistener.sendDataUsingWebRTCSignaling({
    connectedUserSocketId: connectedUserDetails.socketId,
    type: constants.webRTCSignaling.ANSWER,
    answer: answer,
  });
};



export const handleWebRTCAnswer = async (data) => {
  console.log("handling webRTC Answer");
  await peerConection.setRemoteDescription(data.answer);
};

export const handleWebRTCCandidate = async (data) => {
  console.log("handling incoming webRTC candidates");
  try {
    await peerConection.addIceCandidate(data.candidate);
  } catch (err) {
    console.error(
      "error occured when trying to add received ice candidate",
      err
    );
  }
};

let screenSharingStream;

export const ScreenSharing = async (
  screenSharingActive
) => {
  if (screenSharingActive) {
    const localStream = state.getState().localStream;
    const senders = peerConection.getSenders();

    const sender = senders.find((sender) => {
      return sender.track.kind === localStream.getVideoTracks()[0].kind;
    });

    if (sender) {
      sender.replaceTrack(localStream.getVideoTracks()[0]);
    }

    // stop screen sharing stream

    state
      .getState()
      .screenSharingStream.getTracks()
      .forEach((track) => track.stop());

    state.setScreenSharingActive(!screenSharingActive);

    UI.updateLocalVideo(localStream);
  } else {
    console.log("switching");
    try {
      screenSharingStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      state.setScreenSharingStream(screenSharingStream);

      // replace track which sender is sending
      const senders = peerConection.getSenders();

      const sender = senders.find((sender) => {
        return (
          sender.track.kind === screenSharingStream.getVideoTracks()[0].kind
        );
      });

      if (sender) {
        sender.replaceTrack(screenSharingStream.getVideoTracks()[0]);
      }

      state.setScreenSharingActive(!screenSharingActive);

      UI.updateLocalVideo(screenSharingStream);
    } catch (err) {
      console.error(
        "error while screen sharing",
        err
      );
    }
  }
};

// hanging up

export const handleHangUp = () => {
  console.log("finishing the call")
  const data = {
    connectedUserSocketId: connectedUserDetails.socketId,
  };

  socketlistener.sendUserHangedUp(data);
  closePeerConnectionAndResetState();
};

export const handleConnectedUserHangedUp = () => {
  console.log("user hang up")
  closePeerConnectionAndResetState();
};
const closePeerConnectionAndResetState = () => {
  if (peerConection) {
    peerConection.close();
    peerConection = null;
  }

  // active mic and camera
  if (
    connectedUserDetails.callType === constants.callType.VIDEO_PERSONAL_CODE ||
    connectedUserDetails.callType === constants.callType.VIDEO_STRANGER
  ) {
    state.getState().localStream.getVideoTracks()[0].enabled = true;
    state.getState().localStream.getAudioTracks()[0].enabled = true;
  }

  UI.updateUIAfterHangUp(connectedUserDetails.callType);
  setIncomingCallsAvailable();
  connectedUserDetails = null;
};

const checkCallPossibility = (callType) => {
  const callState = state.getState().callState;

  if (callState === constants.callState.CALL_AVAILABLE) {
    return true;
  }

  if (
    (callType === constants.callType.VIDEO_PERSONAL_CODE) && callState === constants.callState.CALL_AVAILABLE_ONLY_CHAT) {
    return false;
  }

  return false;


};

const setIncomingCallsAvailable = () => {
  const localStream = state.getState().localStream;
  if (localStream) {
    state.setCallState(constants.callState.CALL_AVAILABLE);
  } else {
    state.setCallState(constants.callState.CALL_AVAILABLE_ONLY_CHAT);
  }
};

