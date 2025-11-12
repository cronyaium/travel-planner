package com.cronya.controller;

import com.cronya.service.TripPlanService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class TripPlannerController {

    private final TripPlanService tripPlanService;

    public TripPlannerController(TripPlanService tripPlanService) {
        this.tripPlanService = tripPlanService;
    }

    @PostMapping("/planTrip")
    public Map<String, Object> planTrip(@RequestBody Map<String, String> request) {
        String rawText = request.get("rawText");
        return tripPlanService.generateTripPlan(rawText);
    }
}
