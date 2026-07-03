package com.madmon.main.title.entity;

import com.madmon.main.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "titles",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_titles_name", columnNames = "name")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Title extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(length = 255)
    private String icon;

    private Title(String name, String description, String icon) {
        this.name = name;
        this.description = description;
        this.icon = icon;
    }

    public static Title create(String name, String description, String icon) {
        return new Title(name, description, icon);
    }
}
