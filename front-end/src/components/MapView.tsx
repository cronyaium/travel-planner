import React, { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        BMapGL: any;
        initMap?: () => void;
    }
}

const MapView: React.FC<{ ak: string }> = ({ ak }) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null); // 存储地图实例，避免重复创建
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // 若已加载过 SDK，直接标记就绪
        if (window.BMapGL) {
            setIsReady(true);
            return;
        }

        // 避免重复创建脚本标签
        const existingScript = document.querySelector(`script[src*="api.map.baidu.com/api?v=1.0&type=webgl"]`);
        if (existingScript) {
            // 若脚本已存在，监听其加载完成
            const checkLoaded = () => {
                if (window.BMapGL) {
                    setIsReady(true);
                }
            };
            existingScript.addEventListener('load', checkLoaded);
            return () => existingScript.removeEventListener('load', checkLoaded);
        }

        const script = document.createElement('script');
        script.type = 'text/javascript';
        // 百度地图 WebGL 版推荐通过 callback 确认就绪（官方文档规范）
        script.src = `https://api.map.baidu.com/api?v=1.0&type=webgl&ak=${ak}&callback=initMap`;

        // 定义全局回调函数，确保 SDK 加载后触发
        window.initMap = () => {
            console.log('✅ 百度地图 SDK 加载并初始化成功');
            setIsReady(true);
        };

        script.onerror = () => {
            console.error('❌ 百度地图脚本加载失败，请检查 ak 有效性或网络连接');
        };

        document.body.appendChild(script);

        // 清理函数：移除脚本、销毁地图实例、删除全局回调
        return () => {
            document.body.removeChild(script);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.destroy(); // 销毁地图，释放资源
            }
            delete window.initMap;
        };
    }, [ak]);

    useEffect(() => {
        // 必须同时满足：SDK 就绪 + 容器存在 + 无已创建实例
        if (!isReady || !mapRef.current || mapInstanceRef.current) return;

        console.log("new BMapGL");
        const { BMapGL } = window;
        const map = new BMapGL.Map(mapRef.current);

        // 初始化地图（中心点坐标可根据需求调整）
        map.centerAndZoom(new BMapGL.Point(116.404, 39.915), 12);
        map.enableScrollWheelZoom(true); // 启用滚轮缩放

        mapInstanceRef.current = map; // 存储实例，避免重复创建
    }, [isReady]);

    return (
        <div
            ref={mapRef}
            style={{ width: '100%', height: '500px', border: '1px solid #ccc' }}
        />
    );
};

export default MapView;