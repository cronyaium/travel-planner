package com.cronya;

import com.alibaba.dashscope.aigc.generation.Generation;
import com.alibaba.dashscope.aigc.generation.GenerationParam;
import com.alibaba.dashscope.aigc.generation.GenerationResult;
import com.alibaba.dashscope.common.Message;
import com.alibaba.dashscope.common.Role;
import com.alibaba.dashscope.utils.JsonUtils;
import com.cronya.config.AlibabaModelConfig;
import com.cronya.service.BaiduMapService;
import com.cronya.service.TripPlanService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

@SpringBootTest
public class TravelTest {

    @Autowired
    private AlibabaModelConfig config;

    private GenerationResult callWithMessage() throws Exception {
        Generation gen = new Generation();
        Message systemMsg = Message.builder()
                .role(Role.SYSTEM.getValue())
                .content("You are a helpful assistant.")
                .build();
        Message userMsg = Message.builder()
                .role(Role.USER.getValue())
                .content("你是谁？")
                .build();
        GenerationParam param = GenerationParam.builder()
                .apiKey(config.getApiKey())
                .model("qwen-plus")
                .messages(Arrays.asList(systemMsg, userMsg))
                .resultFormat(GenerationParam.ResultFormat.MESSAGE)
                .build();
        return gen.call(param);
    }

    @Test
    public void testLLM() {
        try {
            GenerationResult result = callWithMessage();
            System.out.println(JsonUtils.toJson(result));
        } catch (Exception e) {
            // 使用日志框架记录异常信息
            System.err.println("An error occurred while calling the generation service: " + e.getMessage());
        }
        System.exit(0);
    }

    @Autowired
    private TripPlanService tripPlanService;

    @Test
    public void testTravelPlanService() {
        String rawText = "我想去北京玩三天，预算一万元，喜欢美食和动漫，带孩子。";
        tripPlanService.generateTripPlan(rawText);
    }

    @Autowired
    private BaiduMapService baiduMapService;

    @Test
    public void testBaiduMap() {
        Map<String, String> params = new HashMap<>();
        params.put("origin", "39.908823,116.39748"); // 起点经纬度（lng,lat）
        params.put("destination", "39.896499,116.321317"); // 终点经纬度
        params.put("waypoints", "39.916527,116.390884|39.904162,116.380347|39.900125,116.365523");
//        params.put("origin", "35.652832,139.839478"); // 东京
//        params.put("destination", "34.672314,135.484802"); // 大阪

        System.out.println(baiduMapService.getDrivingRoute(params));
    }
}
