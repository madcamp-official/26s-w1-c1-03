package com.madmon.main.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.madmon.main.common.exception.BusinessException;
import com.madmon.main.common.exception.ErrorCode;
import com.madmon.main.storage.client.SupabaseStorageClient;
import com.madmon.main.storage.service.StorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class StorageServiceTest {

    @Mock
    private SupabaseStorageClient supabaseStorageClient;

    private StorageService storageService;

    @Test
    void 정상적인_이미지는_업로드되고_URL을_반환한다() throws Exception {
        storageService = new StorageService(supabaseStorageClient);
        MockMultipartFile file = new MockMultipartFile("file", "profile.png", "image/png", "dummy-image-bytes".getBytes());
        when(supabaseStorageClient.upload(anyString(), any(byte[].class), anyString()))
                .thenReturn("https://example.supabase.co/storage/v1/object/public/profile-images/abc.png");

        String url = storageService.uploadProfileImage(file);

        assertEquals("https://example.supabase.co/storage/v1/object/public/profile-images/abc.png", url);
        verify(supabaseStorageClient).upload(anyString(), any(byte[].class), org.mockito.ArgumentMatchers.eq("image/png"));
    }

    @Test
    void 빈_파일을_업로드하면_예외가_발생한다() {
        storageService = new StorageService(supabaseStorageClient);
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> storageService.uploadProfileImage(emptyFile));
        assertEquals(ErrorCode.INVALID_INPUT_VALUE, exception.getErrorCode());
    }

    @Test
    void 크기_제한을_초과하면_예외가_발생한다() {
        storageService = new StorageService(supabaseStorageClient);
        byte[] tooLarge = new byte[6 * 1024 * 1024];
        MockMultipartFile largeFile = new MockMultipartFile("file", "big.png", "image/png", tooLarge);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> storageService.uploadProfileImage(largeFile));
        assertEquals(ErrorCode.INVALID_INPUT_VALUE, exception.getErrorCode());
    }

    @Test
    void 허용되지_않는_형식이면_예외가_발생한다() {
        storageService = new StorageService(supabaseStorageClient);
        MockMultipartFile pdfFile = new MockMultipartFile("file", "doc.pdf", "application/pdf", "dummy".getBytes());

        BusinessException exception = assertThrows(BusinessException.class,
                () -> storageService.uploadProfileImage(pdfFile));
        assertEquals(ErrorCode.INVALID_INPUT_VALUE, exception.getErrorCode());
    }
}
