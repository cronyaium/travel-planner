// src/types/trip.ts

// 行程片段类型
export interface Segment {
    time: "上午" | "中午" | "下午" | "晚上" | "全天"; // 新增"全天"时间类型
    activity: string;
    location: string;
    cost: number; // 支持小数金额
    category: "住宿" | "交通" | "餐饮" | "景点" | "购物" | "文化";
}

// 每日行程类型
export interface DailyPlan {
    day: number;
    segments: Segment[]; // 每天至少包含1条住宿记录
    dailyTotalCost: number; // 当日segments的cost总和
}

// 预算分类类型（固定字段，与返回的分类严格对应）
export interface BudgetCategory {
    "交通": number;
    "住宿": number;
    "餐饮": number;
    "景点": number;
    "购物": number;
    "文化": number;
}

// 预算分析类型
export interface BudgetAnalysis {
    estimatedTotal: number; // 所有dailyTotalCost的总和
    categories: BudgetCategory; // 各分类总和需等于estimatedTotal
    currency: "CNY"; // 目前仅人民币
}

// 新增：每日费用计算结果
export interface ComputedDailySums {
    [key: `day${number}`]: number; // 键格式为day1、day2等
}

// 新增：分类费用计算结果（与BudgetCategory结构一致）
export interface ComputedCategorySums {
    "交通": number;
    "住宿": number;
    "餐饮": number;
    "景点": number;
    "购物": number;
    "文化": number;
}

// 新增：数据校验结果
export interface Verification {
    dailyEqual: boolean; // 每日费用总和是否匹配
    totalEqual: boolean; // 总费用是否匹配
    categoryEqual: boolean; // 分类费用是否匹配
}

// 最外层行程数据类型
export interface TripData {
    userProfile: {
        companions: "独自" | "带孩子" | "情侣" | "家庭" | "朋友";
        preferences: ("美食" | "动漫" | "自然风光" | "文化" | "购物")[];
    };
    tripIntent: {
        destination: string;
        days: number; // ≥1
        budget: number; // ≥0
        transportMode: "飞机" | "火车" | "自驾" | "待定";
        season: "春季" | "夏季" | "秋季" | "冬季";
    };
    tripPlan: DailyPlan[]; // 数组长度等于tripIntent.days
    budgetAnalysis: BudgetAnalysis;
    computedDailySums: ComputedDailySums; // 新增字段
    computedCategorySums: ComputedCategorySums; // 新增字段
    verification: Verification; // 新增字段
    debug?: string; // 调试信息（可选字段）
}