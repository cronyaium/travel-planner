import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { getCloudBaseAuth } from './utils/cloudbase';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import Modal from './components/Modal';
import MapView from "./components/MapView";
import TripPlanner from "./components/TripPlanner";
import { TripData } from "./types/TripData";
import { Button, Input, Card, Alert } from "antd";
import {DriveResult} from "./types/DriveResult";

// ======= 讯飞语音识别配置 =======
const APPID = process.env.REACT_APP_IFLYTEK_APPID || '';
const APIKey = process.env.REACT_APP_IFLYTEK_APIKEY || '';
const APISecret = process.env.REACT_APP_IFLYTEK_APISECRET || '';
const IAT_URL = 'wss://iat-api.xfyun.cn/v2/iat';

// ======= 百度地图配置 =======
const BAIDU_AK = process.env.REACT_APP_BAIDU_AK || ''; // 百度地图AK

const DRIVE_ROUTE_RESULT = {
  "status": 0,
  "message": "ok",
  "result": {
    "origin": {
      "lng": 116.39748,
      "lat": 39.908823077525
    },
    "destination": {
      "lng": 116.321317,
      "lat": 39.896499078488
    },
    "routes": [
      {
        "route_md5": "3168c2840466ce15fb9138156cd3a1bd",
        "distance": 8557,
        "duration": 1797,
        "traffic_condition": 2,
        "toll": 0,
        "restriction_info": {
          "status": 0
        },
        "steps": [
          {
            "leg_index": 0,
            "distance": 51,
            "duration": 21,
            "direction": 3,
            "turn": 3,
            "road_type": 6,
            "road_types": "6",
            "instruction": "\u4ece<b>\u8d77\u70b9</b>\u5411\u6b63\u4e1c\u65b9\u5411\u51fa\u53d1,\u6cbf<b>\u524d\u7ea2\u4e95\u80e1\u540c</b>\u884c\u9a7650\u7c73,<b>\u53f3\u8f6c</b>\u8fdb\u5165<b>\u4eba\u5927\u4f1a\u5802\u897f\u8def</b>",
            "path": "116.39746069298,39.908720916234;116.39803920172,39.908685564022",
            "traffic_condition": [
              {
                "status": 0,
                "geo_cnt": 1
              }
            ],
            "start_location": {
              "lng": "116.39746069298",
              "lat": "39.908720916234"
            },
            "end_location": {
              "lng": "116.39803920172",
              "lat": "39.908685564022"
            }
          },
          {
            "leg_index": 0,
            "distance": 220,
            "duration": 85,
            "direction": 5,
            "turn": 3,
            "road_type": 5,
            "road_types": "5",
            "instruction": "\u6cbf<b>\u4eba\u5927\u4f1a\u5802\u897f\u8def</b>\u884c\u9a76220\u7c73,<b>\u53f3\u8f6c</b>\u8fdb\u5165<b>\u524d\u95e8\u897f\u5927\u8857</b>",
            "path": "116.39803920172,39.908685564022;116.39804917292,39.908655677206;116.39807962547,39.90813604576;116.39814017126,39.907366795749;116.39818059501,39.906837261092;116.39819074586,39.906707402016",
            "traffic_condition": [
              {
                "status": 1,
                "geo_cnt": 5
              }
            ],
            "start_location": {
              "lng": "116.39803920172",
              "lat": "39.908685564022"
            },
            "end_location": {
              "lng": "116.39819074586",
              "lat": "39.906707402016"
            }
          }
        ]
      }
    ]
  }
};

function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState('我打算去北京玩3天');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 新增状态：控制保存按钮加载状态
  const [isSaving, setIsSaving] = useState(false);

  const [routeData, setRouteData] = useState<DriveResult | null>(null);

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
          console.log("userInfo:", userInfo);
          console.log("uid", userInfo.uid);
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
      }, 1000);
    }
  };

  const submit = async () => {
    console.log("提交");
    console.log(text);

    // 清空之前的错误
    setError(null);
    // 显示加载状态
    setLoading(true);

    try {
      // 发送POST请求
      const response = await fetch("http://localhost:8080/api/planTrip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // 声明请求体为JSON格式
          // 如果后端有跨域限制，可能需要添加额外请求头（如认证信息）
        },
        body: JSON.stringify({ rawText: text }) // 构造请求体，键名需与后端@RequestBody中的参数一致
      });

      // 检查响应是否成功
      if (!response.ok) {
        throw new Error(`HTTP错误，状态码: ${response.status}`);
      }

      // 解析行程计划结果（包含经纬度）
      const tripResult: TripData = await response.json();
      console.log("行程计划结果:", tripResult);
      setTripData(tripResult);

      // 2. 提取所有地点的经纬度（过滤无效坐标）
      const coordinates: {latitude: number; longitude: number}[] = [];
      tripResult.tripPlan.forEach(day => {
        day.segments.forEach(segment => {
          // 确保经纬度有效（不为0或null）
          if (segment.latitude && segment.longitude &&
              segment.latitude !== 0 && segment.longitude !== 0) {
            coordinates.push({
              latitude: segment.latitude,
              longitude: segment.longitude
            });
          }
        });
      });

      // 如果没有足够的坐标，不调用路线接口
      if (coordinates.length < 2) {
        console.warn("有效坐标不足，无法规划路线");
        return;
      }

      // 3. 构建路线参数（改为 JSON 格式，而非 URL 参数）
      const routeParams = {
        origin: `${coordinates[0].latitude},${coordinates[0].longitude}`, // 起点
        destination: `${coordinates[coordinates.length - 1].latitude},${coordinates[coordinates.length - 1].longitude}`, // 终点
        waypoints: coordinates.length > 2
            ? coordinates.slice(1, -1).map(coord => `${coord.latitude},${coord.longitude}`).join("|")
            : "" // 途经点（无则传空字符串）
      };

      // 4. 调用路线接口（关键修改：GET → POST，参数放请求体）
      const routeResponse = await fetch("http://localhost:8080/api/route", {
        method: "POST", // 改为 POST 方法
        headers: {
          "Content-Type": "application/json", // 声明 JSON 请求体
        },
        body: JSON.stringify(routeParams) // 参数放在请求体中
      });

      if (!routeResponse.ok) {
        throw new Error(`路线规划请求失败，状态码: ${routeResponse.status}`);
      }

      // 注意：后端返回的是 String 类型，需先解析为 JSON
      const routeResultStr = await routeResponse.text();
      const routeResult: DriveResult = JSON.parse(routeResultStr);
      console.log("路线规划结果:", routeResult);
      setRouteData(routeResult);

    } catch (error) {
      // 先判断error是否为Error实例
      if (error instanceof Error) {
        console.error("请求失败:", error.message);
        setError(error.message); // 保存错误信息
      } else {
        // 处理非Error类型的错误（如字符串、未知对象等）
        console.error("请求失败:", error);
        setError("请求失败，请稍后重试");
      }
    } finally {
      // 关闭加载状态
      setLoading(false);
    }
  };

  // 保存行程到后端
  const handleSaveTrip = async () => {
    if (!tripData) return;

    setIsSaving(true);
    try {
      // 构造后端需要的对象
      const payload = {
        userId: userInfo.uid,               // 填充 user_id
        tripName: tripData.tripIntent.destination || "",  // 如果 tripData 有名字可以用
        tripDataJson: JSON.stringify(tripData) // 整个对象序列化为字符串
      };

      const response = await fetch("http://localhost:8080/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload), // 发送 payload
      });

      if (!response.ok) {
        throw new Error(`保存失败，状态码: ${response.status}`);
      }

      // 保存成功
      const result = await response.json();
      alert(`✅ 行程保存成功！\n行程ID: ${result.id}`);
    } catch (err) {
      console.error("保存行程失败:", err);
      alert(`❌ 保存失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // @ts-ignore
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
                用语音说出你的旅行需求，例如“我打算去北京玩 5 天”，AI 将自动生成行程并规划路线。
                <br/>
                由于百度地图API的限制，目前只支持中国大陆境内的行程规划。
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

              {/* 错误提示 */}
              {error && (
                  <Alert
                      message="请求错误"
                      description={error}
                      type="error"
                      showIcon
                      style={{ marginBottom: "20px" }}
                  />
              )}

              {/* 加载状态：使用自定义样式 */}
              {loading && (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <div className="loading-text">正在生成行程计划，请稍候...</div>
                  </div>
              )}

              {/* 行程计划组件 */}
              {!loading && !error && tripData && (
                  <div style={{marginBottom: '1rem'}}>
                    {/* 行程展示组件 */}
                    <TripPlanner tripData={tripData}/>
                    {/* 保存按钮 */}
                    <button
                        onClick={handleSaveTrip}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#1890ff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginBottom: '1rem',
                          fontSize: '14px'
                        }}
                    >
                      保存行程计划
                    </button>
                  </div>
              )}

              {!loading && !error && routeData && (
                  <MapView
                      ak={BAIDU_AK}
                      result={routeData}
                  />
              )}
            </>
        )}
      </div>
  );
}

export default App;
