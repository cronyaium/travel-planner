package com.cronya.domain;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "trip")
@Data
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_name")
    private String tripName;

    @Column(name = "user_id")
    private String userId;

    @Lob // 支持大文本（推荐）
    @Column(columnDefinition = "TEXT")
    private String tripDataJson; // 存整个 DTO 的 JSON 字符串

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;

    // getter/setter ...
}