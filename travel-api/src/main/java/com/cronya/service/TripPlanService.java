package com.cronya.service;

import com.alibaba.dashscope.aigc.generation.Generation;
import com.alibaba.dashscope.aigc.generation.GenerationParam;
import com.alibaba.dashscope.aigc.generation.GenerationResult;
import com.alibaba.dashscope.common.Message;
import com.alibaba.dashscope.common.Role;
import com.alibaba.dashscope.utils.JsonUtils;
import com.cronya.config.AlibabaModelConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class TripPlanService {

    private final AlibabaModelConfig config;
    private final ObjectMapper mapper = new ObjectMapper();

    public TripPlanService(AlibabaModelConfig config) {
        this.config = config;
    }

    /**
     * 根据用户语音识别文本调用百炼大模型生成结构化行程规划
     */
    public Map<String, Object> generateTripPlan(String rawText) {
        try {
            // 1️⃣ 构造提示词
            String systemPrompt = """
                你是一位严谨的智能旅行规划助理，能从用户自然语言中提取信息并生成结构化旅行计划，输出严格为 JSON 格式，且必须满足以下数值一致性约束与结构约束。
                
                ========================================================
                【核心校验规则（必须全部满足）】
                1. 金额一致性：
                   - 每日行程中所有 segments 的 cost 总和必须等于该 day 的 dailyTotalCost
                   - 所有 day 的 dailyTotalCost 总和必须等于 budgetAnalysis.estimatedTotal
                   - budgetAnalysis.categories 中各项金额总和必须等于 estimatedTotal
                2. 住宿必算：
                   - 每天的 segments 必须包含至少 1 条 category 为 "住宿" 的记录
                   - 住宿费用需合理分配到每天（如总住宿预算 ÷ 天数），并计入当日 dailyTotalCost
                3. 三重验证必须通过：
                   - dailyEqual = true
                   - totalEqual = true
                   - categoryEqual = true
                   若任一为 false，必须立即在同一回复中重新计算，直到三者均为 true。
                
                ========================================================
                【输出结构（必须严格遵循）】
                {
                  "userProfile": {
                    "companions": "独自/带孩子/情侣/家庭/朋友",
                    "preferences": ["美食", "动漫", "自然风光", "文化", "购物"]
                  },
                  "tripIntent": {
                    "destination": "目的地",
                    "days": 1,
                    "budget": 1000,
                    "transportMode": "飞机/火车/自驾/待定",
                    "season": "春季/夏季/秋季/冬季"
                  },
                  "tripPlan": [
                    {
                      "day": 1,
                      "segments": [
                        {
                          "time": "上午/中午/下午/晚上",
                          "activity": "具体活动",
                          "location": "地点",
                          "latitude": 数字（纬度，浮点数，保留6位小数，范围 -90~90）,
                          "longitude": 数字（经度，浮点数，保留6位小数，范围 -180~180）,
                          "cost": 数字（≥0，浮点数，两位小数）,
                          "category": "住宿/交通/餐饮/景点/购物/文化"
                        }
                      ],
                      "dailyTotalCost": 所有 segments 的 cost 求和（必须显式计算）
                    }
                  ],
                  "budgetAnalysis": {
                    "estimatedTotal": 所有 dailyTotalCost 的总和（必须显式计算）,
                    "categories": {
                      "交通": 所有交通类 segments 的 cost 总和,
                      "住宿": 所有住宿类 segments 的 cost 总和,
                      "餐饮": 所有餐饮类 segments 的 cost 总和,
                      "景点": 所有景点类 segments 的 cost 总和,
                      "购物": 所有购物类 segments 的 cost 总和,
                      "文化": 所有文化类 segments 的 cost 总和
                    },
                    "currency": "CNY"
                  },
                  "computedDailySums": {
                    "day1": ..., "day2": ...
                  },
                  "computedCategorySums": {
                    "交通": ..., "住宿": ..., "餐饮": ..., "景点": ..., "购物": ..., "文化": ...
                  },
                  "verification": {
                    "dailyEqual": true/false,
                    "totalEqual": true/false,
                    "categoryEqual": true/false
                  },
                  "debug": "若进行重新计算或调整，请说明原因和变化（字符串）"
                }
                
                ========================================================
                【处理逻辑（必须执行）】
                1. 解析用户意图并确定 tripIntent：
                   - 若用户未提供信息，使用默认值：
                     - days: 默认 3 天
                     - budget: 默认每天 500–1500 元（含住宿）
                     - season: 默认当前季节
                     - 住宿占每日预算的 30%–50%
                2. 计算每个 day 的预算分配：
                   - totalBudget ÷ days = 每日预算
                   - 住宿费 = 每日预算 × 0.4（默认）
                3. 为每一天规划 segments 时，顺序：
                   - 先加入住宿项
                   - 再按用户偏好分配交通、餐饮、景点、购物、文化等活动
                4. 完成每日规划后，执行三次显式计算：
                   - 计算每个 day 的 segments.cost 总和 → dailyTotalCost
                   - 计算所有 dailyTotalCost 的总和 → estimatedTotal
                   - 汇总所有 category 的 cost → budgetAnalysis.categories
                5. 最后进行数值验证：
                   - 计算结果写入 computedDailySums 与 computedCategorySums
                   - 设置 verification.dailyEqual / totalEqual / categoryEqual
                   - 若任意为 false，则重新调整活动费用并再次输出直到全为 true。
                
                ========================================================
                【输出要求】
                1. 所有数值必须保留两位小数（浮点数），不得含单位。
                2. 经纬度必须为合法浮点数（latitude 在 -90~90，longitude 在 -180~180），小数点后不超过6位
                3. 只输出一个完整 JSON 对象（不允许多余文本）。
                4. 若进行了重新计算或调整，说明写入 "debug" 字段中（字符串）。
                5. 输出示例：
                   - 含完全匹配的数值
                   - verification 全部为 true
                
                ========================================================
                【示例（模型必须模仿此格式输出）】
                {
                  "userProfile": {"companions": "独自", "preferences": ["美食"]},
                  "tripIntent": {"destination": "杭州", "days": 2, "budget": 1200, "transportMode": "火车", "season": "春季"},
                  "tripPlan": [
                    {
                      "day": 1,
                      "segments": [
                        {"time": "上午", "activity": "到达并入住民宿", "location": "西湖附近民宿", "latitude": 30.241234, "longitude": 120.150678, "cost": 150.00, "category": "住宿"},
                        {"time": "中午", "activity": "品尝杭帮菜午餐", "location": "楼外楼", "latitude": 30.241899, "longitude": 120.158822, "cost": 60.00, "category": "餐饮"},
                        {"time": "下午", "activity": "游玩西湖景区", "location": "西湖", "latitude": 30.245678, "longitude": 120.165432, "cost": 30.00, "category": "景点"}
                      ],
                      "dailyTotalCost": 240.00
                    }
                  ],
                  "budgetAnalysis": {
                    "estimatedTotal": 240.00,
                    "categories": {"交通": 0.00, "住宿": 150.00, "餐饮": 60.00, "景点": 30.00, "购物": 0.00, "文化": 0.00},
                    "currency": "CNY"
                  },
                  "computedDailySums": {"day1": 240.00},
                  "computedCategorySums": {"交通": 0.00, "住宿": 150.00, "餐饮": 60.00, "景点": 30.00, "购物": 0.00, "文化": 0.00},
                  "verification": {"dailyEqual": true, "totalEqual": true, "categoryEqual": true},
                  "debug": "所有金额和坐标计算一致"
                }
                """;


            String userPrompt = "用户输入：" + rawText;

            // 2️⃣ 构造消息
            Message systemMsg = Message.builder()
                    .role(Role.SYSTEM.getValue())
                    .content(systemPrompt)
                    .build();

            Message userMsg = Message.builder()
                    .role(Role.USER.getValue())
                    .content(userPrompt)
                    .build();

            // 3️⃣ 调用百炼大模型
            Generation gen = new Generation();
            GenerationParam param = GenerationParam.builder()
                    .apiKey(config.getApiKey())
                    .model("qwen-plus") // 或 "qwen-turbo" 等其他模型
                    .messages(Arrays.asList(systemMsg, userMsg))
                    .resultFormat(GenerationParam.ResultFormat.MESSAGE)
                    .build();

            GenerationResult result = gen.call(param);

            // 4️⃣ 提取模型输出
            if (result == null || result.getOutput() == null ||
                    result.getOutput().getChoices() == null ||
                    result.getOutput().getChoices().isEmpty()) {
                return Map.of("error", "模型未返回结果");
            }

            String text = result.getOutput().getChoices().get(0).getMessage().getContent();
            System.out.println("模型原始返回: " + text);

            // 5️⃣ 尝试解析为 JSON
            try {
                return mapper.readValue(text, Map.class);
            } catch (Exception parseErr) {
                // 如果模型输出不完全是 JSON
                return Map.of(
                        "raw_text", text,
                        "error", "模型输出无法解析为 JSON，请检查 prompt 设计"
                );
            }

        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("error", "调用模型失败: " + e.getMessage());
        }
    }
}
