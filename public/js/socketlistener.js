import * as state from "./state.js";
import * as UI from "./UI.js";
import * as webRTCHandler from "./webRTCHandler.js";
import * as constants from "./constants.js"


let socketIO = null;
export const socketevent=(socket)=>{
    socketIO=socket;

    socket.on('connect', () => {
        console.log("user is connected to the web socket server")
        state.setSocketId(socket.id);
        UI.updatePersonalCode(socket.id);
    });

    socket.on("pre-offer", (data) => {
        webRTCHandler.handlePreOffer(data);
    });

    socket.on("pre-offer-answer", (data) => {
        webRTCHandler.handlePreOfferAnswer(data);
    });

    socket.on("user-hanged-up", () => {
        webRTCHandler.handleConnectedUserHangedUp();
    });

    socket.on("webRTC-signaling", (data) => {
        switch (data.type) {
            case constants.webRTCSignaling.OFFER:
                webRTCHandler.handleWebRTCOffer(data);
                break;
            case constants.webRTCSignaling.ANSWER:
                webRTCHandler.handleWebRTCAnswer(data);
                break;
            case constants.webRTCSignaling.ICE_CANDIDATE:
                webRTCHandler.handleWebRTCCandidate(data);
                break;
            default:
                return;
        }
    });
};
export const sendPreOffer = (data) => {
    socketIO.emit("pre-offer", data);
}

export const sendPreOfferAnswer = (data) => {
    socketIO.emit("pre-offer-answer", data);
};

export const sendDataUsingWebRTCSignaling = (data) => {
    socketIO.emit("webRTC-signaling", data);
};

export const sendUserHangedUp = (data) => {
    socketIO.emit("user-hanged-up", data);
};


