package com.cronya.service;

import com.alibaba.fastjson.JSONObject;
import com.cronya.config.BaiduMapConfig;
import org.apache.hc.client5.http.fluent.Request;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class BaiduMapService {
    private final BaiduMapConfig baiduMapConfig;

    @Autowired
    public BaiduMapService(BaiduMapConfig baiduMapConfig) {
        this.baiduMapConfig = baiduMapConfig;
    }

    public String getDrivingRoute(Map<String, String> params) {
        try {
            // 1. 从配置类中获取服务端AK和接口地址
            String ak = baiduMapConfig.getServer().getAk();
            String apiUrl = baiduMapConfig.getDriving().getUrl();
            int timeout = 5000;

            // 2. 校验配置是否完整
            if (ak == null || ak.isEmpty()) {
                throw new RuntimeException("百度地图服务端AK未配置");
            }
            if (apiUrl == null || apiUrl.isEmpty()) {
                throw new RuntimeException("驾车路线接口地址未配置");
            }

            // 3. 获取前端传递的起终点经纬度
            String origin = params.get("origin"); // 格式："lng,lat"
            String destination = params.get("destination");
            if (origin == null || destination == null) {
                throw new RuntimeException("请传入起点和终点经纬度");
            }

            // 4. 构建百度地图API请求参数
            Map<String, String> apiParams = new HashMap<>();
            apiParams.put("ak", ak);               // 服务端AK（从配置类获取）
            apiParams.put("origin", origin);       // 起点
            apiParams.put("destination", destination); // 终点
//            apiParams.put("output", "json");       // 返回格式为JSON

            // 5. 拼接请求URL（参数键值对）
            StringBuilder urlBuilder = new StringBuilder(apiUrl);
            urlBuilder.append("?");
            for (Map.Entry<String, String> entry : apiParams.entrySet()) {
                urlBuilder.append(entry.getKey())
                        .append("=")
                        .append(entry.getValue())
                        .append("&");
            }
            // 去除最后一个多余的"&"
            String requestUrl = urlBuilder.substring(0, urlBuilder.length() - 1);
            System.out.println(requestUrl);

            // 6. 调用百度地图API（设置超时时间，从配置类获取）
            String response = Request.get(requestUrl)
                    .connectTimeout(Timeout.ofMilliseconds(timeout)) // 连接超时
                    .responseTimeout(Timeout.ofMilliseconds(timeout)) // 响应超时
                    .execute()
                    .returnContent()
                    .asString();

            // 7. 将百度返回的结果转发给前端
            return response;

        } catch (Exception e) {
            // 异常处理：返回统一格式的错误信息
            JSONObject error = new JSONObject();
            error.put("status", -1);
            error.put("message", "路线规划失败：" + e.getMessage());
            return error.toString();
        }
    }
}
