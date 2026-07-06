package com.madmon.main.title.dto;

import com.madmon.main.title.entity.Title;

public record TitleResponse(
        Long id,
        String name,
        String description,
        String icon
) {

    public static TitleResponse of(Title title) {
        return new TitleResponse(title.getId(), title.getName(), title.getDescription(), title.getIcon());
    }
}
