# ERD — Catalog (milestone 3)

Entity-relationship diagram for the catalog schema. Money is integer **bani**; translatable
fields (`name`, `label`, `description`, …) are JSON per locale (EN + RO). See
[`.claude/context/content-model.md`](../.claude/context/content-model.md) for field-level notes.

```mermaid
erDiagram
    vocabularies ||--o{ terms : has
    terms ||--o{ products : "brand_id / segment_id"
    products ||--o{ product_variants : has
    products }o--o{ terms : product_term
    products ||--o{ product_compatibility : "accessory_id"
    products ||--o{ product_compatibility : "phone_id"
    option_types ||--o{ option_values : has
    product_variants }o--o{ option_values : variant_option_value
    users ||--o{ products : "created_by / updated_by"

    vocabularies {
        id id PK
        string code UK "product_type|brand|segment|connection|case_material"
        json name "translatable"
    }
    terms {
        id id PK
        id vocabulary_id FK
        json name "translatable"
        string slug "unique per vocabulary"
        int weight
    }
    products {
        id id PK
        string type "enum: phone|case|headset_bt|headset_wired"
        id brand_id FK "terms (nullable)"
        id segment_id FK "terms (nullable)"
        string slug UK
        string sku_base
        json name "translatable"
        json short_description "translatable"
        json description "translatable"
        jsonb specs "GIN-indexed; keys from attribute_definitions"
        int base_price "bani"
        string status "enum: draft|published|unpublished"
        timestamp published_at
        bool is_featured
        tinyint featured_position "1..3, unique when set"
        id created_by FK "users"
        id updated_by FK "users"
        timestamp deleted_at "soft delete"
    }
    product_variants {
        id id PK
        id product_id FK
        string sku UK
        int price "bani"
        int compare_at_price "bani, nullable"
        int stock
        bool is_default
    }
    option_types {
        id id PK
        string code UK "color|ram|storage"
        json name "translatable"
    }
    option_values {
        id id PK
        id option_type_id FK
        string code "unique per type"
        json label "translatable"
        int sort
        jsonb meta "{hex} or {gb}"
    }
    variant_option_value {
        id variant_id FK
        id option_value_id FK
    }
    product_term {
        id product_id FK
        id term_id FK
    }
    product_compatibility {
        id accessory_id FK "products"
        id phone_id FK "products"
    }
    attribute_definitions {
        id id PK
        string product_type "which type's specs"
        string key "specs JSON key"
        json label "translatable"
        string data_type "string|int|decimal|bool|enum|list"
        string unit "mAh, MP, h, g, ..."
        jsonb options "for enum/list"
        string group "Display|Camera|Battery|..."
        bool is_filterable
        bool is_required
        int sort
    }
```

`attribute_definitions` has no FK to `products` — it's a **schema catalog** matched by
`product_type` + `key`, driving the dynamic spec form, the PDP spec table and `SpecsValidator`.
