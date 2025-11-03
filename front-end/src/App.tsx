import React from 'react';
import logo from './logo.svg';
import './App.css';
import {getCloudBaseAuth} from "./utils/cloudbase";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 导入路由跳转工具

function App() {
  // 1. 状态管理：控制弹窗显示
  const [showLoginModal, setShowLoginModal] = useState(false);
  // 2. 获取路由跳转函数
  const navigate = useNavigate();

  const auth = getCloudBaseAuth();

  // 3. 初始化时检查登录状态
  useEffect(() => {
    console.log("hello!")

    console.log(auth.hasLoginState())
    if (!auth.hasLoginState()) {
      // 未登录，显示弹窗
      setShowLoginModal(true);
    }
  }, [auth]);

  // 4. 关闭弹窗的处理函数：关闭弹窗后跳转至登录页
  const handleCloseModal = () => {
    setShowLoginModal(false); // 隐藏弹窗
    navigate('/login'); // 跳转到登录页
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>

      {/* 5. 未登录弹窗 */}
      {showLoginModal && (
          <div className="login-modal">
            <div className="modal-content">
              <p>您尚未登录，请先登录</p>
              <button onClick={handleCloseModal}>确定</button>
            </div>

            {/* 遮罩层（可选）：点击遮罩也关闭弹窗并跳转 */}
            <div className="modal-overlay" onClick={handleCloseModal} />
          </div>
      )}
    </div>
  );
}

export default App;
