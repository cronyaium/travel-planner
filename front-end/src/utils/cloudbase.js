// src/utils/cloudbase.js
import cloudbase from "@cloudbase/js-sdk";

// 初始化CloudBase客户端（仅初始化一次）
let app = null;
export const initCloudBase = () => {
    if (!app) {
        app = cloudbase.init({
            env: window._env_.REACT_APP_CLOUDBASE_ENV, // 替换为你的环境ID（如 dev-xxxxxx）
        });
    }
    return app;
};

// 获取已初始化的Auth实例（方便组件直接调用）
export const getCloudBaseAuth = () => {
    const app = initCloudBase();
    return app.auth();
};
