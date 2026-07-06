package com.madmon.main.storage.client;

import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
public class SupabaseStorageClient {

    private final RestClient restClient;
    private final String storageUrl;
    private final String bucket;

    public SupabaseStorageClient(
            @Qualifier("supabaseStorageRestClient") RestClient restClient,
            @Value("${app.storage.url}") String storageUrl,
            @Value("${app.storage.bucket}") String bucket
    ) {
        this.restClient = restClient;
        this.storageUrl = storageUrl;
        this.bucket = bucket;
    }

    public String upload(String objectPath, byte[] content, String contentType) {
        try {
            restClient.post()
                    .uri("/object/{bucket}/{path}", bucket, objectPath)
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(content)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new BusinessException(ErrorCode.STORAGE_UPLOAD_FAILED);
        }

        return buildPublicUrl(objectPath);
    }

    public void ensureBucketExists() {
        try {
            restClient.get().uri("/bucket/{bucket}", bucket).retrieve().toBodilessEntity();
        } catch (RestClientResponseException e) {
            if (isBucketNotFound(e)) {
                createBucket();
            } else {
                throw new BusinessException(ErrorCode.STORAGE_UPLOAD_FAILED);
            }
        }
    }

    // Supabase Storage API는 버킷이 없을 때 HTTP 상태 코드를 400으로 반환하고,
    // 실제 404는 응답 본문(JSON)의 "statusCode" 필드에 문자열로만 담아 보낸다.
    private boolean isBucketNotFound(RestClientResponseException e) {
        String body = e.getResponseBodyAsString();
        return body != null && body.contains("Bucket not found");
    }

    private void createBucket() {
        restClient.post()
                .uri("/bucket")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("id", bucket, "name", bucket, "public", true))
                .retrieve()
                .toBodilessEntity();
    }

    private String buildPublicUrl(String objectPath) {
        return "%s/object/public/%s/%s".formatted(storageUrl, bucket, objectPath);
    }
}
