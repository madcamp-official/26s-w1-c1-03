package com.madmon.main.title.repository;

import com.madmon.main.title.entity.Title;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TitleRepository extends JpaRepository<Title, Long> {

    Optional<Title> findByName(String name);

    boolean existsByName(String name);
}
