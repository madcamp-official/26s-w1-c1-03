package com.madmon.main.storage.service;

import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.storage.client.SupabaseStorageClient;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class StorageService {

    private static final Map<String, String> ALLOWED_CONTENT_TYPE_EXTENSIONS = Map.of(
            "image/png", ".png",
            "image/jpeg", ".jpg",
            "image/webp", ".webp"
    );
    private static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

    private final SupabaseStorageClient supabaseStorageClient;

    public String uploadProfileImage(MultipartFile file) {
        String extension = validate(file);
        String objectPath = UUID.randomUUID() + extension;

        try {
            return supabaseStorageClient.upload(objectPath, file.getBytes(), file.getContentType());
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.STORAGE_UPLOAD_FAILED);
        }
    }

    private String validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "업로드할 파일이 없습니다.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "파일 크기는 5MB를 초과할 수 없습니다.");
        }

        String extension = ALLOWED_CONTENT_TYPE_EXTENSIONS.get(file.getContentType());
        if (extension == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "PNG, JPG, WEBP 형식만 업로드할 수 있습니다.");
        }
        return extension;
    }
}
