package com.cronya.repository;

import com.cronya.domain.Trip;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TripRepository extends JpaRepository<Trip, Long> {
    // 按 userId 查询所有行程
    List<Trip> findAllByUserId(String userId);
}