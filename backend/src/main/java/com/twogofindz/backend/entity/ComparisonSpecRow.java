package com.twogofindz.backend.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Entity
@Table(name = "comparison_spec_rows")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComparisonSpecRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "comparison_id", nullable = false)
    private Comparison comparison;

    @Column(name = "group_label", nullable = false, length = 100)
    private String groupLabel;

    @Column(name = "row_label", nullable = false, length = 100)
    private String rowLabel;

    @OneToMany(mappedBy = "specRow", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ComparisonSpecValue> values;
}
