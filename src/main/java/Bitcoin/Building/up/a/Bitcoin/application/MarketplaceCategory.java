package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity representing marketplace categories
 */
@Entity
@Table(name = "marketplace_categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"parent", "children", "items"})
@EqualsAndHashCode(exclude = {"parent", "children", "items"})
public class MarketplaceCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String icon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private MarketplaceCategory parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MarketplaceCategory> children = new ArrayList<>();

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @OneToMany(mappedBy = "category", fetch = FetchType.LAZY)
    @Builder.Default
    private List<MarketplaceItem> items = new ArrayList<>();

    /**
     * Get the full category path (e.g., "Electronics > Phones > Smartphones")
     */
    public String getFullPath() {
        if (parent == null) {
            return name;
        }
        return parent.getFullPath() + " > " + name;
    }

    /**
     * Check if this is a root category (no parent)
     */
    public boolean isRootCategory() {
        return parent == null;
    }

    /**
     * Check if this is a leaf category (no children)
     */
    public boolean isLeafCategory() {
        return children == null || children.isEmpty();
    }
}