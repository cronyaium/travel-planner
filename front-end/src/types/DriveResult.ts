// DriveResult.ts

/** 经纬度坐标类型 */
export interface LngLat {
    lng: number | string; // 经度（可能是数字或字符串格式）
    lat: number | string; // 纬度（可能是数字或字符串格式）
}

/** 交通状况详情 */
export interface TrafficConditionItem {
    status: number; // 交通状态（0-畅通，1-缓行等）
    geo_cnt: number; // 该状态的地理节点数量
}

/** 路线步骤详情 */
export interface RouteStep {
    leg_index: number; // 路段索引
    distance: number; // 该步骤距离（米）
    duration: number; // 该步骤耗时（秒）
    direction: number; // 方向标识
    turn: number; // 转向标识
    road_type: number; // 道路类型
    road_types: string; // 道路类型字符串
    instruction: string; // 导航指令（含HTML标签）
    path: string; // 路径坐标串（格式：lng,lat;lng,lat...）
    traffic_condition: TrafficConditionItem[]; // 交通状况数组
    start_location: LngLat; // 步骤起点坐标
    end_location: LngLat; // 步骤终点坐标
}

/** 限行信息 */
export interface RestrictionInfo {
    status: number; // 限行状态（0-无限行）
}

/** 驾车路线详情 */
export interface DrivingRoute {
    route_md5: string; // 路线唯一标识
    distance: number; // 总距离（米）
    duration: number; // 总耗时（秒）
    traffic_condition: number; // 整体交通状况
    toll: number; // 总过路费（元）
    restriction_info: RestrictionInfo; // 限行信息
    steps: RouteStep[]; // 路线步骤数组
}

/** 路线结果顶层数据 */
export interface DriveResultData {
    origin: LngLat; // 起点坐标
    destination: LngLat; // 终点坐标
    routes: DrivingRoute[]; // 路线数组（可能有多条路线方案）
}

/** 百度地图驾车路线接口返回结果类型 */
export interface DriveResult {
    status: number; // 状态码（0-成功）
    message: string; // 状态描述
    result: DriveResultData; // 路线结果数据
}