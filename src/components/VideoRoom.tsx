import React, { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { User, Room } from "../types"; // Pastikan Room diimport

interface VideoRoomProps {
  activeRoom: Room; // UPDATE: Terima object Room lengkap, bukan cuma ID string
  currentUser: User;
  socket: Socket;
  onLeave: () => void;
}

const RTC_CONFIG = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:global.stun.twilio.com:3478",
      ],
    },
  ],
};

const VideoRoom: React.FC<VideoRoomProps> = ({
  activeRoom,
  currentUser,
  socket,
  onLeave,
}) => {
  const roomId = activeRoom.id;
  const isCreator = activeRoom.creator_id === currentUser.id; // Cek apakah kita Admin Room

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{
    [key: string]: MediaStream;
  }>({});

  // Status Control Media
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Refs
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // === 1. SETUP AWAL ===
  useEffect(() => {
    const startLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Gabung ke Room
        socket.emit("join_room", roomId);
      } catch (err) {
        console.error("Gagal akses kamera:", err);
        alert("Gagal mengakses kamera/microphone.");
        onLeave();
      }
    };

    startLocalStream();

    return () => {
      // Cleanup lokal saja, jangan emit leave dulu (di-handle tombol)
      localStream?.getTracks().forEach((track) => track.stop());
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
    // eslint-disable-next-line
  }, [roomId]);

  // === 2. SIGNALING HANDLERS (SOCKET.IO) ===
  useEffect(() => {
    // A. User Baru Join -> Kita (Orang Lama) Buat Offer ke Dia
    // INI YANG MEMPERBAIKI MASALAH VIDEO TEMAN TIDAK MUNCUL
    socket.on("user_joined_room", async (newSocketId) => {
      console.log(
        "👋 User baru terdeteksi:",
        newSocketId,
        "- Mengirim Offer..."
      );
      await createOffer(newSocketId);
    });

    // B. Terima Offer
    socket.on("webrtc_offer", async (data) => {
      if (data.senderId === socket.id) return;
      console.log("📩 Menerima Offer dari:", data.senderId);
      await handleReceiveOffer(data.senderId, data.sdp);
    });

    // C. Terima Answer
    socket.on("webrtc_answer", async (data) => {
      const pc = peerConnections.current[data.senderId];
      if (pc) {
        console.log("✅ Koneksi terjalin dengan:", data.senderId);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    });

    // D. Terima ICE Candidate
    socket.on("webrtc_ice_candidate", async (data) => {
      const pc = peerConnections.current[data.senderId];
      if (pc && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // E. User Keluar
    socket.on("user_left_room", (socketId) => {
      closePeerConnection(socketId);
    });

    // F. ROOM DIBUBARKAN (Force Close oleh Creator)
    socket.on("room_destroyed", () => {
      alert("Host telah mengakhiri panggilan.");
      onLeave(); // Kembali ke menu utama
    });

    return () => {
      socket.off("user_joined_room");
      socket.off("webrtc_offer");
      socket.off("webrtc_answer");
      socket.off("webrtc_ice_candidate");
      socket.off("user_left_room");
      socket.off("room_destroyed");
    };
  }, [socket, localStream]);

  // === 3. WEBRTC CORE FUNCTIONS ===

  const closePeerConnection = (socketId: string) => {
    if (peerConnections.current[socketId]) {
      peerConnections.current[socketId].close();
      delete peerConnections.current[socketId];
    }
    setRemoteStreams((prev) => {
      const newStreams = { ...prev };
      delete newStreams[socketId];
      return newStreams;
    });
  };

  const createPeerConnection = (targetSocketId: string) => {
    if (peerConnections.current[targetSocketId])
      return peerConnections.current[targetSocketId];

    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc_ice_candidate", {
          candidate: event.candidate,
          roomId,
          targetSocketId,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("📹 Menerima Stream Video dari:", targetSocketId);
      setRemoteStreams((prev) => ({
        ...prev,
        [targetSocketId]: event.streams[0],
      }));
    };

    localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    peerConnections.current[targetSocketId] = pc;
    return pc;
  };

  // Initiator: Membuat Offer
  const createOffer = async (targetSocketId: string) => {
    const pc = createPeerConnection(targetSocketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc_offer", {
      sdp: offer,
      roomId,
      targetSocketId,
    });
  };

  // Receiver: Menerima Offer & Balas Answer
  const handleReceiveOffer = async (
    senderId: string,
    sdp: RTCSessionDescriptionInit
  ) => {
    const pc = createPeerConnection(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("webrtc_answer", {
      sdp: answer,
      targetSocketId: senderId,
    });
  };

  // === 4. ACTIONS & MEDIA CONTROLS ===

  const handleEndCall = () => {
    if (isCreator) {
      // Jika Creator: Bubarkan Room
      const confirmEnd = window.confirm(
        "Anda adalah Host. Mengakhiri panggilan akan mengeluarkan semua peserta. Lanjutkan?"
      );
      if (confirmEnd) {
        socket.emit("close_room", roomId);
        // onLeave akan dipanggil via event 'room_destroyed'
      }
    } else {
      // Jika Peserta: Keluar Sendiri
      socket.emit("leave_room", roomId);
      onLeave();
    }
  };

  const toggleMic = () => {
    if (localStream) {
      localStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !isMicOn));
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCam = () => {
    if (localStream) {
      localStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !isCamOn));
      setIsCamOn(!isCamOn);
    }
  };

  const startShareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = screenStream.getVideoTracks()[0];

      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });

      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      setIsScreenSharing(true);
      screenTrack.onended = () => stopShareScreen();
    } catch (err) {
      console.error("Gagal share screen:", err);
    }
  };

  const stopShareScreen = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      const cameraTrack = cameraStream.getVideoTracks()[0];

      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(cameraTrack);
      });

      if (localVideoRef.current) localVideoRef.current.srcObject = cameraStream;
      setIsScreenSharing(false);
    } catch (e) {
      console.error("Gagal kembali ke kamera", e);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 p-6 h-full overflow-hidden animate-in fade-in">
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]"></span>
          <h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <i className="fas fa-video text-indigo-500"></i>
            Room: {activeRoom.name}
          </h2>
        </div>

        {/* HOST BADGE */}
        {isCreator && (
          <div className="bg-amber-500/10 px-3 py-1 rounded border border-amber-500/50 text-amber-500 text-xs font-bold">
            HOST MODE
          </div>
        )}
      </div>

      {/* --- VIDEO GRID --- */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar">
        {/* 1. Local Video (Saya) */}
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-2xl aspect-video group">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1] transition-transform"
            style={isScreenSharing ? { transform: "none" } : {}}
          />
          <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-xs font-bold text-white backdrop-blur-md flex items-center gap-2">
            {currentUser.username} (You)
            {!isMicOn && (
              <i className="fas fa-microphone-slash text-rose-500"></i>
            )}
          </div>
        </div>

        {/* 2. Remote Videos (Orang Lain) */}
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <div
            key={peerId}
            className="relative bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-lg aspect-video"
          >
            <VideoPlayer stream={stream} />
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-xs font-bold text-slate-200 backdrop-blur-md">
              Peer {peerId.slice(0, 5)}...
            </div>
          </div>
        ))}

        {/* Placeholder jika sendirian */}
        {Object.keys(remoteStreams).length === 0 && (
          <div className="flex items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50 aspect-video text-slate-600">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-3xl mb-2"></i>
              <p className="text-sm">Waiting for others...</p>
              <p className="text-[10px] mt-2 opacity-50">Room ID: {roomId}</p>
            </div>
          </div>
        )}
      </div>

      {/* --- CONTROLS BAR --- */}
      <div className="h-24 mt-6 flex items-center justify-center">
        <div className="bg-slate-900/80 px-8 py-4 rounded-3xl border border-slate-700 flex items-center gap-6 backdrop-blur-xl shadow-2xl">
          {/* Mic Toggle */}
          <button
            onClick={toggleMic}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-lg ${
              isMicOn
                ? "bg-slate-700 text-white hover:bg-slate-600"
                : "bg-rose-500 text-white shadow-rose-500/30 ring-2 ring-rose-500/50"
            }`}
          >
            <i
              className={`fas ${
                isMicOn ? "fa-microphone" : "fa-microphone-slash"
              }`}
            ></i>
          </button>

          {/* Cam Toggle */}
          <button
            onClick={toggleCam}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-lg ${
              isCamOn
                ? "bg-slate-700 text-white hover:bg-slate-600"
                : "bg-rose-500 text-white shadow-rose-500/30 ring-2 ring-rose-500/50"
            }`}
          >
            <i className={`fas ${isCamOn ? "fa-video" : "fa-video-slash"}`}></i>
          </button>

          {/* Screen Share */}
          <button
            onClick={isScreenSharing ? stopShareScreen : startShareScreen}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-lg ${
              isScreenSharing
                ? "bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-500/50"
                : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            <i className="fas fa-desktop"></i>
          </button>

          <div className="w-px h-10 bg-slate-600 mx-2 opacity-50"></div>

          {/* Leave / End Button */}
          <button
            onClick={handleEndCall}
            className={`px-8 py-4 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2 ${
              isCreator
                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                : "bg-slate-600 hover:bg-slate-500"
            }`}
          >
            <i className="fas fa-phone-slash"></i>
            <span className="hidden md:inline">
              {isCreator ? "END ROOM" : "LEAVE"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENT: VIDEO PLAYER ---
const VideoPlayer: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-cover"
    />
  );
};

export default VideoRoom;
