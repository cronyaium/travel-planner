import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { getCloudBaseAuth } from './utils/cloudbase';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import Modal from './components/Modal';
import MapView from "./components/MapView";

// ======= 讯飞语音识别配置 =======
const APPID = process.env.REACT_APP_IFLYTEK_APPID || '';
const APIKey = process.env.REACT_APP_IFLYTEK_APIKEY || '';
const APISecret = process.env.REACT_APP_IFLYTEK_APISECRET || '';
const IAT_URL = 'wss://iat-api.xfyun.cn/v2/iat';

// ======= 百度地图配置 =======
const BAIDU_AK = process.env.REACT_APP_BAIDU_AK || ''; // 百度地图AK

function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getCloudBaseAuth();

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // ======= 登录状态检查 =======
  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.hasLoginState()) {
        setShowLoginModal(true);
      } else {
        setIsLoggedIn(true);
        try {
          const userInfo = await auth.getUserInfo();
          setUserInfo(userInfo);
        } catch (e) {
          console.error('获取用户信息失败:', e);
        }
      }
    };
    checkAuth();
  }, [auth]);

  const handleCloseModal = () => {
    setShowLoginModal(false);
    navigate('/login');
  };

  // ======= 登出功能 =======
  const handleLogout = async () => {
    try {
      await auth.signOut();
      setIsLoggedIn(false);
      setUserInfo(null);
      navigate('/login');
    } catch (err) {
      console.error('登出失败：', err);
    }
  };

  // ======= ArrayBuffer 转 Base64 =======
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  // ======= 生成 WebSocket URL =======
  const getWebSocketUrl = () => {
    const host = 'iat-api.xfyun.cn';
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, APISecret);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);
    const authorizationOrigin = `api_key="${APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);
    return `${IAT_URL}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
  };

  // ======= 开始录音 =======
  const startRecording = async () => {
    setText('');
    setIsRecording(true);

    const ws = new WebSocket(getWebSocketUrl());
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log('✅ WebSocket连接成功');
      ws.send(
          JSON.stringify({
            common: { app_id: APPID },
            business: { language: 'zh_cn', domain: 'iat', accent: 'mandarin', vad_eos: 5000 },
            data: { status: 0, format: 'audio/L16;rate=16000', encoding: 'raw', audio: '' },
          })
      );

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < input.length; i++) {
          let s = Math.max(-1, Math.min(1, input[i]));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        const base64data = arrayBufferToBase64(buffer);
        ws.send(
            JSON.stringify({
              data: { status: 1, format: 'audio/L16;rate=16000', encoding: 'raw', audio: base64data },
            })
        );
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    };

    ws.onmessage = (event) => {
      const jsonData = JSON.parse(event.data);
      if (jsonData.data?.result) {
        const str = jsonData.data.result.ws
            .map((w: any) => w.cw.map((cw: any) => cw.w).join(''))
            .join('');
        setText((prev) => prev + str);
      }
    };

    ws.onerror = (err) => console.error('WebSocket 出错：', err);
    ws.onclose = () => console.log('WebSocket 已关闭');
  };

  // ======= 停止录音 =======
  const stopRecording = () => {
    setIsRecording(false);
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
          JSON.stringify({
            data: { status: 2, format: 'audio/L16;rate=16000', encoding: 'raw', audio: '' },
          })
      );
      setTimeout(() => {
        wsRef.current?.close();
        wsRef.current = null;
      }, 100);
    }
  };

  const submit = () => {
    console.log("提交");
  };

  return (
      <div className="App">
        {showLoginModal && (
            <Modal show={showLoginModal} title="提示" onClose={handleCloseModal}>
              您尚未登录，请先登录
            </Modal>
        )}

        {isLoggedIn && (
            <>
              <div className="app-header">
                <h1 className="app-name">🎤 AI 旅行规划师</h1>
                {userInfo && (
                    <div className="user-info" onClick={() => setMenuOpen(!menuOpen)}>
                      <img
                          src={userInfo.picture || '/default_avatar.jpg'}
                          alt="avatar"
                          className="user-avatar"
                      />
                      <span className="user-name">{userInfo.name || '用户'}</span>
                      {menuOpen && (
                          <div className="user-menu">
                            <button onClick={handleLogout}>登出</button>
                          </div>
                      )}
                    </div>
                )}
              </div>

              <div className="hint">
                用语音说出你的旅行需求，例如“我打算去日本玩 5 天”，AI 将自动生成行程并规划路线。
              </div>

              <div className="recorder-box">
                <div className="result-box">{text || '点击"开始录音"按钮，开始讲话...'}</div>
              </div>

              <div className="op-panel">
                <button onClick={isRecording ? stopRecording : startRecording}>
                  {isRecording ? '⏹ 停止录音' : '🎙 开始录音'}
                </button>
                <button onClick={!isRecording ? submit : undefined} disabled={isRecording}>
                  生成旅行规划
                </button>
              </div>

              <MapView
                  ak={BAIDU_AK}
              />
            </>
        )}
      </div>
  );
}

export default App;
