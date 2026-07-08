package com.madmon.main.chat.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

// AI 요청 Rate Limiting(기능명세서 5.4.7): 사용자 1명당 분당 5회로 OpenAI 호출을 제한한다.
// 단일 서버 인스턴스 기준의 인메모리 구현이라, 서버 재시작 시 카운트가 초기화되고
// 인스턴스를 여러 대로 늘리면 인스턴스마다 별도로 집계된다(이 프로젝트 배포 구조에서는 충분).
@Component
public class ChatRateLimiter {

    private static final int CAPACITY = 5;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final ConcurrentHashMap<Long, Bucket> buckets = new ConcurrentHashMap<>();

    public boolean tryConsume(Long userId) {
        return buckets.computeIfAbsent(userId, id -> newBucket()).tryConsume(1);
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.builder().capacity(CAPACITY).refillGreedy(CAPACITY, WINDOW).build();
        return Bucket.builder().addLimit(limit).build();
    }
}
