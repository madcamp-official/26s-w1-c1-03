package com.madmon.main.title.entity;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserTitleStatsId implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long userId;
    private Long titleId;
}
