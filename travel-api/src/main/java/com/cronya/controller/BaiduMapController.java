package com.cronya.controller;

import com.cronya.config.BaiduMapConfig;
import com.cronya.service.BaiduMapService;
import lombok.NoArgsConstructor;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class BaiduMapController {

    private final BaiduMapService baiduMapService;

    @Autowired
    public BaiduMapController(BaiduMapService baiduMapService) {
        this.baiduMapService = baiduMapService;
    }

    @PostMapping("/route")
    public String getDrivingRoute(@RequestBody Map<String, String> params) {
        return baiduMapService.getDrivingRoute(params);
    }
}
