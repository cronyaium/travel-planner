package com.cronya.service;

import com.cronya.domain.Trip;
import com.cronya.repository.TripRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class TripService {

    @Autowired
    private TripRepository tripRepository;

    // 1. 创建行程
    public Trip createTrip(Trip trip) {
        trip.setCreatedTime(LocalDateTime.now());
        trip.setUpdatedTime(LocalDateTime.now());
        return tripRepository.save(trip);
    }

    // 2. 查询单个行程
    public Trip getTripById(Long id) {
        return tripRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("行程不存在"));
    }

    // 3. 更新行程
    public Trip updateTrip(Long id, Trip trip) {
        Trip existingTrip = getTripById(id);
        existingTrip.setTripName(trip.getTripName());
        existingTrip.setUserId(trip.getUserId());
        existingTrip.setTripDataJson(trip.getTripDataJson());
        existingTrip.setUpdatedTime(LocalDateTime.now());
        return tripRepository.save(existingTrip);
    }

    // 4. 删除行程
    public void deleteTrip(Long id) {
        tripRepository.deleteById(id);
    }

    // 5. 查询所有行程
    public List<Trip> getAllTrips() {
        return tripRepository.findAll();
    }

    public List<Trip> getTripsByUserId(String userId) {
        return tripRepository.findAllByUserId(userId);
    }

}
