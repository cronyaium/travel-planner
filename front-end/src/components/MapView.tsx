import React, { useEffect, useRef, useState } from 'react';
import { DriveResult } from '../types/DriveResult'; // 导入统一的DriveResult类型

declare global {
    interface Window {
        BMapGL: any;
        initBaiduMap?: () => void;
    }
}

interface MapViewProps {
    ak: string;
    result?: DriveResult; // 使用统一的DriveResult类型
}

const MapView: React.FC<MapViewProps> = ({ ak, result }) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);
    const polylineRef = useRef<any>(null);
    const markerRefs = useRef<Array<any>>([]);
    const [isReady, setIsReady] = useState(false);

    // 解析路径字符串为坐标数组（兼容number/string类型的经纬度）
    const parsePath = (pathStr: string) => {
        if (!pathStr) return [];
        return pathStr.split(';')
            .map(coordStr => {
                const [lng, lat] = coordStr.split(',').map(Number);
                return { lng, lat };
            })
            .filter(coord => !isNaN(coord.lng) && !isNaN(coord.lat));
    };

    // 合并所有步骤的路径点
    const getFullRoutePath = (steps: DriveResult['result']['routes'][0]['steps']) => {
        let fullPath: Array<{ lng: number; lat: number }> = [];
        steps.forEach(step => {
            const stepPath = parsePath(step.path);
            fullPath = [...fullPath, ...stepPath];
        });
        return fullPath;
    };

    // 加载百度地图SDK
    useEffect(() => {
        if (!ak) {
            console.error('百度地图AK为空，请检查配置');
            return;
        }

        if (window.BMapGL) {
            console.log('✅ 百度地图SDK已缓存');
            setIsReady(true);
            return;
        }

        const existingScript = document.querySelector(`script[src*="api.map.baidu.com/api?v=1.0&type=webgl"]`);
        if (existingScript) {
            const handleLoad = () => {
                window.BMapGL && setIsReady(true);
            };
            existingScript.addEventListener('load', handleLoad);
            existingScript.addEventListener('error', () => {
                console.error('❌ 已存在的百度地图脚本加载失败');
            });
            return () => existingScript.removeEventListener('load', handleLoad);
        }

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = `https://api.map.baidu.com/api?v=1.0&type=webgl&ak=${ak}&callback=initBaiduMap`;

        window.initBaiduMap = () => {
            if (window.BMapGL) {
                console.log('✅ 百度地图SDK加载并初始化成功');
                setIsReady(true);
            } else {
                console.error('❌ SDK加载完成，但BMapGL未挂载');
            }
        };

        script.onerror = () => {
            console.error('❌ 百度地图SDK加载失败，请检查：1. AK有效性 2. 网络连接 3. 域名白名单配置');
        };

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
            if (mapInstanceRef.current) mapInstanceRef.current.destroy();
            delete window.initBaiduMap;
        };
    }, [ak]);

    // 初始化地图并绘制路线
    useEffect(() => {
        if (!isReady || !mapRef.current || !window.BMapGL) return;

        const { BMapGL } = window;
        // 初始化地图实例
        if (!mapInstanceRef.current) {
            const map = new BMapGL.Map(mapRef.current, { enableHighResolution: true });
            map.enableScrollWheelZoom(true);
            map.enableDragging(true);
            mapInstanceRef.current = map;
        }

        const map = mapInstanceRef.current;

        // 清除已有覆盖物
        const clearOverlays = () => {
            if (polylineRef.current) {
                map.removeOverlay(polylineRef.current);
                polylineRef.current = null;
            }
            markerRefs.current.forEach(marker => map.removeOverlay(marker));
            markerRefs.current = [];
        };

        clearOverlays();

        console.log("entering drawing routes....")
        // 绘制路线（使用统一的DriveResult类型解析）
        if (result && result.status === 0 && result.result?.routes?.length) {
            const { routes, origin, destination } = result.result;
            const firstRoute = routes[0];
            const fullPath = getFullRoutePath(firstRoute.steps);
            console.log("result=", result)

            if (fullPath.length === 0) {
                console.error('❌ 路线坐标解析失败，无有效坐标');
                return;
            }

            // 转换为百度地图Point数组
            const pathPoints = fullPath.map(coord => new BMapGL.Point(coord.lng, coord.lat));

            // 1. 绘制路线
            const polyline = new BMapGL.Polyline(pathPoints, {
                color: '#1890ff',
                weight: 6,
                opacity: 0.8,
                borderWeight: 1,
                strokeStyle: 'solid'
            });
            map.addOverlay(polyline);
            polylineRef.current = polyline;

            // 2. 起点标记（绿色）
            const startPoint = new BMapGL.Point(
                Number(origin.lng),
                Number(origin.lat)
            );
            const startMarker = new BMapGL.Marker(startPoint, {
                icon: new BMapGL.Icon(
                    'data:image/svg+xml;utf8,<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="%2327ae60" stroke="%23fff" stroke-width="2"/></svg>',
                    new BMapGL.Size(30, 30),
                    { anchor: new BMapGL.Size(15, 15) }
                )
            });
            map.addOverlay(startMarker);
            markerRefs.current.push(startMarker);
            const startInfoWindow = new BMapGL.InfoWindow(
                '<div style="padding: 8px;">起点</div>',
                { width: 60 }
            );
            startMarker.addEventListener('click', () => map.openInfoWindow(startInfoWindow, startPoint));

            // 3. 终点标记（红色）
            const endPoint = new BMapGL.Point(
                Number(destination.lng),
                Number(destination.lat)
            );
            const endMarker = new BMapGL.Marker(endPoint, {
                icon: new BMapGL.Icon(
                    'data:image/svg+xml;utf8,<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="%23e74c3c" stroke="%23fff" stroke-width="2"/></svg>',
                    new BMapGL.Size(30, 30),
                    { anchor: new BMapGL.Size(15, 15) }
                )
            });
            map.addOverlay(endMarker);
            markerRefs.current.push(endMarker);
            const totalDistance = (firstRoute.distance / 1000).toFixed(1);
            const totalDuration = Math.ceil(firstRoute.duration / 60);
            const endInfoWindow = new BMapGL.InfoWindow(
                `<div style="padding: 8px;">
                    终点<br/>
                    总距离：${totalDistance}km<br/>
                    总耗时：${totalDuration}分钟
                </div>`,
                { width: 120 }
            );
            endMarker.addEventListener('click', () => map.openInfoWindow(endInfoWindow, endPoint));

            // 4. 自动适配路线视野
            if (pathPoints.length > 1) {
                map.setViewport(pathPoints, { padding: [50, 50, 50, 50] });
            } else if (pathPoints.length === 1) {
                map.centerAndZoom(pathPoints[0], 15);
            }
        } else {
            // 无有效路线时显示默认位置
            map.centerAndZoom(new BMapGL.Point(116.404, 39.915), 12);
        }
    }, [isReady, result]); // 仅依赖isReady和result，移除冗余的ak依赖

    return (
        <div
            ref={mapRef}
            style={{ width: '100%', height: '500px', border: '1px solid #ccc', marginTop: '20px' }}
        >
            {!isReady && (
                <div style={{ textAlign: 'center', lineHeight: '500px', color: '#666' }}>
                    地图加载中...
                </div>
            )}
            {isReady && (!result || result.status !== 0) && (
                <div style={{ textAlign: 'center', lineHeight: '500px', color: '#666' }}>
                    {result?.status !== 0 ? `路线获取失败：${result?.message || '未知错误'}` : '暂无有效导航路线，请生成旅行规划'}
                </div>
            )}
        </div>
    );
};

export default MapView;