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
                你是一位智能旅行规划助理，能够从用户的自然语言描述中自动提取结构化的出行信息，
                并基于这些信息生成详细旅行计划。
                输出格式严格为 JSON，不要输出除 JSON 外的任何文字。
                JSON 结构如下：
                {
                  "tripIntent": {
                    "destination": "目的地",
                    "days": 5,
                    "budget": 10000,
                    "preferences": ["美食", "动漫"],
                    "companions": "带孩子"
                  },
                  "tripPlan": [
                    { "day": 1, "activities": ["..."] },
                    { "day": 2, "activities": ["..."] }
                  ]
                }
                如果用户描述不完整，请合理推测并补全。
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
