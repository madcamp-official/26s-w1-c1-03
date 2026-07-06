package com.madmon.main.storage;

import com.madmon.main.storage.client.SupabaseStorageClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("!test")
@RequiredArgsConstructor
public class StorageBucketInitializer implements CommandLineRunner {

    private final SupabaseStorageClient supabaseStorageClient;

    @Override
    public void run(String... args) {
        // Storage 설정이 아직 안 되어 있어도(서비스 키 미설정 등) 앱 전체가 기동 실패하지 않도록,
        // 버킷 확인/생성 실패는 로그만 남기고 넘어간다.
        try {
            supabaseStorageClient.ensureBucketExists();
        } catch (Exception e) {
            log.warn("Supabase Storage 버킷 확인/생성에 실패했습니다. Storage 관련 기능이 정상 동작하지 않을 수 있습니다.", e);
        }
    }
}
