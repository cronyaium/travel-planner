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
            你是一位智能旅行规划助理，能够从用户的自然语言描述中自动提取结构化出行信息，
            并基于这些信息生成详细、可执行的旅行计划。
            
            要求：
            1. 输出严格为 JSON 格式，不要包含除 JSON 外的任何文字。
            2. 输出的 JSON 必须符合以下结构：
            {
              "userProfile": {
                "companions": "独自/带孩子/情侣/家庭/朋友",
                "preferences": ["美食", "动漫", "自然风光", "文化", "购物"]
              },
              "tripIntent": {
                "destination": "目的地",
                "days": 5,
                "budget": 10000,
                "transportMode": "飞机/火车/自驾/待定",
                "season": "春季/夏季/秋季/冬季"
              },
              "tripPlan": [
                {
                  "day": 1,
                  "segments": [
                    {
                      "time": "上午",
                      "activity": "抵达东京，入住酒店",
                      "location": "新宿区",
                      "cost": 500,
                      "category": "交通/住宿"
                    },
                    {
                      "time": "下午",
                      "activity": "参观秋叶原动漫街",
                      "location": "秋叶原",
                      "cost": 0,
                      "category": "景点"
                    },
                    {
                      "time": "晚上",
                      "activity": "在一兰拉面用餐",
                      "location": "银座",
                      "cost": 150,
                      "category": "美食"
                    }
                  ],
                  "dailyTotalCost": 650
                }
              ],
              "budgetAnalysis": {
                "estimatedTotal": 9500,
                "categories": {
                  "交通": 2500,
                  "住宿": 3000,
                  "餐饮": 2000,
                  "景点": 1500,
                  "购物": 500
                },
                "currency": "CNY"
              },
              "expenseRecords": [
                {
                  "item": "出租车",
                  "category": "交通",
                  "amount": 120,
                  "notes": "机场到酒店"
                }
              ]
            }
            
            说明：
            - 如果用户未提供信息（如预算、天数等），请合理推测并补全。
            - 每天的 tripPlan 可细分为多个时间段（上午/中午/下午/晚上），每个活动包含地点、活动内容、费用、类型。
            - 预算与开销信息要保持一致，比如总金额要一致，方便后续云端同步和用户管理。
            - 优先输出简洁、结构化、便于存储和后续修改的 JSON。
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
