import React, { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        BMapGL: any;
        initBaiduMap?: () => void;
    }
}

// 修正后的驾车导航结果类型接口（完全匹配实际返回格式）
interface DriveRouteResult {
    status: number;
    message: string;
    result: {
        origin: {
            lng: number;
            lat: number;
        };
        destination: {
            lng: number;
            lat: number;
        };
        routes: Array<{
            route_md5: string;
            distance: number; // 总距离（米）
            duration: number; // 总耗时（秒）
            traffic_condition: number;
            toll: number;
            restriction_info: {
                status: number;
            };
            steps: Array<{
                leg_index: number;
                distance: number;
                duration: number;
                direction: number;
                turn: number;
                road_type: number;
                road_types: string;
                instruction: string;
                path: string; // 关键修正：path 是字符串格式 "lng1,lat1;lng2,lat2;..."
                traffic_condition: Array<{
                    status: number;
                    geo_cnt: number;
                }>;
                start_location: {
                    lng: string;
                    lat: string;
                };
                end_location: {
                    lng: string;
                    lat: string;
                };
            }>;
        }>;
    };
}

interface MapViewProps {
    ak: string;
    result?: DriveRouteResult; // 接收修正后的驾车导航结果
}

const MapView: React.FC<MapViewProps> = ({ ak, result }) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);
    const polylineRef = useRef<any>(null);
    const markerRefs = useRef<Array<any>>([]); // 存储所有标记点，用于销毁
    const [isReady, setIsReady] = useState(false);

    // 解析字符串格式的 path 为坐标数组
    const parsePath = (pathStr: string) => {
        if (!pathStr) return [];
        return pathStr.split(';').map(coordStr => {
            const [lng, lat] = coordStr.split(',').map(Number); // 转换为数字
            return { lng, lat };
        }).filter(coord => !isNaN(coord.lng) && !isNaN(coord.lat)); // 过滤无效坐标
    };

    // 合并所有步骤的 path，获取完整路线
    const getFullRoutePath = (steps: Array<{ path: string }>) => {
        let fullPath: Array<{ lng: number; lat: number }> = [];
        steps.forEach(step => {
            const stepPath = parsePath(step.path);
            fullPath = [...fullPath, ...stepPath];
        });
        return fullPath;
    };

    // 加载百度地图 SDK
    useEffect(() => {
        if (!ak) {
            console.error('百度地图 AK 为空，请检查配置');
            return;
        }

        if (window.BMapGL) {
            console.log('✅ 百度地图 SDK 已缓存');
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
        // script.crossOrigin = 'anonymous';

        window.initBaiduMap = () => {
            if (window.BMapGL) {
                console.log('✅ 百度地图 SDK 加载并初始化成功');
                setIsReady(true);
            } else {
                console.error('❌ SDK 加载完成，但 BMapGL 未挂载');
            }
        };

        script.onerror = () => {
            console.error('❌ 百度地图 SDK 加载失败，请检查：1. AK 有效性 2. 网络连接 3. 域名白名单配置');
        };

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
            if (mapInstanceRef.current) mapInstanceRef.current.destroy();
            delete window.initBaiduMap;
        };
    }, [ak]);

    // 初始化地图 + 绘制路线
    useEffect(() => {
        if (!isReady || !mapRef.current || !window.BMapGL) return;

        const { BMapGL } = window;
        // 初始化地图（未创建时）
        if (!mapInstanceRef.current) {
            const map = new BMapGL.Map(mapRef.current, { enableHighResolution: true });
            map.enableScrollWheelZoom(true);
            map.enableDragging(true);
            mapInstanceRef.current = map;
            console.log("new BMapGL");
        }

        const map = mapInstanceRef.current;

        // 清除已有覆盖物（路线 + 标记点），避免重复绘制
        const clearOverlays = () => {
            if (polylineRef.current) {
                map.removeOverlay(polylineRef.current);
                polylineRef.current = null;
            }
            markerRefs.current.forEach(marker => map.removeOverlay(marker));
            markerRefs.current = [];
        };

        clearOverlays();

        // 有有效导航结果时，绘制路线
        if (result && result.status === 0 && result.result?.routes?.length) {
            const { routes, origin, destination } = result.result;
            const firstRoute = routes[0];
            const fullPath = getFullRoutePath(firstRoute.steps); // 合并所有步骤的路径

            if (fullPath.length === 0) {
                console.error('❌ 路线坐标解析失败，无有效坐标');
                return;
            }

            // 转换为百度地图 Point 数组
            const pathPoints = fullPath.map(coord => new BMapGL.Point(coord.lng, coord.lat));

            // 1. 绘制完整路线
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
            const startMarker = new BMapGL.Marker(new BMapGL.Point(origin.lng, origin.lat), {
                // 内置圆形标记，设置颜色和大小（无外部图片依赖）
                icon: new BMapGL.Icon(
                    // 用 SVG 圆形替代外部图片，零跨域
                    'data:image/svg+xml;utf8,<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="%2327ae60" stroke="%23fff" stroke-width="2"/></svg>',
                    new BMapGL.Size(30, 30),
                    { anchor: BMapGL.Size(15, 15) } // 锚点居中
                )
            });
            map.addOverlay(startMarker);
            markerRefs.current.push(startMarker);
            // 起点信息窗口
            const startInfoWindow = new BMapGL.InfoWindow(`<div style="padding: 8px;">起点</div>`, { width: 60 });
            startMarker.addEventListener('click', () => map.openInfoWindow(startInfoWindow, new BMapGL.Point(origin.lng, origin.lat)));

            // 3. 终点标记（红色）
            const endMarker = new BMapGL.Marker(new BMapGL.Point(destination.lng, destination.lat), {
                icon: new BMapGL.Icon(
                    'data:image/svg+xml;utf8,<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="%23e74c3c" stroke="%23fff" stroke-width="2"/></svg>',
                    new BMapGL.Size(30, 30),
                    { anchor: BMapGL.Size(15, 15) }
                )
            });
            map.addOverlay(endMarker);
            markerRefs.current.push(endMarker);
            // 终点信息窗口（显示总距离、总耗时）
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
            endMarker.addEventListener('click', () => map.openInfoWindow(endInfoWindow, new BMapGL.Point(destination.lng, destination.lat)));

            // 4. 自动适配路线视野
            // const bounds = new BMapGL.Bounds();
            // pathPoints.forEach(point => bounds.extend(point));
            // map.setViewport(bounds, { padding: [50, 50, 50, 50] });
            // 4. 自动适配路线视野（修复版）
            if (pathPoints.length > 1) {
                // 直接传入点数组自动计算视野
                map.setViewport(pathPoints, { padding: [50, 50, 50, 50] });
            } else if (pathPoints.length === 1) {
                // 若仅有单点路径，居中并放大
                map.centerAndZoom(pathPoints[0], 15);
            }
        } else {
            // 无有效路线时，默认显示北京中心点
            map.centerAndZoom(new BMapGL.Point(116.404, 39.915), 12);
        }
    }, [isReady, result, ak]);

    return (
        <div
            ref={mapRef}
            style={{ width: '100%', height: '500px', border: '1px solid #ccc', marginTop: '20px' }}
        >
            {!isReady && <div style={{ textAlign: 'center', lineHeight: '500px', color: '#666' }}>地图加载中...</div>}
            {isReady && (!result || result.status !== 0) && (
                <div style={{ textAlign: 'center', lineHeight: '500px', color: '#666' }}>暂无有效导航路线，请生成旅行规划</div>
            )}
        </div>
    );
};

export default MapView;