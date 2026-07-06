package com.madmon.main.title.controller;

import com.madmon.main.common.response.ApiResponse;
import com.madmon.main.title.dto.TitleResponse;
import com.madmon.main.title.service.TitleService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/titles")
@RequiredArgsConstructor
public class TitleController {

    private final TitleService titleService;

    @GetMapping
    public ApiResponse<List<TitleResponse>> getTitles() {
        return ApiResponse.success(titleService.getAllTitles());
    }
}
