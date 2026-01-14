import React, { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { User, Room } from "../types";

interface VideoRoomProps {
  activeRoom: Room;
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
  const isCreator = activeRoom.creator_id === currentUser.id;

  // STATE
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{
    [key: string]: MediaStream;
  }>({});
  const [peerNames, setPeerNames] = useState<{ [key: string]: string }>({});

  // UI STATE
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // REFS
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // PENTING: Hardware Reference

  // === FUNGSI MATIKAN TOTAL ===
  const stopAllTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop(); // Perintah mematikan lampu hardware
        track.enabled = false;
      });
      streamRef.current = null;
      setLocalStream(null);
    }
  };

  // === 1. SETUP AWAL ===
  useEffect(() => {
    const startLocalStream = async () => {
      try {
        stopAllTracks(); // Pastikan bersih dulu

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: { echoCancellation: true, noiseSuppression: true }, // Optimasi Audio
        });

        setLocalStream(stream);
        streamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true; // Mute video sendiri agar tidak feedback (hanya lokal)
        }

        socket.emit("join_room", roomId);
      } catch (err) {
        console.error("Gagal akses kamera:", err);
        alert("Gagal mengakses media. Pastikan izin diberikan.");
        onLeave();
      }
    };

    startLocalStream();

    return () => {
      stopAllTracks(); // Cleanup saat unmount
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      // Jangan emit leave disini jika navigasi via tombol, tapi untuk refresh page perlu
      // socket.emit("leave_room", roomId); // Opsional tergantung behavior yang diinginkan
    };
    // eslint-disable-next-line
  }, [roomId]);

  // === 2. SIGNALING (SOCKET) ===
  useEffect(() => {
    // A. ADA USER BARU MASUK
    socket.on("user_joined_room", async (data: any) => {
      const { socketId, username } = data;
      console.log(`👋 User masuk: ${username} (${socketId})`);

      // 1. Cek Duplikat Manual
      // Kita akses state peerNames saat ini untuk mencari ID lama
      let oldSocketId: string | undefined;

      setPeerNames((prev) => {
        oldSocketId = Object.keys(prev).find((key) => prev[key] === username);
        // Kita update nama dulu
        return { ...prev, [socketId]: username };
      });

      // 2. Jika ketemu "Hantu" (User lama dengan nama sama), bunuh koneksinya
      if (oldSocketId) {
        console.log(`👻 Menghapus ghost user: ${username} (${oldSocketId})`);
        // Hapus stream dan koneksi ID lama
        if (peerConnections.current[oldSocketId]) {
          peerConnections.current[oldSocketId].close();
          delete peerConnections.current[oldSocketId];
        }
        setRemoteStreams((prev) => {
          const newStreams = { ...prev };
          delete newStreams[oldSocketId!];
          return newStreams;
        });
        // Kita juga hapus nama lama dari state (walaupun tadi sudah ditimpa, ini safety cleanup)
        setPeerNames((prev) => {
          const newNames = { ...prev };
          delete newNames[oldSocketId!];
          return newNames;
        });
      }

      // 3. Buat koneksi ke User yang BARU
      await createOffer(socketId);
    });

    // B. TERIMA OFFER
    socket.on("webrtc_offer", async (data) => {
      if (data.senderId === socket.id) return;
      if (data.senderUsername) {
        // Anti-Duplikat juga disini (Safety Ganda)
        setPeerNames((prev) => {
          // Hapus entry lama jika ada username yang sama dengan ID berbeda
          const oldId = Object.keys(prev).find(
            (key) => prev[key] === data.senderUsername && key !== data.senderId
          );
          if (oldId) {
            // Trigger cleanup visual nanti, tapi update nama dulu
            const newMap = { ...prev };
            delete newMap[oldId];
            newMap[data.senderId] = data.senderUsername;
            return newMap;
          }
          return { ...prev, [data.senderId]: data.senderUsername };
        });
      }
      await handleReceiveOffer(data.senderId, data.sdp);
    });

    // C. TERIMA ANSWER
    socket.on("webrtc_answer", async (data) => {
      if (data.senderUsername) {
        setPeerNames((prev) => ({
          ...prev,
          [data.senderId]: data.senderUsername,
        }));
      }
      const pc = peerConnections.current[data.senderId];
      if (pc)
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    });

    socket.on("webrtc_ice_candidate", async (data) => {
      const pc = peerConnections.current[data.senderId];
      if (pc && data.candidate)
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    // D. USER KELUAR
    socket.on("user_left_room", (socketId) => {
      closePeerConnection(socketId);
    });

    socket.on("room_destroyed", () => {
      stopAllTracks();
      alert("Host telah mengakhiri room.");
      onLeave();
    });

    return () => {
      socket.off("user_joined_room");
      socket.off("webrtc_offer");
      socket.off("webrtc_answer");
      socket.off("webrtc_ice_candidate");
      socket.off("user_left_room");
      socket.off("room_destroyed");
    };
  }, [socket, localStream, roomId, currentUser]);

  // === 3. WEBRTC CORE ===
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
    // 1. Return existing connection
    if (peerConnections.current[targetSocketId])
      return peerConnections.current[targetSocketId];

    // 2. SAFETY CHECK: Jangan buat koneksi jika stream Hardware belum siap!
    // Ini yang mencegah Host mengirim offer "bisu"
    if (!streamRef.current) {
      console.warn("⚠️ Stream belum siap, menunda koneksi ke", targetSocketId);
      throw new Error("Local stream not ready yet");
    }

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
      setRemoteStreams((prev) => ({
        ...prev,
        [targetSocketId]: event.streams[0],
      }));
    };

    // 3. ADD TRACKS (Audio & Video)
    streamRef.current.getTracks().forEach((track) => {
      // Log untuk memastikan track audio masuk
      if (track.kind === "audio")
        console.log("🎤 Menambahkan Audio Track ke koneksi");
      pc.addTrack(track, streamRef.current!);
    });

    peerConnections.current[targetSocketId] = pc;
    return pc;
  };

  const createOffer = async (targetSocketId: string) => {
    const pc = createPeerConnection(targetSocketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("webrtc_offer", {
      sdp: offer,
      roomId,
      targetSocketId,
      senderUsername: currentUser.username,
    });
  };

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
      senderUsername: currentUser.username,
    });
  };

  // === 4. CONTROLS (FIXED LOGIC) ===

  const handleManualLeave = () => {
    stopAllTracks();
    if (isCreator) {
      if (window.confirm("End room for everyone?")) {
        socket.emit("close_room", roomId);
      }
    } else {
      socket.emit("leave_room", roomId);
      onLeave();
    }
  };

  // FIX: Akses track langsung dari streamRef (Hardware)
  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled; // Toggle Native
        setIsMicOn(audioTrack.enabled); // Sync UI
      }
    }
  };

  // FIX: Akses track langsung dari streamRef
  const toggleCam = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled; // Toggle Native
        setIsCamOn(videoTrack.enabled); // Sync UI
      }
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
      console.error(err);
    }
  };

  const stopShareScreen = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      const cameraTrack = cameraStream.getVideoTracks()[0];

      // Restore Audio track lama agar tidak putus
      if (streamRef.current) {
        const audioTrack = streamRef.current.getAudioTracks()[0];
        const newStream = new MediaStream([cameraTrack, audioTrack]);
        streamRef.current = newStream;
        setLocalStream(newStream);
      }

      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(cameraTrack);
      });

      if (localVideoRef.current)
        localVideoRef.current.srcObject = streamRef.current;
      setIsScreenSharing(false);
      setIsCamOn(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 p-6 h-full overflow-hidden animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]"></span>
          <h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <i className="fas fa-video text-indigo-500"></i>
            Room: {activeRoom.name}
          </h2>
        </div>
        {isCreator && (
          <div className="bg-amber-500/10 px-3 py-1 rounded border border-amber-500/50 text-amber-500 text-xs font-bold">
            HOST MODE
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar">
        {/* Local Video */}
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-2xl aspect-video group">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1]"
            style={isScreenSharing ? { transform: "none" } : {}}
          />
          <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-xs font-bold text-white backdrop-blur-md">
            {currentUser.username} (You)
          </div>
          {!isCamOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
              <i className="fas fa-video-slash text-slate-500 text-3xl"></i>
            </div>
          )}
        </div>

        {/* Remote Videos */}
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <div
            key={peerId}
            className="relative bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-lg aspect-video"
          >
            <VideoPlayer stream={stream} />
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-xs font-bold text-slate-200 backdrop-blur-md">
              {peerNames[peerId] || `User ${peerId.slice(0, 4)}`}
            </div>
          </div>
        ))}
      </div>

      <div className="h-24 mt-6 flex items-center justify-center">
        <div className="bg-slate-900/80 px-8 py-4 rounded-3xl border border-slate-700 flex items-center gap-6 backdrop-blur-xl shadow-2xl">
          <button
            onClick={toggleMic}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-lg ${
              isMicOn ? "bg-slate-700 text-white" : "bg-rose-500 text-white"
            }`}
          >
            <i
              className={`fas ${
                isMicOn ? "fa-microphone" : "fa-microphone-slash"
              }`}
            ></i>
          </button>
          <button
            onClick={toggleCam}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-lg ${
              isCamOn ? "bg-slate-700 text-white" : "bg-rose-500 text-white"
            }`}
          >
            <i className={`fas ${isCamOn ? "fa-video" : "fa-video-slash"}`}></i>
          </button>
          <button
            onClick={isScreenSharing ? stopShareScreen : startShareScreen}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-lg ${
              isScreenSharing
                ? "bg-emerald-500 text-white"
                : "bg-slate-700 text-white"
            }`}
          >
            <i className="fas fa-desktop"></i>
          </button>
          <div className="w-px h-10 bg-slate-600 mx-2 opacity-50"></div>
          <button
            onClick={handleManualLeave}
            className={`px-8 py-4 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2 ${
              isCreator
                ? "bg-rose-600 hover:bg-rose-500"
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
