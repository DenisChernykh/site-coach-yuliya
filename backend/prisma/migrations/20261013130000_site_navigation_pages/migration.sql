-- Store the navigation that the site previously produced at render time.
-- Keep custom labels, links, order and every other published/draft field.
WITH navigation_sources AS (
    SELECT 'published' AS kind, id, settings -> 'navigation' AS navigation
    FROM site_content
    UNION ALL
    SELECT 'draft', id, content #> '{site,navigation}'
    FROM site_cms_drafts
), replacements AS (
    SELECT kind, id,
        COALESCE((
            SELECT jsonb_agg(
                CASE WHEN item ->> 'href' = '/#about'
                    THEN jsonb_set(item, '{href}', '"/about/"'::jsonb)
                    ELSE item
                END ORDER BY position
            )
            FROM jsonb_array_elements(source.navigation)
                WITH ORDINALITY AS items(item, position)
        ), '[]'::jsonb) || CASE WHEN EXISTS (
            SELECT 1 FROM jsonb_array_elements(source.navigation) AS items(item)
            WHERE item ->> 'href' = '/contacts/'
        ) THEN '[]'::jsonb
          ELSE '[{"label":"Контакты","href":"/contacts/"}]'::jsonb
        END AS navigation
    FROM navigation_sources AS source
    WHERE jsonb_typeof(navigation) = 'array'
), published_update AS (
    UPDATE site_content AS site
    SET settings = jsonb_set(site.settings, '{navigation}', replacement.navigation),
        updated_at = CURRENT_TIMESTAMP
    FROM replacements AS replacement
    WHERE replacement.kind = 'published' AND site.id = replacement.id
        AND site.settings -> 'navigation' IS DISTINCT FROM replacement.navigation
    RETURNING site.id
)
UPDATE site_cms_drafts AS draft
SET content = jsonb_set(draft.content, '{site,navigation}', replacement.navigation),
    revision = draft.revision + 1,
    published_revision = CASE WHEN draft.revision = draft.published_revision
        THEN draft.published_revision + 1 ELSE draft.published_revision END,
    updated_at = CURRENT_TIMESTAMP
FROM replacements AS replacement
WHERE replacement.kind = 'draft' AND draft.id = replacement.id
    AND draft.content #> '{site,navigation}' IS DISTINCT FROM replacement.navigation;
